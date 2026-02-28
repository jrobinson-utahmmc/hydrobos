# 13 – Widget & Dashboard API Specification

> HydroBOS standardized REST API for dashboards, widgets, data sources, and the
> widget builder tool.

---

## 1  Overview

The Widget Service exposes a RESTful API at **`/api/widgets`** and
**`/api/dashboards`** (proxied through the API Gateway on port **5000**).
It owns:

| Resource            | Description                                         |
| ------------------- | --------------------------------------------------- |
| **Dashboards**      | Named grid layouts that hold widgets                |
| **Widgets**         | Individual visualisation / data components           |
| **Widget Templates**| Pre-built, reusable widget configurations            |
| **Data Proxy**      | Server-side proxy for 3rd-party API calls (no CORS) |

All endpoints require a valid JWT (cookie or `Authorization: Bearer <token>`).

---

## 2  Base URLs

| Environment | Gateway URL                |
| ----------- | -------------------------- |
| Development | `http://localhost:5000/api` |
| Production  | `https://<domain>/api`     |

---

## 3  Authentication

Every request must carry the JWT issued by the Identity Service.

```
Cookie: token=<jwt>
   — or —
Authorization: Bearer <jwt>
```

The Gateway forwards the cookie/header to the Widget Service, which validates
it locally using the shared `JWT_SECRET`.

---

## 4  Dashboards

### 4.1  List dashboards

```
GET /api/dashboards
```

Returns dashboards owned by the caller **plus** dashboards shared with them and
templates.

**Response** `200`

```json
{
  "data": [
    {
      "_id": "665a…",
      "name": "IT Operations",
      "description": "Core infrastructure overview",
      "icon": "server",
      "isDefault": true,
      "isTemplate": false,
      "columns": 12,
      "createdBy": "664f…",
      "sharedWith": [],
      "tags": ["infrastructure"],
      "createdAt": "2024-06-01T…",
      "updatedAt": "2024-06-01T…"
    }
  ]
}
```

### 4.2  Create dashboard

```
POST /api/dashboards
Content-Type: application/json

{
  "name": "Security Center",
  "description": "Security monitoring and alerts",
  "icon": "shield",
  "columns": 12,
  "isTemplate": false
}
```

**Response** `201`

### 4.3  Get dashboard (with widgets)

```
GET /api/dashboards/:id
```

Returns the dashboard **plus** an embedded `widgets[]` array.

### 4.4  Update dashboard

```
PATCH /api/dashboards/:id
Content-Type: application/json

{
  "name": "New Name",
  "sharedWith": ["<userId>", "admin"],
  "tags": ["security", "soc"],
  "isDefault": true
}
```

Setting `isDefault: true` clears the flag on all other dashboards for the user.

### 4.5  Delete dashboard

```
DELETE /api/dashboards/:id
```

Cascade-deletes all widgets belonging to the dashboard.

---

## 5  Widgets

### 5.1  Create widget

```
POST /api/widgets
Content-Type: application/json

{
  "dashboardId": "665a…",
  "type": "bar-chart",
  "config": {
    "title": "Monthly Revenue",
    "subtitle": "Last 12 months",
    "icon": "bar-chart-2",
    "color": "#3b82f6",
    "showHeader": true,
    "refreshable": true
  },
  "dataSource": {
    "type": "external-api",
    "url": "https://api.example.com/revenue",
    "method": "GET",
    "refreshInterval": 60,
    "authentication": {
      "type": "bearer",
      "config": { "token": "sk_live_…" }
    }
  },
  "position": { "x": 0, "y": 0, "w": 6, "h": 4 },
  "chartConfig": {
    "xAxis": "month",
    "yAxis": "revenue",
    "showLegend": true,
    "showGrid": true
  }
}
```

### 5.2  Widget types

