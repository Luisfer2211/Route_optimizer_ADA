#!/usr/bin/env bash
# Deploy optimize-route using env.deploy.yaml
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -f env.deploy.yaml ]]; then
  if [[ -f env.deploy.yaml.example ]]; then
    cp env.deploy.yaml.example env.deploy.yaml
    echo "Created env.deploy.yaml — edit it, then run ./deploy.sh again."
    exit 1
  fi
  echo "Missing env.deploy.yaml" >&2
  exit 1
fi

echo "Deploying optimize-route..."
gcloud functions deploy optimize-route \
  --gen2 \
  --runtime=python312 \
  --region=us-central1 \
  --source=. \
  --entry-point=optimize_route \
  --trigger-http \
  --allow-unauthenticated \
  --env-vars-file=env.deploy.yaml

echo "Health: https://us-central1-route-optimizer-11.cloudfunctions.net/optimize-route"
