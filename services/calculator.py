"""Request and result assembly for the Conjugate Gradient calculator."""

from methods.conjugate_gradient import conjugate_method_with_steps
from services.input_parsing import (
    parse_equations,
    parse_grid_input,
    parse_positive_float,
    parse_positive_int,
    parse_vector,
    validate_symmetric,
)
from services.result_formatting import add_display_values
from services.visualization import add_visualization_values


MAX_GRID_SIZE = 5


def collect_grid_values(form):
    """Keep grid values available so failed submissions can repopulate inputs."""
    matrix_values = {}
    vector_values = {}
    x0_values = {}

    for row_index in range(MAX_GRID_SIZE):
        for column_index in range(MAX_GRID_SIZE):
            field_name = "a_" + str(row_index) + "_" + str(column_index)
            matrix_values[field_name] = form.get(field_name, "")

        b_field = "b_" + str(row_index)
        x0_field = "x0_" + str(row_index)
        vector_values[b_field] = form.get(b_field, "")
        x0_values[x0_field] = form.get(x0_field, "")

    return matrix_values, vector_values, x0_values


def parse_calculator_submission(form):
    """Normalize either input mode into A, b, x0, tolerance, and iteration limit."""
    input_mode = form.get("input_mode", "grid")
    matrix_size = form.get("matrix_size", "2")
    equations_text = form.get("equations", "")
    initial_guess_text = form.get("initial_guess", "")

    if input_mode == "grid":
        matrix, target, initial_guess, parsed_size = parse_grid_input(form)
        matrix_size = str(parsed_size)
    elif input_mode == "equations":
        matrix, target, _variables = parse_equations(equations_text)
        initial_guess = parse_vector(initial_guess_text, "Initial guess x0")
    else:
        raise ValueError("Choose either matrix grid or equation input mode.")

    tolerance = parse_positive_float(form.get("tolerance", ""), "Tolerance")
    max_iterations = parse_positive_int(
        form.get("max_iterations", ""),
        "Maximum iterations",
    )
    validate_symmetric(matrix)

    return {
        "input_mode": input_mode,
        "matrix_size": matrix_size,
        "equations_text": equations_text,
        "initial_guess_text": initial_guess_text,
        "matrix": matrix,
        "target": target,
        "initial_guess": initial_guess,
        "tolerance": tolerance,
        "max_iterations": max_iterations,
    }


def solve_calculator_submission(submission):
    """Run the solver and attach display and visualization data."""
    result = conjugate_method_with_steps(
        submission["matrix"],
        submission["target"],
        submission["initial_guess"],
        submission["max_iterations"],
        submission["tolerance"],
    )
    result["plot_labels"] = [
        index for index in range(len(result["residual_norms"]))
    ]
    add_visualization_values(
        result,
        submission["matrix"],
        submission["target"],
        submission["initial_guess"],
    )
    add_display_values(result)

    return result


def make_template_context(form):
    """Build the default template context for GET and POST requests."""
    matrix_values, vector_values, x0_values = collect_grid_values(form)

    return {
        "result": None,
        "error": None,
        "input_mode": form.get("input_mode", "grid"),
        "matrix_size": form.get("matrix_size", "2"),
        "matrix_values": matrix_values,
        "vector_values": vector_values,
        "x0_values": x0_values,
        "equations_text": form.get("equations", ""),
        "initial_guess_text": form.get("initial_guess", ""),
        "tolerance_text": form.get("tolerance", ""),
        "max_iterations_text": form.get("max_iterations", ""),
        "variable_names": [],
    }
