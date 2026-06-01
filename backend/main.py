"""HTTP entry point for the route optimizer Cloud Function."""

import json

import functions_framework
from flask import Request


@functions_framework.http
def optimize_route(request: Request):
    """Validate auth and IP, then run genetic algorithm on distance matrix."""
    if request.method == "OPTIONS":
        headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        }
        return ("", 204, headers)

    if request.method != "POST":
        return ("Method not allowed", 405)

    # TODO: verify Firebase ID token, check caller IP, build matrix, run GA
    _ = request.get_json(silent=True)
    return (
        json.dumps({"status": "not_implemented", "message": "Backend in progress"}),
        501,
        {"Content-Type": "application/json"},
    )
