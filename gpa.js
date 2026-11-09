
function processGpaAttendance(attendanceMap, applyChanges = false, approvedChanges = []) {
    const attendanceBands = [
        { min: 95, label: /^95-100/, score: 5 },
        { min: 85, label: /^85-94/, score: 4 },
        { min: 75, label: /^75-84/, score: 3 },
        { min: 65, label: /^65-74/, score: 2 },
        { min: 55, label: /^55-64/, score: 1 },
        { min: 0, label: /^<\s*54/, score: 0 }
    ];

    function getBand(percentage) {
        return attendanceBands.find(
            band => percentage >= band.min
        )?.label;
    }

    function isAttendanceSelect(select) {
        const options = [...select.options].map(option =>
            option.textContent.trim().toLowerCase()
        );

        const expected = [
            "95-100", "85-94", "75-84",
            "65-74", "55-64", "<54", "n/a"
        ];

        return expected.every(label =>
            options.some(option => option.includes(label))
        );
    }

    const rows = [...document.querySelectorAll("tr.even, tr.odd")]
        .filter(row => !row.classList.contains("gpa-fill-down-row"));

    const changes = [];
    const matches = [];
    let skipped = 0;

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
        const percentage = Number(attendanceMap[id]);

        if (
            attendanceMap[id] === undefined ||
            !Number.isFinite(percentage) ||
            percentage < 0 ||
            percentage > 100
        ) {
            skipped++;
            continue;
        }

        const selects = [...row.querySelectorAll("td.gpa_normal select")]
            .filter(isAttendanceSelect);

        // Do not guess if multiple attendance fields exist.
        if (selects.length !== 1) {
            skipped++;
            continue;
        }

        const select = selects[0];
        const band = getBand(percentage);

        const option = [...select.options].find(item =>
            band?.test(item.textContent.trim())
        );

        if (!option) {
            skipped++;
            continue;
        }

        const change = {
            id,
            percentage,
            attendanceBand: option.textContent.trim()
        };

        changes.push(change);
        matches.push({ select, option, change });
    }

    if (applyChanges) {
        // Check that every proposed change was approved.
        const approved = new Map(
            approvedChanges.map(change => [change.id, change])
        );

        const allApproved =
            matches.length === approvedChanges.length &&
            matches.every(({ change }) => {
                const previous = approved.get(change.id);

                return previous &&
                    previous.percentage === change.percentage &&
                    previous.attendanceBand === change.attendanceBand;
            });

        if (!allApproved || matches.length === 0) {
            return {
                success: false,
                message: "GPA matches changed. Please preview again.",
                matched: matches.length,
                skipped,
                applied: false,
                changes
            };
        }

        // Apply only after all checks have passed.
        for (const { select, option } of matches) {
            select.value = option.value;
            select.dispatchEvent(
                new Event("change", { bubbles: true })
            );
        }
    }

    return {
        success: true,
        matched: changes.length,
        skipped,
        applied: applyChanges,
        changes
    };
}
