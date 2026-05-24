"""Flask routes for the Conjugate Gradient calculator."""

from flask import Flask, render_template, request

from services.calculator import (
    make_template_context,
    parse_calculator_submission,
    solve_calculator_submission,
)

app = Flask(__name__)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/conjugate-gradient", methods=["GET", "POST"])
def conjugate_gradient():
    context = make_template_context(request.form)

    if request.method == "POST":
        try:
            submission = parse_calculator_submission(request.form)
            context["result"] = solve_calculator_submission(submission)
            context["input_mode"] = submission["input_mode"]
            context["matrix_size"] = submission["matrix_size"]
            context["equations_text"] = submission["equations_text"]
            context["initial_guess_text"] = submission["initial_guess_text"]
        except ValueError as exception:
            context["error"] = str(exception)

    return render_template("conjugate_gradient.html", **context)


if __name__ == "__main__":
    app.run(debug=True)
