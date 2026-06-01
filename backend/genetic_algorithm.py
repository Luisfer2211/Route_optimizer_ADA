"""Genetic algorithm for open/closed TSP over a precomputed distance matrix."""

from __future__ import annotations

import random
from typing import Literal

RouteMode = Literal["closed", "open"]

POPULATION_SIZE = 120
GENERATIONS = 250
MUTATION_RATE = 0.15
TOURNAMENT_SIZE = 5
ELITE_COUNT = 2
ORIGIN_INDEX = 0


def _route_distance(order: list[int], matrix: list[list[float]], mode: RouteMode) -> float:
    total = 0.0
    for index in range(len(order) - 1):
        total += matrix[order[index]][order[index + 1]]
    if mode == "closed":
        total += matrix[order[-1]][order[ORIGIN_INDEX]]
    return total


def _create_individual(size: int, mode: RouteMode) -> list[int]:
    remaining = [index for index in range(size) if index != ORIGIN_INDEX]
    random.shuffle(remaining)
    return [ORIGIN_INDEX, *remaining]


def _crossover(parent_a: list[int], parent_b: list[int]) -> list[int]:
    """Order crossover preserving ORIGIN_INDEX at position 0."""
    size = len(parent_a)
    if size <= 2:
        return parent_a[:]

    start, end = sorted(random.sample(range(1, size), 2))
    child: list[int | None] = [None] * size
    child[ORIGIN_INDEX] = ORIGIN_INDEX
    child[start : end + 1] = parent_a[start : end + 1]

    fill_index = (end + 1) % size
    for gene in parent_b:
        if gene == ORIGIN_INDEX or gene in child:
            continue
        while child[fill_index] is not None:
            fill_index = (fill_index + 1) % size
            if fill_index == ORIGIN_INDEX:
                fill_index = 1
        child[fill_index] = gene

    return [int(gene) for gene in child]


def _mutate(individual: list[int]) -> None:
    if len(individual) <= 2:
        return
    i, j = random.sample(range(1, len(individual)), 2)
    individual[i], individual[j] = individual[j], individual[i]


def optimize_order(
    distance_matrix: list[list[float]],
    mode: RouteMode = "closed",
) -> tuple[list[int], float]:
    """
    Return visit order (indices) and total distance in km.

    The first destination (index 0) is treated as the route origin.
    """
    size = len(distance_matrix)
    if size < 2:
        raise ValueError("At least two destinations are required")

    population = [_create_individual(size, mode) for _ in range(POPULATION_SIZE)]
    best_order = min(population, key=lambda route: _route_distance(route, distance_matrix, mode))
    best_cost = _route_distance(best_order, distance_matrix, mode)

    for _ in range(GENERATIONS):
        population.sort(key=lambda route: _route_distance(route, distance_matrix, mode))
        if _route_distance(population[0], distance_matrix, mode) < best_cost:
            best_order = population[0][:]
            best_cost = _route_distance(best_order, distance_matrix, mode)

        next_generation = [route[:] for route in population[:ELITE_COUNT]]

        while len(next_generation) < POPULATION_SIZE:
            tournament = random.sample(population, TOURNAMENT_SIZE)
            tournament.sort(key=lambda route: _route_distance(route, distance_matrix, mode))
            parent_a, parent_b = tournament[0], tournament[1]
            child = _crossover(parent_a, parent_b)
            if random.random() < MUTATION_RATE:
                _mutate(child)
            next_generation.append(child)

        population = next_generation

    return best_order, round(best_cost, 2)
