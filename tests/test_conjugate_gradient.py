import io
import unittest
from contextlib import redirect_stdout
from pathlib import Path

from app import app
from methods.conjugate_gradient import conjugate_method, conjugate_method_with_steps
from services.calculator import parse_calculator_submission, solve_calculator_submission
from services.input_parsing import parse_equations
from services.result_formatting import format_display_number
from services.visualization import VISUALIZATION_GRID_SIZE, add_visualization_values


class ConjugateGradientTests(unittest.TestCase):
    def test_known_two_by_two_system(self):
        matrix = [[4, 1], [1, 3]]
        target = [1, 2]
        initial_guess = [0, 0]

        solution = conjugate_method(matrix, target, initial_guess, 100, 0.000001)

        self.assertAlmostEqual(solution[0], 0.09090909090909091)
        self.assertAlmostEqual(solution[1], 0.6363636363636364)

    def test_step_history_for_known_system(self):
        result = conjugate_method_with_steps(
            [[4, 1], [1, 3]],
            [1, 2],
            [0, 0],
            100,
            0.000001,
        )

        self.assertTrue(result["converged"])
        self.assertEqual(result["iterations"], 2)
        self.assertEqual(result["residual_norms"][-1], 0.0)
        self.assertAlmostEqual(result["steps"][0]["alpha"], 0.25)

    def test_solution_only_and_step_solver_share_results(self):
        matrix = [[4, 1], [1, 3]]
        target = [1, 2]
        initial_guess = [0, 0]

        solution = conjugate_method(matrix, target, initial_guess, 100, 0.000001)
        result = conjugate_method_with_steps(
            matrix,
            target,
            initial_guess,
            100,
            0.000001,
        )

        self.assertEqual(solution, result["solution"])
        self.assertEqual(result["iterations"], 2)

    def test_show_steps_debug_output_remains_compatible(self):
        stream = io.StringIO()

        with redirect_stdout(stream):
            conjugate_method([[4, 1], [1, 3]], [1, 2], [0, 0], 100, 0.000001, True)

        output = stream.getvalue()
        self.assertIn("Iteration 1", output)
        self.assertIn("alpha =", output)
        self.assertIn("residual =", output)

    def test_spd_and_iteration_failure_errors_remain_stable(self):
        with self.assertRaisesRegex(
            ValueError,
            "Matrix A must be symmetric positive definite.",
        ):
            conjugate_method_with_steps([[0, 0], [0, -1]], [1, 1], [0, 0], 10, 0.000001)

        with self.assertRaisesRegex(
            ValueError,
            "Conjugate Gradient did not converge within the maximum iterations.",
        ):
            conjugate_method_with_steps([[4, 1], [1, 3]], [1, 2], [0, 0], 1, 0.000001)

    def test_larger_grid_examples_converge_to_clean_solutions(self):
        examples = {
            3: (
                [[4, 1, 0], [1, 3, 1], [0, 1, 2]],
                [6, 10, 8],
                [1, 2, 3],
            ),
            4: (
                [[6, 1, 0, 0], [1, 5, 1, 0], [0, 1, 4, 1], [0, 0, 1, 3]],
                [8, 14, 18, 15],
                [1, 2, 3, 4],
            ),
            5: (
                [
                    [7, 1, 0, 0, 0],
                    [1, 6, 1, 0, 0],
                    [0, 1, 5, 1, 0],
                    [0, 0, 1, 4, 1],
                    [0, 0, 0, 1, 3],
                ],
                [9, 16, 21, 24, 19],
                [1, 2, 3, 4, 5],
            ),
        }

        for size, (matrix, target, expected_solution) in examples.items():
            with self.subTest(size=size):
                result = conjugate_method_with_steps(
                    matrix,
                    target,
                    [0] * size,
                    100,
                    0.000001,
                )

                self.assertTrue(result["converged"])
                self.assertLessEqual(result["iterations"], size)
                for actual, expected in zip(result["solution"], expected_solution):
                    self.assertAlmostEqual(actual, expected)

    def test_equation_parser_supports_omitted_coefficients(self):
        matrix, target, variables = parse_equations("x - y = 1\n-x + 3y = 2")

        self.assertEqual(matrix, [[1.0, -1.0], [-1.0, 3.0]])
        self.assertEqual(target, [1.0, 2.0])
        self.assertEqual(variables, ["x", "y"])

    def test_equation_parser_rejects_nonlinear_terms(self):
        with self.assertRaises(ValueError):
            parse_equations("x^2 + y = 1\nx + 3y = 2")

    def test_result_display_uses_six_decimal_places(self):
        client = app.test_client()
        response = client.post(
            "/conjugate-gradient",
            data={
                "input_mode": "grid",
                "matrix_size": "2",
                "a_0_0": "4",
                "a_0_1": "1",
                "a_1_0": "1",
                "a_1_1": "3",
                "b_0": "1",
                "b_1": "2",
                "x0_0": "0",
                "x0_1": "0",
                "tolerance": "0.000001",
                "max_iterations": "100",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn(b"[0.090909, 0.636364]", response.data)
        self.assertIn(b"0.000000", response.data)
        self.assertNotIn(b"0.09090909090909091</pre>", response.data)
        self.assertIn(b'id="calculation-feedback"', response.data)
        self.assertIn(b'tabindex="-1"', response.data)

    def test_calculator_service_preserves_submission_and_result_shape(self):
        submission = parse_calculator_submission({
            "input_mode": "grid",
            "matrix_size": "2",
            "a_0_0": "4",
            "a_0_1": "1",
            "a_1_0": "1",
            "a_1_1": "3",
            "b_0": "1",
            "b_1": "2",
            "x0_0": "0",
            "x0_1": "0",
            "tolerance": "0.000001",
            "max_iterations": "100",
        })
        result = solve_calculator_submission(submission)

        self.assertEqual(submission["input_mode"], "grid")
        self.assertEqual(submission["matrix_size"], "2")
        self.assertIn("display_solution", result)
        self.assertIn("plot_labels", result)
        self.assertIn("quadratic_visualization", result)

    def test_invalid_post_preserves_error_page_contract(self):
        client = app.test_client()
        response = client.post(
            "/conjugate-gradient",
            data={
                "input_mode": "grid",
                "matrix_size": "2",
                "a_0_0": "4",
                "a_0_1": "2",
                "a_1_0": "1",
                "a_1_1": "3",
                "b_0": "1",
                "b_1": "2",
                "x0_0": "0",
                "x0_1": "0",
                "tolerance": "0.000001",
                "max_iterations": "100",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Matrix A must be symmetric.", response.data)
        self.assertIn(b'value="4"', response.data)

    def test_demo_script_was_removed_from_web_app_surface(self):
        self.assertFalse(Path("main.py").exists())
        self.assertTrue(Path("docs/parity-checklist.md").exists())

    def test_near_zero_display_is_clean(self):
        self.assertEqual(format_display_number(2.220446049250313e-16), "0.000000")

    def test_content_sections_have_minimize_controls(self):
        client = app.test_client()
        response = client.get("/conjugate-gradient")
        html = response.data.decode()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(html.count('class="section-toggle"'), 4)
        self.assertEqual(html.count('class="section-toggle-icon"'), 4)
        self.assertIn('aria-label="Minimize Discussion"', html)
        self.assertIn('aria-label="Minimize Formula"', html)
        self.assertIn('aria-label="Minimize Worked Example 1"', html)
        self.assertIn('aria-label="Minimize Worked Example 2"', html)
        self.assertIn('id="discussion" data-collapsible-section', html)
        self.assertIn('id="formula" data-collapsible-section', html)
        self.assertIn('id="examples" data-collapsible-section', html)
        self.assertIn('id="example-2" data-collapsible-section', html)
        self.assertNotIn(
            'class="section calculator" id="calculator" data-collapsible-section',
            html,
        )

    def test_minimize_controls_refresh_scroll_layout(self):
        client = app.test_client()
        response = client.get("/conjugate-gradient")
        html = response.data.decode()
        script = Path("static/js/conjugate_gradient.js").read_text()
        navigation_script = Path("static/js/site_navigation.js").read_text()
        motion_script = Path("static/js/site_motion.js").read_text()

        self.assertEqual(response.status_code, 200)
        self.assertIn("js/conjugate_gradient.js", html)
        self.assertIn("js/site_navigation.js", html)
        self.assertIn("gsap.min.js", html)
        self.assertIn("js/site_motion.js", html)
        self.assertIn('action="/conjugate-gradient#calculation-feedback"', html)
        self.assertIn("function refreshSectionLayout()", script)
        self.assertIn('window.dispatchEvent(new Event("resize"))', script)
        self.assertIn("correctElementScroll", navigation_script)
        self.assertIn("correctElementScroll(\n            feedbackTarget", script)
        self.assertIn('behavior: "auto"', navigation_script)
        self.assertIn("preventScroll: true", script)
        self.assertIn("waitForStableLayout", navigation_script)
        self.assertIn("prefers-reduced-motion: reduce", motion_script)
        self.assertIn("IntersectionObserver", motion_script)

    def test_calculator_submit_uses_fetch_without_full_reload(self):
        script = Path("static/js/conjugate_gradient.js").read_text()

        self.assertIn("async function handleCalculatorSubmit(event)", script)
        self.assertIn("event.preventDefault()", script)
        self.assertIn("fetch(submitUrl", script)
        self.assertIn('new FormData(calculatorForm)', script)
        self.assertIn('"X-Requested-With": "fetch"', script)
        self.assertIn("calculationFeedback.innerHTML = incomingFeedback.innerHTML", script)
        self.assertIn("showLoadingFeedback()", script)
        self.assertIn("revealFeedback()", script)
        self.assertIn("function holdViewportPosition(position)", script)
        self.assertIn('behavior: "auto"', script)
        self.assertIn('calculatorForm.classList.toggle("is-submitting", isBusy)', script)
        self.assertIn('replayClass(calculationFeedback, "result-enter", 520)', script)
        self.assertNotIn("correctElementScroll(calculationFeedback)", script)
        self.assertIn('calculatorForm.addEventListener("submit", handleCalculatorSubmit)', script)

    def test_interface_has_smooth_in_place_feedback_states(self):
        script = Path("static/js/conjugate_gradient.js").read_text()
        styles = Path("static/css/styles.css").read_text()

        self.assertIn('class="result loading-result"', script)
        self.assertIn('replayClass(matrixGrid, "is-refreshing", 360)', script)
        self.assertIn(".loading-result", styles)
        self.assertIn(".result-enter .summary-card", styles)
        self.assertIn("@keyframes loading-sweep", styles)
        self.assertIn("@keyframes fade-slide-up", styles)
        self.assertIn("@keyframes soft-flash", styles)
        self.assertIn('mjx-container[display="true"]', styles)
        self.assertIn("overflow-x: hidden", styles)
        self.assertIn("@media (prefers-reduced-motion: reduce)", styles)

    def test_responsive_layout_has_tablet_and_narrow_phone_breakpoints(self):
        styles = Path("static/css/styles.css").read_text()

        self.assertIn("@media (max-width: 980px)", styles)
        self.assertIn("@media (max-width: 760px)", styles)
        self.assertIn("@media (max-width: 380px)", styles)
        self.assertIn(".summary-grid", styles)
        self.assertIn("flex-wrap: nowrap;", styles)
        self.assertIn("scrollbar-width: none;", styles)
        self.assertIn("min-width: max-content;", styles)
        self.assertIn("scroll-snap-type: x mandatory;", styles)
        self.assertIn("scroll-snap-align: start;", styles)
        self.assertIn(".calculator .visualization-tab", styles)
        self.assertIn(".visualization-tabs-scroll-hint", styles)
        self.assertIn("Swipe tabs", Path("templates/partials/conjugate_gradient_feedback.html").read_text())
        self.assertIn("grid-template-columns: repeat(2, minmax(0, 1fr));", styles)
        self.assertIn(".example-button-group", styles)
        self.assertIn("min-height: clamp(340px, 72vw, 460px);", styles)
        self.assertIn("--matrix-cell-min", styles)
        self.assertIn("display: grid;", styles)
        self.assertIn("width: 100%;", styles)

    def test_grid_example_controls_render_for_all_supported_sizes(self):
        client = app.test_client()
        response = client.get("/conjugate-gradient")
        html = response.data.decode()

        self.assertEqual(response.status_code, 200)
        for size in [2, 3, 4, 5]:
            self.assertIn(f'data-example-size="{size}"', html)
            self.assertIn(f"Load {size}x{size}", html)

    def test_grid_examples_are_size_based_in_javascript(self):
        script = Path("static/js/conjugate_gradient.js").read_text()

        self.assertIn("const gridExamples = {", script)
        self.assertIn("gridExampleButtons", script)
        self.assertIn("function setGridExample(size)", script)
        self.assertIn("matrixSizeSelect.value = String(size)", script)
        self.assertIn("setGridExample(Number(button.dataset.exampleSize))", script)
        self.assertIn("target: [6, 10, 8]", script)
        self.assertIn("target: [8, 14, 18, 15]", script)
        self.assertIn("target: [9, 16, 21, 24, 19]", script)

    def test_two_by_two_visualization_payload_uses_real_path(self):
        result = conjugate_method_with_steps(
            [[4, 1], [1, 3]],
            [1, 2],
            [0, 0],
            100,
            0.000001,
        )
        add_visualization_values(result, [[4, 1], [1, 3]], [1, 2], [0, 0])

        self.assertEqual(result["system_size"], 2)
        self.assertEqual(result["iteration_path"][0], [0, 0])
        self.assertEqual(result["iteration_path"][-1], result["solution"])
        self.assertIn("quadratic_visualization", result)
        self.assertEqual(
            len(result["quadratic_visualization"]["x_values"]),
            VISUALIZATION_GRID_SIZE,
        )
        self.assertEqual(
            len(result["quadratic_visualization"]["z_values"]),
            VISUALIZATION_GRID_SIZE,
        )
        self.assertEqual(
            len(result["quadratic_visualization"]["z_values"][0]),
            VISUALIZATION_GRID_SIZE,
        )

    def test_three_by_three_has_no_quadratic_visualization_payload(self):
        result = conjugate_method_with_steps(
            [[4, 1, 0], [1, 3, 0], [0, 0, 2]],
            [1, 2, 3],
            [0, 0, 0],
            100,
            0.000001,
        )
        add_visualization_values(
            result,
            [[4, 1, 0], [1, 3, 0], [0, 0, 2]],
            [1, 2, 3],
            [0, 0, 0],
        )

        self.assertEqual(result["system_size"], 3)
        self.assertIn("iteration_path", result)
        self.assertNotIn("quadratic_visualization", result)

    def test_visualization_tabs_render_for_two_by_two_result(self):
        client = app.test_client()
        response = client.post(
            "/conjugate-gradient",
            data={
                "input_mode": "grid",
                "matrix_size": "2",
                "a_0_0": "4",
                "a_0_1": "1",
                "a_1_0": "1",
                "a_1_1": "3",
                "b_0": "1",
                "b_1": "2",
                "x0_0": "0",
                "x0_1": "0",
                "tolerance": "0.000001",
                "max_iterations": "100",
            },
        )
        html = response.data.decode()

        self.assertEqual(response.status_code, 200)
        self.assertIn("2D Contour", html)
        self.assertIn("3D Surface", html)
        self.assertIn("Residual Graph", html)
        self.assertIn("Iteration Table", html)
        self.assertIn('id="contourPlot"', html)
        self.assertIn('class="surface-reading-guide"', html)
        self.assertIn("Export CSV", html)
        self.assertIn("Export PDF", html)
        self.assertIn("js/table_exports.js", html)
        contour_tab = html[html.find('id="tab-contour"'):html.find('id="tab-contour"') + 260]
        self.assertIn('aria-selected="true"', contour_tab)
        self.assertIn("cdn.plot.ly", html)

    def test_iteration_table_export_payload_contains_metadata_and_rows(self):
        client = app.test_client()
        response = client.post(
            "/conjugate-gradient",
            data={
                "input_mode": "grid",
                "matrix_size": "2",
                "a_0_0": "4",
                "a_0_1": "1",
                "a_1_0": "1",
                "a_1_1": "3",
                "b_0": "1",
                "b_1": "2",
                "x0_0": "0",
                "x0_1": "0",
                "tolerance": "0.000001",
                "max_iterations": "100",
            },
        )
        html = response.data.decode()

        self.assertEqual(response.status_code, 200)
        self.assertIn("tableExport", html)
        self.assertIn('methodName: "Conjugate Gradient Method"', html)
        self.assertIn('finalResidualNorm: "0.000000"', html)
        self.assertIn('approximateSolution: "[0.090909, 0.636364]"', html)
        self.assertIn('tolerance: "0.000001"', html)
        self.assertIn('maxIterations: "100"', html)
        self.assertIn('"Residual vector r_k"', html)
        self.assertIn('alpha: "0.250000"', html)
        self.assertIn('residualNorm: "0.559017"', html)

    def test_empty_iteration_table_disables_export_controls(self):
        client = app.test_client()
        response = client.post(
            "/conjugate-gradient",
            data={
                "input_mode": "grid",
                "matrix_size": "2",
                "a_0_0": "1",
                "a_0_1": "0",
                "a_1_0": "0",
                "a_1_1": "1",
                "b_0": "0",
                "b_1": "0",
                "x0_0": "0",
                "x0_1": "0",
                "tolerance": "0.000001",
                "max_iterations": "100",
            },
        )
        html = response.data.decode()

        self.assertEqual(response.status_code, 200)
        self.assertIn("No iteration rows to export", html)
        self.assertIn(
            "No iterations were needed because the initial guess already satisfies the tolerance.",
            html,
        )
        self.assertIn('data-export-format="csv"', html)
        self.assertIn('data-export-format="pdf"', html)
        self.assertIn("disabled", html)
        self.assertIn("rows: [\n                \n            ]", html)

    def test_conjugate_gradient_template_uses_partials_for_churn_surfaces(self):
        template = Path("templates/conjugate_gradient.html").read_text()

        self.assertIn('include "partials/conjugate_gradient_form.html"', template)
        self.assertIn('include "partials/conjugate_gradient_feedback.html"', template)
        self.assertIn('include "partials/conjugate_gradient_learning_sections.html"', template)
        self.assertIn('include "partials/conjugate_gradient_scripts.html"', template)
        self.assertTrue(Path("templates/partials/conjugate_gradient_form.html").exists())
        self.assertTrue(Path("templates/partials/conjugate_gradient_feedback.html").exists())
        self.assertTrue(Path("templates/partials/conjugate_gradient_learning_sections.html").exists())
        self.assertTrue(Path("templates/partials/conjugate_gradient_scripts.html").exists())

    def test_three_dimensional_plot_has_readability_layers(self):
        script = Path("static/js/result_visualizations.js").read_text()

        self.assertIn("function initResultVisualizations()", script)
        self.assertIn("initVisualizations = initResultVisualizations", script)
        self.assertIn("const visualTheme", script)
        self.assertIn("makeBasePlotLayout", script)
        self.assertIn('name: "base plane"', script)
        self.assertIn('name: "path projection"', script)
        self.assertIn('name: "height guide"', script)
        self.assertIn('aspectratio', script)
        self.assertIn('dragmode: "orbit"', script)
        self.assertIn('hovertemplate: "%{hovertext}<extra>CG path</extra>"', script)

    def test_table_export_script_generates_csv_and_pdf(self):
        script = Path("static/js/table_exports.js").read_text()

        self.assertIn("function initTableExports()", script)
        self.assertIn("initTableExports = initTableExports", script)
        self.assertIn("function buildCsv()", script)
        self.assertIn("function buildPdf()", script)
        self.assertIn('"SUMMARY"', script)
        self.assertIn('"ITERATION TABLE"', script)
        self.assertIn('"===================="', script)
        self.assertIn('"Approximate solution"', script)
        self.assertIn('"Final residual norm"', script)
        self.assertIn('"End of export"', script)
        self.assertIn("makeFillCommand", script)
        self.assertIn("/Helvetica-Bold", script)
        self.assertNotIn("How to read this file", script)
        self.assertNotIn("How to read the table", script)
        self.assertIn("application/pdf", script)
        self.assertIn("text/csv;charset=utf-8", script)
        self.assertIn("No table data is available to export.", script)

    def test_three_by_three_result_shows_visualization_unavailable_message(self):
        client = app.test_client()
        response = client.post(
            "/conjugate-gradient",
            data={
                "input_mode": "grid",
                "matrix_size": "3",
                "a_0_0": "4",
                "a_0_1": "1",
                "a_0_2": "0",
                "a_1_0": "1",
                "a_1_1": "3",
                "a_1_2": "0",
                "a_2_0": "0",
                "a_2_1": "0",
                "a_2_2": "2",
                "b_0": "1",
                "b_1": "2",
                "b_2": "3",
                "x0_0": "0",
                "x0_1": "0",
                "x0_2": "0",
                "tolerance": "0.000001",
                "max_iterations": "100",
            },
        )
        html = response.data.decode()

        self.assertEqual(response.status_code, 200)
        self.assertIn(
            "2D and 3D visualizations are only available for 2x2 systems.",
            html,
        )
        self.assertIn('id="panel-residual"', html)
        residual_tab = html[html.find('id="tab-residual"'):html.find('id="tab-residual"') + 260]
        self.assertIn('aria-selected="true"', residual_tab)
        self.assertNotIn("cdn.plot.ly", html)


if __name__ == "__main__":
    unittest.main()
