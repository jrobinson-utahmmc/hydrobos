# 03 — Technical Architecture & Microservices Design

## Architecture Overview

HydroBOS is built on a **microservices architecture** where each service owns a distinct domain. Services are containerized with Docker, communicate through an API Gateway and event bus, and can be independently scaled and deployed.

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Browser]
        MOB[Mobile Browser]
    end

    subgraph "Edge Layer"
        CDN[CDN / Static Assets]
        LB[Load Balancer]
    end

    subgraph "Gateway Layer"
        GW[API Gateway<br/>Auth · Rate Limiting · Routing · Tenant Context]
    end

    subgraph "Core Services"
        IAS[Identity & Auth<br/>Service]
        PAS[Policy / Authorization<br/>Service]
        WLE[Widget & Layout<br/>Engine]
        FE[Frontend / UI<br/>Service - Next.js]
        ART[Applet Runtime<br/>iframe Manager]
    end

    subgraph "Applets (Vite + Vue 3)"
        A_SEO[SEO Optimizer<br/>Applet]
        A_NET[Network Monitor<br/>Applet - Future]
        A_CUST[Custom Applets<br/>via Template API]
    end

    subgraph "Connector Services"
        C_SF[ServiceFusion<br/>Connector]
        C_UF[UniFi<br/>Connector]
        C_GSC[Google Search<br/>Console Connector]
        C_PF[pfSense / OPNsense<br/>Connector]
        C_AZ[Azure / GCP<br/>Connector]
        C_CF[Cloudflare<br/>Connector]
        C_FR[Frigate NVR<br/>Connector]
        C_PX[Proxmox<br/>Connector]
    end

    subgraph "Data Layer"
        MDB[(MongoDB<br/>Core Data)]
        TSDB[(Time-Series DB<br/>Metrics & Logs)]
        CACHE[(Redis<br/>Cache & Sessions)]
        OBJ[(Object Storage<br/>S3 / ADLS)]
    end

    subgraph "Messaging Layer"
        EB[Event Bus<br/>Kafka / Azure Service Bus]
        MQTT[MQTT Broker<br/>IoT & NVR Events]
    end

    subgraph "On-Premises"
        EA[Edge Agent<br/>Docker Container]
        FW[Firewalls]
        NVR[NVR / Cameras]
        NET[Network Devices]
    end

    WEB --> CDN
    MOB --> CDN
    CDN --> LB
    LB --> GW

    GW --> IAS
    GW --> PAS
    GW --> FE
    GW --> WLE
    GW --> ART
    GW --> C_SF
    GW --> C_UF
    GW --> C_GSC
    GW --> C_PF
    GW --> C_AZ
    GW --> C_CF
    GW --> C_FR
    GW --> C_PX

    FE --> ART
    ART --> A_SEO
    ART --> A_NET
    ART --> A_CUST
    A_SEO -->|"postMessage"| ART

    IAS --> MDB
    PAS --> MDB
    WLE --> MDB
    C_SF --> MDB
    C_UF --> MDB

    C_FR --> MQTT
    EA --> MQTT
    MQTT --> EB

    C_SF --> EB
    C_UF --> EB
    C_GSC --> EB
    C_PF --> EB

    EB --> TSDB
    EB --> OBJ

    IAS --> CACHE
    GW --> CACHE

    EA --- FW
    EA --- NVR
    EA --- NET
```

---

## Service Decomposition

### Service Inventory

| Service | Domain | Responsibilities |
|---------|--------|-----------------|
| **API Gateway** | Ingress | Single entry point for all client/external requests; validates OIDC tokens; authorization enforcement; request routing; rate limiting; logging; tenant context extraction |
| **Identity & Auth Service** | Identity | Local account auth (bcrypt); optional Entra ID integration via OIDC/OAuth 2.0; login flows; JWT processing; session management; user/group management; role mapping |
| **Policy / Authorization Service** | Security | Central policy engine; RBAC/ABAC evaluation; answers "Can user X do action Y on resource Z given context C?"; context-aware (MFA status, device posture) |
| **Frontend / UI Service** | Presentation | Serves Next.js application and static assets; main layout, navigation, widgets, user interactions; connects to backend via API Gateway |
| **Widget & Layout Engine** | UI Config | Dashboard and widget configuration management; stores/retrieves user-specific layouts; widget registry; future marketplace host |
| **Applet Runtime** | Extension | Manages applet lifecycle; iframe container; host ↔ applet postMessage bridge; auth token provisioning; theme sync; API request proxy for applets |
| **Connector Services** (per integration) | Integration | Each handles auth to an external service, polls/listens for data, normalizes to canonical model, may execute commands |
| **Data Services** | Storage | Core data storage and retrieval; MongoDB for config/users; time-series for metrics; manages data retention, partitioning, multi-tenant isolation |
| **Event & Messaging Bus** | Communication | Async inter-service communication; connectors publish events, services subscribe; decoupling and event-driven architecture |

---

### Service Detail Cards

#### API Gateway

```
┌─────────────────────────────────────────────┐
│  API GATEWAY                                │
│─────────────────────────────────────────────│
│  Responsibilities:                          │
│  • TLS termination                          │
│  • JWT / OIDC token validation              │
│  • Tenant context extraction (from JWT)     │
│  • Request routing to internal services     │
│  • Rate limiting & throttling               │
│  • Request/response logging                 │
│  • CORS handling                            │
│                                             │
│  Inputs:  HTTPS requests from clients       │
│  Outputs: Routed requests to microservices  │
│  Tech:    Kong / Traefik / Custom (Node.js) │
└─────────────────────────────────────────────┘
```

#### Identity & Auth Service

```mermaid
flowchart TD
    A[User Request] --> B{Has Valid Session?}
    B -->|Yes| C[Extract User Context]
    B -->|No| D{Auth Method?}
    D -->|Local Account| LA[Validate Email + Password]
    LA --> LB{Valid?}
    LB -->|Yes| J[Create Session]
    LB -->|No| LC[401 Unauthorized]
    D -->|Microsoft SSO| E[Redirect to Entra ID]
    E --> F[User Authenticates + MFA]
    F --> G[Receive Auth Code]
    G --> H[Exchange for Tokens]
    H --> I[Validate ID Token / JWT]
    I --> J
    J --> K[Map Roles]
    K --> C
    C --> M[Attach User Context to Request]
    M --> N[Forward to Service]
