"""Build distance matrix using Google Maps Distance Matrix API."""

from typing import Sequence


class Destination:
    """A stop with latitude and longitude."""

    def __init__(self, lat: float, lng: float) -> None:
        self.lat = lat
        self.lng = lng


def build_distance_matrix(
    destinations: Sequence[Destination],
    api_key: str,
) -> list[list[float]]:
    """Fetch pairwise road distances and return an NxN matrix."""
    raise NotImplementedError("Distance matrix not implemented yet")
