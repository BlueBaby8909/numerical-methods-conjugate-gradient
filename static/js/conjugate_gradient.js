(function () {
const storedGridValues = {};
const variableLabels = ["x", "y", "z", "w", "v"];

document.querySelectorAll("[data-grid-value]").forEach((input) => {
    storedGridValues[input.dataset.name] = input.value;
});

const modeInputs = document.querySelectorAll("input[name='input_mode']");
const matrixSizeSelect = document.getElementById("matrix_size");
const matrixBody = document.getElementById("matrixBody");
const unknownVector = document.getElementById("unknownVector");
const targetVector = document.getElementById("targetVector");
const initialGuessVector = document.getElementById("initialGuessVector");
const matrixGrid = document.getElementById("matrixGrid");
const gridExampleButtons = document.querySelectorAll("[data-example-size]");
const loadEquationExample = document.getElementById("loadEquationExample");
const clearCalculator = document.getElementById("clearCalculator");
const calculationFeedback = document.getElementById("calculation-feedback");
const calculatorForm = document.querySelector(".calculator form");
const gridExamples = {
    2: {
        matrix: [
            [4, 1],
            [1, 3]
        ],
        target: [1, 2],
        initialGuess: [0, 0]
    },
    3: {
        matrix: [
            [4, 1, 0],
            [1, 3, 1],
            [0, 1, 2]
        ],
        target: [6, 10, 8],
        initialGuess: [0, 0, 0]
    },
    4: {
        matrix: [
            [6, 1, 0, 0],
            [1, 5, 1, 0],
            [0, 1, 4, 1],
            [0, 0, 1, 3]
        ],
        target: [8, 14, 18, 15],
        initialGuess: [0, 0, 0, 0]
    },
    5: {
        matrix: [
            [7, 1, 0, 0, 0],
            [1, 6, 1, 0, 0],
            [0, 1, 5, 1, 0],
            [0, 0, 1, 4, 1],
            [0, 0, 0, 1, 3]
        ],
        target: [9, 16, 21, 24, 19],
        initialGuess: [0, 0, 0, 0, 0]
    }
};

// Matrix-grid rendering and example loading.
function saveCurrentGridValues() {
    document.querySelectorAll("#matrixGrid input").forEach((input) => {
        storedGridValues[input.name] = input.value;
    });
}

function makeNumberInput(name, value, placeholder) {
    const input = document.createElement("input");
    input.type = "text";
    input.name = name;
    input.value = value || "";
    input.placeholder = placeholder;
    input.inputMode = "decimal";
    return input;
}

function buildGrid(size) {
    matrixBody.innerHTML = "";
    unknownVector.innerHTML = "";
    targetVector.innerHTML = "";
    initialGuessVector.innerHTML = "";

    matrixBody.style.gridTemplateColumns = (
        "repeat(" + size + ", minmax(var(--matrix-cell-min, 64px), 1fr))"
    );

    for (let row = 0; row < size; row += 1) {
        const unknown = document.createElement("span");
        unknown.className = "unknown-cell";
        unknown.textContent = variableLabels[row];
        unknownVector.appendChild(unknown);

        for (let column = 0; column < size; column += 1) {
            const name = "a_" + row + "_" + column;
            const cell = document.createElement("div");
            cell.className = "matrix-cell";
            const placeholder = row === column ? "1" : "0";
            const input = makeNumberInput(name, storedGridValues[name], placeholder);
            input.setAttribute(
                "aria-label",
                "Matrix A row " + (row + 1) + ", column " + (column + 1)
            );
            cell.appendChild(input);
            matrixBody.appendChild(cell);
        }

        const bName = "b_" + row;
        const bCell = document.createElement("div");
        bCell.className = "vector-cell";
        const bInput = makeNumberInput(bName, storedGridValues[bName], "0");
        bInput.setAttribute("aria-label", "Vector b row " + (row + 1));
        bCell.appendChild(bInput);
        targetVector.appendChild(bCell);

        const x0Name = "x0_" + row;
        const x0Cell = document.createElement("div");
        x0Cell.className = "vector-cell";
        const x0Input = makeNumberInput(x0Name, storedGridValues[x0Name], "0");
        x0Input.setAttribute("aria-label", "Initial guess x0 row " + (row + 1));
        x0Cell.appendChild(x0Input);
        initialGuessVector.appendChild(x0Cell);
    }

    refreshSectionLayout();
}

function updateInputMode() {
    const selectedMode = document.querySelector("input[name='input_mode']:checked").value;

    document.querySelectorAll("[data-input-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.inputPanel !== selectedMode;
    });

    refreshSectionLayout();
}

// Collapsible content and layout stabilization.
function refreshSectionLayout() {
    window.requestAnimationFrame(() => {
        window.dispatchEvent(new Event("resize"));
    });
}

function replayClass(element, className, duration) {
    if (!element) {
        return;
    }

    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);

    window.setTimeout(() => {
        element.classList.remove(className);
    }, duration);
}