```

#### Policy / Authorization Service

```mermaid
flowchart TD
    A[Service Requests<br/>Authorization Check] --> B[Policy Engine]
    
    B --> C{Evaluate RBAC}
    C -->|Role allows?| D{Evaluate ABAC}
    C -->|Role denies| H[DENY]
    
    D --> E{MFA completed?}
    D --> F{Device compliant?}
    D --> G{Tenant context valid?}
    
    E -->|Yes| I[Continue]
    E -->|No| J[Require Step-Up MFA]
    
    F -->|Yes| I
    F -->|No| H
    
    G -->|Yes| I
    G -->|No| H
    
    I --> K[ALLOW]
    
    J --> L[User completes MFA]
    L --> K
```

---

## Key Architectural Principles

### 1. Separation of Concerns

Each service has a **narrow, well-defined role**. Connectors and UI components can evolve independently without breaking the core. Services are loosely coupled via the event bus and API Gateway.

```mermaid
graph LR
    subgraph "Presentation"
        FE[Frontend]
        WLE[Widget Engine]
    end
    subgraph "Business Logic"
        IAS[Identity]
        PAS[Policy]
        CON[Connectors]
    end
    subgraph "Data"
        DB[(Databases)]
        EB[Event Bus]
    end

    FE --> IAS
    FE --> WLE
    WLE --> CON
    IAS --> DB
    PAS --> DB
    CON --> EB
    EB --> DB
```

### 2. Multi-Tenancy

Tenant context is determined at **request ingress** (extracted from the JWT token) and passed through the entire system, ensuring data isolation.

```mermaid
sequenceDiagram
    participant Client
    participant Gateway as API Gateway
    participant Service as Any Service
    participant DB as Database

    Client->>Gateway: Request + JWT
    Gateway->>Gateway: Validate JWT
    Gateway->>Gateway: Extract tenant_id from claims
    Gateway->>Service: Request + tenant_id header
    Service->>Service: Tenant-scoped logic (shared lib)
    Service->>DB: Query WHERE tenant_id = X
    DB->>Service: Tenant-scoped results
    Service->>Gateway: Response
    Gateway->>Client: Response
```

**Tenant Isolation Layers:**

| Layer | Isolation Mechanism |
|-------|-------------------|
| **Network** | Tenant-specific request headers; service mesh policies |
| **Application** | Shared libraries enforce tenant scoping on every DB query |
| **Data** | Per-tenant database or schema-based partitioning |
| **Secrets** | Per-tenant encryption keys and credentials |

### 3. Hybrid Deployment

```mermaid
graph TB
    subgraph "Cloud Control Plane"
        CP[Core Platform Services]
        API[API Gateway]
        DS[Data Services]
    end

    subgraph "Edge Site Alpha"
        EA1[Edge Agent]
        HW1[Local Hardware<br/>Firewalls, Switches, NVR]
    end

    subgraph "Edge Site Beta"
        EA2[Edge Agent]
        HW2[Local Hardware<br/>Servers, IoT]
    end

    EA1 <-->|"TLS Tunnel<br/>Outbound Only"| API
    EA2 <-->|"TLS Tunnel<br/>Outbound Only"| API
    EA1 --- HW1
    EA2 --- HW2
    API --> CP
    CP --> DS
```

Edge agents:
- Lightweight Docker containers deployed on-premises
- Initiate **outbound-only** connections to the cloud (no inbound firewall rules needed)
- Interface with local resources (firewalls, NVRs, IoT, legacy servers)
- Cache data locally for resilience during connectivity loss
- Feed data back to the cloud control plane

### 4. Scalability & Resilience

```mermaid
graph LR
    subgraph "Scaling Strategy"
        H[Horizontal Scaling<br/>Add more container instances]
        V[Vertical Scaling<br/>Increase container resources]
    end

    subgraph "Resilience Patterns"
        CB[Circuit Breakers<br/>Isolate failing dependencies]
        RT[Retries with Backoff<br/>Handle transient failures]
        CA[Caching<br/>Reduce external calls]
        FO[Fallbacks<br/>Graceful degradation]
    end
