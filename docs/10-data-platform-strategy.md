# 10 — Data Platform Strategy

## Evolution from Product DB to Lakehouse

HydroBOS's data architecture is designed to **grow with the organization** — starting simple with a single document database and evolving into a full data lakehouse for advanced analytics and machine learning.

```mermaid
graph LR
    subgraph "Stage 1: MVP"
        MDB1[(MongoDB<br/>All Data)]
    end

    subgraph "Stage 2: Specialization"
        MDB2[(MongoDB<br/>Config & Core)]
        TSDB[(Time-Series DB<br/>Metrics & Logs)]
        RDB[(PostgreSQL<br/>Structured Biz Data)]
        OBJ[(Object Storage<br/>Archive)]
    end

    subgraph "Stage 3: Lakehouse"
        LAKE[(Data Lake<br/>ADLS / S3)]
        SPARK[Spark / Synapse<br/>Processing]
        SQL[SQL Engine<br/>Athena / Synapse SQL]
        ML[ML Models]
        API[Analytics API]
    end

    MDB1 -->|"Growth"| MDB2
    MDB1 -->|"Growth"| TSDB
    MDB1 -->|"Growth"| RDB
    MDB2 -->|"Archive"| OBJ

    OBJ -->|"Evolution"| LAKE
    TSDB -->|"Feed"| LAKE
    RDB -->|"Feed"| LAKE
    LAKE --> SPARK
    LAKE --> SQL
    SPARK --> ML
    SQL --> API
    ML --> API
```

---

## Stage 1: MVP (Months 0–9)

**Database:** MongoDB (single cluster)

**What's Stored:**
| Collection | Data | Purpose |
|-----------|------|---------|
| `users` | User profiles, role assignments | Identity & access |
| `tenants` | Tenant configurations, subscription info | Multi-tenancy |
| `dashboards` | Widget layouts, user preferences | UI personalization |
| `connectors` | Connector configs, credentials (encrypted) | Integration management |
| `connector_data` | Recent data pulled from third-party APIs | Real-time display |
| `audit_logs` | Security and admin action logs | Compliance |
| `events` | Recent events from connectors | Alert processing |

**Design Decisions:**
- MongoDB's flexible schema accommodates rapid iteration during MVP
- Document model naturally fits configuration data and connector payloads
- Single cluster keeps operational complexity low
- Per-tenant data isolation via `tenantId` field on every document
- Indexes on `tenantId` + relevant query fields for performance

**Multi-Tenant Data Pattern:**
```json
{
  "_id": "ObjectId",
  "tenantId": "tenant-abc-123",
  "entityType": "job",
  "sourceConnector": "servicefusion",
  "data": {
    "jobId": "SF-4521",
    "customer": "Acme Corp",
    "status": "in_progress",
    "scheduledDate": "2026-03-15"
  },
  "syncedAt": "2026-02-28T10:00:00Z"
}
```

---

## Stage 2: Specialization (Months 9–15)

As data volume increases, introduce **purpose-built stores** alongside MongoDB.

```mermaid
graph TB
    subgraph "Data Sources"
        CON[Connectors]
        SVC[Platform Services]
        EDGE[Edge Agents]
    end

    subgraph "Hot Path (Real-Time)"
        MDB[(MongoDB<br/>Config, Users, Recent Data)]
        REDIS[(Redis<br/>Cache, Sessions)]
    end

    subgraph "Warm Path (Analytics)"
        TSDB[(InfluxDB / TimescaleDB<br/>Metrics, Performance Data)]
        PG[(PostgreSQL<br/>Structured Business Data)]
    end

    subgraph "Cold Path (Archive)"
        OBJ[(Object Storage<br/>S3 / ADLS Blob)]
    end

    CON --> MDB
    CON --> TSDB
    SVC --> MDB
    SVC --> PG
    EDGE --> TSDB
    
    MDB -->|"Aging data"| OBJ
    TSDB -->|"Downsampled"| OBJ
    
    MDB --- REDIS
```

### Store Responsibilities

| Store | Type | Data | Query Pattern |
|-------|------|------|--------------|
| **MongoDB** | Document | Users, tenants, dashboards, connector configs, recent connector data | Key-value lookups, flexible queries |
| **Redis** | Cache | Sessions, API response cache, rate limit counters | Sub-millisecond reads |
| **InfluxDB / TimescaleDB** | Time-Series | Network throughput, CPU/memory metrics, connector poll data, event counts | Time-range aggregations |
| **PostgreSQL** | Relational | Structured business data (jobs, invoices, customers), reporting tables | Complex joins, aggregations |
| **Object Storage** | Blob | Archived logs, old connector data, NVR clips, backup snapshots | Batch reads, compliance retrieval |

### Data Retention Policy

| Data Type | Hot (Online) | Warm (Queryable) | Cold (Archive) |
|-----------|:----:|:----:|:----:|
| Audit Logs | 30 days | 1 year | 7 years |
| Connector Data | 7 days | 90 days | 1 year |
| Metrics/Time-Series | 24 hours (full res) | 90 days (downsampled) | 1 year (aggregated) |
| NVR Events | 7 days | 30 days | 90 days |
| User/Config Data | Always | — | Retained until deleted |

