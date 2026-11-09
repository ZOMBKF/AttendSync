
(() => {
    // Convert text to a consistent format.
    const clean = (text) =>
        (text || "").replace(/\s+/g, "").toLowerCase();

    // Check whether a student ID matches our expected format.
    const isStudentId = (id) =>
        /^[A-Z-]{3}\d{4}$/i.test(id);

    // Find the attendance table.
    const attendanceHeader = [...document.querySelectorAll("table th")]
        .find((th) => clean(th.textContent).includes("schl%"));

    if (!attendanceHeader) {
        return {
            success: false,
            message: "Could not find the Schl % column."
        };
    }

    const table = attendanceHeader.closest("table");

    // Find the student ID column.
    const idHeader = [...table.querySelectorAll("th")]
        .find((th) => clean(th.textContent) === "idcode");

    if (!idHeader) {
        return {
            success: false,
            message: "Could not find the ID Code column."
        };
    }

    // Count columns, including colspan values.
    function getColumnIndex(header) {
        let index = 0;

        for (const cell of header.parentElement.children) {
            if (cell === header) break;

            index += Number(cell.getAttribute("colspan")) || 1;
        }

        return index;
    }

    const idIndex = getColumnIndex(idHeader);
    const attendanceIndex = getColumnIndex(attendanceHeader);

    const attendanceMap = {};

    // Read student rows.
    const rows = [...table.querySelectorAll("tr")]
        .filter((row) => row.querySelector("td"));

    for (const row of rows) {
        const cells = [...row.children]
            .filter((cell) => cell.tagName === "TD");

        const id = cells[idIndex]?.textContent.trim().toUpperCase();
        const attendanceText = cells[attendanceIndex]?.textContent.trim();

        if (!id || !isStudentId(id)) continue;

        const match = attendanceText?.match(/-?\d+(?:\.\d+)?/);
        if (!match) continue;

        const percentage = Math.round(Number(match[0]));

        if (percentage < 0 || percentage > 100) continue;

        attendanceMap[id] = percentage;
    }

    if (Object.keys(attendanceMap).length === 0) {
        return {
            success: false,
            message: "No valid student attendance records found."
        };
    }

    return {
        success: true,
        attendanceMap,
        count: Object.keys(attendanceMap).length
    };
})();
