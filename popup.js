
const extractButton = document.getElementById("extract");
const fillButton = document.getElementById("fill");
const statusEl = document.getElementById("status");

// 1. EXTRACT ATTENDANCE

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

// 2. AUTOMATICALLY FILL GPA ATTENDANCE

fillButton.addEventListener("click", async () => {
    try {
        fillButton.disabled = true;
        statusEl.textContent = "Filling GPA attendance...";

        const { attendanceMap, attendanceSavedAt } =
            await chrome.storage.local.get([
                "attendanceMap",
                "attendanceSavedAt"
            ]);

        if (!attendanceMap || !Object.keys(attendanceMap).length) {
            throw new Error("Please extract attendance first.");
        }

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

        if (!tab?.id) {
            throw new Error("No active GPA tab found.");
        }

        // Load the GPA processing function.
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["gpa.js"]
        });

        // Fill immediately, without confirmation.
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (data) => {
                if (typeof processGpaAttendance !== "function") {
                    return {
                        success: false,
                        message: "GPA function is not loaded."
                    };
                }

                // First check all proposed changes.
                const preview = processGpaAttendance(data, false);

                if (!preview.success || !preview.matched) {
                    return {
                        success: false,
                        message: "No matching GPA fields found."
                    };
                }

                // Apply only the matches that passed validation.
                return processGpaAttendance(
                    data,
                    true,
                    preview.changes
                );
            },
            args: [attendanceMap]
        });

        const result = results[0]?.result;

        if (!result?.success || !result.applied) {
            throw new Error(
                result?.message || "Unable to fill GPA attendance."
            );
        }

        statusEl.textContent =
            `Filled ${result.matched} students! ` +
            `${result.skipped} skipped.`;

    } catch (error) {
        statusEl.textContent = `Error: ${error.message}`;
        console.error(error);
    } finally {
        fillButton.disabled = false;
    }
});
