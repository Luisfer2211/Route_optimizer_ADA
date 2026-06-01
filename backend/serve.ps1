# Local Cloud Function (port 8787 — 8080 is often reserved/blocked on Windows)
Set-Location $PSScriptRoot
uv run functions-framework --target=optimize_route --port=8787
