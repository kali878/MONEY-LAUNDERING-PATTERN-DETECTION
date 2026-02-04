##Income vs Transactions (weight 0.30)

Count incoming credits > 2× monthly_salary_inr.
Score = 20 points per such credit, capped at 100.

##Transaction Structuring (weight 0.25)

Cash deposits into the person’s accounts with amount_inr between 40,000 and 49,999.
Score buckets: 0 (none), 15 (1–2), 40 (3–4), 70 (5–7), 100 (≥8).

##Shell Company Links (weight 0.25)

“Potential shells”: companies incorporated within last 365 days AND paid_up_capital_inr < 500,000.
Count transactions between person’s accounts and shell accounts.
Score buckets: 0 (none), 20 (1), 40 (2–4), 70 (5–9), 100 (≥10).

##High-Value Property (weight 0.15)

Ratio = total purchase_value_inr of owned properties ÷ (monthly_salary_inr × 12).
Score: 0 (ratio ≤ 5), 100 (ratio ≥ 50), else linearly scaled 5→50 with a minimum of 10.

##Tax Status Irregularities (weight 0.05)

Score: 80 if tax_filing_status == "Not Filed", else 0.
Final score = sum(component_score × weight). Alerts are created only if final_score > RISK_ALERT_THRESHOLD (env, default 10). Current SCORING_VERSION = 2.



###Title ANUP-SECURITY-PORTAL — Financial Risk Investigation and Triage Platform

ANUP-SECURITY-PORTAL helps analysts quickly identify, prioritize, and investigate risky entities using explainable rules and interactive graphs. It ingests synthetic datasets, computes risk scores, and streamlines Triage → Investigation → Reporting.

##Problem

High alert volumes overwhelm small teams.
Disconnected data sources hinder fast decisions.
Lack of explainability reduces trust in scoring.

##Solution

Unified workflow: Upload → Triage → Investigation → Reporting.
Explainable risk scoring with clear contributing factors.
Graph-based link analysis to uncover shell-like company ties and shared relationships.
Actionable reports and audit-ready artifacts.

##Core features

Data ingest: Upload CSV/ZIP (synthetic datasets) and auto-parse.
Triage queue: Sort by risk, filter, bulk actions, quick assignments.
Investigation workspace: Profile, timeline, graph view, notes, and attachments.
Explainable scoring: Per-signal contributions, thresholds, and reasoning.
Reporting: One-click summaries (PDF/JSON) with evidence links.
Authentication and roles: Basic auth now; SSO-ready design.
REST API: Clean endpoints consumed by the frontend.

##Risk scoring signals (explainable)

Income vs credits: Unusually large credits relative to stated income.
Structuring: Repeated cash deposits just below thresholds (e.g., 40k–50k INR).
Shell-like links: Transactions or shared ties with recently incorporated, low paid-up capital companies. Uses corporate registry fields like paid_up_capital_inr and incorporation_date (from Companies.csv).
Asset exposure: Property/value vs annual income ratios.
Compliance flags: Missing or irregular tax filing status. Each alert shows which signals fired and why.

##Data and privacy

Synthetic datasets only (safe for demos/tests).
Example file: Companies.csv with columns:
cin, company_name, registered_address, incorporation_date, company_status, paid_up_capital_inr
Additional synthetic files (transactions, persons, properties, etc.) can be added to broaden scenarios.

##Architecture

Frontend: React (mobile-ready) with a responsive UI and cached queries.
Backend: Flask REST API under /api for ingest, scoring, graph, and reporting.
Storage: CSV/ZIP for ingest; in-memory/filesystem for demo; pluggable DB/graph in future.
Integration: Designed to extend to Postgres/Neo4j and object storage when needed.

##Why “Triage”

Industry-standard first-pass review to prioritize, assign, or close alerts before deep investigation.



###Improvements 

##Data model and ingestion