function setupCollapsibleSections() {
    document.querySelectorAll("[data-collapsible-section]").forEach((section) => {
        const toggle = section.querySelector(".section-toggle");

        if (!toggle) {
            return;
        }

        toggle.addEventListener("click", () => {
            const isCollapsed = section.classList.toggle("is-collapsed");
            const action = isCollapsed ? "Show" : "Minimize";
            const sectionName = section.dataset.sectionName || "section";

            toggle.setAttribute("aria-expanded", String(!isCollapsed));
            toggle.setAttribute("aria-label", action + " " + sectionName);
            toggle.setAttribute("title", action + " " + sectionName);
            refreshSectionLayout();
        });
    });
}

function setGridExample(size) {
    const example = gridExamples[size];

    if (!example) {
        return;
    }

    Object.keys(storedGridValues).forEach((name) => {
        storedGridValues[name] = "";
    });

    example.matrix.forEach((row, rowIndex) => {
        row.forEach((value, columnIndex) => {
            storedGridValues["a_" + rowIndex + "_" + columnIndex] = String(value);
        });
    });

    example.target.forEach((value, rowIndex) => {
        storedGridValues["b_" + rowIndex] = String(value);
    });

    example.initialGuess.forEach((value, rowIndex) => {
        storedGridValues["x0_" + rowIndex] = String(value);
    });

    matrixSizeSelect.value = String(size);
    document.querySelector("input[name='input_mode'][value='grid']").checked = true;
    buildGrid(size);
    updateInputMode();
    replayClass(matrixGrid, "is-refreshing", 360);
}

function setEquationExample() {
    document.querySelector("input[name='input_mode'][value='equations']").checked = true;
    document.getElementById("equations").value = "4x + y = 1\nx + 3y = 2";
    document.getElementById("initial_guess").value = "0 0";
    updateInputMode();
}

function clearStoredGridValues() {
    Object.keys(storedGridValues).forEach((name) => {
        storedGridValues[name] = "";
    });
}

function clearCurrentFeedback() {
    calculationFeedback.removeAttribute("data-scroll-after-submit");
    calculationFeedback.removeAttribute("tabindex");
    calculationFeedback.innerHTML = '<div class="result">Enter values above, then press Calculate Solution.</div>';
}

function clearCalculatorInputs() {
    clearStoredGridValues();

    matrixSizeSelect.value = "2";
    document.getElementById("equations").value = "";
    document.getElementById("initial_guess").value = "";
    document.getElementById("tolerance").value = "0.000001";
    document.getElementById("max_iterations").value = "100";

    buildGrid(2);
    updateInputMode();
    clearCurrentFeedback();
}

function scrollToCalculationFeedback() {
    const feedbackTarget = document.querySelector(
        "[data-scroll-after-submit='true']"
    );

    if (!feedbackTarget) {
        return;
    }

    if (window.NumericalMethodsUI) {
        const corrected = window.NumericalMethodsUI.correctElementScroll(
            feedbackTarget
        );

        if (corrected && typeof feedbackTarget.focus === "function") {
            feedbackTarget.focus({
                preventScroll: true
            });
        }
    }
}

