# Deploy route optimizer to GCP (Cloud Functions Gen 2)

Prerequisites: [gcloud CLI](https://cloud.google.com/sdk/docs/install), billing enabled, APIs enabled (**Cloud Functions**, **Cloud Build**, **Distance Matrix**).

## 1. One-time: env file for deploy (no long `gcloud` lines)

From `backend/`:

```powershell
copy env.deploy.yaml.example env.deploy.yaml
```

Edit **`env.deploy.yaml`** (gitignored — never commit it):

```yaml
FIREBASE_PROJECT_ID: route-optimizer-11
ALLOWED_CALLER_IPS: "181.189.154.189,200.119.172.237,2803:c800:..."
GOOGLE_MAPS_API_KEY: "your-server-maps-key"
```

| Variable | Description |
|----------|-------------|
| `GOOGLE_MAPS_API_KEY` | Server key (no HTTP referrer lock) with Distance Matrix + Directions |
| `FIREBASE_PROJECT_ID` | e.g. `route-optimizer-11` |
| `ALLOWED_CALLER_IPS` | Public IPs, comma-separated — **always quote** the value (IPv6 uses `:`) |

On GCP, Firebase Admin uses the function’s **default service account**; you do not need `GOOGLE_APPLICATION_CREDENTIALS` in this file.

## 2. Deploy code + env vars

```powershell
cd backend
.\deploy.ps1
```

Linux/macOS: `chmod +x deploy.sh && ./deploy.sh`

This runs `gcloud functions deploy` with `--env-vars-file=env.deploy.yaml`.

Refresh dependencies when `pyproject.toml` changed:

```bash
uv export --no-dev -o requirements.txt
```

Copy the **function URL** from the output (or use  
`https://us-central1-route-optimizer-11.cloudfunctions.net/optimize-route`).

## 3. Change only IPs or keys (no full redeploy)

Edit `env.deploy.yaml`, then:

```powershell
.\update-env.ps1
```

Updates the Cloud Run service behind Gen 2 — usually **much faster** than a full deploy when you only added a phone IP.

## 4. Frontend production

In `frontend/.env`:

```env
VITE_ROUTE_OPTIMIZER_URL=https://us-central1-route-optimizer-11.cloudfunctions.net/optimize-route
```

```powershell
cd frontend
npm run build
firebase deploy --only hosting
```

## 5. IP restriction

Only **`ALLOWED_CALLER_IPS`** on the function enforces this.

From the **phone browser**, open the function URL (GET). JSON includes:

- `clientIp` — address to add to `env.deploy.yaml`
- `ipAllowed` — `true` / `false`

Then run `.\update-env.ps1` (or `.\deploy.ps1` if you also changed Python code).

Local dev: leave `ALLOWED_CALLER_IPS` empty in `backend/.env`.

## 6. Smoke test

```bash
curl -s "https://us-central1-route-optimizer-11.cloudfunctions.net/optimize-route"
```

Expect `"status":"ok"`, `"mapsKeyConfigured":true`, and your `clientIp`.

## Optional: Secret Manager instead of YAML key

You can remove `GOOGLE_MAPS_API_KEY` from `env.deploy.yaml` and add to `deploy.ps1`:

`--set-secrets GOOGLE_MAPS_API_KEY=maps-api-key:latest`

Keep `ALLOWED_CALLER_IPS` in the YAML file — it is not a secret.
