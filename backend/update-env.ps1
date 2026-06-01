# Update Cloud Function env vars only (faster than full deploy when you only change IPs or keys).
#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$BackendDir = $PSScriptRoot
$EnvFile = Join-Path $BackendDir "env.deploy.yaml"

if (-not (Test-Path $EnvFile)) {
    Write-Host "Create env.deploy.yaml from env.deploy.yaml.example first." -ForegroundColor Yellow
    exit 1
}

Set-Location $BackendDir

Write-Host "Updating env vars on optimize-route (Cloud Run)..." -ForegroundColor Cyan

gcloud run services update optimize-route `
    --region=us-central1 `
    --env-vars-file=$EnvFile

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Write-Host "Env vars updated. Test: https://us-central1-route-optimizer-11.cloudfunctions.net/optimize-route" -ForegroundColor Green
