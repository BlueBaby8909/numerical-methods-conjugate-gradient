# Numerical Methods Online Calculator

## Selected Topic

Conjugate Gradient Method

## Project Description

This project is a Flask web application for the Conjugate Gradient Method. It
explains the method, shows the main formulas, presents two worked examples, and
provides an interactive calculator for solving systems of linear equations in
the form `Ax = b`.

The calculator displays the final approximation, convergence status, residual
norm plot, iteration table, CSV/PDF exports, 2D/3D visualizations for 2 x 2
systems, and step-by-step iteration details.

## How to Run Locally

Install the project dependency:

```powershell
pip install -r requirements.txt
```

Run the Flask application:

```powershell
python app.py
```

Then open:

```text
http://127.0.0.1:5000
```

## Input Format

The calculator supports two input modes.

### Matrix Grid Mode

Choose a matrix size from `2 x 2` to `5 x 5`, then fill in the interactive
table for matrix `A`, vector `b`, and initial guess `x0`.

Example:

```text
A = [[4, 1], [1, 3]]
b = [1, 2]
x0 = [0, 0]
```

### Linear Equation Mode

Enter one linear equation per line. Supported variables are `x`, `y`, `z`, `w`,
and `v`.

Example:

```text
4x + y = 1
x + 3y = 2
```

Then type the initial guess as space-separated numbers.

Example:

```text
0 0
```

Tolerance should be a positive decimal number.

Example:

```text
0.000001
```

Maximum iterations should be a positive whole number.

Example:

```text
100
```

## Safe Input Parsing

The calculator does not use `eval()`. User input is parsed manually using
string splitting, loops, `float()` conversion for numerical values, and `int()`
conversion for the maximum iteration count. Invalid inputs are handled with
error messages instead of being executed as code.

The calculator assumes that matrix `A` is symmetric positive definite, which is
required for the Conjugate Gradient Method.

## Features

- Manual input validation with helpful error messages.
- Interactive matrix grid from 2 x 2 to 5 x 5.
- Ready-to-run grid examples from 2 x 2 to 5 x 5.
- Linear equation shorthand input for systems such as `4x + y = 1`.
- Step-by-step Conjugate Gradient iteration display.
- Residual norm convergence plot using Chart.js.
- 2D contour and 3D surface visualizations for 2 x 2 systems using Plotly.
- CSV and PDF export for the visible iteration table.
- Responsive calculator-focused layout.
- Two worked examples with mathematical steps.

## Vercel Link

TODO: Add your deployed Vercel project link here.
