"""Input parsing and validation helpers for calculator forms."""

SUPPORTED_VARIABLES = ["x", "y", "z", "w", "v"]


def parse_vector(text, field_name):
    """Convert a space-separated input string into a numeric vector."""
    if text.strip() == "":
        raise ValueError(field_name + " is required.")

    vector = []

    for value in text.split():
        try:
            vector.append(float(value))
        except ValueError:
            raise ValueError(field_name + " contains a non-numeric value: " + value)

    return vector


def parse_number(text, field_name):
    """Parse a required numeric value."""
    if text.strip() == "":
        raise ValueError(field_name + " is required.")

    try:
        return float(text)
    except ValueError:
        raise ValueError(field_name + " must be a number.")


def parse_positive_float(text, field_name):
    """Parse a required positive decimal value."""
    value = parse_number(text, field_name)

    if value <= 0:
        raise ValueError(field_name + " must be greater than zero.")

    return value


def parse_matrix_size(text):
    """Parse the matrix dimension used by the interactive grid."""
    try:
        size = int(text)
    except ValueError:
        raise ValueError("Matrix size must be a whole number from 2 to 5.")

    if size < 2 or size > 5:
        raise ValueError("Matrix size must be from 2 to 5.")

    return size


def parse_positive_int(text, field_name):
    """Parse a required positive whole number."""
    if text.strip() == "":
        raise ValueError(field_name + " is required.")

    try:
        value = int(text)
    except ValueError:
        raise ValueError(field_name + " must be a whole number.")

    if value <= 0:
        raise ValueError(field_name + " must be greater than zero.")

    return value


def parse_grid_input(form):
    """Parse matrix, vector, and initial guess values from grid fields."""
    size = parse_matrix_size(form.get("matrix_size", "2"))
    matrix = []
    target = []
    initial_guess = []

    for row_index in range(size):
        row = []

        for column_index in range(size):
            field_name = (
                "Matrix A row "
                + str(row_index + 1)
                + ", column "
                + str(column_index + 1)
            )
            field_value = form.get("a_" + str(row_index) + "_" + str(column_index), "")
            row.append(parse_number(field_value, field_name))

        matrix.append(row)

        target.append(
            parse_number(
                form.get("b_" + str(row_index), ""),
                "Vector b row " + str(row_index + 1),
            )
        )
        initial_guess.append(
            parse_number(
                form.get("x0_" + str(row_index), ""),
                "Initial guess x0 row " + str(row_index + 1),
            )
        )

    return matrix, target, initial_guess, size


def split_terms(expression):
    """Split a linear expression into signed terms."""
    expression = expression.replace(" ", "")

    if expression == "":
        raise ValueError("Each equation must have terms before the equals sign.")

    if expression[0] not in "+-":
        expression = "+" + expression

    terms = []
    term = expression[0]

    for character in expression[1:]:
        if character in "+-":
            if term in ["+", "-"]:
                raise ValueError("Equation contains an empty term.")

            terms.append(term)
            term = character
        else:
            term += character

    if term in ["+", "-"]:
        raise ValueError("Equation contains an empty term.")

    terms.append(term)
    return terms


def parse_linear_side(expression):
    """Parse the left side of a linear equation into coefficients."""
    coefficients = {}
    forbidden_characters = ["*", "/", "^", "(", ")"]

    for character in forbidden_characters:
        if character in expression:
            raise ValueError(
                "Equation input supports only linear terms such as 4x + y."
            )

    for term in split_terms(expression):
        variables_in_term = []

        for variable in SUPPORTED_VARIABLES:
            if variable in term:
                variables_in_term.append(variable)

        if len(variables_in_term) != 1:
            raise ValueError("Each term must contain exactly one supported variable.")

        variable = variables_in_term[0]

        if term.count(variable) != 1:
            raise ValueError("Repeated variables in one term are not supported.")

        variable_index = term.index(variable)
        coefficient_text = term[:variable_index]
        suffix = term[variable_index + 1:]

        if suffix != "":
            raise ValueError("Variables cannot have trailing characters.")

        if coefficient_text in ["+", ""]:
            coefficient = 1.0
        elif coefficient_text == "-":
            coefficient = -1.0
        else:
            try:
                coefficient = float(coefficient_text)
            except ValueError:
                raise ValueError("Invalid coefficient: " + coefficient_text)

        if variable in coefficients:
            coefficients[variable] += coefficient
        else:
            coefficients[variable] = coefficient

    return coefficients


def parse_equations(text):
    """Parse linear equation shorthand into matrix A and vector b."""
    if text.strip() == "":
        raise ValueError("Equations are required.")

    lines = []

    for line in text.splitlines():
        if line.strip() != "":
            lines.append(line.strip())

    if len(lines) < 2 or len(lines) > 5:
        raise ValueError("Enter 2 to 5 equations.")

    parsed_rows = []
    used_variables = []
    targets = []

    for row_index, line in enumerate(lines):
        if line.count("=") != 1:
            raise ValueError(
                "Equation " + str(row_index + 1) + " must contain exactly one = sign."
            )

        left_side, right_side = line.split("=")
        coefficients = parse_linear_side(left_side)

        try:
            target = float(right_side.strip())
        except ValueError:
            raise ValueError(
                "Right side of equation "
                + str(row_index + 1)
                + " must be a number."
            )

        for variable in SUPPORTED_VARIABLES:
            if variable in coefficients and variable not in used_variables:
                used_variables.append(variable)

        parsed_rows.append(coefficients)
        targets.append(target)

    ordered_variables = []

    for variable in SUPPORTED_VARIABLES:
        if variable in used_variables:
            ordered_variables.append(variable)

    if len(ordered_variables) != len(lines):
        raise ValueError(
            "The number of equations must match the number of variables used."
        )

    matrix = []

    for coefficients in parsed_rows:
        row = []

        for variable in ordered_variables:
            row.append(coefficients.get(variable, 0.0))

        matrix.append(row)

    return matrix, targets, ordered_variables


def validate_symmetric(matrix):
    """Validate that a square matrix is symmetric."""
    for row in matrix:
        if len(row) != len(matrix):
            raise ValueError("Matrix A must be square before symmetry can be checked.")

    for i in range(len(matrix)):
        for j in range(i + 1, len(matrix)):
            if matrix[i][j] != matrix[j][i]:
                raise ValueError(
                    "Matrix A must be symmetric. Entry A["
                    + str(i + 1)
                    + "]["
                    + str(j + 1)
                    + "] does not match A["
                    + str(j + 1)
                    + "]["
                    + str(i + 1)
                    + "]."
                )
