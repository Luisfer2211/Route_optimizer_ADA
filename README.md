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
npm install
npm run dev
```

Open http://localhost:5173 — sign in or create an account.

**Do not commit** `.env`, `importante.txt`, or any API keys.

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
- [ ] Destinations input + 100 km validation
- [ ] Genetic algorithm + Distance Matrix
- [ ] Cloud Function deploy + IP restriction
- [ ] Google Maps route visualization
- [ ] Diagrams (draw.io)
