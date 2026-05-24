function initResultVisualizations() {
const residualLabels = window.cgResultData.residualLabels;
const residualValues = window.cgResultData.residualValues;
const quadraticVisualization = window.cgResultData.quadraticVisualization;
const chartCanvas = document.getElementById("residualChart");
const chartFallback = document.getElementById("chartFallback");
let residualChart = null;
let contourRendered = false;
let surfaceRendered = false;

const computedTheme = getComputedStyle(document.documentElement);
const visualTheme = {
    background: computedTheme.getPropertyValue("--surface").trim() || "#ffffff",
    surfaceSoft: computedTheme.getPropertyValue("--surface-soft").trim() || "#f8fbfa",
    text: computedTheme.getPropertyValue("--text").trim() || "#172022",
    muted: computedTheme.getPropertyValue("--muted").trim() || "#667174",
    line: computedTheme.getPropertyValue("--line").trim() || "#d6e0df",
    lineStrong: computedTheme.getPropertyValue("--line-strong").trim() || "#aec2bf",
    accent: computedTheme.getPropertyValue("--accent").trim() || "#216b66",
    accentDark: computedTheme.getPropertyValue("--accent-dark").trim() || "#164b47",
    accentSoft: computedTheme.getPropertyValue("--accent-soft").trim() || "#e6f2ef",
    accentWarm: computedTheme.getPropertyValue("--accent-warm").trim() || "#c96842",
    accentWarmSoft: computedTheme.getPropertyValue("--accent-warm-soft").trim() || "#fff1eb",
    fontFamily: "Outfit, Arial, Helvetica, sans-serif"
};

const plotlyConfig = {
    displaylogo: false,
    responsive: true,
    scrollZoom: true,
    modeBarButtonsToRemove: [
        "lasso2d",
        "select2d",
        "autoScale2d",
        "toggleSpikelines"
    ]
};

// Shared Plotly theme and sizing helpers.
function makeBasePlotLayout(extraLayout) {
    return Object.assign({
        autosize: true,
        paper_bgcolor: visualTheme.background,
        plot_bgcolor: visualTheme.background,
        font: {
            color: visualTheme.text,
            family: visualTheme.fontFamily,
            size: 12
        },
        hoverlabel: {
            align: "left",
            bgcolor: visualTheme.text,
            bordercolor: visualTheme.text,
            font: {
                color: "#ffffff",
                family: visualTheme.fontFamily,
                size: 12
            }
        }
    }, extraLayout);
}

function makeAxis(title) {
    return {
        title: {
            text: title,
            font: {
                color: visualTheme.text,
                size: 13
            }
        },
        gridcolor: visualTheme.line,
        zerolinecolor: visualTheme.lineStrong,
        linecolor: visualTheme.lineStrong,
        tickcolor: visualTheme.lineStrong,
        tickfont: {
            color: visualTheme.muted,
            size: 11
        },
        mirror: true,
        showline: true
    };
}

function formatPlotNumber(value) {
    if (Math.abs(value) < 0.0000005) {
        return "0.000000";
    }

    return Number(value).toFixed(6);
}

function getGridRange(zRows) {
    let minimum = Infinity;
    let maximum = -Infinity;

    zRows.forEach((row) => {
        row.forEach((value) => {
            minimum = Math.min(minimum, value);
            maximum = Math.max(maximum, value);
        });
    });

    return {
        minimum,
        maximum,
        span: Math.max(maximum - minimum, 1)
    };
}

// Residual chart rendering.
if (window.Chart && chartCanvas) {
    if (chartFallback) {
        chartFallback.hidden = true;
    }

    residualChart = new Chart(chartCanvas, {
        type: "line",
        data: {
            labels: residualLabels,
            datasets: [{
                label: "Residual norm",
                data: residualValues,
                borderColor: visualTheme.accent,
                backgroundColor: "rgba(33, 107, 102, 0.12)",
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: visualTheme.background,
                pointBorderColor: visualTheme.accent,
                pointBorderWidth: 2,
                tension: 0.22,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: "index"
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: visualTheme.text,
                    bodyFont: {
                        family: visualTheme.fontFamily
                    },
                    titleFont: {
                        family: visualTheme.fontFamily
                    },
                    callbacks: {
                        label: (context) => {
                            return "Residual norm: " + formatPlotNumber(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Iteration",
                        color: visualTheme.text
                    },
                    grid: {
                        color: visualTheme.line
                    },
                    ticks: {
                        color: visualTheme.muted
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: "Residual norm",
                        color: visualTheme.text
                    },
                    beginAtZero: true,
                    grid: {
                        color: visualTheme.line
                    },
                    ticks: {
                        color: visualTheme.muted
                    }
                }
            }
        }
    });
}

function refreshVisualizationLayout() {
    if (residualChart) {
        residualChart.resize();
    }

    if (window.Plotly) {
        ["contourPlot", "surfacePlot"].forEach((plotId) => {
            const plot = document.getElementById(plotId);

            if (plot) {
                window.Plotly.Plots.resize(plot);
            }
        });
    }
}

// Plot resize and tab behavior.
function setupPlotResizeObserver() {
    if (!window.ResizeObserver) {
        window.addEventListener("resize", refreshVisualizationLayout);
        return;
    }

    const observer = new ResizeObserver(() => {
        window.requestAnimationFrame(refreshVisualizationLayout);
    });

    ["contourPlot", "surfacePlot"].forEach((plotId) => {
        const plot = document.getElementById(plotId);

        if (plot) {
            observer.observe(plot);
        }
    });
}

// Convergence path helpers used by both 2D and 3D plots.
function getPathLabels() {
    return quadraticVisualization.path.map((point, index) => {
        if (index === 0) {
            return "start";
        }

        if (index === quadraticVisualization.path.length - 1) {
            return "solution";
        }

        return "k=" + index;
    });
}

function getPathXValues() {
    return quadraticVisualization.path.map((point) => point[0]);
}

function getPathYValues() {
    return quadraticVisualization.path.map((point) => point[1]);
}

function getPathHoverText() {
    const pathLabels = getPathLabels();

    return quadraticVisualization.path.map((point, index) => {
        const label = pathLabels[index];
        const zValue = quadraticVisualization.path_z[index];

        return (
            label
            + "<br>x1 = "
            + formatPlotNumber(point[0])
            + "<br>x2 = "
            + formatPlotNumber(point[1])
            + "<br>f(x) = "
            + formatPlotNumber(zValue)
        );
    });
}

function getMarkerColors(pathLabels) {
    return pathLabels.map((label) => {
        if (label === "start") {
            return visualTheme.background;
        }

        if (label === "solution") {
            return visualTheme.text;
        }

        return visualTheme.accentWarmSoft;
    });
}

// 2D contour and 3D surface rendering.
function renderContourPlot() {
    const plot = document.getElementById("contourPlot");

    if (!window.Plotly || !quadraticVisualization || !plot || contourRendered) {
        return;
    }

    const pathX = getPathXValues();
    const pathY = getPathYValues();
    const pathLabels = getPathLabels();
    const pathHoverText = getPathHoverText();

    window.Plotly.newPlot(
        plot,
        [
            {
                type: "contour",
                x: quadraticVisualization.x_values,
                y: quadraticVisualization.y_values,
                z: quadraticVisualization.z_values,
                colorscale: [
                    [0, visualTheme.surfaceSoft],
                    [0.34, visualTheme.accentSoft],
                    [0.68, "#90c2b8"],
                    [1, visualTheme.accentDark]
                ],
                contours: {
                    coloring: "heatmap",
                    showlabels: true,
                    labelfont: {
                        color: visualTheme.text,
                        size: 10
                    }
                },
                line: {
                    color: "rgba(23, 32, 34, 0.24)",
                    width: 0.8
                },
                hovertemplate: (
                    "x1 = %{x:.6f}<br>"
                    + "x2 = %{y:.6f}<br>"
                    + "f(x) = %{z:.6f}<extra>objective</extra>"
                ),
                colorbar: {
                    title: {
                        text: "f(x)",
                        side: "right"
                    },
                    thickness: 12,
                    len: 0.76,
                    tickfont: {
                        color: visualTheme.muted,
                        size: 10
                    }
                },
                name: "Quadratic objective"
            },
            {
                type: "scatter",
                mode: "lines+markers",
                x: pathX,
                y: pathY,
                customdata: pathHoverText,
                hovertemplate: "%{customdata}<extra>CG path</extra>",
                line: {
                    color: visualTheme.accentWarm,
                    width: 4
                },
                marker: {
                    color: getMarkerColors(pathLabels),
                    line: {
                        color: visualTheme.accentWarm,
                        width: 2
                    },
                    size: pathLabels.map((label) => label === "solution" ? 12 : 9)
                },
                name: "Convergence path"
            },
            {
                type: "scatter",
                mode: "markers+text",
                x: [pathX[0]],
                y: [pathY[0]],
                text: ["start"],
                hovertemplate: pathHoverText[0] + "<extra>start</extra>",
                textposition: "top center",
                marker: {
                    color: visualTheme.background,
                    line: {
                        color: visualTheme.accentWarm,
                        width: 2
                    },
                    symbol: "circle",
                    size: 12
                },
                name: "Start"
            },
            {
                type: "scatter",
                mode: "markers+text",
                x: [quadraticVisualization.solution[0]],
                y: [quadraticVisualization.solution[1]],
                text: ["solution"],
                hovertemplate: pathHoverText[pathHoverText.length - 1] + "<extra>minimum</extra>",
                textposition: "bottom center",
                marker: {
                    color: visualTheme.text,
                    line: {
                        color: visualTheme.background,
                        width: 2
                    },
                    symbol: "diamond",
                    size: 14
                },
                name: "Final solution"
            }
        ],
        makeBasePlotLayout({
            margin: {
                l: 62,
                r: 26,
                t: 18,
                b: 58,
                pad: 2
            },
            xaxis: makeAxis("x1 value"),
            yaxis: makeAxis("x2 value"),
            legend: {
                orientation: "h",
                x: 0,
                y: 1.08,
                bgcolor: "rgba(255, 255, 255, 0)",
                font: {
                    color: visualTheme.muted,
                    size: 11
                }
            }
        }),
        plotlyConfig
    );

    contourRendered = true;
}

function renderSurfacePlot() {
    const plot = document.getElementById("surfacePlot");

    if (!window.Plotly || !quadraticVisualization || !plot || surfaceRendered) {
        return;
    }

    const pathX = getPathXValues();
    const pathY = getPathYValues();
    const pathLabels = getPathLabels();
    const pathHoverText = getPathHoverText();
    const zRange = getGridRange(quadraticVisualization.z_values);
    const floorZ = zRange.minimum - (zRange.span * 0.12);
    const floorZValues = quadraticVisualization.z_values.map((row) => {
        return row.map(() => floorZ);
    });
    const pathFloorZ = quadraticVisualization.path_z.map(() => floorZ);
    const guideX = [];
    const guideY = [];
    const guideZ = [];

    quadraticVisualization.path.forEach((point, index) => {
        guideX.push(point[0], point[0], null);
        guideY.push(point[1], point[1], null);
        guideZ.push(floorZ, quadraticVisualization.path_z[index], null);
    });

    window.Plotly.newPlot(
        plot,
        [
            {
                type: "surface",
                x: quadraticVisualization.x_values,
                y: quadraticVisualization.y_values,
                z: floorZValues,
                colorscale: [
                    [0, visualTheme.surfaceSoft],
                    [1, visualTheme.accentSoft]
                ],
                hoverinfo: "skip",
                opacity: 0.28,
                showscale: false,
                name: "base plane"
            },
            {
                type: "surface",
                x: quadraticVisualization.x_values,
                y: quadraticVisualization.y_values,
                z: quadraticVisualization.z_values,
                colorscale: [
                    [0, visualTheme.surfaceSoft],
                    [0.32, visualTheme.accentSoft],
                    [0.7, visualTheme.accent],
                    [1, visualTheme.text]
                ],
                contours: {
                    z: {
                        show: true,
                        usecolormap: true,
                        highlightcolor: visualTheme.accentWarm,
                        project: {
                            z: true
                        }
                    }
                },
                hovertemplate: (
                    "x1 = %{x:.6f}<br>"
                    + "x2 = %{y:.6f}<br>"
                    + "f(x) = %{z:.6f}<extra>objective</extra>"
                ),
                lighting: {
                    ambient: 0.78,
                    diffuse: 0.54,
                    specular: 0.05,
                    roughness: 0.96
                },
                opacity: 0.76,
                showscale: true,
                colorbar: {
                    title: {
                        text: "f(x)",
                        side: "right"
                    },
                    thickness: 12,
                    len: 0.66,
                    tickfont: {
                        color: visualTheme.muted,
                        size: 10
                    }
                },
                name: "Objective surface"
            },
            {
                type: "scatter3d",
                mode: "lines",
                x: pathX,
                y: pathY,
                z: pathFloorZ,
                line: {
                    color: "rgba(201, 104, 66, 0.42)",
                    width: 6
                },
                hoverinfo: "skip",
                name: "path projection"
            },
            {
                type: "scatter3d",
                mode: "lines",
                x: guideX,
                y: guideY,
                z: guideZ,
                line: {
                    color: "rgba(23, 32, 34, 0.24)",
                    width: 2
                },
                hoverinfo: "skip",
                showlegend: false,
                name: "height guide"
            },
            {
                type: "scatter3d",
                mode: "lines+markers+text",
                x: pathX,
                y: pathY,
                z: quadraticVisualization.path_z,
                text: pathLabels,
                hovertext: pathHoverText,
                hovertemplate: "%{hovertext}<extra>CG path</extra>",
                textposition: "top center",
                line: {
                    color: visualTheme.accentWarm,
                    width: 8
                },
                marker: {
                    color: getMarkerColors(pathLabels),
                    line: {
                        color: visualTheme.accentWarm,
                        width: 3
                    },
                    size: pathLabels.map((label) => label === "solution" ? 7 : 5)
                },
                textfont: {
                    color: visualTheme.text,
                    size: 10
                },
                name: "CG path"
            },
            {
                type: "scatter3d",
                mode: "markers+text",
                x: [quadraticVisualization.solution[0]],
                y: [quadraticVisualization.solution[1]],
                z: [quadraticVisualization.solution_z],
                text: ["solution"],
                hovertext: [
                    "solution"
                    + "<br>x1 = "
                    + formatPlotNumber(quadraticVisualization.solution[0])
                    + "<br>x2 = "
                    + formatPlotNumber(quadraticVisualization.solution[1])
                    + "<br>f(x) = "
                    + formatPlotNumber(quadraticVisualization.solution_z)
                ],
                hovertemplate: "%{hovertext}<extra>minimum</extra>",
                textposition: "bottom center",
                marker: {
                    color: visualTheme.text,
                    symbol: "diamond",
                    size: 9,
                    line: {
                        color: visualTheme.background,
                        width: 2
                    }
                },
                textfont: {
                    color: visualTheme.text,
                    size: 10
                },
                name: "Final solution"
            }
        ],
        makeBasePlotLayout({
            margin: {
                l: 0,
                r: 0,
                t: 34,
                b: 0,
                pad: 0
            },
            dragmode: "orbit",
            hovermode: "closest",
            scene: {
                aspectmode: "manual",
                aspectratio: {
                    x: 1,
                    y: 1,
                    z: 0.58
                },
                camera: {
                    eye: {
                        x: 1.42,
                        y: -1.66,
                        z: 1.04
                    },
                    center: {
                        x: 0,
                        y: 0,
                        z: -0.08
                    }
                },
                xaxis: Object.assign(makeAxis("x1 value"), {
                    backgroundcolor: visualTheme.surfaceSoft,
                    tickformat: ".3f"
                }),
                yaxis: Object.assign(makeAxis("x2 value"), {
                    backgroundcolor: visualTheme.surfaceSoft,
                    tickformat: ".3f"
                }),
                zaxis: Object.assign(makeAxis("objective f(x)"), {
                    backgroundcolor: visualTheme.background,
                    range: [floorZ, zRange.maximum],
                    tickformat: ".3f"
                })
            },
            legend: {
                orientation: "h",
                x: 0,
                y: 1.03,
                bgcolor: "rgba(255, 255, 255, 0)",
                font: {
                    color: visualTheme.muted,
                    size: 11
                }
            }
        }),
        plotlyConfig
    );

    surfaceRendered = true;
}

function renderActiveVisualization(activeTab) {
    if (activeTab === "contour") {
        renderContourPlot();
    }

    if (activeTab === "surface") {
        renderSurfacePlot();
    }

    window.requestAnimationFrame(refreshVisualizationLayout);
}

function setupVisualizationTabs() {
    const tabs = document.querySelectorAll("[data-visualization-tab]");

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const activeTab = tab.dataset.visualizationTab;

            tabs.forEach((currentTab) => {
                const isSelected = currentTab === tab;
                const panel = document.getElementById(
                    "panel-" + currentTab.dataset.visualizationTab
                );

                currentTab.setAttribute("aria-selected", String(isSelected));

                if (panel) {
                    panel.hidden = !isSelected;
                }
            });

            renderActiveVisualization(activeTab);
        });
    });

    const selectedTab = document.querySelector(
        "[data-visualization-tab][aria-selected='true']"
    );

    if (selectedTab) {
        renderActiveVisualization(selectedTab.dataset.visualizationTab);
    }
}

setupPlotResizeObserver();
setupVisualizationTabs();
}

window.NumericalMethodsResults = window.NumericalMethodsResults || {};
window.NumericalMethodsResults.initVisualizations = initResultVisualizations;
initResultVisualizations();