Move from CSV files to Postgres with a normalized schema (persons, accounts, transactions, companies, directorships, properties).
Enforce constraints: PK/FK, UNIQUE(cin), NOT NULLs, CHECK(paid_up_capital_inr >= 0), enums for company_status, created_at/updated_at/audit columns.
Data quality gates (Great Expectations) on ingest: types, ranges, duplicates, referential integrity, no future dates unless explicitly allowed. Note: Companies.csv contains future incorporation_date (e.g., CIN00002 2025‑08‑31) — should be flagged/rejected in production.
Object storage for uploads (S3/Azure Blob) with pre‑signed URLs; store only metadata in DB.
Data catalog/lineage and PII tagging; retention policies.

##Backend API and services

Versioned REST (/api/v1) with OpenAPI spec; request/response validation; consistent error model.
Pagination, filtering, sorting; idempotency keys for uploads; rate limiting and quotas.
Background jobs (Celery/RQ + Redis) for ingest/scoring/report generation; job status APIs and retries with backoff.
Content scanning for uploads; strict MIME checks.

##AuthN/AuthZ and tenancy

OIDC/OAuth2 SSO (Azure AD/Auth0/Cognito); short‑lived JWTs with refresh.
RBAC/ABAC (viewer, analyst, approver, admin) enforced at API and UI.
Optional multi‑tenancy with org scoping; per‑tenant data isolation.

##Security and compliance

Secrets in a vault (AWS SM/GCP SM/Key Vault); no secrets in repo.
TLS everywhere; strict headers (CSP, HSTS, X‑Frame‑Options, Referrer‑Policy) and CORS allowlist.
Dependency/image scanning (pip‑audit, npm audit, Trivy) and SBOM generation; regular patching.
Encrypt at rest; audit logs for access and data changes; least‑privilege IAM.

##Observability and reliability

Structured JSON logs with correlation/request IDs; centralized logging.
Metrics and tracing via OpenTelemetry; dashboards and alerts (latency, error rate, saturation).
Health/readiness endpoints; timeouts, retries, circuit breakers; graceful shutdown.
SLOs with paging alerts; error budgets.

##Frontend readiness

TypeScript + strict mode; API client generated from OpenAPI.
TanStack Query for caching/retries; error boundaries; role‑based UI states; a11y checks.
Performance budgets, bundle analysis, code‑splitting; i18n and feature flags.

##Testing strategy

Backend: pytest unit + integration (Testcontainers for Postgres/Redis/Neo4j), contract tests vs OpenAPI, property‑based tests for scoring rules.
Frontend: RTL unit + Playwright E2E (auth, uploads, triage → investigation → reporting).
Non‑functional: load tests (k6/Locust), security tests (ZAP), chaos/latency injection in staging.
Stable synthetic fixtures + anonymized real samples for calibration.

##CI/CD and release engineering

GitHub Actions: lint/typecheck/test, security scans, build Docker images, SBOM, push to registry.
Environments: dev/staging/prod with smoke tests; canary/blue‑green deploys; rollback playbooks.
Dependabot/renovate; conventional commits; automated changelog and versioning.

##Infrastructure

Containerize services; Helm charts on Kubernetes with HPA/autoscaling and resource limits.
Terraform for cloud infra (VPC, DBs, buckets, secrets, WAF).
Backups, PITR, DR plans with defined RPO/RTO; regular restore drills.

##Graph and analytics (if using)

Formal graph schema with constraints and unique IDs; sync from Postgres; CDC/ETL jobs.
Identity resolution/dedup; feature store for scoring inputs with lineage.

##Risk scoring governance

Config‑driven rules with versioning (SCORING_VERSION), per‑signal explainability and weights.
Thresholds per segment; calibration against real data; drift monitoring and review cadence.

##Documentation and ops

OpenAPI docs published; ADRs for key decisions; runbooks and on‑call guides.
User/admin docs; data dictionary (e.g., Companies.csv columns and semantics).
Compliance roadmap (SOC 2/ISO 27001/GDPR) and DPIA where needed.


###More Questions

Data & Domain##
What is the source of your synthetic data? How was it generated?
How does your data model map to real-world scenarios?
How do you handle data quality issues (e.g., duplicates, missing values, future dates)?
How would you adapt your solution for real, sensitive data?

