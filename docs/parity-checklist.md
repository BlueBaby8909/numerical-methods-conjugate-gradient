# Conjugate Gradient Parity Checklist

Use this checklist before and after behavior-preserving refactors.

## Routes and Forms

- `GET /` renders the method landing page and links to `/conjugate-gradient`.
- `GET /conjugate-gradient` renders the calculator with grid mode selected, 2x2 as the default size, and example buttons for 2x2 through 5x5.
- `POST /conjugate-gradient` accepts both matrix-grid input and equation input.
- Invalid input returns the same page with a readable error message and preserves submitted values.

## Solver and Results

- Known 2x2, 3x3, 4x4, and 5x5 examples converge to their expected clean solutions.
- The public functions `conjugate_method` and `conjugate_method_with_steps` remain import-compatible.
- Display values use six decimal places and near-zero values render as `0.000000`.
- Initial guesses that already satisfy tolerance show the empty iteration-table state.

## Client Experience

- Calculate updates results without a full page reload when JavaScript is available.
- The visible calculate button does not cause a viewport jump during the result refresh.
- Normal section navigation still scrolls to Calculator, Formula, and Examples.
- The result container receives focus with `preventScroll` after calculation.

## Visualizations and Exports

- 2D and 3D Plotly visualizations render only for 2x2 systems.
- Larger systems show the visualization-unavailable message and still show residual/table tabs.
- CSV and PDF exports include method metadata and the visible iteration table rows.
- Empty iteration states disable export buttons and show a helpful message.

## Responsive Layout

- Desktop and mobile calculator layouts have no document-level horizontal overflow.
- Plot containers resize with their panels.
- Reduced-motion users keep non-smooth scroll and near-zero animation duration.
