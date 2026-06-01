from genetic_algorithm import optimize_order


def test_closed_route_returns_to_origin():
    matrix = [
        [0.0, 10.0, 15.0],
        [10.0, 0.0, 20.0],
        [15.0, 20.0, 0.0],
    ]
    order, total = optimize_order(matrix, mode="closed")
    assert order[0] == 0
    assert len(order) == 3
    assert total > 0


def test_open_route_skips_return_leg():
    matrix = [
        [0.0, 10.0, 15.0],
        [10.0, 0.0, 20.0],
        [15.0, 20.0, 0.0],
    ]
    _, closed_total = optimize_order(matrix, mode="closed")
    _, open_total = optimize_order(matrix, mode="open")
    assert open_total <= closed_total
