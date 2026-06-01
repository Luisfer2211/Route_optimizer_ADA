# Local Cloud Function (port 8787 — 8080 is often blocked on Windows)
Set-Location $PSScriptRoot

# Load backend/.env into this shell so uv/functions-framework inherit the variables
if (Test-Path .env) {
  Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)\s*=\s*(.*)\s*$') {
      $name = $matches[1].Trim()
      $value = $matches[2].Trim()
      Set-Item -Path "env:$name" -Value $value
    }
  }
}

if (-not $env:GOOGLE_MAPS_API_KEY) {
  Write-Host "WARNING: GOOGLE_MAPS_API_KEY is not set in backend/.env" -ForegroundColor Red
} else {
  Write-Host "GOOGLE_MAPS_API_KEY loaded for backend." -ForegroundColor Green
}

uv run functions-framework --target=optimize_route --port=8787
