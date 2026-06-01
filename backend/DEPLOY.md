# Deploy route optimizer to GCP (Cloud Functions Gen 2)

Prerequisites: [gcloud CLI](https://cloud.google.com/sdk/docs/install), billing enabled, APIs enabled (**Cloud Functions**, **Cloud Build**, **Distance Matrix**).

## 1. Prepare secrets (never commit values)

In Google Cloud Console → **Secret Manager** (or function environment variables):

| Variable | Description |
|----------|-------------|
| `GOOGLE_MAPS_API_KEY` | Server key or unrestricted key with Distance Matrix enabled |
| `FIREBASE_PROJECT_ID` | e.g. `route-optimizer-11` |
| `ALLOWED_CALLER_IPS` | Your public IP(s), comma-separated (see [whatismyip](https://whatismyip.com/)) |

On GCP, Firebase Admin uses the function’s **default service account**; you do not need `GOOGLE_APPLICATION_CREDENTIALS` if the project is linked to Firebase.

## 2. Deploy from `backend/`

```bash
cd backend
uv export --no-dev -o requirements.txt   # refresh lock for pip if dependencies changed
```

```bash
gcloud functions deploy optimize-route \
  --gen2 \
  --runtime=python312 \
  --region=us-central1 \
  --source=. \
  --entry-point=optimize_route \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars FIREBASE_PROJECT_ID=route-optimizer-11,ALLOWED_CALLER_IPS=YOUR_PUBLIC_IP \
  --set-secrets GOOGLE_MAPS_API_KEY=maps-api-key:latest
```

Replace `YOUR_PUBLIC_IP` and the secret name with your values.  
Alternatively set env vars in the Console after deploy.

Copy the **function URL** from the command output.

## 3. Frontend production

In `frontend/.env`:

```env
VITE_ROUTE_OPTIMIZER_URL=https://REGION-PROJECT.cloudfunctions.net/optimize-route
```

Build and host (Firebase Hosting, Vercel, etc.):

```bash
cd frontend
npm run build
```

## 4. IP restriction check

Calls from any IP not listed in `ALLOWED_CALLER_IPS` receive `403 Forbidden IP`.  
Local dev: leave empty or use `127.0.0.1` when using the Vite proxy.

## 5. Smoke test

```bash
curl -s "https://YOUR_FUNCTION_URL" | head
```

Expect JSON with `"status":"ok"` and `"mapsKeyConfigured":true` (GET health).
