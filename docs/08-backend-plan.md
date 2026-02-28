# 08 — Backend Implementation Plan

## Stack & Framework

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Runtime** | Node.js 20 LTS | Async I/O for connectors, stack synergy with frontend |
| **Language** | TypeScript 5+ | Type safety, refactoring confidence, shared types with frontend |
| **Framework** | NestJS | Modular architecture, built-in DI, decorator-based, TypeScript-native |
| **API Format** | REST (JSON) | Simplicity, broad client support; GraphQL considered for future |
| **Validation** | class-validator + class-transformer | Decorator-based DTO validation in NestJS |
| **ORM / ODM** | Mongoose (MongoDB) + TypeORM (PostgreSQL) | Flexible document mapping; relational when needed |
| **Auth Library** | passport + passport-azure-ad | Battle-tested OIDC/OAuth flows for Node.js |
| **Testing** | Jest + Supertest | Unit and integration testing |
| **Containers** | Docker + Docker Compose | Local dev, CI, and production deployment |

---

## Service Structure

Each microservice follows a consistent internal structure:

```
service-name/
├── src/
│   ├── main.ts                    # Entry point, bootstrap NestJS app
│   ├── app.module.ts              # Root module
│   ├── config/
│   │   ├── configuration.ts       # Environment-based config
│   │   └── validation.ts          # Config schema validation
│   ├── modules/
│   │   └── feature/
│   │       ├── feature.module.ts
│   │       ├── feature.controller.ts
│   │       ├── feature.service.ts
│   │       ├── feature.repository.ts
│   │       ├── dto/
│   │       │   ├── create-feature.dto.ts
│   │       │   └── update-feature.dto.ts
│   │       ├── schemas/
│   │       │   └── feature.schema.ts
│   │       └── interfaces/
│   │           └── feature.interface.ts
│   ├── common/
│   │   ├── guards/
│   │   │   ├── auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts
│   │   │   └── tenant.decorator.ts
│   │   ├── interceptors/
│   │   │   ├── audit-log.interceptor.ts
│   │   │   └── tenant-context.interceptor.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   └── middleware/
│   │       └── tenant-extraction.middleware.ts
│   └── shared/
│       ├── tenant/
│       │   ├── tenant.module.ts
│       │   └── tenant.service.ts
│       ├── audit/
│       │   ├── audit.module.ts
│       │   └── audit.service.ts
│       └── event-bus/
│           ├── event-bus.module.ts
│           └── event-bus.service.ts
├── test/
│   ├── unit/
│   └── integration/
├── Dockerfile
├── package.json
├── tsconfig.json
└── .env.example
```

---

## Microsoft Entra ID Integration

### OIDC Authentication Flow

```mermaid
sequenceDiagram
    participant Browser
    participant FE as Next.js Frontend
    participant GW as API Gateway
    participant Auth as Identity Service
    participant Entra as Microsoft Entra ID
    participant Graph as Microsoft Graph API
    participant DB as MongoDB

    Browser->>FE: Navigate to /login
    FE->>GW: GET /auth/login
    GW->>Auth: Forward
    Auth->>Browser: 302 Redirect to Entra ID /authorize
    
    Note over Browser, Entra: OIDC Authorization Code Flow
    Browser->>Entra: GET /authorize?client_id=...&scope=openid+profile+email
    Entra->>Browser: Login Page + MFA
    Browser->>Entra: Credentials + MFA code
    Entra->>Browser: 302 Redirect to callback with ?code=AUTH_CODE
    
    Browser->>GW: GET /auth/callback?code=AUTH_CODE
    GW->>Auth: Forward
    Auth->>Entra: POST /token (exchange code for tokens)
    Entra->>Auth: { id_token, access_token, refresh_token }
    
    Auth->>Auth: Validate ID Token (signature, issuer, audience, exp)
    Auth->>Auth: Extract claims (sub, name, email, groups)
    
    Auth->>Graph: GET /me?$select=id,displayName,mail,jobTitle
    Graph->>Auth: User profile
    Auth->>Graph: GET /me/memberOf
    Graph->>Auth: Group memberships
    
    Auth->>Auth: Map AD groups → platform roles
    Auth->>DB: Upsert user record
    Auth->>Auth: Create session (store in Redis)
    Auth->>Browser: Set session cookie + redirect to /dashboard
```

### Implementation Details

**OIDC Configuration:**
```typescript
// Pseudocode — NestJS OIDC Strategy
{
  identityMetadata: 'https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration',
  clientID: process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
  responseType: 'code',
  responseMode: 'query',
  redirectUrl: process.env.REDIRECT_URI,
  scope: ['openid', 'profile', 'email', 'User.Read', 'GroupMember.Read.All'],
  passReqToCallback: true,
  allowHttpForRedirectUrl: false,  // HTTPS only in production
}
```