```

- Services run in Docker containers → horizontal scaling via orchestration
- Circuit breaker pattern isolates failures in external APIs
- Caching (Redis) reduces load on external services and databases
- Event-driven architecture absorbs traffic spikes via message queuing
- Health checks and auto-restart on container failure

### 5. Security by Design

```mermaid
graph TD
    A[Request Arrives] --> B[TLS Termination]
    B --> C[JWT Validation]
    C --> D[Tenant Extraction]
    D --> E[Rate Limit Check]
    E --> F[Route to Service]
    F --> G[Policy Engine Check]
    G --> H{Authorized?}
    H -->|Yes| I[Execute & Audit Log]
    H -->|No| J[403 Forbidden + Audit Log]
```

- **Transport**: All communications over HTTPS/TLS
- **Authentication**: Centrally enforced at the API Gateway
- **Authorization**: Policy Engine evaluates every action
- **Secrets**: Managed via Azure Key Vault / AWS Secrets Manager
- **Audit**: Every action logged for compliance
- **Isolation**: Services don't share credentials; minimal privileges

---

## Communication Patterns

### Synchronous (REST via API Gateway)

Used for: User-facing requests, CRUD operations, real-time queries

```
Client → API Gateway → Service → Database → Response
```

### Asynchronous (Event Bus)

Used for: Data ingestion, cross-service notifications, background processing

```mermaid
graph LR
    C1[UniFi Connector] -->|"device.status.changed"| EB[Event Bus]
    C2[Frigate Connector] -->|"security.motion.detected"| EB
    C3[pfSense Connector] -->|"firewall.rule.changed"| EB
    
    EB -->|Subscribe| SC[Security Center Service]
    EB -->|Subscribe| NS[Notification Service]
    EB -->|Subscribe| TS[Time-Series Storage]
    EB -->|Subscribe| AL[Audit Log Service]
```

### MQTT (IoT & Physical Security)

Used for: Real-time events from NVR cameras, IoT sensors, physical access systems

```
Frigate NVR → MQTT Broker → Frigate Connector → Event Bus → Subscribers
```

---

## Container & Deployment Topology

```mermaid
graph TB
    subgraph "Docker Compose / K8s Cluster"
        subgraph "Public-Facing"
            LB[Load Balancer :443]
            GW[API Gateway :8080]
            FE[Frontend :3000]
        end
        
        subgraph "Internal Services"
            IAS[Identity Service :4001]
            PAS[Policy Service :4002]
            WLE[Widget Engine :4003]
        end
        
        subgraph "Connectors"
            CSF[ServiceFusion :5001]
            CUF[UniFi :5002]
            CGSC[Google SC :5003]
            CPF[pfSense :5004]
            CFR[Frigate :5005]
        end
        
        subgraph "Infrastructure"
            MDB[(MongoDB :27017)]
            RDS[(Redis :6379)]
            KFK[Kafka :9092]
            MQ[MQTT :1883]
        end
    end

    LB --> GW
    GW --> FE
    GW --> IAS
    GW --> PAS
    GW --> WLE
    GW --> CSF
    GW --> CUF
    GW --> CGSC
    GW --> CPF
    GW --> CFR

    IAS --> MDB
    IAS --> RDS
    PAS --> MDB
    WLE --> MDB
    CSF --> KFK
    CUF --> KFK
    CFR --> MQ
    MQ --> KFK
```

---

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Frontend Framework** | Next.js + React + TypeScript | SSR for SEO/performance, React ecosystem, type safety |
| **Applet Framework** | Vite + Vue 3 + TypeScript | Fast HMR, lightweight builds, ideal for iframe-embedded micro-apps |
| **Backend Language** | Node.js + TypeScript | Stack synergy with frontend, async I/O for connectors, broad ecosystem |
| **Service Framework** | NestJS | Modular architecture, built-in DI, TypeScript-native, decorator-based |
| **API Gateway** | Kong or custom (Express) | Mature plugin ecosystem; fallback to custom for full control |
| **Primary Database** | MongoDB | Flexible schema for MVP; document model fits config and connector data |
| **Cache** | Redis | Session storage, API response caching, rate limiting counters |
| **Event Bus** | Kafka (or Azure Service Bus) | Durable, ordered, scalable messaging; replay capability |
| **MQTT Broker** | Mosquitto | Lightweight, perfect for NVR/IoT event ingestion |
| **Containers** | Docker + Docker Compose → Kubernetes | Start simple, scale to K8s when needed |
| **CI/CD** | GitHub Actions / Azure DevOps | Automated build, test, scan, and deploy pipelines |
| **Secret Management** | Azure Key Vault / AWS Secrets Manager | Centralized, audited secret storage |
| **Monitoring** | Azure Monitor / Prometheus + Grafana | Metrics, alerting, and dashboarding for platform health |
