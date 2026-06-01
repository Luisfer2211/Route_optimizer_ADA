"""Server-side proxies for Google Maps REST APIs (browser cannot call them due to CORS)."""

from __future__ import annotations

from typing import Any

import requests
from flask import Request

DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"
DIRECTIONS_URL = "https://maps.googleapis.com/maps/api/directions/json"
PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"


def _passthrough_response(
    upstream: requests.Response,
) -> tuple[str, int, dict[str, str]]:
    content_type = upstream.headers.get("Content-Type", "application/json")
    return upstream.text, upstream.status_code, {"Content-Type": content_type}


def proxy_distance_matrix(request: Request, api_key: str) -> tuple[str, int, dict[str, str]]:
    params = {key: value for key, value in request.args.items()}
    params["key"] = api_key
    params.setdefault("units", "metric")

    response = requests.get(DISTANCE_MATRIX_URL, params=params, timeout=30)
    return _passthrough_response(response)


def proxy_directions(request: Request, api_key: str) -> tuple[str, int, dict[str, str]]:
    params = {key: value for key, value in request.args.items()}
    params["key"] = api_key

    response = requests.get(DIRECTIONS_URL, params=params, timeout=30)
    return _passthrough_response(response)


def proxy_places_search(request: Request, api_key: str) -> tuple[str, int, dict[str, str]]:
    response = requests.post(
        PLACES_SEARCH_URL,
        data=request.get_data(),
        headers={
            "Content-Type": request.headers.get("Content-Type", "application/json"),
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": request.headers.get(
                "X-Goog-FieldMask",
                "places.displayName,places.formattedAddress,places.location",
            ),
        },
        timeout=30,
    )
    return _passthrough_response(response)