**Group-to-Role Mapping:**
```typescript
// Role mapping configuration
const GROUP_ROLE_MAP = {
  'HydreOS-Admins':     'platform_admin',
  'HydreOS-ITOps':      'it_operations',
  'HydreOS-Security':   'security_analyst',
  'HydreOS-Executives': 'executive_viewer',
  'HydreOS-Users':      'standard_user',
};

function mapGroupsToRoles(adGroups: string[]): string[] {
  return adGroups
    .map(group => GROUP_ROLE_MAP[group])
    .filter(Boolean);
}
```

**Token Refresh Strategy:**
```mermaid
flowchart TD
    A[API Request Arrives] --> B{Session Valid?}
    B -->|Yes| C{Access Token<br/>Expiring Soon?}
    C -->|No| D[Process Request]
    C -->|Yes| E[Refresh Token<br/>with Entra ID]
    E --> F{Refresh OK?}
    F -->|Yes| G[Update Session<br/>with New Tokens]
    G --> D
    F -->|No| H[Clear Session]
    H --> I[401 → Re-authenticate]
    B -->|No| I
```

---

## RBAC / ABAC Implementation

### Role Guard (NestJS)

```typescript
// Decorator usage example
@Controller('network')
export class NetworkController {
  
  @Get('devices')
  @Roles('platform_admin', 'it_operations', 'security_analyst')
  async getDevices(@TenantId() tenantId: string) {
    return this.networkService.getDevices(tenantId);
  }

  @Post('firewall/rules')
  @Roles('platform_admin', 'it_operations')
  @RequireMFA()  // ABAC: requires recent MFA
  async createFirewallRule(@Body() dto: CreateFirewallRuleDto) {
    return this.networkService.createRule(dto);
  }
}
```

### Policy Engine Integration

```mermaid
flowchart LR
    SVC[Service] -->|"authz.check()"| SDK[Policy SDK]
    SDK -->|"POST /evaluate"| PE[Policy Engine<br/>Microservice]
    PE -->|"Load rules"| DB[(Policy Store)]
    PE -->|"ALLOW / DENY"| SDK
    SDK -->|"Result"| SVC
```

**Policy Evaluation Request:**
```json
{
  "subject": {
    "userId": "user-456",
    "roles": ["it_operations"],
    "tenantId": "tenant-abc"
  },
  "action": "firewall.rule.create",
  "resource": {
    "type": "firewall",
    "id": "pfsense-01"
  },
  "context": {
    "mfaCompleted": true,
    "mfaTimestamp": "2026-02-28T14:25:00Z",
    "ipAddress": "192.168.1.50",
    "deviceCompliant": true,
    "timeOfDay": "14:30",
    "dayOfWeek": "Saturday"
  }
}
```

---

## Multi-Tenant Architecture

### Tenant Extraction Middleware

```mermaid
flowchart TD
    A[Request with JWT] --> B[Extract tenant_id<br/>from JWT claims]
    B --> C{tenant_id present?}
    C -->|No| D[403 Forbidden]
    C -->|Yes| E{Tenant active?}
    E -->|No| F[403 Tenant Suspended]
    E -->|Yes| G[Attach to Request Context]
    G --> H[All downstream queries<br/>scoped by tenant_id]
```

**Shared Library — Tenant-Scoped Repository:**
```typescript
// All repositories extend this base
abstract class TenantScopedRepository<T> {
  async find(tenantId: string, filter: object): Promise<T[]> {
    return this.model.find({ tenantId, ...filter });
  }

  async create(tenantId: string, data: Partial<T>): Promise<T> {
    return this.model.create({ tenantId, ...data });
  }

  // tenant_id is ALWAYS included — never optional
}
```

---

## Audit Logging

### Audit Interceptor (NestJS)

Every controller action automatically generates an audit log entry via an interceptor:

```mermaid
flowchart LR
    A[Request] --> B[Audit Interceptor<br/>Captures: who, what, when]
    B --> C[Controller Action]
    C --> D[Response]
    D --> E[Audit Interceptor<br/>Records: result, duration]
    E --> F[Publish to Event Bus]
    F --> G[Audit Log Service]
    G --> H[(Audit Store)]
```

---

## Connector Service Pattern

Each connector follows a standard pattern:

```mermaid
flowchart TD
    subgraph "Connector Service"
        AUTH[Auth Handler<br/>Manage API keys / OAuth tokens]
        SCHED[Scheduler<br/>Polling intervals or webhook listener]
        FETCH[Data Fetcher<br/>Call external API]
        NORM[Normalizer<br/>Map → Canonical Model]
        CACHE[Local Cache<br/>Rate limit protection]
        CMD[Command Handler<br/>Write operations]
        HEALTH[Health Check<br/>Verify external API reachable]
    end

    EXT[External API] <--> AUTH
    AUTH --> FETCH
    SCHED --> FETCH
    FETCH --> NORM
    FETCH --> CACHE
    NORM --> EB[Event Bus]
    NORM --> DB[(MongoDB)]
    CMD --> AUTH
    CMD --> EXT
```

**Connector Lifecycle:**
1. **Register:** Admin adds connector config (endpoint, credentials, polling interval)
2. **Authenticate:** Connector validates credentials with external API
3. **Sync:** Initial full data sync → normalize → store
4. **Poll/Listen:** Ongoing data fetch (scheduled poll or webhook/stream)
5. **Serve:** Platform queries connector's stored data via canonical model
6. **Command:** Platform sends write operations back to external API
7. **Health Check:** Periodic verification that external API is reachable

---

## API Gateway Configuration

```mermaid
flowchart TD
    A[Incoming Request] --> B[TLS Termination]
    B --> C[CORS Check]
    C --> D[Rate Limiting<br/>Per tenant + per user]
    D --> E[JWT Validation<br/>Verify Entra ID token]
    E --> F[Tenant Extraction]
    F --> G[Request Logging]
    G --> H{Route Matching}
    
    H -->|"/api/auth/*"| I[Identity Service]
    H -->|"/api/users/*"| I
    H -->|"/api/policy/*"| J[Policy Service]
    H -->|"/api/widgets/*"| K[Widget Engine]
    H -->|"/api/connectors/sf/*"| L[ServiceFusion Connector]
    H -->|"/api/connectors/unifi/*"| M[UniFi Connector]
    H -->|"/api/connectors/gsc/*"| N[Google SC Connector]
    H -->|"/*"| O[Frontend Service]
```

---

## Security & DevOps

### Security Controls

| Control | Implementation |
|---------|---------------|
| **Transport Encryption** | TLS 1.3 for all external; mTLS between services (future) |
| **Secret Management** | Azure Key Vault / AWS Secrets Manager; never in code or env files |
| **Input Validation** | DTO validation on every endpoint; sanitize all user input |
| **Dependency Scanning** | `npm audit` + Snyk in CI pipeline |
| **Container Security** | Minimal base images (Alpine); non-root containers; image scanning |
| **Rate Limiting** | Per-tenant and per-user limits at API Gateway |
| **CORS** | Strict origin whitelist |
| **Helmet** | HTTP security headers (CSP, HSTS, X-Frame-Options) |

### CI/CD Pipeline

```mermaid
flowchart LR
    A[Git Push] --> B[Lint + Type Check]
    B --> C[Unit Tests]
    C --> D[Integration Tests]
    D --> E[Build Docker Images]
    E --> F[Security Scan<br/>Snyk + Trivy]
    F --> G{All Passed?}
    G -->|Yes| H[Push to Registry]
    H --> I[Deploy to Staging]
    I --> J[E2E Tests]
    J --> K{Passed?}
    K -->|Yes| L[Deploy to Production<br/>Blue-Green / Canary]
    K -->|No| M[Alert Team]
    G -->|No| M
```

### Monitoring & Alerting

| Aspect | Tool | What's Monitored |
|--------|------|-----------------|
| **Metrics** | Prometheus + Grafana | Request latency, error rates, throughput, container CPU/memory |
| **Logs** | ELK Stack or Azure Log Analytics | Application logs, access logs, audit events |
| **Tracing** | OpenTelemetry + Jaeger | Distributed request traces across services |
| **Alerting** | Grafana Alerts / PagerDuty | SLA breaches, error spikes, service down |
| **Uptime** | Synthetic monitors | Endpoint availability from multiple regions |

### Error Handling & Resilience

```mermaid
flowchart TD
    A[External API Call] --> B{Response?}
    B -->|Success| C[Process Data]
    B -->|Timeout| D[Retry with Exponential Backoff]
    B -->|Error 4xx| E[Log Error<br/>Return Cached Data]
    B -->|Error 5xx| D
    
    D --> F{Max Retries?}
    F -->|No| A
    F -->|Yes| G[Circuit Breaker OPEN]
    G --> H[Return Cached / Stale Data]
    G --> I[Alert Operations Team]
    
    G --> J{After Cooldown}
    J --> K[Circuit Breaker HALF-OPEN]
    K --> L{Test Request}
    L -->|Success| M[Circuit Breaker CLOSED]
    L -->|Failure| G
```