##Risk Scoring & Explainability
What are the main criteria for risk scoring? How are weights assigned?
How do you ensure the scoring is explainable and auditable?
How would you calibrate or validate your scoring model with real data?

##Workflow & Features
What is the purpose of the Triage module? How does it improve analyst efficiency?
How does the Investigation module work? What insights does the graph view provide?
Can users add notes, tags, or attachments? How are these stored?
Security & Privacy
How do you protect sensitive information?
What authentication and authorization mechanisms are in place?
How do you handle secrets and configuration securely?

##Architecture & Scalability
How does your system scale with large datasets or many users?
What are the main components and how do they interact?
How would you deploy this in production (cloud/on-prem, containers, etc.)?

##API & Integration
Is your API documented (OpenAPI/Swagger)? How can other systems integrate?
How do you handle versioning and backward compatibility?

##Testing & Reliability
What testing strategies are in place (unit, integration, E2E)?
How do you monitor and log system health and errors?

##Improvements & Roadmap
What are the next steps to make this enterprise/industry ready?
What are the limitations of your current approach?
How would you support multi-tenancy or role-based access?

##Demo & Usability
Can you show a typical user flow from upload to report?
How is the UI optimized for mobile and accessibility?
What feedback have you received from users/testers?

##Compliance & Audit
How do you ensure compliance with data protection regulations (GDPR, etc.)?
Is there an audit trail for actions and data changes?



###Isolated Forest

We use Isolation Forest because it is an effective, unsupervised machine learning algorithm for anomaly detection in tabular financial data.

##Why Isolation Forest?

Detects outliers: It identifies rare, suspicious patterns (e.g., unusual transaction amounts, structuring, layering) without needing labeled fraud data.
Scales well: It works efficiently on large datasets, making it suitable for batch scoring in financial systems.
Feature-agnostic: It can handle mixed features (amounts, counts, ratios) and is robust to irrelevant variables.
Explainability: It provides anomaly scores for each entity, which can be surfaced in triage and investigation modules.

##In this project:

Isolation Forest helps flag accounts, transactions, or entities that deviate from normal behavior, supporting risk scoring and alert generation—especially when synthetic data lacks real fraud labels.



###Fallback Analysis 

##Graph Analysis Fallback:

If Neo4j (the graph database) is unavailable, the frontend uses in-memory JSON data and a React 2D graph library to render entity relationships. This ensures the investigation workspace remains functional for demos and offline use.

##Synthetic Data Fallback:

The system uses synthetic datasets for development and demo purposes. If real data is unavailable or restricted, the platform can operate fully with generated data.

##API Fallbacks:

For certain API calls, if a backend service or external API is down, the frontend can display cached or last-known results, or switch to offline mode for basic analysis.

##Background Job Fallback:

If Celery or Redis is not running, long-running tasks (like report generation or bulk scoring) can be queued for later or processed synchronously in demo mode.

##Configurable Modes:

The application supports configuration flags (e.g., demo mode, offline mode) to gracefully degrade features and avoid hard failures.



###Benefits

##1. Financial Crime Prevention:
Helps banks, regulators, and investigators detect suspicious patterns (structuring, layering, mule accounts) early, reducing fraud, money laundering, and financial abuse.

##2. Protects Individuals:
By identifying risky entities and transactions, it safeguards ordinary people from being unknowingly involved in financial crime or scams.

##3. Promotes Transparency:
Explainable risk scoring and visual graph analysis make decisions clear and auditable, building trust in financial systems.

##4. Supports Law Enforcement:
Provides actionable insights and evidence for investigations, making it easier to trace illicit funds and prosecute offenders.

##5. Education and Awareness:
Synthetic datasets and demo tools help train analysts and educate the public about financial risks and red flags.

##6. Scalable Impact:
Automated triage and investigation workflows enable small teams to handle large volumes of alerts, improving efficiency and coverage.

##7. Privacy and Safety:
Uses synthetic data for demos and development, ensuring privacy and compliance while enabling innovation.