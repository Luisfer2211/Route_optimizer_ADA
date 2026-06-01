from genetic_algorithm import optimize_order


def test_closed_route_returns_to_origin():
    matrix = [
        [0.0, 10.0, 15.0],
        [10.0, 0.0, 20.0],
        [15.0, 20.0, 0.0],
    ]
    order, total = optimize_order(matrix, mode="closed", fix_start=True)
    assert order[0] == 0
    assert len(order) == 3
    assert total > 0


def test_open_route_skips_return_leg():
    matrix = [
        [0.0, 10.0, 15.0],
        [10.0, 0.0, 20.0],
        [15.0, 20.0, 0.0],
    ]
    _, closed_total = optimize_order(matrix, mode="closed", fix_start=True)
    _, open_total = optimize_order(matrix, mode="open", fix_start=True)
    assert open_total <= closed_total


def test_free_start_finds_shorter_open_path():
    """A in the middle, B and C 50 km away on opposite sides — best open route is 100 km."""
    matrix = [
        [0.0, 50.0, 50.0],
        [50.0, 0.0, 100.0],
        [50.0, 100.0, 0.0],
    ]
    _, fixed_total = optimize_order(matrix, mode="open", fix_start=True)
    order, free_total = optimize_order(matrix, mode="open", fix_start=False)

    assert free_total == 100.0
    assert free_total < fixed_total
    assert order[0] in (1, 2)