function scheduleFeedbackScroll() {
    const readyPromise = window.NumericalMethodsUI
        ? window.NumericalMethodsUI.waitForStableLayout()
        : Promise.resolve();

    readyPromise.finally(() => {
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                refreshSectionLayout();
                scrollToCalculationFeedback();
            });
        });
    });
}

// Result feedback, AJAX submission, and script hydration.
function setCalculatorBusy(isBusy) {
    const submitButton = calculatorForm.querySelector("button[type='submit']");

    calculatorForm.setAttribute("aria-busy", String(isBusy));
    calculatorForm.classList.toggle("is-submitting", isBusy);

    if (submitButton) {
        submitButton.disabled = isBusy;
        submitButton.textContent = isBusy ? "Calculating..." : "Calculate Solution";
    }
}

function showLoadingFeedback() {
    calculationFeedback.removeAttribute("data-scroll-after-submit");
    calculationFeedback.setAttribute("aria-live", "polite");
    calculationFeedback.innerHTML = (
        '<div class="result loading-result">'
        + "<h3>Calculating solution</h3>"
        + "<p>Preparing the iteration table and visualizations.</p>"
        + '<div class="loading-lines" aria-hidden="true">'
        + "<span></span><span></span><span></span>"
        + "</div>"
        + "</div>"
    );
}

function revealFeedback() {
    calculationFeedback.classList.remove("is-updating");
    replayClass(calculationFeedback, "result-enter", 520);
}

function restoreViewportPosition(position) {
    if (!position || !Number.isFinite(position.top)) {
        return;
    }

    window.scrollTo({
        left: Number.isFinite(position.left) ? position.left : window.scrollX,
        top: position.top,
        behavior: "auto"
    });
}

function holdViewportPosition(position) {
    restoreViewportPosition(position);
    window.requestAnimationFrame(() => {
        restoreViewportPosition(position);
    });
}

function copyFeedbackAttributes(incomingFeedback) {
    ["data-scroll-after-submit", "tabindex"].forEach((attributeName) => {
        calculationFeedback.removeAttribute(attributeName);
    });

    if (incomingFeedback.hasAttribute("data-scroll-after-submit")) {
        calculationFeedback.setAttribute("data-scroll-after-submit", "true");
    }

    if (incomingFeedback.hasAttribute("tabindex")) {
        calculationFeedback.setAttribute(
            "tabindex",
            incomingFeedback.getAttribute("tabindex")
        );
    }
}

function loadScriptOnce(source) {
    const absoluteSource = new URL(source, window.location.href).href;
    const existingScript = Array.from(document.scripts).find((script) => {
        return script.src === absoluteSource;
    });

    if (existingScript) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement("script");

        script.src = absoluteSource;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
    });
}

function findResponseScriptSource(responseDocument, filename) {
    const script = Array.from(responseDocument.scripts).find((candidate) => {
        return candidate.src && candidate.src.indexOf(filename) !== -1;
    });

    return script ? script.src : null;
}

async function runMathJaxForFeedback() {
    if (window.MathJax && window.MathJax.typesetPromise) {
        await window.MathJax.typesetPromise([calculationFeedback]);
    }
}

function applyResultData(responseDocument) {
    const resultDataScript = Array.from(responseDocument.scripts).find((script) => {
        return script.textContent.indexOf("window.cgResultData") !== -1;
    });

    if (!resultDataScript) {
        window.cgResultData = null;
        return false;
    }

    Function(resultDataScript.textContent)();
    return true;
}

