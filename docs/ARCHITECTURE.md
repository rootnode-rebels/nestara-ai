# System Architecture — Nestara AI

**Date:** October 22, 2026  
**Auditor / Architect:** Senior Software Architect  
**Scope:** Current As-Audited Architecture and Target Production Architecture for Nestara AI.

---

## 1. Architectural Philosophy & Strategy

Nestara AI builds upon the rock-solid foundation of **OpenProperty**:
1. **Edge-First Serverless Backend:** Cloudflare Workers running Hono delivers sub-50ms cold starts globally with zero DevOps maintenance.
2. **Embedded Relational Store:** Cloudflare D1 provides full relational ACID guarantees and standard SQLite syntax without managing a dedicated database cluster.
3. **Modern Unified Frontend:** React 19 with Vite and Tailwind CSS v4 delivers rapid iteration, type safety, and responsive design across desktop and mobile.
4. **Intelligent Edge AI:** Rather than maintaining cumbersome Python microservices with heavy PyTorch/CUDA containers, Nestara AI integrates AI capabilities via direct, streaming API calls to Google Gemini models from Cloudflare Workers.

---

## 2. Current Architecture (As-Audited Baseline)

The current baseline is completely functional for a single back-office landlord user.

### 2.1 Current Architecture Diagram

```mermaid
flowchart TD
    subgraph Browser ["Client Application (React 19 + Vite)"]
        UI["React Single Page App"]
        Nav["<AppNav> Sidebar"]
        Pages["Dashboard | Properties | Tenants | Leases | Rent | Maintenance | Settings"]
        Router["pushState URL Router (use-router.ts)"]
        Context["React State Provider (AppContext)"]
        ApiClient["Fetch API Client (api.ts)"]
        
        UI --> Nav
        UI --> Pages
        Pages --> Context
        Context --> Router
        Context --> ApiClient
    end

    subgraph Edge ["Server Runtime (Cloudflare Workers + Hono)"]
        Worker["Hono Server (src/server/index.ts)"]
        Cors["CORS & JSON Middleware"]
        Seed["ensureSeeded() Bootstrapper"]
        Routes["43 REST Endpoints (/api/*)"]
        DbAdapter["D1 Adapter (src/server/db.ts)"]
        
        Worker --> Cors
        Cors --> Seed
        Seed --> Routes
        Routes --> DbAdapter
    end

    subgraph Storage ["Cloudflare D1 (Local SQLite)"]
        D1["D1 Database (open-property-db)"]
        Tables["11 Tables: properties, units, tenants, leases, rent_charges, payments, vendors, work_orders, applications, settings, lease_tenants"]
        D1 --- Tables
    end

    ApiClient -->|"HTTP / REST (port 8787 in dev)"| Worker
    DbAdapter -->|"Prepared Statements SQL"| D1
```