| Type           | Description                                |
| -------------- | ------------------------------------------ |
| `kpi`          | Single value + trend                       |
| `line-chart`   | Time-series line chart                     |
| `bar-chart`    | Categorical bar chart                      |
| `area-chart`   | Filled area chart                          |
| `donut-chart`  | Proportional donut / pie                   |
| `table`        | Sortable / filterable data table           |
| `status-grid`  | Grid of status indicators                  |
| `alert-feed`   | Real-time alert stream                     |
| `text`         | Static text / Markdown                     |
| `iframe`       | Embedded external page                     |
| `image`        | Static image / graphic                     |
| `custom`       | Custom configuration (free-form)           |

### 5.3  Data source types

| Type             | Description                                   |
| ---------------- | --------------------------------------------- |
| `static`         | Data embedded in the widget config (JSON)      |
| `api`            | Internal HydroBOS API endpoint                 |
| `external-api`   | Third-party REST API (proxied server-side)     |
| `connector`      | Pre-configured data connector (future)         |
| `websocket`      | WebSocket data stream (future)                 |
| `graphql`        | GraphQL endpoint (future)                      |

### 5.4  Authentication types (for external data sources)

| Type       | Config keys                                        |
| ---------- | -------------------------------------------------- |
| `none`     | —                                                  |
| `bearer`   | `token`                                            |
| `api-key`  | `headerName`, `apiKey`                             |
| `basic`    | `username`, `password`                             |
| `oauth2`   | `clientId`, `clientSecret`, `tokenUrl` (future)    |

### 5.5  Get widget

```
GET /api/widgets/:id
```

### 5.6  Update widget

```
PATCH /api/widgets/:id
```

Accepts any combination of `config`, `dataSource`, `position`, `chartConfig`,
`tableConfig`, `kpiConfig`, `customConfig`.

### 5.7  Quick position update (drag-and-drop)

```
PATCH /api/widgets/:id/position
Content-Type: application/json

{ "x": 4, "y": 0, "w": 4, "h": 3 }
```

### 5.8  Delete widget

```
DELETE /api/widgets/:id
```

---

## 6  Widget Templates

```
GET /api/widgets/templates
```

Returns all pre-built templates grouped by `category`. Templates contain
default `config`, `dataSource`, and type-specific configuration objects that
serve as starting points in the Widget Builder.

**Categories:** `analytics`, `monitoring`, `data`, `security`, `network`, `custom`.

---

## 7  Data Proxy

The data proxy lets widgets fetch external data server-side, avoiding CORS
issues and keeping API keys off the client.

```
POST /api/widgets/data-proxy
Content-Type: application/json

{
  "url": "https://api.openweathermap.org/data/2.5/weather?q=London",
  "method": "GET",
  "headers": { "Accept": "application/json" },
  "authentication": {
    "type": "api-key",
    "config": { "headerName": "X-API-Key", "apiKey": "abc123" }
  }
}
```

**Response** `200`

```json
{
  "data": { /* upstream response body */ },
  "status": 200
}
```

---

## 8  Grid Layout System

Dashboards use a 12-column responsive grid. Each widget's `position` object
defines its placement:

| Field | Description                         | Default |
| ----- | ----------------------------------- | ------- |
| `x`   | Column offset (0-11)               | 0       |
| `y`   | Row offset (auto-flow)             | 0       |
| `w`   | Width in columns (1-12)            | 4       |
| `h`   | Height in rows                      | 3       |
| `minW` | Minimum width (prevents resizing)  | —       |
| `minH` | Minimum height                     | —       |

The frontend uses a react-grid-layout compatible coordinate system.

---

## 9  Standard Responses

### Success

```json
{
  "data": { /* resource */ },
  "message": "Optional success message"
}
```

### Paginated

```json
{
  "data": [ /* items */ ],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

### Error

```json
{
  "error": "Human-readable error message"
}
```

HTTP status codes follow RFC 7231: `200`, `201`, `400`, `401`, `403`, `404`,
`500`, `502` (for data proxy failures).

---

## 10  Future Enhancements

- **Connectors** — pre-configured data connectors for SaaS tools (Jira,
  ServiceNow, PagerDuty, Datadog, Azure Monitor)
- **WebSocket feeds** — live data streaming for real-time dashboards
- **Dashboard versioning** — snapshot and restore layouts
- **Role-based widget visibility** — restrict widgets by user role
- **Widget marketplace** — community-contributed templates
