"""Request and route constraints."""

from __future__ import annotations

from distance_matrix import Destination

MIN_DESTINATIONS = 2
MAX_DESTINATIONS = 15
MAX_RADIUS_KM = 100


def parse_destinations(raw_destinations: list[dict]) -> list[Destination]:
    if not isinstance(raw_destinations, list):
        raise ValueError("destinations must be an array")

    if not MIN_DESTINATIONS <= len(raw_destinations) <= MAX_DESTINATIONS:
        raise ValueError(
            f"Between {MIN_DESTINATIONS} and {MAX_DESTINATIONS} destinations are required",
        )

    parsed: list[Destination] = []
    for index, item in enumerate(raw_destinations):
        if not isinstance(item, dict):
            raise ValueError(f"Destination at index {index} must be an object")
        try:
            lat = float(item["lat"])
            lng = float(item["lng"])
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError(f"Destination at index {index} needs numeric lat and lng") from exc

        parsed.append(
            Destination(
                lat=lat,
                lng=lng,
                name=str(item.get("name", "")),
                id=str(item.get("id", "")),
            ),
        )

    return parsed


def validate_closest_neighbor_radius(
    matrix: list[list[float]],
    max_km: float = MAX_RADIUS_KM,
) -> None:
    """Each stop must have another stop within max_km by road."""
    size = len(matrix)
    for row_index in range(size):
        closest_km = min(
            matrix[row_index][col_index]
            for col_index in range(size)
            if col_index != row_index
        )
        if closest_km > max_km:
            raise ValueError(
                f"Destination {row_index + 1} has no neighbor within {max_km} km by road",
            )
