"""Display formatting helpers for calculator results."""

DISPLAY_DECIMALS = 6
ZERO_DISPLAY_THRESHOLD = 0.5 * (10 ** -DISPLAY_DECIMALS)


def format_display_number(value):
    """Format numeric output for readable calculator display."""
    if abs(value) < ZERO_DISPLAY_THRESHOLD:
        value = 0

    return f"{value:.{DISPLAY_DECIMALS}f}"


def format_display_vector(vector):
    """Format a vector using the calculator display precision."""
    formatted_values = []

    for value in vector:
        formatted_values.append(format_display_number(value))

    return "[" + ", ".join(formatted_values) + "]"


def add_display_values(result):
    """Attach rounded display-only values without changing raw results."""
    result["display_solution"] = format_display_vector(result["solution"])
    result["display_final_residual_norm"] = format_display_number(
        result["residual_norms"][-1]
    )

    for step in result["steps"]:
        step["display_alpha"] = format_display_number(step["alpha"])
        step["display_beta"] = (
            format_display_number(step["beta"])
            if step["beta"] is not None
            else None
        )
        step["display_x"] = format_display_vector(step["x"])
        step["display_residual"] = format_display_vector(step["residual"])
        step["display_residual_norm"] = format_display_number(
            step["residual_norm"]
        )
        step["display_direction"] = format_display_vector(step["direction"])
        step["display_ap"] = format_display_vector(step["ap"])

    return result
