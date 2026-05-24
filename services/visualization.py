"""Visualization data helpers for Conjugate Gradient results."""

VISUALIZATION_GRID_SIZE = 41


def quadratic_value(matrix, target, point):
    """Evaluate 1/2 x^T A x - b^T x for visualization."""
    matrix_product = []

    for row in matrix:
        row_total = 0

        for index in range(len(point)):
            row_total += row[index] * point[index]

        matrix_product.append(row_total)

    quadratic_total = 0
    linear_total = 0

    for index in range(len(point)):
        quadratic_total += point[index] * matrix_product[index]
        linear_total += target[index] * point[index]

    return 0.5 * quadratic_total - linear_total


def build_iteration_path(initial_guess, steps):
    """Return the actual CG path from x0 through each computed x value."""
    path = [initial_guess.copy()]

    for step in steps:
        path.append(step["x"])

    return path


def make_axis_values(start, end, count):
    """Create evenly spaced axis values without adding numeric dependencies."""
    if count <= 1:
        return [start]

    step = (end - start) / (count - 1)
    values = []

    for index in range(count):
        values.append(start + (step * index))

    return values


def calculate_plot_bounds(path):
    """Create padded 2D plot bounds around the real iteration path."""
    x_values = []
    y_values = []

    for point in path:
        x_values.append(point[0])
        y_values.append(point[1])

    min_x = min(x_values)
    max_x = max(x_values)
    min_y = min(y_values)
    max_y = max(y_values)
    x_span = max_x - min_x
    y_span = max_y - min_y
    largest_span = max(x_span, y_span)
    padding = max(largest_span * 0.55, 1.0)

    return {
        "x_min": min_x - padding,
        "x_max": max_x + padding,
        "y_min": min_y - padding,
        "y_max": max_y + padding,
    }


def build_quadratic_visualization(matrix, target, path):
    """Build 2D/3D plot data for a 2x2 quadratic function."""
    bounds = calculate_plot_bounds(path)
    x_values = make_axis_values(
        bounds["x_min"],
        bounds["x_max"],
        VISUALIZATION_GRID_SIZE,
    )
    y_values = make_axis_values(
        bounds["y_min"],
        bounds["y_max"],
        VISUALIZATION_GRID_SIZE,
    )
    z_values = []

    for y_value in y_values:
        row = []

        for x_value in x_values:
            row.append(quadratic_value(matrix, target, [x_value, y_value]))

        z_values.append(row)

    path_z = []

    for point in path:
        path_z.append(quadratic_value(matrix, target, point))

    return {
        "A": matrix,
        "b": target,
        "path": path,
        "path_z": path_z,
        "solution": path[-1],
        "solution_z": path_z[-1],
        "bounds": bounds,
        "x_values": x_values,
        "y_values": y_values,
        "z_values": z_values,
    }


def add_visualization_values(result, matrix, target, initial_guess):
    """Attach visualization data derived from the real solver history."""
    result["system_size"] = len(target)
    result["iteration_path"] = build_iteration_path(initial_guess, result["steps"])

    if result["system_size"] == 2:
        result["quadratic_visualization"] = build_quadratic_visualization(
            matrix,
            target,
            result["iteration_path"],
        )

    return result