async function hydrateResultModules(responseDocument) {
    const hasResultData = applyResultData(responseDocument);

    if (!hasResultData) {
        await runMathJaxForFeedback();
        return;
    }

    const chartSource = findResponseScriptSource(responseDocument, "chart.js");
    const plotlySource = findResponseScriptSource(responseDocument, "plotly");
    const exportSource = findResponseScriptSource(responseDocument, "table_exports.js");
    const visualizationSource = findResponseScriptSource(
        responseDocument,
        "result_visualizations.js"
    );

    if (chartSource && !window.Chart) {
        await loadScriptOnce(chartSource);
    }

    if (plotlySource && window.cgResultData.quadraticVisualization && !window.Plotly) {
        await loadScriptOnce(plotlySource);
    }

    if (
        window.NumericalMethodsResults
        && window.NumericalMethodsResults.initTableExports
    ) {
        window.NumericalMethodsResults.initTableExports();
    } else if (exportSource) {
        await loadScriptOnce(exportSource);
    }

    if (
        window.NumericalMethodsResults
        && window.NumericalMethodsResults.initVisualizations
    ) {
        window.NumericalMethodsResults.initVisualizations();
    } else if (visualizationSource) {
        await loadScriptOnce(visualizationSource);
    }

    await runMathJaxForFeedback();
}

function showAjaxFailure() {
    calculationFeedback.removeAttribute("data-scroll-after-submit");
    calculationFeedback.setAttribute("tabindex", "-1");
    calculationFeedback.classList.remove("is-updating");
    calculationFeedback.innerHTML = (
        '<div class="result error">'
        + "<h3>Calculation interrupted</h3>"
        + "<p>The page could not update the result without reloading. "
        + "Please try Calculate Solution again.</p>"
        + "</div>"
    );
}

async function handleCalculatorSubmit(event) {
    event.preventDefault();
    const viewportPosition = {
        left: window.scrollX,
        top: window.scrollY
    };
    saveCurrentGridValues();
    setCalculatorBusy(true);
    calculationFeedback.classList.add("is-updating");
    showLoadingFeedback();
    restoreViewportPosition(viewportPosition);

    try {
        const submitUrl = calculatorForm.action.split("#")[0];
        const response = await fetch(submitUrl, {
            method: "POST",
            body: new FormData(calculatorForm),
            headers: {
                "X-Requested-With": "fetch"
            }
        });

        if (!response.ok) {
            throw new Error("Calculation request failed.");
        }

        const responseHtml = await response.text();
        const responseDocument = new DOMParser().parseFromString(
            responseHtml,
            "text/html"
        );
        const incomingFeedback = responseDocument.getElementById(
            "calculation-feedback"
        );

        if (!incomingFeedback) {
            throw new Error("Calculation response was missing the result panel.");
        }

        copyFeedbackAttributes(incomingFeedback);
        calculationFeedback.innerHTML = incomingFeedback.innerHTML;
        await hydrateResultModules(responseDocument);
        revealFeedback();

        if (typeof calculationFeedback.focus === "function") {
            calculationFeedback.focus({
                preventScroll: true
            });
        }
        holdViewportPosition(viewportPosition);
    } catch (error) {
        showAjaxFailure();
        revealFeedback();
        holdViewportPosition(viewportPosition);
    } finally {
        setCalculatorBusy(false);
    }
}

matrixSizeSelect.addEventListener("change", () => {
    saveCurrentGridValues();
    buildGrid(Number(matrixSizeSelect.value));
});

modeInputs.forEach((input) => {
    input.addEventListener("change", updateInputMode);
});

gridExampleButtons.forEach((button) => {
    button.addEventListener("click", () => {
        setGridExample(Number(button.dataset.exampleSize));
    });
});
loadEquationExample.addEventListener("click", setEquationExample);
clearCalculator.addEventListener("click", clearCalculatorInputs);
calculatorForm.addEventListener("submit", handleCalculatorSubmit);

buildGrid(Number(matrixSizeSelect.value));
updateInputMode();
setupCollapsibleSections();

if (document.readyState === "complete") {
    scheduleFeedbackScroll();
} else {
    window.addEventListener("load", scheduleFeedbackScroll, { once: true });
}
}());
