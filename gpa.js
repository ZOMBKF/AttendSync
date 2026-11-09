
function processGpaAttendance(
    attendanceMap,
    applyChanges = false,
    approvedChanges = []
) {
    // Convert attendance percentages into GPA scores.
    const attendanceBands = [
        { min: 95, score: 5, label: /^95\s*-\s*100$/ },
        { min: 85, score: 4, label: /^85\s*-\s*94$/ },
        { min: 75, score: 3, label: /^75\s*-\s*84$/ },
        { min: 65, score: 2, label: /^65\s*-\s*74$/ },
        { min: 55, score: 1, label: /^55\s*-\s*64$/ },
        { min: 0, score: 0, label: /^<\s*(54|55)$/ }
    ];

    function getBand(percentage) {
        return attendanceBands.find(
            band => percentage >= band.min
        );
    }

    function normalise(text) {
        return (text || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "");
    }

    // Confirm that a dropdown contains attendance bands.
    function isAttendanceSelect(select) {
        const options = [...select.options].map(option =>
            normalise(option.textContent)
        );

        const expected = [
            "95-100",
            "85-94",
            "75-84",
            "65-74",
            "55-64",
            "n/a"
        ];

        const hasExpectedBands = expected.every(label =>
            options.includes(label)
        );

        const hasLowestBand =
            options.includes("<54") ||
            options.includes("<55");

        return hasExpectedBands && hasLowestBand;
    }

    const rows = [
        ...document.querySelectorAll("tr.even, tr.odd")
    ].filter(
        row => !row.classList.contains("gpa-fill-down-row")
    );

    const changes = [];
    const matches = [];
    const seenIds = new Set();
    let skipped = 0;

    // Validate student records before making changes.
    for (const row of rows) {
        const nameCell = row.querySelector(".gpa_subject");

        const idMatch = nameCell?.textContent.match(
            /\(([A-Z0-9-]+)\)\s*$/i
        );

        if (!idMatch) {
            skipped++;
            continue;
        }

        const id = idMatch[1].toUpperCase();

        // Stop if the GPA page contains duplicate student IDs.
        if (seenIds.has(id)) {
            return {
                success: false,
                message:
                    `Duplicate student ID on GPA page: ${id}. ` +
                    "No changes made.",
                matched: 0,
                skipped,
                applied: false,
                changes: []
            };
        }

        seenIds.add(id);

        if (
            !Object.prototype.hasOwnProperty.call(
                attendanceMap,
                id
            )
        ) {
            skipped++;
            continue;
        }

        const percentage = Number(attendanceMap[id]);

        if (
            !Number.isFinite(percentage) ||
            !Number.isInteger(percentage) ||
            percentage < 0 ||
            percentage > 100
        ) {
            skipped++;
            continue;
        }

        const selects = [
            ...row.querySelectorAll("td.gpa_normal select")
        ].filter(isAttendanceSelect);

        // Never guess when multiple fields match.
        if (selects.length !== 1) {
            skipped++;
            continue;
        }

        const select = selects[0];
        const band = getBand(percentage);

        const option = [...select.options].find(item =>
            band.label.test(
                item.textContent.trim()
            )
        );

        if (!option || option.disabled || select.disabled) {
            skipped++;
            continue;
        }

        const change = {
            id,
            percentage,
            attendanceBand: option.textContent.trim()
        };

        changes.push(change);
        matches.push({
            select,
            option,
            change
        });
    }

    // Apply changes only after validation.
    if (applyChanges) {
        const approved = new Map(
            approvedChanges.map(change => [
                change.id,
                change
            ])
        );

        const allApproved =
            approved.size === approvedChanges.length &&
            matches.length === approvedChanges.length &&
            matches.every(({ change }) => {
                const previous = approved.get(change.id);

                return (
                    previous &&
                    previous.percentage === change.percentage &&
                    previous.attendanceBand ===
                    change.attendanceBand
                );
            });

        if (!allApproved || matches.length === 0) {
            return {
                success: false,
                message:
                    "GPA matches changed. No changes made.",
                matched: matches.length,
                skipped,
                applied: false,
                changes
            };
        }

        // Fill each matching attendance dropdown.
        for (const { select, option } of matches) {
            select.value = option.value;

            select.dispatchEvent(
                new Event("change", {
                    bubbles: true
                })
            );
        }
    }

    return {
        success: true,
        matched: changes.length,
        skipped,
        applied: applyChanges
            ? matches.length
            : 0,
        changes
    };
}
