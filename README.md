# PROJECT--->>> ANUP SECURITY PORTAL               

<p align="center">
  <img src="!(image-1.png)" alt="Money Laundering Pattern Detection" width="800">
</p>

An AI‑powered financial intelligence platform for detecting and investigating suspicious activity across accounts, persons, and companies.

[![License](https://img.shields.io/badge/license-OCT-yellow.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.10%2B-yellow.svg)](https://python.org)
[![React](https://img.shields.io/badge/react-18.2%2B-yellow.svg)](https://reactjs.org)
[![Neo4j (optional)](https://img.shields.io/badge/neo4j-optional-maroon.svg)](https://neo4j.com)
[![Deploy with Vercel](https://vercel.com/button)](https://anup-security-portal.vercel.app/)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://money-laundering-pattern-detection.onrender.com)

</div>


## Overview

Project anup-security-portal provides a unified workflow for ingesting datasets (CSV/ZIP), calculating hybrid risk scores, inspecting networks, and generating AI‑assisted PDF reports. It ships with synthetic datasets and lets investigators upload data from the UI.

Highlights:
- Hybrid risk scoring (rules) with a CSV pipeline; AlertScores.csv is the canonical output.
- Upload your own CSVs or a ZIP of CSVs from Settings; schema validation and re‑analysis run automatically.
- Graph view uses Neo4j when available; otherwise, a small network is synthesized from CSVs.
- PDF report generation; the endpoint accepts either a person_id or a case_id.
- Optional AI summary via Google Gemini with a deterministic local fallback.
- Authentication is token‑based; mock tokens are supported for local/demo.

## Architecture


```mermaid
flowchart LR
  %% Client Layer
  subgraph Client
    U[User]
    FE[Frontend - React + Vite]
  end

  %% Backend API and Services
  subgraph Backend
    API[REST API]
    RS[risk_scoring.py]
    RG[report_generator.py]
    GA[graph_analysis.py]
    CM[case_manager.py]
    AS[ai_summarizer.py]
  end

  %% Data Sources
  subgraph Data Sources
    CSV[CSV files<br/>backend/generated-data]
    NEO[Neo4j optional]
    FS[Firestore optional]
  end

  %% Client -> API
  U -->|actions| FE
  FE -->|Fetch JSON or PDF| API
  FE -->|Upload ZIP or CSV| API

  %% API -> Services
  API --> RS
  API --> RG
  API --> GA
  API --> CM
  API --> AS

  %% Services <-> Data
  RS --> CSV
  GA --> NEO
  CM --> FS
  RS -->|AlertScores.csv| CSV

  %% Responses
  RG -->|PDF| FE
  API -->|JSON| FE
```

## Connection Flow

```mermaid
sequenceDiagram
    participant User
    participant FE as Frontend (React)
    participant API as Flask API (/api)
    participant Risk as Risk Scoring
    participant Graph as Graph Analysis
    participant Report as Report Generator
    participant Store as Firestore (optional)
    participant Neo4j as Neo4j (optional)
    participant CSV as CSV Data

    User->>FE: Open app / Login
    FE->>API: GET /alerts (Bearer token)
    API->>Risk: Load scores
    Risk->>CSV: Read AlertScores.csv
    API-->>FE: Alerts JSON

    User->>FE: Upload dataset (CSV/ZIP)
    FE->>API: POST /datasets/upload
    API->>CSV: Replace files
    API->>Risk: Re-run analysis
    API-->>FE: Upload OK

    User->>FE: Create case
    FE->>API: POST /cases
    API->>Store: Create/Update case (if configured)
    API-->>FE: Case created (caseId)

    User->>FE: Investigate person/case
    FE->>API: GET /graph/:personId
    API->>Graph: Build graph
    Graph->>Neo4j: Query (if available)
    Graph->>CSV: Synthesize fallback
    API-->>FE: Graph JSON

    User->>FE: Generate report
    FE->>API: GET /report/:id
    API->>Report: Compile PDF
    Report->>Risk: Pull scores
    Report->>CSV: Fetch details
    API-->>FE: PDF (blob)

    FE-->>User: Render views / Download report
```

## Detailed Application Flow

```mermaid
flowchart TD
    Start([User opens app]) --> AuthCheck[Auth check via AuthProvider]
    AuthCheck -->|Authenticated| GoDashboard[Route to /dashboard]
    AuthCheck -->|No auth| GoLogin[Route to /login]

    subgraph Dashboard
      GoDashboard --> FetchAlerts[GET /alerts]
      FetchAlerts --> ShowAlerts[Render alerts & metrics]
      ShowAlerts --> ActionTriage[Open Triage]
      ShowAlerts --> ActionInvestigate[Open Investigation]
      ShowAlerts --> ActionReporting[Open Reporting]
    end

    subgraph Triage
      ActionTriage --> CreateCase[POST /cases]
      CreateCase --> CaseCreated[(caseId)]
      CaseCreated --> NavWorkspace[Go to /workspace/:caseId]
    end

    subgraph Investigation_Workspace
      ActionInvestigate --> LoadGraph[GET /graph/:personId]
      NavWorkspace --> LoadGraph
      LoadGraph --> ViewGraph[React Flow graph + details]
      ViewGraph --> UpdateNotes[PUT /cases/:id/notes]
  UpdateNotes --> NotesSaved[Notes saved - Firestore or local]
    end

    subgraph Reporting
      ActionReporting --> GetReport[GET /report/:id]
      GetReport --> PDF[PDF blob]
      PDF --> Download[Trigger download]
    end

    subgraph Settings_and_Datasets
      Settings[Open Settings] --> Upload[POST /datasets/upload - CSV or ZIP]
      Upload --> Reanalyze[Run analysis]
      Reanalyze --> AlertsUpdated[Updated AlertScores.csv]
      AlertsUpdated --> FetchAlerts
    end

  GoLogin --> LoginFlow[Login - Firebase or mock token]
    LoginFlow --> AuthCheck
```

Backend (Flask):
- Data loader with schema validation (CSVs under `backend/generated-data/`).
- Risk scoring (`services/risk_scoring.py`), AI summarizer, report generator, optional graph analyzer.
- Case management with Firebase Firestore if configured; otherwise, a local JSON fallback.

Frontend (React + Vite):
- Centralized API client with envelope unwrapping and a token provider.
- Pages: Dashboard, Triage, Investigation Workspace, Reporting, and Settings.
- Settings provides dataset uploads (CSV/ZIP) and a metadata view.

Data generation:
- `data-generation/generate_data.py` produces CSVs into `backend/generated-data/`.
- Optional Neo4j loading via scripts in `backend/data-generation/`.

## Quick Start (Local)

Prerequisites: Python 3.10+, Node 18+.

Backend:
1) `cd backend`
2) `python -m venv venv` (Windows: `venv\Scripts\activate`, macOS/Linux: `source venv/bin/activate`)
3) `pip install -r requirements.txt`
4) Set environment variables (optional but recommended):
  - `GEMINI_API_KEY` for AI summaries (otherwise a rule‑based fallback is used)
  - `FRONTEND_URL` for CORS (e.g.,  http://localhost:3000/)
  - `FIREBASE_CREDENTIALS` or `GOOGLE_APPLICATION_CREDENTIALS` if using Firestore
5) Run: `python app.py` (serves at http://localhost:5001)

Frontend:
1) `cd frontend`
2) `npm install`
3) Optional: set `VITE_API_URL` to your backend API base (e.g., http://localhost:5001/api). If unset, it auto‑detects localhost and uses `http://localhost:5001/api`.
4) `npm run dev` (http://localhost:5173)

Authentication (local/mock):
- The backend accepts `Authorization: Bearer mock-jwt-token-12345`.
- The frontend includes a mock token provider in development to call protected APIs.

## Dataset Uploads (CSV/ZIP)

Upload via the UI: Settings → Data Management.

- ZIP upload: include any of these exact filenames (case‑insensitive):
  - Persons.csv, BankAccounts.csv, Transactions.csv, Companies.csv, Directorships.csv, Properties.csv, PoliceCases.csv
- Single CSV upload: choose which dataset it represents (dropdown in the UI).
- After upload, the server reloads all CSVs and re‑runs analysis to regenerate alerts.

Schemas (minimal required columns):
- persons: person_id, full_name, dob, pan_number, address, monthly_salary_inr, tax_filing_status
- accounts: account_number, owner_id, bank_name, account_type, open_date, balance_inr
- transactions: transaction_id, from_account, to_account, amount_inr, timestamp, payment_mode, remarks
- companies: cin, company_name, registered_address, incorporation_date, company_status, paid_up_capital_inr
- directorships: directorship_id, person_id, cin, appointment_date
- properties: property_id, owner_person_id, property_address, purchase_date, purchase_value_inr
- cases: case_id, person_id, case_details, case_date, status

Sample data that triggers alerts:
- See `samples/` at the repo root (ready‑named CSVs) or `frontend/public/samples/` for individual examples and a README.

## Key Endpoints (Backend)

Base path: `/api`.

- GET `/alerts` → list alerts (reads `AlertScores.csv`).
- GET `/persons?q=<query>` → search persons.
- GET `/investigate/<person_id>` → risk breakdown for a person.
- GET `/graph/<person_id>` → network; synthesizes from CSVs if Neo4j is empty or unavailable.
- GET `/report/<person_or_case_id>` → PDF report; accepts person_id or case_id.
- POST `/cases` → create a case; body must include `person_id` or embed it in `risk_profile.person_details`.
- GET `/cases` → list cases (Firestore or local fallback).
- POST `/datasets/upload` → upload CSV/ZIP; validates, reloads, and reruns analysis.
- GET `/datasets/metadata` → seed/snapshot/counts (if metadata.json is present; counts are derived regardless).
- POST `/run-analysis` (or `?sync=1`) and GET `/run-analysis/status` → control risk analysis.
- Settings: `/settings/profile`, `/settings/api-key`, `/settings/theme`, `/settings/regenerate-data`, `/settings/clear-cases`.

Auth:
- All protected routes use `Authorization: Bearer <token>`.
- Mock token accepted: `mock-jwt-token-12345`.

## Reporting

- The Reporting page downloads a PDF via `/api/report/<id>`. You can pass a caseId or personId.
- The PDF score is harmonized with `AlertScores.csv` to match the dashboard.

## Data Generation

- `data-generation/generate_data.py` writes CSVs to `backend/generated-data/`.
- From the backend Settings page, you can trigger regeneration.
- If using Neo4j, see `backend/data-generation/load_to_neo4j.py` for loading.

## Project Structure

```
project-ANUP-SECURITY-PORTAL/
├── backend/
│   ├── app.py                 # Flask API (CORS, endpoints, uploads, reports)
│   ├── services/              # risk_scoring, report_generator, graph_analysis, case_manager, ai_summarizer
│   ├── utils/                 # data_loader (schemas), auth (mock/real)
│   └── generated-data/        # CSVs + AlertScores.csv (+ metadata.json if present)
├── frontend/
│   ├── src/pages/             # Dashboard, Triage, Investigation, Reporting, Settings
│   ├── src/services/api.js    # API base resolver + token provider + endpoints
│   └── public/samples/        # Downloadable sample CSVs
├── data-generation/           # generate_data.py, patterns.py (synthetic data)
├── samples/                   # Ready‑named CSVs to ZIP & upload (alerts guaranteed)
└── README.md
```

## Configuration

Backend environment:
- `FRONTEND_URL` (for CORS), e.g., http://localhost:3000/
- `GEMINI_API_KEY` (optional): for AI summaries
- `FIREBASE_CREDENTIALS` (JSON or base64 JSON) or `GOOGLE_APPLICATION_CREDENTIALS` (path) for Firestore
- `RISK_ALERT_THRESHOLD` (optional, default 10)

Frontend environment:
- `VITE_API_URL` (optional): override API base; otherwise auto‑detects localhost `http://localhost:5001/api` or same‑origin `/api` in production
- `VITE_USE_MOCK_AUTH` (optional): use mock auth in local development

## Notes

- Graph view gracefully falls back to synthesized edges if Neo4j is not available.
- If reports fail with “Person ID not found,” ensure the case points to a person present in the current CSVs; the report endpoint also resolves from `caseId`.

## Contributing

1) Fork the repository.
2) Create a feature branch (`git checkout -b feature/your-change`).
3) Commit and push.
4) Open a pull request.

