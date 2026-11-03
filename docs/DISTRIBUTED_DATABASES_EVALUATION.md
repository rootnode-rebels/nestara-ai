# Distributed Databases Evaluation for Nestara AI

| Database | Type | Consistency Model | Primary Use Case | Fit for Nestara AI |
|---|---|---|---|---|
| **Google Cloud Spanner** | Relational / NewSQL | Strong Consistency | Global financial systems, supply chain tracking | Global multi-region scaling for enterprise portfolios requiring 99.999% SLA and synchronous cross-continent replication without split-brain risk. |
| **CockroachDB** | Relational / NewSQL | Strong Consistency | Multi-region enterprise applications, e-commerce | **Primary Operational Database:** PostgreSQL wire-compatible drop-in with Multi-Raft consensus. Handles leases, rent ledgers, deposits, and RBAC with zero code changes. |
| **Apache Cassandra** | NoSQL (Wide-column) | Eventual Consistency | High-velocity IoT data, logging, analytics | Smart building IoT telemetry: High-velocity power backup monitoring, smart water meters, and sensor event streaming. |
| **Amazon DynamoDB** | NoSQL (Key-Value/Doc) | Configurable (Strong/Eventual) | High-scale web applications, gaming leaderboards | High-throughput subsystems: Write-heavy DPDP/GDPR audit trails (`audit_logs`), session revocation tokens, and smart-lock events. |
| **MongoDB** | NoSQL (Document) | Configurable (Strong/Eventual) | Content management, personalization engines | Document forensics and metadata: Unstructured PDF metadata, forensic parser outputs, Aadhaar/PAN JSON extraction blobs, and dynamic custom lease clauses. |

