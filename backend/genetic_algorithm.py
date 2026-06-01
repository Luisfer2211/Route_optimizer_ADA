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


def _route_distance(
    order: list[int],
    matrix: list[list[float]],
    mode: RouteMode,
    *,
    fix_start: bool,
) -> float:
    total = 0.0
    for index in range(len(order) - 1):
        total += matrix[order[index]][order[index + 1]]
    if mode == "closed":
        total += matrix[order[-1]][order[0]]
    return total


def _create_individual(size: int, *, fix_start: bool) -> list[int]:
    if fix_start:
        remaining = [index for index in range(size) if index != ORIGIN_INDEX]
        random.shuffle(remaining)
        return [ORIGIN_INDEX, *remaining]

    order = list(range(size))
    random.shuffle(order)
    return order


def _crossover_fixed_start(parent_a: list[int], parent_b: list[int]) -> list[int]:
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


def _crossover_free_start(parent_a: list[int], parent_b: list[int]) -> list[int]:
    size = len(parent_a)
    if size <= 2:
        return parent_a[:]

    start, end = sorted(random.sample(range(size), 2))
    child: list[int | None] = [None] * size
    child[start : end + 1] = parent_a[start : end + 1]

    fill_index = (end + 1) % size
    for gene in parent_b:
        if gene in child:
            continue
        while child[fill_index] is not None:
            fill_index = (fill_index + 1) % size
        child[fill_index] = gene

    return [int(gene) for gene in child]


def _mutate(individual: list[int], *, fix_start: bool) -> None:
    if len(individual) <= 2:
        return
    if fix_start:
        i, j = random.sample(range(1, len(individual)), 2)
    else:
        i, j = random.sample(range(len(individual)), 2)
    individual[i], individual[j] = individual[j], individual[i]


def optimize_order(
    distance_matrix: list[list[float]],
    mode: RouteMode = "closed",
    *,
    fix_start: bool = True,
) -> tuple[list[int], float]:
    """
    Return visit order (indices) and total distance in km.

    When fix_start is True, destination index 0 (first in the request list)
    is the mandatory route origin. When False, any stop may be the start/end
    depending on mode, to minimize total driving distance.
    """
    size = len(distance_matrix)
    if size < 2:
        raise ValueError("At least two destinations are required")

    distance_kwargs = {"fix_start": fix_start}

    def cost(route: list[int]) -> float:
        return _route_distance(route, distance_matrix, mode, **distance_kwargs)

    population = [_create_individual(size, fix_start=fix_start) for _ in range(POPULATION_SIZE)]
    best_order = min(population, key=cost)
    best_cost = cost(best_order)

    crossover = _crossover_fixed_start if fix_start else _crossover_free_start

    for _ in range(GENERATIONS):
        population.sort(key=cost)
        if cost(population[0]) < best_cost:
            best_order = population[0][:]
            best_cost = cost(best_order)

        next_generation = [route[:] for route in population[:ELITE_COUNT]]

        while len(next_generation) < POPULATION_SIZE:
            tournament = random.sample(population, TOURNAMENT_SIZE)
            tournament.sort(key=cost)
            parent_a, parent_b = tournament[0], tournament[1]
            child = crossover(parent_a, parent_b)
            if random.random() < MUTATION_RATE:
                _mutate(child, fix_start=fix_start)
            next_generation.append(child)

        population = next_generation

    return best_order, round(best_cost, 2)
