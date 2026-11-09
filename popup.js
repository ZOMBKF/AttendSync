
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

// ---------------------------------
// 1. EXTRACT ATTENDANCE
// ---------------------------------

extractButton.addEventListener("click", async () => {
    try {
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

        if (!result?.success) {
            throw new Error(
                result?.message || "Attendance extraction failed."
            );
        }

        if (!result.attendanceMap || !result.count) {
            throw new Error("No attendance records found.");
        }

        await chrome.storage.local.set({
            attendanceMap: result.attendanceMap,
            attendanceSavedAt: Date.now()
        });

        preview.hidden = true;
        pendingChanges = [];
        pendingTabId = null;
        pendingPageUrl = null;

        statusEl.textContent =
            `Successfully extracted ${result.count} students!`;

    } catch (error) {
        statusEl.textContent = `Error: ${error.message}`;
        console.error(error);
    }
});

// ---------------------------------
// 2. PREVIEW GPA ATTENDANCE
// ---------------------------------

fillButton.addEventListener("click", async () => {
    try {
        preview.hidden = true;
        pendingChanges = [];
        pendingTabId = null;
        pendingPageUrl = null;

        statusEl.textContent = "Checking GPA attendance...";

        const { attendanceMap, attendanceSavedAt } =
            await chrome.storage.local.get([
                "attendanceMap",
                "attendanceSavedAt"
            ]);

        if (!attendanceMap || !Object.keys(attendanceMap).length) {
            throw new Error("Please extract attendance first.");
        }

        // Warn if data is older than 24 hours.
        if (
            !attendanceSavedAt ||
            Date.now() - attendanceSavedAt > 24 * 60 * 60 * 1000
        ) {
            throw new Error(
                "Attendance data is old. Please extract it again."
            );
        }

        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

        if (!tab?.id || !tab.url) {
            throw new Error("No valid GPA tab found.");
        }

        // Pass saved attendance data to the GPA page.
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (data) => {
                window.__attendSyncData = data;
                window.__attendSyncApply = false;
            },
            args: [attendanceMap]
        });

        // Run GPA script in preview mode.
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["gpa.js"]
        });

        const result = results[0]?.result;

        if (!result?.success || !result.matched) {
            throw new Error("No matching GPA attendance fields found.");
        }

        pendingChanges = result.changes;
        pendingTabId = tab.id;
        pendingPageUrl = tab.url;

        // Clear old preview rows.
        previewBody.replaceChildren();

        // Add students to the preview table.
        for (const change of pendingChanges) {
            const row = document.createElement("tr");

            const values = [
                change.id,
                `${change.percentage}%`,
                change.attendanceBand
            ];

            for (const value of values) {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            }

            previewBody.appendChild(row);
        }

        previewSummary.textContent =
            `${result.matched} matched, ${result.skipped} skipped.`;

        preview.hidden = false;

        statusEl.textContent =
            "Review the attendance values before filling.";

    } catch (error) {
        statusEl.textContent = `Error: ${error.message}`;
        console.error(error);
    }
});

// ---------------------------------
// 3. CONFIRM AND FILL
// ---------------------------------

confirmFill.addEventListener("click", async () => {
    try {
        if (!pendingTabId || !pendingChanges.length) {
            throw new Error("No changes to apply.");
        }

        confirmFill.disabled = true;
        fillButton.disabled = true;

        statusEl.textContent = "Filling GPA attendance...";

        // Check that the user has not changed pages.
        const tab = await chrome.tabs.get(pendingTabId);

        if (tab.url !== pendingPageUrl) {
            throw new Error(
                "The GPA page has changed. Please preview again."
            );
        }

        const attendanceMap = Object.fromEntries(
            pendingChanges.map(change => [
                change.id,
                change.percentage
            ])
        );

        // Enable apply mode.
        await chrome.scripting.executeScript({
            target: { tabId: pendingTabId },
            func: (data) => {
                window.__attendSyncData = data;
                window.__attendSyncApply = true;
            },
            args: [attendanceMap]
        });

        // Apply GPA dropdown changes.
        const results = await chrome.scripting.executeScript({
            target: { tabId: pendingTabId },
            files: ["gpa.js"]
        });

        const result = results[0]?.result;

        if (!result?.success) {
            throw new Error("Unable to fill GPA attendance.");
        }

        statusEl.textContent =
            `Successfully filled ${result.matched} students!`;

        preview.hidden = true;
        pendingChanges = [];
        pendingTabId = null;
        pendingPageUrl = null;

    } catch (error) {
        statusEl.textContent = `Error: ${error.message}`;
        console.error(error);
    } finally {
        confirmFill.disabled = false;
        fillButton.disabled = false;
    }
});

// ---------------------------------
// 4. CANCEL
// ---------------------------------

cancelFill.addEventListener("click", () => {
    preview.hidden = true;

    pendingChanges = [];
    pendingTabId = null;
    pendingPageUrl = null;

    statusEl.textContent = "Changes cancelled.";
});
