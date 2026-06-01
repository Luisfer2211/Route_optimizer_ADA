# Local Cloud Function (port 8787 — 8080 is often blocked on Windows)
Set-Location $PSScriptRoot

# Load backend/.env into this shell (same rules as Python _read_maps_api_key_from_file)
if (Test-Path .env) {
  Get-Content .env -Encoding UTF8 | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $eq = $line.IndexOf('=')
    if ($eq -lt 1) { return }
    $name = $line.Substring(0, $eq).Trim()
    $value = $line.Substring($eq + 1).Trim().Trim('"').Trim("'")
    Set-Item -Path "env:$name" -Value $value
  }
}

if (-not $env:GOOGLE_MAPS_API_KEY) {
  Write-Host "WARNING: GOOGLE_MAPS_API_KEY is not set in backend/.env" -ForegroundColor Red
} else {
  Write-Host "GOOGLE_MAPS_API_KEY loaded for backend." -ForegroundColor Green
}

uv run functions-framework --target=optimize_route --port=8787