---

## Stage 3: Lakehouse Architecture (Month 16+)

For long-term scalability and advanced analytics, create a **data lakehouse** that combines the best of data lakes (cheap storage, schema flexibility) and data warehouses (structured queries, performance).

```mermaid
graph TB
    subgraph "Ingestion Layer"
        KAFKA[Kafka / Event Hubs<br/>Streaming Ingestion]
        BATCH[Batch Pipelines<br/>Scheduled ETL]
        RT[Real-Time Connectors]
    end

    subgraph "Storage Layer"
        LAKE[(Data Lake<br/>ADLS Gen2 / S3<br/>Parquet + Delta Lake)]
    end

    subgraph "Processing Layer"
        SPARK[Apache Spark /<br/>Azure Synapse Spark]
        STREAM[Stream Processing<br/>Kafka Streams / Flink]
    end

    subgraph "Serving Layer"
        SQL[Synapse SQL /<br/>AWS Athena]
        CACHE2[(Redis / Materialized Views)]
        AAPI[Analytics API]
    end

    subgraph "Consumption Layer"
        BI[BI Dashboards<br/>HydroBOS Analytics Module]
        REP[Reports & Exports]
        ML[ML Models<br/>Predictions & Anomaly Detection]
    end

    RT --> KAFKA
    BATCH --> LAKE
    KAFKA --> STREAM
    STREAM --> LAKE
    LAKE --> SPARK
    SPARK --> LAKE
    LAKE --> SQL
    SQL --> CACHE2
    CACHE2 --> AAPI
    AAPI --> BI
    AAPI --> REP
    SPARK --> ML
    ML --> AAPI
```

### Lakehouse Design Principles

1. **Multi-Tenant Isolation in the Lake**
   - Data partitioned by `tenant_id` at the storage level
   - Access policies enforce tenant-scoped queries
   - Encryption keys per tenant for sensitive data

2. **Schema Evolution**
   - Use Delta Lake or Apache Iceberg for ACID transactions on the lake
   - Support schema evolution without breaking existing queries
   - Maintain metadata catalog for data lineage

3. **Zone Architecture**
   ```
   data-lake/
   ├── raw/                    # Raw data as ingested (immutable)
   │   ├── tenant-abc/
   │   │   ├── servicefusion/
   │   │   ├── unifi/
   │   │   └── entra-id/
   │   └── tenant-xyz/
   ├── curated/                # Cleaned, transformed, canonical format
   │   ├── tenant-abc/
   │   │   ├── users/
   │   │   ├── devices/
   │   │   ├── metrics/
   │   │   └── events/
   │   └── tenant-xyz/
   └── aggregated/             # Pre-computed aggregations for dashboards
       ├── tenant-abc/
       │   ├── daily-kpis/
       │   ├── weekly-trends/
       │   └── monthly-reports/
       └── tenant-xyz/
   ```

4. **Cross-Domain Analytics**
   Once data from all connectors lives in a unified curated zone, analysts can run cross-domain queries:
   - Correlate network incidents with CRM job delays
   - Predict equipment failures from trending metrics
   - Identify SEO performance impact from infrastructure outages
   - Build security risk scores from combined digital + physical signals

### Technology Options

| Component | Azure Stack | AWS Stack |
|-----------|------------|-----------|
| **Object Storage** | ADLS Gen2 | S3 |
| **Streaming Ingestion** | Azure Event Hubs | Amazon Kinesis |
| **Stream Processing** | Azure Stream Analytics | Kinesis Data Analytics / Flink |
| **Batch Processing** | Azure Synapse Spark | AWS Glue / EMR |
| **SQL Engine** | Synapse Serverless SQL | Athena |
| **Table Format** | Delta Lake | Delta Lake / Iceberg |
| **ML Platform** | Azure ML | SageMaker |
| **Metadata Catalog** | Azure Purview | AWS Glue Data Catalog |

---

## Data Flow Summary

```mermaid
flowchart TD
    subgraph "Sources"
        S1[Entra ID]
        S2[ServiceFusion]
        S3[UniFi]
        S4[pfSense]
        S5[Frigate NVR]
        S6[Google APIs]
        S7[Cloud Platforms]
    end

    subgraph "Ingestion"
        CON[Connector Services]
        EB[Event Bus]
    end

    subgraph "Operational Store"
        MDB[(MongoDB)]
        REDIS[(Redis)]
    end

    subgraph "Analytical Store"
        TSDB[(Time-Series DB)]
        LAKE[(Data Lakehouse)]
    end

    subgraph "Serving"
        API[REST APIs]
        WS[WebSocket]
        AAPI[Analytics API]
    end

    S1 --> CON
    S2 --> CON
    S3 --> CON
    S4 --> CON
    S5 --> CON
    S6 --> CON
    S7 --> CON

    CON --> MDB
    CON --> EB
    EB --> TSDB
    EB --> LAKE

    MDB --> API
    REDIS --> API
    MDB --> WS
    TSDB --> AAPI
    LAKE --> AAPI

    API --> FE[Frontend]
    WS --> FE
    AAPI --> FE
```
