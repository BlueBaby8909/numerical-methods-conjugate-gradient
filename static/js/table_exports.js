(function () {
function initTableExports() {
    const exportData = window.cgResultData ? window.cgResultData.tableExport : null;
    const statusElement = document.getElementById("tableExportStatus");
    const exportButtons = document.querySelectorAll("[data-export-format]");
    const readableHeaders = [
        "Iteration",
        "x_k",
        "Alpha",
        "Beta",
        "Residual r_k",
        "Residual norm"
    ];

    function setStatus(message, isError) {
        if (!statusElement) {
            return;
        }

        statusElement.textContent = message;
        statusElement.classList.toggle("is-error", Boolean(isError));
    }

    function hasRows() {
        return Boolean(exportData && Array.isArray(exportData.rows) && exportData.rows.length);
    }

    // Filename and CSV helpers.
    function padNumber(value) {
        return String(value).padStart(2, "0");
    }

    function timestampForFilename(date) {
        return (
            date.getFullYear()
            + padNumber(date.getMonth() + 1)
            + padNumber(date.getDate())
            + "-"
            + padNumber(date.getHours())
            + padNumber(date.getMinutes())
            + padNumber(date.getSeconds())
        );
    }

    function makeFilename(extension) {
        const methodName = exportData.metadata.methodName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

        return methodName + "-" + timestampForFilename(new Date()) + "." + extension;
    }

    function rowToArray(row) {
        return [
            row.iteration,
            row.x,
            row.alpha,
            row.beta,
            row.residual,
            row.residualNorm
        ];
    }

    function escapeCsvValue(value) {
        const text = String(value == null ? "" : value);

        if (/[",\n\r]/.test(text)) {
            return '"' + text.replace(/"/g, '""') + '"';
        }

        return text;
    }

    function buildCsv() {
        const metadata = exportData.metadata;
        const metadataRows = [
            [metadata.methodName.toUpperCase()],
            ["Iteration Table Export"],
            ["Generated at", metadata.generatedAt],
            [],
            ["===================="],
            ["SUMMARY"],
            ["===================="],
            ["Field", "Value"],
            ["Status", metadata.status],
            ["Total iterations", metadata.iterations],
            ["Approximate solution", metadata.approximateSolution],
            ["Final residual norm", metadata.finalResidualNorm],
            ["Tolerance", metadata.tolerance],
            [],
            ["===================="],
            ["ITERATION TABLE"],
            ["===================="],
            readableHeaders,
            ...exportData.rows.map(rowToArray),
            [],
            ["End of export"]
        ];

        return metadataRows
            .map((row) => row.map(escapeCsvValue).join(","))
            .join("\r\n");
    }

    function downloadBlob(content, mimeType, filename) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    // Minimal PDF writer primitives.
    function toPdfSafeText(value) {
        return String(value == null ? "" : value)
            .replace(/[^\x20-\x7E]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function escapePdfText(value) {
        return toPdfSafeText(value)
            .replace(/\\/g, "\\\\")
            .replace(/\(/g, "\\(")
            .replace(/\)/g, "\\)");
    }

    function wrapText(value, maxLength) {
        const words = toPdfSafeText(value).split(" ");
        const lines = [];
        let currentLine = "";

        words.forEach((word) => {
            if (!word) {
                return;
            }

            if (word.length > maxLength) {
                if (currentLine) {
                    lines.push(currentLine);
                    currentLine = "";
                }

                for (let index = 0; index < word.length; index += maxLength) {
                    lines.push(word.slice(index, index + maxLength));
                }

                return;
            }

            const candidate = currentLine ? currentLine + " " + word : word;

            if (candidate.length > maxLength) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = candidate;
            }
        });

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines.length ? lines : [""];
    }

    function byteLength(value) {
        return new TextEncoder().encode(value).length;
    }

    function makeTextCommand(text, x, y, size, fontName) {
        return (
            "BT /"
            + (fontName || "F1")
            + " "
            + size
            + " Tf "
            + x
            + " "
            + y
            + " Td ("
            + escapePdfText(text)
            + ") Tj ET"
        );
    }

    function makeLineCommand(x1, y1, x2, y2) {
        return (
            "0.75 w 0.83 0.88 0.87 RG "
            + x1
            + " "
            + y1
            + " m "
            + x2
            + " "
            + y2
            + " l S"
        );
    }

    function makeFillCommand(x, y, width, height) {
        return (
            "q 0.90 0.95 0.94 rg "
            + x
            + " "
            + y
            + " "
            + width
            + " "
            + height
            + " re f Q"
        );
    }

    function wrapCell(value, width, fontSize) {
        const averageCharacterWidth = fontSize * 0.52;
        const maxLength = Math.max(Math.floor(width / averageCharacterWidth), 6);

        return wrapText(value, maxLength);
    }

    function buildPdf() {
        const metadata = exportData.metadata;
        const pages = [];
        let commands = [];
        let y = 742;

        const margin = 40;
        const pageWidth = 612;
        const contentWidth = pageWidth - (margin * 2);
        const tableColumns = [
            { header: "Iteration", width: 48 },
            { header: "x_k", width: 126 },
            { header: "Alpha", width: 66 },
            { header: "Beta", width: 66 },
            { header: "Residual r_k", width: 142 },
            { header: "Residual norm", width: 84 }
        ];
        const tableLeft = margin;

        function finishPage() {
            pages.push(commands.join("\n"));
            commands = [];
            y = 742;
        }

        function ensureSpace(requiredHeight) {
            if (y - requiredHeight < 48) {
                finishPage();
                addPageHeader();
                addTableHeader();
            }
        }

        function addText(text, x, yPosition, size, fontName) {
            commands.push(makeTextCommand(text, x, yPosition, size, fontName));
        }

        function addRule(yPosition) {
            commands.push(makeLineCommand(margin, yPosition, pageWidth - margin, yPosition));
        }

        function addPageHeader() {
            addText(metadata.methodName, margin, y, 13, "F2");
            y -= 18;
            addText("Iteration table", margin, y, 9, "F1");
            y -= 18;
        }

        function addSummary() {
            addText(metadata.methodName, margin, y, 16, "F2");
            y -= 20;
            addText("Iteration table", margin, y, 10, "F1");
            y -= 16;
            addRule(y);
            y -= 16;

            const summaryRows = [
                ["Status", metadata.status],
                ["Iterations", metadata.iterations],
                ["Solution", metadata.approximateSolution],
                ["Final residual", metadata.finalResidualNorm],
                ["Tolerance", metadata.tolerance]
            ];

            summaryRows.forEach((row) => {
                addText(row[0] + ":", margin, y, 9, "F2");
                addText(row[1], margin + 132, y, 9, "F1");
                y -= 14;
            });

            y -= 10;
        }

        function addTableHeader() {
            commands.push(makeFillCommand(tableLeft, y - 13, contentWidth, 20));
            let x = tableLeft + 6;

            tableColumns.forEach((column) => {
                addText(column.header, x, y - 6, 7.5, "F2");
                x += column.width;
            });

            y -= 20;
            addRule(y + 3);
            y -= 8;
        }

        function addTableRow(row) {
            const values = rowToArray(row);
            const cellLines = values.map((value, index) => {
                return wrapCell(value, tableColumns[index].width - 10, 8);
            });
            const lineCount = Math.max(...cellLines.map((lines) => lines.length));
            const rowHeight = Math.max((lineCount * 11) + 8, 22);

            ensureSpace(rowHeight + 8);

            let x = tableLeft + 6;
            const rowTop = y;

            tableColumns.forEach((column, columnIndex) => {
                const lines = cellLines[columnIndex];

                lines.forEach((line, lineIndex) => {
                    addText(line, x, rowTop - (lineIndex * 11), 8, "F1");
                });

                x += column.width;
            });

            y -= rowHeight;
            addRule(y + 5);
            y -= 4;
        }

        addSummary();
        addText("Iteration data", margin, y, 11, "F2");
        y -= 18;
        addTableHeader();

        exportData.rows.forEach(addTableRow);

        if (commands.length) {
            finishPage();
        }

        const objects = [];
        const fontObjectNumber = (pages.length * 2) + 3;
        const boldFontObjectNumber = fontObjectNumber + 1;

        objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
        objects[2] = (
            "<< /Type /Pages /Kids ["
            + pages.map((page, index) => ((index * 2) + 3) + " 0 R").join(" ")
            + "] /Count "
            + pages.length
            + " >>"
        );

        pages.forEach((page, index) => {
            const pageObjectNumber = (index * 2) + 3;
            const contentObjectNumber = pageObjectNumber + 1;
            const content = page;

            objects[pageObjectNumber] = (
                "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
                + "/Resources << /Font << /F1 "
                + fontObjectNumber
                + " 0 R /F2 "
                + boldFontObjectNumber
                + " 0 R >> >> /Contents "
                + contentObjectNumber
                + " 0 R >>"
            );
            objects[contentObjectNumber] = (
                "<< /Length "
                + byteLength(content)
                + " >>\nstream\n"
                + content
                + "\nendstream"
            );
        });

        objects[fontObjectNumber] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
        objects[boldFontObjectNumber] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

        let pdf = "%PDF-1.4\n";
        const offsets = [0];

        for (let objectNumber = 1; objectNumber < objects.length; objectNumber += 1) {
            offsets[objectNumber] = byteLength(pdf);
            pdf += objectNumber + " 0 obj\n" + objects[objectNumber] + "\nendobj\n";
        }

        const xrefOffset = byteLength(pdf);
        pdf += "xref\n0 " + objects.length + "\n";
        pdf += "0000000000 65535 f \n";

        for (let objectNumber = 1; objectNumber < objects.length; objectNumber += 1) {
            pdf += String(offsets[objectNumber]).padStart(10, "0") + " 00000 n \n";
        }

        pdf += (
            "trailer\n<< /Size "
            + objects.length
            + " /Root 1 0 R >>\nstartxref\n"
            + xrefOffset
            + "\n%%EOF"
        );

        return pdf;
    }

    function exportCsv() {
        downloadBlob(buildCsv(), "text/csv;charset=utf-8", makeFilename("csv"));
        setStatus("CSV export started.");
    }

    function exportPdf() {
        downloadBlob(buildPdf(), "application/pdf", makeFilename("pdf"));
        setStatus("PDF export started.");
    }

    function handleExport(format) {
        if (!hasRows()) {
            setStatus(exportData ? exportData.emptyMessage : "No table data is available to export.", true);
            return;
        }

        if (format === "csv") {
            exportCsv();
            return;
        }

        if (format === "pdf") {
            exportPdf();
        }
    }

    exportButtons.forEach((button) => {
        button.addEventListener("click", () => {
            handleExport(button.dataset.exportFormat);
        });
    });
}

window.NumericalMethodsResults = window.NumericalMethodsResults || {};
window.NumericalMethodsResults.initTableExports = initTableExports;
initTableExports();
}());
