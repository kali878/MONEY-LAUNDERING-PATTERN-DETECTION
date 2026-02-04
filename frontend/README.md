# Project ANUP-SECURITY-PORTAL — Frontend

<div align="center">

<pre>
███╗   ██╗███████╗████████╗██████╗  █████╗
████╗  ██║██╔════╝╚══██╔══╝██╔══██╗██╔══██╗
██╔██╗ ██║█████╗     ██║   ██████╔╝███████║
██║╚██╗██║██╔══╝     ██║   ██╔══██╗██╔══██║
██║ ╚████║███████╗   ██║   ██║  ██║██║  ██║
╚═╝  ╚═══╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝
</pre>

AI‑powered investigations UI built with React + Vite.

[![React](https://img.shields.io/badge/React-18.2+-61dafb.svg)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Vite-5.1+-646cff.svg)](https://vitejs.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-3.4+-38bdf8.svg)](https://tailwindcss.com)
[![Router](https://img.shields.io/badge/React%20Router-6.22+-ca4245.svg)](https://reactrouter.com)
[![Firebase](https://img.shields.io/badge/Firebase-10.8+-ffca28.svg)](https://firebase.google.com)

</div>

## Overview

This frontend provides dashboards, triage, an investigation workspace, and reporting views for Project ANUP-SECURITY-PORTAL. It talks to a Flask backend over REST, supports Firebase auth, and includes responsive, mobile‑friendly UI components with Tailwind.

Highlights:

- Dashboard, Triage, Investigation Workspace, Reporting, and Settings pages
- React Router v6 protected routes using an `AuthProvider`
- Centralized API client with token support and auto envelope unwrapping
- Responsive layout, mobile menu, and keyboard‑friendly interactions
- Charts (Recharts) and graph exploration (React Flow)

## Tech stack

- React 18, Vite 5, React Router 6
- Tailwind CSS, Lucide icons
- Recharts, React Flow
- Firebase (auth) with a mock‑token fallback for demos

## Project structure

```text
frontend/
├─ public/
│  └─ anup-security-portal-favicon.svg
├─ src/
│  ├─ App.jsx
│  ├─ main.jsx
│  ├─ assets/
│  ├─ components/
│  │  ├─ common/           # Header, Sidebar, Loader, Modal, etc.
│  │  ├─ triage/           # TriageActions, RiskFactorSummary
│  │  └─ workspace/        # CaseSummary, EntityDetailsCard, FinancialTimeline
│  ├─ contexts/            # ThemeContext, useTheme
│  ├─ firebase/            # firebaseConfig.js
│  ├─ hooks/               # useAuth, useFetchData, useDebugFetch
│  ├─ pages/               # Dashboard, Triage, InvestigationWorkspace, Reporting, Settings, Login, NotFound
│  ├─ services/            # api.js (central API helper)
│  ├─ styles/              # index.css
│  └─ utils/               # apiBase.js (API base resolver)
├─ package.json
├─ tailwind.config.js
├─ postcss.config.js
└─ vite.config.js
```

## Routing

Defined in `src/App.jsx` with protected routes via `AuthProvider`:

- Public: `/login`
- Protected: `/dashboard`, `/triage/:personId`, `/workspace/:caseId`, `/reporting`, `/settings`
- Root `/` redirects to `/dashboard`

## Environment & API base

API base resolution lives in `src/utils/apiBase.js` (no hard‑coded URLs in components):

- `VITE_API_URL` (from env/.env) takes precedence
- `window.__ANUP-SECURITY-PORTAL_API_BASE` (runtime override) for debugging
- If running on localhost → `http://localhost:5001/api`
- Otherwise → same‑origin `/api`

Tokens: `src/services/api.js` uses a registered token provider from auth, falling back to `localStorage.authToken` if present.

## Setup

Prerequisites: Node 18+

1. Install dependencies

```bash
npm install
```

1. Optional: set API base

```bash
# .env.local
VITE_API_URL=http://localhost:5001/api
```

1. Configure Firebase

Edit `src/firebase/firebaseConfig.js` with your project details if using Firebase login. For demos, the backend may accept a mock bearer token.

1. Run the dev server

```bash
npm run dev
```

Build and preview:

```bash
npm run build
npm run preview
```

## Key scripts

From `package.json`:

- `dev` — start Vite dev server
- `build` — production build
- `preview` — preview built app
- `lint` — run ESLint

## Auth notes

- Routes are wrapped with `AuthProvider` (`src/hooks/useAuth.jsx`) and use Firebase by default.
- The API helper (`src/services/api.js`) can consume a token from the provider or a value stored in `localStorage.authToken` for demos.

## Troubleshooting

- Blank or loading screen: check the browser console for API/CORS errors. Verify `VITE_API_URL` points to your backend and that CORS is allowed.
- 401/403 errors: ensure auth is configured or a valid token exists; for demos, confirm the backend’s mock token support.
- Styles not applied: confirm Tailwind is installed and `src/styles/index.css` is imported in `main.jsx`.
- Graph/flows missing: ensure React Flow CSS is imported where used.

---

For backend/API details and data workflows, see the project root `README.md`.
