# Route Optimizer ADA

Web app to optimize delivery-style routes (2–15 stops, max 100 km apart) using a genetic algorithm in a Cloud Function, with Firebase Authentication and Google Maps.

## Project structure

```
route-optimizer/
├── backend/          # Python Cloud Function (uv)
├── frontend/         # React + Vite
├── diagrams/         # draw.io flow and architecture
└── hello.py          # Lab places API smoke test
```

## Prerequisites

- Node.js 18+
- [uv](https://docs.astral.sh/uv/) for Python
- Firebase project with **Email/Password** auth enabled
- Google Cloud APIs: **Maps JavaScript**, **Distance Matrix**, **Places API** (place search fallback if lab endpoint is down)

## Run locally (full stack)

### 1. Backend

```bash
cd backend
cp .env.example .env
```

Set in `backend/.env`:

- `GOOGLE_MAPS_API_KEY` — same project, Distance Matrix enabled
- `ALLOWED_CALLER_IPS` — leave empty for local dev, or add `127.0.0.1`
- `FIREBASE_PROJECT_ID=route-optimizer-11`
- Optional: `GOOGLE_APPLICATION_CREDENTIALS` path to Firebase service account JSON for token verification locally

```bash
uv sync
uv run functions-framework --target=optimize_route --port=8787
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env
# Firebase config + VITE_GOOGLE_MAPS_API_KEY
# Optional: VITE_ROUTE_OPTIMIZER_URL=/api/optimize (default in dev via Vite proxy)
npm install
npm run dev
```

Open http://localhost:5173 — sign in, add destinations, choose route mode, **Calcular ruta óptima**.

The Vite dev server proxies `/api/optimize` → `http://127.0.0.1:8787` (port 8080 is often blocked on Windows).

**Do not commit** `.env`, service account JSON, or API keys.

### Firebase vs lab GCP

- **Firebase (`route-optimizer-11`)**: Authentication only.
- **Lab GCP (`lab-ada-mapas`)**: shared Places search Cloud Function.

## Deploy (later)

Deploy `backend/main.py` as an HTTP Cloud Function (2nd gen), set env vars in GCP, put the function URL in `VITE_ROUTE_OPTIMIZER_URL`, and restrict `ALLOWED_CALLER_IPS` to your public IP(s).

## Status

- [x] Firebase Auth (email/password) in React
- [x] Destinations search (lab API) + map with numbered pins
- [x] 100 km validation by driving distance (closest neighbor)
- [x] Route mode open / closed + genetic algorithm backend
- [x] Local Cloud Function + result on map (polyline)
- [ ] Cloud Function deployed to GCP + IP restriction in production
- [ ] Diagrams (draw.io)
