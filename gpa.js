
(() => {
    const attendanceBands = [
        { min: 95, label: /^95-100/ },
        { min: 85, label: /^85-94/ },
        { min: 75, label: /^75-84/ },
        { min: 65, label: /^65-74/ },
        { min: 55, label: /^55-64/ },
        { min: 0, label: /^<\s*54/ }
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

    const attendanceMap = window.__attendSyncData || {};
    const applyChanges = window.__attendSyncApply === true;

    const rows = [...document.querySelectorAll("tr.even, tr.odd")]
        .filter(row => !row.classList.contains("gpa-fill-down-row"));

    let matched = 0;
    let skipped = 0;
    const changes = [];

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
        const percentage = attendanceMap[id];

        if (percentage === undefined) {
            skipped++;
            continue;
        }

        const select = [...row.querySelectorAll("td.gpa_normal select")]
            .find(isAttendanceSelect);

        if (!select) {
            skipped++;
            continue;
        }

        const band = getBand(Number(percentage));

        const option = [...select.options].find(item =>
            band?.test(item.textContent.trim())
        );

        if (!option) {
            skipped++;
            continue;
        }

        changes.push({
            id,
            percentage,
            attendanceBand: option.textContent.trim()
        });

        if (applyChanges) {
            select.value = option.value;
            select.dispatchEvent(
                new Event("change", { bubbles: true })
            );
        }

        matched++;
    }

    return {
        success: true,
        matched,
        skipped,
        applied: applyChanges,
        changes
    };
})();
