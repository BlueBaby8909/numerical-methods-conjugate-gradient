"""Pure Python helpers for the Conjugate Gradient Method."""


def subtract_vectors(u, v):
    result = []

    for i in range(len(u)):
        result.append(u[i] - v[i])

    return result


def add_vectors(u, v):
    result = []

    for i in range(len(u)):
        result.append(u[i] + v[i])

    return result


def dot(u, v):
    total = 0

    for i in range(len(u)):
        total += u[i] * v[i]

    return total


def matrix_vector_multiply(A, x):
    if len(A) == 0:
        raise ValueError("Matrix A must not be empty.")

    if len(A[0]) != len(x):
        raise ValueError("Number of columns in A must match length of x.")

    result = []

    for i in range(len(A)):
        if len(A[i]) != len(x):
            raise ValueError("Each row in A must have the same length as x.")

        row_sum = 0

        for j in range(len(x)):
            row_sum += A[i][j] * x[j]

        result.append(row_sum)

    return result


def scalar_multiply(scalar, vector):
    result = []

    for i in range(len(vector)):
        result.append(scalar * vector[i])

    return result


def vector_norm(v):
    return dot(v, v) ** 0.5


def validate_inputs(A, b, x0, max_iterations, tolerance):
    if len(A) == 0:
        raise ValueError("Matrix A must not be empty.")

    if len(b) == 0:
        raise ValueError("Vector b must not be empty.")

    if len(A) != len(b):
        raise ValueError("Matrix A must have the same number of rows as vector b.")

    for row in A:
        if len(row) != len(b):
            raise ValueError("Matrix A must be square.")

    if len(x0) != 0 and len(x0) != len(b):
        raise ValueError("Initial guess x0 must have the same length as vector b.")

    if max_iterations <= 0:
        raise ValueError("Maximum iterations must be greater than zero.")

    if tolerance <= 0:
        raise ValueError("Tolerance must be greater than zero.")


def _initial_state(A, b, x0):
    if len(x0) == 0:
        x0 = [0 for _ in range(len(b))]

    Ax0 = matrix_vector_multiply(A, x0)
    r0 = subtract_vectors(b, Ax0)
    p0 = r0.copy()

    return x0, r0, p0, vector_norm(r0)


def _print_iteration_step(step):
    print("Iteration", step["iteration"])
    print("alpha =", step["alpha"])
    print("x =", step["x"])
    print("residual =", step["residual"])
    print()


def _run_conjugate_gradient(A, b, x0, max_iterations, tolerance, on_step=None):
    validate_inputs(A, b, x0, max_iterations, tolerance)

    x0, r0, p0, initial_residual_norm = _initial_state(A, b, x0)
    steps = []
    residual_norms = [initial_residual_norm]

    if initial_residual_norm < tolerance:
        return {
            "solution": x0,
            "iterations": 0,
            "converged": True,
            "message": "Initial guess already satisfies the tolerance.",
            "residual_norms": residual_norms,
            "steps": steps,
        }

    for i in range(max_iterations):
        Ap = matrix_vector_multiply(A, p0)
        r_dot_r = dot(r0, r0)
        p_dot_Ap = dot(p0, Ap)

        if p_dot_Ap <= 0:
            raise ValueError("Matrix A must be symmetric positive definite.")

        alpha = r_dot_r / p_dot_Ap
        alpha_p = scalar_multiply(alpha, p0)
        x_new = add_vectors(x0, alpha_p)
        alpha_Ap = scalar_multiply(alpha, Ap)
        r_new = subtract_vectors(r0, alpha_Ap)
        residual_norm = vector_norm(r_new)
        r_new_dot_r_new = dot(r_new, r_new)

        beta = None
        p_new = None
        if residual_norm >= tolerance:
            beta = r_new_dot_r_new / r_dot_r
            beta_p = scalar_multiply(beta, p0)
            p_new = add_vectors(r_new, beta_p)

        step = {
            "iteration": i + 1,
            "alpha": alpha,
            "beta": beta,
            "x": x_new,
            "residual": r_new,
            "residual_norm": residual_norm,
            "direction": p0,
            "ap": Ap,
        }
        steps.append(step)
        residual_norms.append(residual_norm)

        if on_step is not None:
            on_step(step)

        if residual_norm < tolerance:
            return {
                "solution": x_new,
                "iterations": i + 1,
                "converged": True,
                "message": "Converged within the selected tolerance.",
                "residual_norms": residual_norms,
                "steps": steps,
            }

        x0 = x_new
        r0 = r_new
        p0 = p_new

    raise ValueError(
        "Conjugate Gradient did not converge within the maximum iterations."
    )


def conjugate_method(A, b, x0, max_iterations, tolerance, show_steps=False):
    result = _run_conjugate_gradient(
        A,
        b,
        x0,
        max_iterations,
        tolerance,
        _print_iteration_step if show_steps else None,
    )
    return result["solution"]


def conjugate_method_with_steps(A, b, x0, max_iterations, tolerance):
    """Solve Ax = b and return iteration details for the web calculator."""
    return _run_conjugate_gradient(A, b, x0, max_iterations, tolerance)
