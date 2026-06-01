"""Build distance matrix using Google Maps Distance Matrix API."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

import requests

BACKEND_DIR = Path(__file__).resolve().parent

DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"
MAX_DESTINATIONS = 15


@dataclass(frozen=True)
class Destination:
    """A stop with latitude and longitude."""

    lat: float
    lng: float
    name: str = ""
    id: str = ""


def _format_point(destination: Destination) -> str:
    return f"{destination.lat},{destination.lng}"


def _read_maps_api_key_from_file() -> str | None:
    env_path = BACKEND_DIR / ".env"
    if not env_path.is_file():
        return None

    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if not stripped.startswith("GOOGLE_MAPS_API_KEY="):
            continue
        value = stripped.split("=", 1)[1].strip().strip('"').strip("'")
        return value or None

    return None


def _resolve_maps_api_key(explicit_key: str | None = None) -> str:
    if explicit_key and explicit_key.strip():
        return explicit_key.strip()

    env_key = os.environ.get("GOOGLE_MAPS_API_KEY", "").strip()
    if env_key:
        return env_key

    file_key = _read_maps_api_key_from_file()
    if file_key:
        return file_key

    try:
        from dotenv import load_dotenv

        load_dotenv(BACKEND_DIR / ".env", override=True)
        env_key = os.environ.get("GOOGLE_MAPS_API_KEY", "").strip()
        if env_key:
            return env_key
    except ImportError:
        pass

    raise ValueError(
        "GOOGLE_MAPS_API_KEY is not configured. Set it in backend/.env and restart serve.ps1",
    )


def build_distance_matrix(
    destinations: Sequence[Destination],
    api_key: str | None = None,
) -> list[list[float]]:
    """
    Fetch pairwise driving distances (km) and return an NxN matrix.

    matrix[i][j] is the driving distance from destination i to j.
    """
    if not destinations:
        return []

    if len(destinations) > MAX_DESTINATIONS:
        raise ValueError(f"At most {MAX_DESTINATIONS} destinations are allowed")

    key = _resolve_maps_api_key(api_key)

    n = len(destinations)
    origins = "|".join(_format_point(d) for d in destinations)
    params = {
        "origins": origins,
        "destinations": origins,
        "mode": "driving",
        "units": "metric",
        "key": key,
    }

    response = requests.get(DISTANCE_MATRIX_URL, params=params, timeout=30)
    response.raise_for_status()
    payload = response.json()

    if payload.get("status") != "OK":
        message = payload.get("error_message") or payload.get("status")
        raise RuntimeError(f"Distance Matrix API error: {message}")

    matrix: list[list[float]] = [[0.0] * n for _ in range(n)]

    for row_index, row in enumerate(payload.get("rows", [])):
        for col_index, element in enumerate(row.get("elements", [])):
            if element.get("status") != "OK":
                origin = destinations[row_index].name or f"stop {row_index + 1}"
                dest = destinations[col_index].name or f"stop {col_index + 1}"
                raise RuntimeError(f"No driving route between {origin} and {dest}")
            meters = element["distance"]["value"]
            matrix[row_index][col_index] = meters / 1000.0

    return matrix
