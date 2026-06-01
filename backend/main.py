"""HTTP entry point for the route optimizer Cloud Function."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import firebase_admin
import functions_framework
from firebase_admin import auth, credentials
from flask import Request

from distance_matrix import _read_maps_api_key_from_file, build_distance_matrix
from genetic_algorithm import optimize_order
from maps_proxy import proxy_directions, proxy_distance_matrix, proxy_places_search
from validation import parse_destinations, validate_closest_neighbor_radius

BACKEND_DIR = Path(__file__).resolve().parent
MAX_RADIUS_KM = 100
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Maps-Proxy, X-Dev-Maps-Api-Key",
}


def _load_local_env() -> None:
    try:
        from dotenv import load_dotenv

        load_dotenv(BACKEND_DIR / ".env")
    except ImportError:
        pass


_load_local_env()


def _resolve_credentials_path() -> str | None:
    cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if not cred_path:
        return None
    path = Path(cred_path)
    if not path.is_absolute():
        path = BACKEND_DIR / path
    return str(path) if path.is_file() else None


def _init_firebase() -> None:
    if firebase_admin._apps:
        return

    project_id = os.environ.get("FIREBASE_PROJECT_ID", "route-optimizer-11")
    cred_path = _resolve_credentials_path()
    if cred_path:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred, {"projectId": project_id})
    else:
        firebase_admin.initialize_app(options={"projectId": project_id})


def _json_response(body: dict[str, Any], status: int = 200) -> tuple[str, int, dict[str, str]]:
    headers = {"Content-Type": "application/json", **CORS_HEADERS}
    return json.dumps(body), status, headers


def _error_response(message: str, status: int) -> tuple[str, int, dict[str, str]]:
    return _json_response({"error": message}, status)


def _normalize_ip(ip: str) -> str:
    ip = ip.strip()
    if ip.lower().startswith("::ffff:"):
        return ip.split(":", 3)[-1]
    return ip


def _is_private_ip(ip: str) -> bool:
    ip = _normalize_ip(ip)
    if not ip:
        return True
    if ":" in ip:
        lower = ip.lower()
        return (
            lower == "::1"
            or lower.startswith("fe80:")
            or lower.startswith("fc")
            or lower.startswith("fd")
        )
    parts = ip.split(".")
    if len(parts) != 4:
        return False
    try:
        octets = [int(part) for part in parts]
    except ValueError:
        return False
    first, second = octets[0], octets[1]
    return (
        first == 10
        or first == 127
        or (first == 172 and 16 <= second <= 31)
        or (first == 192 and second == 168)
        or first == 169
    )


def _get_client_ip(request: Request) -> str:
    """Best-effort client IP behind Cloud Run / Cloud Functions (Gen 2)."""
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        for part in forwarded.split(","):
            candidate = _normalize_ip(part)
            if candidate and not _is_private_ip(candidate):
                return candidate
        return _normalize_ip(forwarded.split(",")[0])

    for header in ("X-Real-IP", "True-Client-IP", "CF-Connecting-IP"):
        candidate = _normalize_ip(request.headers.get(header, ""))
        if candidate:
            return candidate

    return _normalize_ip(request.remote_addr or "")


def _is_ip_allowed(client_ip: str) -> bool:
    allowed = os.environ.get("ALLOWED_CALLER_IPS", "").strip()
    if not allowed:
        return True
    allowed_ips = {
        _normalize_ip(ip) for ip in allowed.split(",") if ip.strip()
    }
    return _normalize_ip(client_ip) in allowed_ips


def _get_maps_api_key(request: Request) -> str:
    return (
        request.headers.get("X-Dev-Maps-Api-Key", "").strip()
        or os.environ.get("GOOGLE_MAPS_API_KEY", "").strip()
        or (_read_maps_api_key_from_file() or "")
    )


def _request_subpath(request: Request) -> str:
    path = request.path or "/"
    for suffix in ("/optimize-route",):
        if path.endswith(suffix):
            path = path[: -len(suffix)] or "/"
            break
    return path.rstrip("/") or "/"


def _get_proxy_kind(request: Request) -> str | None:
    """Cloud Run often receives path '/' — use mapsProxy query param or header."""
    query_kind = request.args.get("mapsProxy", "").strip().lower()
    if query_kind in ("distance-matrix", "directions", "places-search"):
        return query_kind

    header_kind = request.headers.get("X-Maps-Proxy", "").strip().lower()
    if header_kind in ("distance-matrix", "directions", "places-search"):
        return header_kind

    combined = f"{request.path or ''} {getattr(request, 'full_path', '') or ''}"
    if "distance-matrix" in combined:
        return "distance-matrix"
    if "directions" in combined:
        return "directions"
    if "places/search" in combined:
        return "places-search"

    if request.method == "POST":
        raw_body = request.get_data(cache=True)
        if raw_body:
            try:
                payload = json.loads(raw_body)
            except json.JSONDecodeError:
                payload = None
            if (
                isinstance(payload, dict)
                and "textQuery" in payload
                and "mode" not in payload
                and "destinations" not in payload
            ):
                return "places-search"

    return None


def _require_auth_and_ip(request: Request) -> tuple[str, int, dict[str, str]] | None:
    client_ip = _get_client_ip(request)
    if not _is_ip_allowed(client_ip):
        return _error_response(
            f"Forbidden IP (seen: {client_ip or 'unknown'}). "
            "Add this address to ALLOWED_CALLER_IPS on the Cloud Function.",
            403,
        )

    try:
        _verify_bearer_token(request)
    except ValueError as exc:
        return _error_response(str(exc), 401)
    except Exception:
        return _error_response("Invalid or expired authentication token", 401)

    return None


def _verify_bearer_token(request: Request) -> dict[str, Any]:
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        raise ValueError("Missing Authorization Bearer token")

    token = header.split(" ", 1)[1].strip()
    _init_firebase()
    return auth.verify_id_token(token)


@functions_framework.http
def optimize_route(request: Request):
    """Route optimizer API, Maps proxies, and health check."""
    if request.method == "OPTIONS":
        return ("", 204, CORS_HEADERS)

    subpath = _request_subpath(request)
    proxy_kind = _get_proxy_kind(request)

    if proxy_kind == "distance-matrix" or subpath.endswith("/distance-matrix"):
        if request.method != "GET":
            return _error_response("Method not allowed", 405)
        auth_error = _require_auth_and_ip(request)
        if auth_error:
            return auth_error
        maps_api_key = _get_maps_api_key(request)
        if not maps_api_key:
            return _error_response("GOOGLE_MAPS_API_KEY is not configured", 500)
        body, status, headers = proxy_distance_matrix(request, maps_api_key)
        return body, status, {**CORS_HEADERS, **headers}

    if proxy_kind == "directions" or subpath.endswith("/directions"):
        if request.method != "GET":
            return _error_response("Method not allowed", 405)
        auth_error = _require_auth_and_ip(request)
        if auth_error:
            return auth_error
        maps_api_key = _get_maps_api_key(request)
        if not maps_api_key:
            return _error_response("GOOGLE_MAPS_API_KEY is not configured", 500)
        body, status, headers = proxy_directions(request, maps_api_key)
        return body, status, {**CORS_HEADERS, **headers}

    if proxy_kind == "places-search" or subpath.endswith("/places/search"):
        if request.method != "POST":
            return _error_response("Method not allowed", 405)
        auth_error = _require_auth_and_ip(request)
        if auth_error:
            return auth_error
        maps_api_key = _get_maps_api_key(request)
        if not maps_api_key:
            return _error_response("GOOGLE_MAPS_API_KEY is not configured", 500)
        body, status, headers = proxy_places_search(request, maps_api_key)
        return body, status, {**CORS_HEADERS, **headers}

    if request.method == "GET" and subpath in ("/", ""):
        maps_key = _get_maps_api_key(request)
        client_ip = _get_client_ip(request)
        return _json_response(
            {
                "status": "ok",
                "mapsKeyConfigured": bool(maps_key),
                "fromHeader": bool(request.headers.get("X-Dev-Maps-Api-Key")),
                "fromEnv": bool(os.environ.get("GOOGLE_MAPS_API_KEY")),
                "fromFile": bool(_read_maps_api_key_from_file()),
                "clientIp": client_ip,
                "ipAllowed": _is_ip_allowed(client_ip),
            },
        )

    if request.method != "POST":
        return _error_response("Method not allowed", 405)

    auth_error = _require_auth_and_ip(request)
    if auth_error:
        return auth_error

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _error_response("JSON body required", 400)

    mode = payload.get("mode")
    if mode not in ("closed", "open"):
        return _error_response("mode must be 'closed' or 'open'", 400)

    try:
        destinations = parse_destinations(payload.get("destinations"))
        _load_local_env()
        maps_api_key = _get_maps_api_key(request)
        if not maps_api_key:
            return _error_response(
                "GOOGLE_MAPS_API_KEY missing. Check backend/.env, restart serve.ps1, "
                "and open http://127.0.0.1:8787 in the browser to diagnose.",
                500,
            )
        matrix = build_distance_matrix(destinations, api_key=maps_api_key)
        validate_closest_neighbor_radius(matrix, MAX_RADIUS_KM)
        order, total_distance_km = optimize_order(matrix, mode=mode)
    except ValueError as exc:
        return _error_response(str(exc), 400)
    except RuntimeError as exc:
        return _error_response(str(exc), 502)

    ordered_destinations = [
        {
            "id": destinations[index].id,
            "name": destinations[index].name,
            "address": "",
            "lat": destinations[index].lat,
            "lng": destinations[index].lng,
        }
        for index in order
    ]

    # Include address from request if present
    raw_destinations = payload.get("destinations", [])
    id_to_address = {
        str(item.get("id", "")): str(item.get("address", ""))
        for item in raw_destinations
        if isinstance(item, dict)
    }
    for item in ordered_destinations:
        item["address"] = id_to_address.get(item["id"], "")

    return _json_response(
        {
            "mode": mode,
            "order": order,
            "totalDistanceKm": total_distance_km,
            "destinations": ordered_destinations,
        },
    )
