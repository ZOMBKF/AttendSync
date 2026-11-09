
const extractButton = document.getElementById("extract");
const fillButton = document.getElementById("fill");
const status = document.getElementById("status");

extractButton.addEventListener("click", async () => {
    try {
        status.textContent = "Extracting attendance...";

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
            throw new Error(result?.message || "Extraction failed.");
        }

        await chrome.storage.local.set({
            attendanceMap: result.attendanceMap
        });

        status.textContent =
            `Successfully extracted ${result.count} students!`;

    } catch (error) {
        status.textContent = `Error: ${error.message}`;
        console.error(error);
    }
});


fillButton.addEventListener("click", async () => {
    try {
        const { attendanceMap } =
            await chrome.storage.local.get("attendanceMap");

        if (!attendanceMap || !Object.keys(attendanceMap).length) {
            throw new Error("Extract attendance first.");
        }

        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

        if (!tab?.id) {
            throw new Error("No active tab found.");
        }

        // Preview changes first.
        const preview = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (data) => {
                window.__attendSyncData = data;
                window.__attendSyncApply = false;
            },
            args: [attendanceMap]
        });

        const previewResults = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["gpa.js"]
        });

        const result = previewResults[0]?.result;

        if (!result?.success || result.matched === 0) {
            throw new Error("No matching GPA attendance fields found.");
        }

        const approved = confirm(
            `AttendSync found ${result.matched} matches.\n\n` +
            result.changes.map(change =>
                `${change.id}: ${change.percentage}% → ${change.attendanceBand}`
            ).join("\n") +
            "\n\nApply these changes?"
        );

        if (!approved) {
            status.textContent = "Changes cancelled.";
            return;
        }

        // Apply changes after confirmation.
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (data) => {
                window.__attendSyncData = data;
                window.__attendSyncApply = true;
            },
            args: [attendanceMap]
        });

        const appliedResults = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["gpa.js"]
        });

        const applied = appliedResults[0]?.result;

        status.textContent =
            `Filled ${applied.matched} GPA attendance fields!`;

    } catch (error) {
        status.textContent = `Error: ${error.message}`;
        console.error(error);
    }
});

