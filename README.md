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
- Google Cloud / Maps APIs (lab + your function when ready)

## Frontend (local)

```bash
cd frontend
cp .env.example .env
# Fill VITE_FIREBASE_* from Firebase Console → Project settings → Your apps
# Fill VITE_GOOGLE_MAPS_API_KEY (Maps JavaScript API, referrer: http://localhost:* )
npm install
npm run dev
```

Open http://localhost:5173 — sign in or create an account.

**Do not commit** `.env`, `importante.txt`, or any API keys.

### Firebase vs lab GCP

- **Firebase (`route-optimizer-11`)**: login only (Authentication). No need to move the lab into Firebase.
- **Lab GCP (`lab-ada-mapas`)**: shared Places Cloud Function for the course. The frontend calls it by URL; it is not part of your Firebase project.

### Places search and CORS

`hello.py` works because Python is not a browser. In the browser, the lab function must allow CORS or you proxy the request. **Local dev** uses Vite (`/api/lab/places` → lab function). For a **production** build you may later proxy through your own Cloud Function.

## Backend (local, later)

```bash
cd backend
cp .env.example .env
uv sync
# Run with functions-framework when implemented
```

## Lab places API

`hello.py` calls the course Cloud Function for place search. The frontend can reuse the same URL via `VITE_LAB_PLACES_URL`.

## Status

- [x] Firebase Auth (email/password) in React
- [x] Destinations search (lab API) + map with numbered pins
- [ ] 100 km validation between stops
- [ ] Genetic algorithm + Distance Matrix
- [ ] Cloud Function deploy + IP restriction
- [ ] Google Maps route visualization
- [ ] Diagrams (draw.io)
