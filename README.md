# Route Optimizer ADA

Web application to optimize delivery-style routes (**2–15 stops**, max **100 km** driving distance between closest neighbors) using a **genetic algorithm** in a GCP Cloud Function, with **Firebase Authentication** and **Google Maps**.

**Live app:** [https://route-optimizer-11.web.app](https://route-optimizer-11.web.app)

## Authors

- Luis Palacios
- Pablo Cabrera
- Estuardo Castro
- Eliazar Canastuj

## Overview

Users sign in with Firebase, search and add destinations (Places API), and the app validates that every stop has another within **100 km** by road (Distance Matrix). They choose **closed** or **open** route mode, optionally fix the first destination as the mandatory start, and request an optimized visit order. The Cloud Function builds the distance matrix, runs the genetic algorithm, and returns total distance and ordered stops. The map shows numbered pins and a driving polyline.

## Architecture

| Layer | Technology |
|-------|------------|
| Hosting | Firebase Hosting (static SPA) |
| Frontend | React + Vite |
| Auth | Firebase Authentication (email/password) |
| Optimizer | GCP Cloud Function Gen 2 (`optimize-route`, Python) |
| Distances | Google Distance Matrix API (via function proxy in production) |
| Map UI | Maps JavaScript API, Directions API, Places API (New) |

**Optimizer URL (production):**  
`https://us-central1-route-optimizer-11.cloudfunctions.net/optimize-route`

Diagrams (draw.io + exported PNG):

| File | Description |
|------|-------------|
| `diagrams/flow.drawio` | User flow: login → destinations → validation → calculate → map |
| `diagrams/architecture.drawio` | System architecture with GCP icons |
| `diagrams/Diagrama_Flujo.png` | Exported user flow |
| `diagrams/Diagrama_Arquitectura.png` | Exported architecture |

Open `.drawio` files in [diagrams.net](https://app.diagrams.net/) to edit; re-export PNG/PDF when diagrams change.

## Features

- **2–15 destinations** per route calculation
- **100 km** closest-neighbor validation (on add and before optimize)
- **Closed route:** return to start · **Open route:** end at last stop
- **Optional fixed start:** checkbox *¿Punto de partida?* — first stop fixed vs optimizer picks start
- **Genetic algorithm** (tournament selection, order crossover, swap mutation) on server-built matrix
- **IP allowlist** on Cloud Function (`ALLOWED_CALLER_IPS`)
- **Firebase ID token** required for optimize and Maps proxy calls
- **Responsive UI** for desktop and mobile

## Project structure

```
Route_optimizer_ADA/
├── README.md
├── firebase.json              # Firebase Hosting → frontend/dist
├── .firebaserc
├── backend/
│   ├── main.py                # HTTP entry (optimize_route + Maps proxy)
│   ├── genetic_algorithm.py
│   ├── distance_matrix.py
│   ├── validation.py
│   ├── maps_proxy.py
│   ├── serve.ps1              # local dev (port 8787)
│   ├── deploy.ps1             # deploy with env.deploy.yaml
│   ├── update-env.ps1         # update env vars only (IPs, keys)
│   ├── env.deploy.yaml.example
│   ├── DEPLOY.md
│   ├── pyproject.toml
│   ├── uv.lock
│   └── requirements.txt       # Cloud Functions pip deps
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/        # Map, DestinationInput, RouteResult, RouteOptions, …
│   │   └── services/          # firebase, cloudFunction, roadDistance, drivingRoute, places
│   ├── vite.config.js         # dev proxies (/api/optimize, Maps, lab places)
│   ├── package.json
│   └── .env.example
└── diagrams/
    ├── flow.drawio
    ├── architecture.drawio
    ├── Diagrama_Flujo.png
    └── Diagrama_Arquitectura.png
```

## Prerequisites

- **Git**
- **Node.js** 18+
- **[uv](https://docs.astral.sh/uv/)** for Python
- **[gcloud CLI](https://cloud.google.com/sdk/docs/install)** (deploy only)
- **[Firebase CLI](https://firebase.google.com/docs/cli)** (hosting deploy only)
- Firebase project with **Email/Password** sign-in enabled
- Google Cloud APIs enabled:
  - Maps JavaScript API
  - Distance Matrix API
  - Directions API
  - Places API (New)

### API keys (production)

Use two logical keys (can be same project):

| Key | Used in | Restriction |
|-----|---------|-------------|
| **Browser** | `VITE_GOOGLE_MAPS_API_KEY` | HTTP referrers (`localhost`, your Hosting domain) |
| **Server** | `GOOGLE_MAPS_API_KEY` in Cloud Function / `env.deploy.yaml` | No referrer lock (or IP restriction) |

Places search runs in the **browser**; Distance Matrix and Directions go through the **Cloud Function** proxy to avoid CORS.

## Run from scratch (local)

### 1. Clone

```powershell
git clone <your-repo-url>
cd Route_optimizer_ADA
```

### 2. Backend

```powershell
cd backend
copy .env.example .env
```

Edit `backend/.env`:

| Variable | Purpose |
|----------|---------|
| `GOOGLE_MAPS_API_KEY` | Distance Matrix / Directions |
| `FIREBASE_PROJECT_ID` | e.g. `route-optimizer-11` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Firebase Admin JSON **filename** in `backend/` (local only) |
| `ALLOWED_CALLER_IPS` | Leave **empty** for local dev |

Place the Firebase Admin service account JSON in `backend/` (never commit it).

```powershell
uv sync
.\serve.ps1
```

Expect **`GOOGLE_MAPS_API_KEY loaded for backend.`**  
Health check: http://127.0.0.1:8787 → `"status":"ok"`, `"mapsKeyConfigured":true`.

> Port **8787** (not 8080). Run only one `serve.ps1` instance.

### 3. Frontend

```powershell
cd frontend
copy .env.example .env
```

Fill Firebase web config and `VITE_GOOGLE_MAPS_API_KEY`.  
Leave `VITE_ROUTE_OPTIMIZER_URL` **empty** — Vite proxies to `http://127.0.0.1:8787`.

```powershell
npm install
npm run dev
```

Open the URL Vite prints (e.g. http://localhost:5173).

**Typical flow:** Sign in → (optional) *¿Punto de partida?* → add destinations → wait for green radius banner → open/closed mode → **Calcular ruta óptima**.

### Lab Places (optional, dev)

In local dev, Vite can proxy to the lab Places endpoint (`lab-ada-mapas`); if it fails, the app uses Places API (New) directly.

## Deploy to production

See **[backend/DEPLOY.md](backend/DEPLOY.md)** for details.

### Backend (Cloud Function)

```powershell
cd backend
copy env.deploy.yaml.example env.deploy.yaml
# Edit env.deploy.yaml: FIREBASE_PROJECT_ID, ALLOWED_CALLER_IPS, GOOGLE_MAPS_API_KEY
.\deploy.ps1
```

To add a new client IP without redeploying code:

```powershell
.\update-env.ps1
```

Check allowed IP from a device: open the function URL in a browser and read `clientIp` / `ipAllowed` in the JSON response.

### Frontend (Firebase Hosting)

In `frontend/.env`:

```env
VITE_ROUTE_OPTIMIZER_URL=https://us-central1-route-optimizer-11.cloudfunctions.net/optimize-route
```

```powershell
cd frontend
npm run build
cd ..
firebase deploy --only hosting
```

## Security

- **Authentication:** App and API calls require a valid Firebase session; `POST` handlers verify the Bearer ID token.
- **IP restriction:** `ALLOWED_CALLER_IPS` on the Cloud Function; other IPs receive `403 Forbidden IP`.
- **Secrets:** Use `.env` and `env.deploy.yaml` locally; never commit `.env`, `env.deploy.yaml`, `*-firebase-adminsdk-*.json`, or API keys.

## Assignment checklist

| Requirement | Status |
|-------------|--------|
| 2–15 destinations, 100 km validation and notification | Done |
| Closed and open route modes | Done |
| Genetic algorithm on Google Distance Matrix in Cloud Function | Done |
| Map: numbered pins, route polyline, total distance visible | Done |
| Firebase login; no access without session | Done |
| Cloud Function deployed and callable from frontend | Done |
| IP restriction configured | Done |
| No API keys or credentials in the repository | Done (use `.gitignore`) |
| Incremental git commit history | Done |
| README, `pyproject.toml`, `uv.lock`, `package.json` | Done |
| User flow and architecture diagrams (draw.io + PNG) | Done |
| Responsive UI (desktop + mobile) | Done |

## Course

Academic project — ADA route optimization lab (genetic algorithms + GCP + Firebase).
