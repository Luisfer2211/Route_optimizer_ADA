# Deploy optimize-route using env.deploy.yaml (no secrets on the command line).
#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$BackendDir = $PSScriptRoot
$EnvFile = Join-Path $BackendDir "env.deploy.yaml"
$ExampleFile = Join-Path $BackendDir "env.deploy.yaml.example"

if (-not (Test-Path $EnvFile)) {
    if (-not (Test-Path $ExampleFile)) {
        throw "Missing env.deploy.yaml.example"
    }
    Copy-Item $ExampleFile $EnvFile
    Write-Host "Created env.deploy.yaml from example. Edit it, then run deploy.ps1 again." -ForegroundColor Yellow
    exit 1
}

Set-Location $BackendDir

Write-Host "Deploying optimize-route (env-vars-file: env.deploy.yaml)..." -ForegroundColor Cyan

gcloud functions deploy optimize-route `
    --gen2 `
    --runtime=python312 `
    --region=us-central1 `
    --source=. `
    --entry-point=optimize_route `
    --trigger-http `
    --allow-unauthenticated `
    --env-vars-file=$EnvFile

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Deploy finished. Health check (see clientIp / ipAllowed):" -ForegroundColor Green
Write-Host "  https://us-central1-route-optimizer-11.cloudfunctions.net/optimize-route"
