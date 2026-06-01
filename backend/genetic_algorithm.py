"""Genetic algorithm for open/closed TSP over a precomputed distance matrix."""

from typing import Literal

RouteMode = Literal["closed", "open"]


def optimize_order(
    distance_matrix: list[list[float]],
    mode: RouteMode = "closed",
) -> tuple[list[int], float]:
    """
    Return visit order (indices) and total distance.

    Args:
        distance_matrix: NxN symmetric distances in meters or km (consistent units).
        mode: "closed" returns to start; "open" ends at last stop.
    """
    raise NotImplementedError("Genetic algorithm not implemented yet")