## Project Lead & Developer

<table style="width: 100%; border-collapse: collapse; text-align:center;">
        <tr>
            <th colspan="3" style="background-color: #1a1a1a; color: #00AEEF; padding: 10px;">
                <a href="https://github.com/kali878" style="color: #00AEEF; text-decoration: none; font-size: 20px;">Anup</a>
            </th>
        </tr>
        <tr>
            <td style="padding: 20px;">
                <img src="https://avatars.githubusercontent.com/kali878" alt="ANUP PATEL" width="150" style="border-radius: 50%; border: 3px solid #9EFF00;">
            </td>
            <td style="text-align: left; padding: 20px;">
                <strong>Role:</strong> CYBERSECURITY ANALYST & NETWORK SECURITY TRAINEE  <br>
                <strong>Education:</strong> B.Tech (2022-2026) <br>
                <strong>Institute Name:</strong> Oriental College of Technology,BHOPAL <br>  
                <strong>Certification:</strong> NPTEL(cybersecurity&privacy), CISCO(intro to cybersecurity, packet tracer), GOOGLE(cybersecurity) Certificates <br>
                <strong>Internship:</strong> Security Analysis & Networking 
            </td>
            <td style="text-align: left; padding: 20px;">
                <strong>Core Tech Skill:</strong> <br>
                • Python & Linux Proficiency <br>
                • Network Security (Wireshark, Nmap, OSINT, DHCP) <br>
                • TCP/IP & Network Fundamentals and various Tools<br>
                • Ethical Hacking & Threat Detection, Log analysis
            </td>
        </tr>
</table>

## License

OCT © Project ANUP-SECURITY-PORTAL contributors