### 2.2 Current Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    PROPERTIES ||--o{ UNITS : "contains"
    PROPERTIES {
        int id PK
        string name
        string type
        string address
        string city
        string state
        string zip
        string color
    }
    UNITS ||--o{ LEASES : "leased in"
    UNITS {
        int id PK
        int property_id FK
        string name
        real bedrooms
        real bathrooms
        int sqft
        real market_rent
        string status
    }
    TENANTS ||--o{ LEASES : "primary tenant"
    TENANTS ||--o{ LEASE_TENANTS : "occupant"
    TENANTS {
        int id PK
        string first_name
        string last_name
        string email
        string phone
        real monthly_income
    }
    LEASES ||--o{ LEASE_TENANTS : "has occupants"
    LEASES ||--o{ RENT_CHARGES : "generates"
    LEASES {
        int id PK
        int unit_id FK
        int primary_tenant_id FK
        string start_date
        string end_date
        real monthly_rent
        real deposit
        int rent_due_day
        string status
    }
    RENT_CHARGES ||--o{ PAYMENTS : "paid by"
    RENT_CHARGES {
        int id PK
        int lease_id FK
        string period
        string due_date
        real amount
        real amount_paid
        string status
    }
    PAYMENTS {
        int id PK
        int charge_id FK
        string paid_at
        real amount
        string method
        string reference
    }
    PROPERTIES ||--o{ WORK_ORDERS : "occurs at"
    UNITS ||--o{ WORK_ORDERS : "occurs in"
    VENDORS ||--o{ WORK_ORDERS : "assigned to"
    WORK_ORDERS {
        int id PK
        int property_id FK
        int unit_id FK
        int vendor_id FK
        string title
        string priority
        string status
        real cost
    }
    VENDORS {
        int id PK
        string name
        string category
        string phone
        string email
    }
    SETTINGS {
        string key PK
        string value
    }
    APPLICATIONS {
        int id PK
        int unit_id FK
        string first_name
        string last_name
        string status
    }
```

### 2.3 Limitations of Current Baseline
1. **No Authentication or Access Control:** Any client with HTTP access can query or mutate all endpoints.
2. **Single Audience (Landlord Back-Office Only):** Prospective renters cannot browse listings; current tenants cannot view their ledger or submit repair requests online.
3. **No AI Capabilities:** No conversational assistance, no recommendation engine, no image triage.
4. **No Public Storage for Media:** Properties and work orders cannot store or display photographic attachments.

---

## 3. Target Production Architecture (Nestara AI)

The planned architecture extends the core into a dual-portal platform (Public Tenant Portal + Landlord Management Workspace) with an intelligent AI copilot layer.

### 3.1 Target Architecture Diagram

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Layer (React 19 + Tailwind v4)"]
        direction TB
        subgraph PublicFacing ["Public Portal & Renter Experience"]
            P_Home["Landing Page & Showcase"]
            P_Search["Explore Listings & Filters"]
            P_Detail["Listing Detail & Virtual Tour"]
            P_AI["AI Recommendation Chatbot"]
            P_Apply["Online Rental Application"]
        end
        subgraph AuthenticatedPortal ["Role-Based Portals"]
            T_Portal["Tenant Portal (Lease, Rent, Maintenance)"]
            L_Portal["Landlord / Operations Workspace"]
            A_Portal["Admin / System Settings"]
        end
    end

    subgraph GatewayLayer ["Edge API Gateway (Cloudflare Workers + Hono)"]
        direction TB
        AuthMid["Auth Middleware (JWT + WebCrypto)"]
        RateLimit["Rate Limiter & Security Headers"]
        
        subgraph CoreAPIs ["Core Business APIs"]
            API_Prop["Properties & Units API"]
            API_Rent["Rent Ledger & Charges API"]
            API_Maint["Work Orders & Tickets API"]
            API_Users["Auth & Users API"]
        end
        
        subgraph AI_Engine ["Nestara AI Engine"]
            AI_Rec["Property Matcher & Explainer"]
            AI_Vision["Maintenance Image Triage"]
            AI_Lease["Lease Clause RAG Copilot"]
        end
    end

    subgraph DataLayer ["Data & Storage Layer"]
        D1_DB[("Cloudflare D1 Database\n(Core Entities + Auth + AI Logs)")]
        R2_Store[("Cloudflare R2 Bucket\n(Photos, PDF Leases, Invoices)")]
    end

    subgraph ExternalServices ["External Intelligence & Services"]
        Gemini["Google Gemini 2.0 Flash API"]
        Email["Transactional Mail (Resend API)"]
        PaymentGateway["Payment Gateway (Stripe/PayPal)"]
    end

    ClientLayer -->|"Secure HTTPS (JWT Bearer)"| GatewayLayer
    GatewayLayer --> AuthMid
    AuthMid --> CoreAPIs
    AuthMid --> AI_Engine
    
    CoreAPIs --> D1_DB
    CoreAPIs --> R2_Store
    CoreAPIs --> Email
    CoreAPIs --> PaymentGateway
    
    AI_Engine --> D1_DB
    AI_Engine --> Gemini
```

### 3.2 AI Recommendation & Search Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Prospective Tenant
    participant UI as Search & Copilot UI
    participant Hono as Hono API Gateway
    participant D1 as Cloudflare D1 Store
    participant Gemini as Google Gemini API

    User->>UI: Types: "2-bed in Austin near transit under $2000"
    UI->>Hono: POST /api/ai/recommend { prompt, preferences }
    Hono->>D1: Query vacant units + property metadata
    D1-->>Hono: Return matching candidate records
    Hono->>Gemini: Send prompt with candidate units JSON schema
    Note over Hono,Gemini: System prompt enforces structured JSON output with match scores and explanations
    Gemini-->>Hono: Return ranked recommendations with explanations
    Hono-->>UI: Deliver structured recommendations
    UI-->>User: Render ranked property cards with "Why this matches" badges
```

### 3.3 Maintenance Image Triage Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor Tenant as Tenant
    participant Portal as Tenant Portal
    participant API as Hono API Gateway
    participant Gemini as Google Gemini Vision
    participant D1 as D1 Database
    participant Landlord as Landlord Dashboard

    Tenant->>Portal: Uploads photo of bursting pipe under sink
    Portal->>API: POST /api/maintenance/triage (multipart/form-data)
    API->>Gemini: Multimodal prompt: "Analyze damage, severity, category, suggested repair"
    Gemini-->>API: { category: "plumbing", priority: "urgent", summary: "Active water pipe rupture" }
    API->>D1: INSERT INTO work_orders (status='open', priority='urgent', ...)
    D1-->>API: work_order_id: 104
    API-->>Landlord: Real-time alert: Urgent Plumbing Work Order Created
    API-->>Portal: Confirmation & ticket number
```

---

## 4. Integration Boundaries & Isolation Directives

To maintain complete stability and clean architectural boundaries:
1. **Primary App Isolation:** `OpenProperty/` is the sole production runtime and Git repository. No code from external reference repositories may be imported directly via `package.json` references.
2. **Schema Migration Discipline:** All future D1 schema modifications must append backwards-compatible DDL migrations in `src/server/schema.sql`.
3. **Authentication Boundary:** Public endpoints (`/api/public/*`, `/api/auth/*`) will be separated from protected manager endpoints (`/api/admin/*`, `/api/properties/*`) using explicit Hono route groups (`const privateApi = new Hono()`).
4. **AI Graceful Degradation:** All AI endpoints must catch external LLM timeout or quota errors and fall back gracefully to deterministic database search and default normal ticket prioritization.
