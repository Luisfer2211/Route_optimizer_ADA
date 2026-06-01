# Route Optimizer ADA

Web app to optimize delivery-style routes (**2–15 stops**, max **100 km** driving distance between closest neighbors) using a **genetic algorithm** in a Cloud Function, with **Firebase Authentication** and **Google Maps**.

## Architecture

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite |
| Auth | Firebase Authentication (email/password) |
| Optimizer | GCP Cloud Function (Python, `functions-framework`) |
| Distances | Google Distance Matrix API |
| Map UI | Maps JavaScript API, Directions API, Places API (New) |

See `diagrams/flow.drawio` (user flow) and `diagrams/architecture.drawio` (system). Open in [draw.io](https://app.diagrams.net/) and export to PDF/PNG for delivery.

## Project structure

```
Route_optimizer_ADA/
├── README.md
├── backend/
│   ├── main.py                 # HTTP entry (optimize_route)
│   ├── genetic_algorithm.py
│   ├── distance_matrix.py
│   ├── validation.py
│   ├── serve.ps1               # local dev on port 8787
│   ├── DEPLOY.md               # GCP deploy steps
│   ├── pyproject.toml
│   ├── uv.lock
│   └── requirements.txt        # pip deps for Cloud Functions deploy
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/         # Map, DestinationInput, RouteResult, …
│   │   └── services/           # firebase, cloudFunction, roadDistance, drivingRoute
│   ├── vite.config.js          # dev proxies (optimize, Maps APIs, lab places)
│   └── package.json
└── diagrams/
    ├── flow.drawio
    └── architecture.drawio
```

## Prerequisites

- Node.js 18+
- [uv](https://docs.astral.sh/uv/) for Python
- Firebase project with **Email/Password** sign-in enabled
- Google Cloud APIs on your key:
  - **Maps JavaScript API**
  - **Distance Matrix API**
  - **Directions API**
  - **Places API (New)** (destination search fallback)

## Run locally

### 1. Backend

```powershell
cd backend
copy .env.example .env
```

Edit `backend/.env`:

| Variable | Purpose |
|----------|---------|
| `GOOGLE_MAPS_API_KEY` | Distance Matrix (same key as frontend) |
| `FIREBASE_PROJECT_ID` | e.g. `route-optimizer-11` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Filename of Firebase Admin JSON in `backend/` (local only) |
| `ALLOWED_CALLER_IPS` | Empty for local dev, or `127.0.0.1` |

```powershell
uv sync
.\serve.ps1
```

You should see **`GOOGLE_MAPS_API_KEY loaded for backend.`**  
Function URL: http://127.0.0.1:8787 — health check: open in browser → `"mapsKeyConfigured": true`.

> Use **8787**, not 8080 (often blocked on Windows). Only **one** `serve.ps1` instance on that port.

### 2. Frontend

```powershell
cd frontend
copy .env.example .env
```

Fill Firebase web config and `VITE_GOOGLE_MAPS_API_KEY`.  
Leave `VITE_ROUTE_OPTIMIZER_URL` empty — dev uses `/api/optimize` via Vite proxy.

```powershell
npm install
npm run dev
```

Open the URL Vite prints (e.g. http://localhost:5173). Sign in → add destinations → wait for green radius banner → choose open/closed → **Calcular ruta óptima**.

**Never commit** `.env`, `*-firebase-adminsdk-*.json`, or API keys.

### Firebase vs lab GCP

- **Firebase (`route-optimizer-11`)**: authentication only.
- **Lab GCP (`lab-ada-mapas`)**: optional shared Places search; app falls back to Places API (New) if the lab endpoint fails.

## Deploy to GCP

See **[backend/DEPLOY.md](backend/DEPLOY.md)** for Cloud Functions Gen 2 deploy, `ALLOWED_CALLER_IPS`, and setting `VITE_ROUTE_OPTIMIZER_URL` in production.

## Security notes

- Cloud Function verifies **Firebase ID token** on every `POST`.
- **`ALLOWED_CALLER_IPS`**: rejects requests from other IPs (required for grading).
- Credentials only in environment variables / Secret Manager — **never in git**.

## Feature checklist (assignment)

| Requirement | Status |
|-------------|--------|
| 2–15 destinations, 100 km validation | Done |
| Open / closed route modes | Done |
| Genetic algorithm + Distance Matrix in Cloud Function | Done (local + deploy-ready) |
| Map: numbered pins, road polyline, total distance | Done |
| Firebase login, blocked when logged out | Done |
| Responsive UI (desktop + mobile) | Done |
| Incremental git history | In progress |
| README + dependency files | Done |
| Diagrams (draw.io) | Done (export PDF/PNG for delivery) |
| Cloud Function deployed + IP restriction in prod | **You** — follow DEPLOY.md |

## License / course

Academic project — ADA route optimization lab.
