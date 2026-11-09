
const extractButton = document.getElementById("extract");
const fillButton = document.getElementById("fill");
const statusEl = document.getElementById("status");

const preview = document.getElementById("preview");
const previewBody = document.getElementById("previewBody");
const previewSummary = document.getElementById("previewSummary");
const confirmFill = document.getElementById("confirmFill");
const cancelFill = document.getElementById("cancelFill");

let pendingChanges = [];
let pendingTabId = null;
let pendingPageUrl = null;

function clearPreview() {
    preview.hidden = true;
    pendingChanges = [];
    pendingTabId = null;
    pendingPageUrl = null;
    previewBody.replaceChildren();
}

// Run GPA logic directly with the supplied arguments.
async function runGpa(tabId, attendanceMap, apply, approved = []) {
    const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: async (data, shouldApply, approvedList) => {
            // Load GPA function into the same isolated world.
            // This function is defined in gpa.js.
            if (typeof processGpaAttendance !== "function") {
                return {
                    success: false,
                    message: "GPA function is not loaded."
                };
            }

            return processGpaAttendance(data, shouldApply, approvedList);
        },
        args: [attendanceMap, apply, approved]
    });

    return results[0]?.result;
}

// Extract attendance
extractButton.addEventListener("click", async () => {
    try {
        clearPreview();
        statusEl.textContent = "Extracting attendance...";

        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

        if (!tab?.id) {
            throw new Error("No active tab found.");
        }

        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["attendance.js"]
        });

        const result = results[0]?.result;

        if (!result?.success || !result.count) {
            throw new Error(
                result?.message || "No attendance records found."
            );
        }

        await chrome.storage.local.set({
            attendanceMap: result.attendanceMap,
            attendanceSavedAt: Date.now()
        });

        statusEl.textContent =
            `Successfully extracted ${result.count} students!`;

    } catch (error) {
        statusEl.textContent = `Error: ${error.message}`;
        console.error(error);
    }
});

// Preview GPA changes
fillButton.addEventListener("click", async () => {
    try {
        clearPreview();
        statusEl.textContent = "Checking GPA attendance...";

        const { attendanceMap, attendanceSavedAt } =
            await chrome.storage.local.get([
                "attendanceMap",
                "attendanceSavedAt"
            ]);

        if (!attendanceMap || !Object.keys(attendanceMap).length) {
            throw new Error("Extract attendance first.");
        }

        if (
            !attendanceSavedAt ||
            Date.now() - attendanceSavedAt > 24 * 60 * 60 * 1000
        ) {
            throw new Error("Attendance data is old. Extract it again.");
        }

        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

        if (!tab?.id || !tab.url) {
            throw new Error("No valid GPA tab found.");
        }

        // Load the GPA function.
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["gpa.js"]
        });

        const result = await runGpa(
            tab.id,
            attendanceMap,
            false
        );

        if (!result?.success || !result.matched) {
            throw new Error(
                result?.message || "No matching GPA fields found."
            );
        }

        pendingChanges = result.changes;
        pendingTabId = tab.id;
        pendingPageUrl = tab.url;

        for (const change of pendingChanges) {
            const row = document.createElement("tr");

            for (const value of [
                change.id,
                `${change.percentage}%`,
                change.attendanceBand
            ]) {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            }

            previewBody.appendChild(row);
        }

        previewSummary.textContent =
            `${result.matched} matched, ${result.skipped} skipped.`;

        preview.hidden = false;
        statusEl.textContent = "Review changes before filling.";

    } catch (error) {
        statusEl.textContent = `Error: ${error.message}`;
        console.error(error);
    }
});

// Confirm and apply
confirmFill.addEventListener("click", async () => {
    try {
        if (!pendingTabId || !pendingChanges.length) {
            throw new Error("No changes to apply.");
        }

        confirmFill.disabled = true;
        statusEl.textContent = "Filling GPA attendance...";

        const tab = await chrome.tabs.get(pendingTabId);

        if (tab.url !== pendingPageUrl) {
            throw new Error("Page changed. Preview again.");
        }

        const attendanceMap = Object.fromEntries(
            pendingChanges.map(change => [
                change.id,
                change.percentage
            ])
        );

        // Load GPA function again.
        await chrome.scripting.executeScript({
            target: { tabId: pendingTabId },
            files: ["gpa.js"]
        });

        const result = await runGpa(
            pendingTabId,
            attendanceMap,
            true,
            pendingChanges
        );

        if (!result?.success || !result.applied) {
            throw new Error(
                result?.message || "Unable to apply GPA changes."
            );
        }

        statusEl.textContent =
            `Successfully filled ${result.matched} students!`;

        clearPreview();

    } catch (error) {
        clearPreview();
        statusEl.textContent = `Error: ${error.message}`;
        console.error(error);
    } finally {
        confirmFill.disabled = false;
    }
});

// Cancel
cancelFill.addEventListener("click", () => {
    clearPreview();
    statusEl.textContent = "Changes cancelled.";
});
