
const extractButton = document.getElementById("extract");
const fillButton = document.getElementById("fill");
const clearDataButton = document.getElementById("clearData");
const statusEl = document.getElementById("status");

// UPDATE CLEAR BUTTON BASED ON SAVED DATA

async function updateClearButton() {
    try {
        const { attendanceMap } = await chrome.storage.local.get(
            "attendanceMap"
        );

        const hasData =
            attendanceMap &&
            Object.keys(attendanceMap).length > 0;

        clearDataButton.disabled = !hasData;

    } catch (error) {
        clearDataButton.disabled = true;
        console.error("Could not check saved data:", error);
    }
}

// Check saved data when the popup first opens.
clearDataButton.disabled = true;
updateClearButton();

// Keep the button updated if storage changes.
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (
        areaName === "local" &&
        ("attendanceMap" in changes)
    ) {
        updateClearButton();
    }
});

// 1. EXTRACT ATTENDANCE

extractButton.addEventListener("click", async () => {
    extractButton.disabled = true;

    try {
        statusEl.textContent = "Extracting attendance...";

        // Clear old data before starting a new extraction.
        await chrome.storage.local.remove([
            "attendanceMap",
            "attendanceSavedAt"
        ]);

        await updateClearButton();

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

        await updateClearButton();

        statusEl.textContent =
            `Successfully extracted ${result.count} students!`;

    } catch (error) {
        // Prevent old data from being used after failure.
        try {
            await chrome.storage.local.remove([
                "attendanceMap",
                "attendanceSavedAt"
            ]);
        } catch (storageError) {
            console.error(
                "Failed to clear saved data:",
                storageError
            );
        }

        statusEl.textContent = `Error: ${error.message}`;
        console.error(error);

    } finally {
        extractButton.disabled = false;
        await updateClearButton();
    }
});

// 2. AUTOMATICALLY FILL GPA ATTENDANCE

fillButton.addEventListener("click", async () => {
    fillButton.disabled = true;

    try {
        statusEl.textContent = "Filling GPA attendance...";

        const { attendanceMap, attendanceSavedAt } =
            await chrome.storage.local.get([
                "attendanceMap",
                "attendanceSavedAt"
            ]);

        if (
            !attendanceMap ||
            !Object.keys(attendanceMap).length
        ) {
            throw new Error(
                "Please extract attendance first."
            );
        }

        if (
            !attendanceSavedAt ||
            Date.now() - attendanceSavedAt >
            24 * 60 * 60 * 1000
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

        // Fill automatically without confirmation.
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },

            func: (data) => {
                if (
                    typeof processGpaAttendance !== "function"
                ) {
                    return {
                        success: false,
                        message: "GPA function is not loaded."
                    };
                }

                // Check proposed changes before applying.
                const preview = processGpaAttendance(
                    data,
                    false
                );

                if (!preview.success || !preview.matched) {
                    return {
                        success: false,
                        message: "No matching GPA fields found."
                    };
                }

                // Apply validated changes immediately.
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
                result?.message ||
                "Unable to fill GPA attendance."
            );
        }

        statusEl.textContent =
            `Filled ${result.applied} students! ` +
            `${result.skipped ?? 0} skipped.`;

    } catch (error) {
        statusEl.textContent =
            `Error: ${error.message}`;

        console.error(error);

    } finally {
        fillButton.disabled = false;
    }
});

// 3. CLEAR SAVED ATTENDANCE DATA

clearDataButton.addEventListener("click", async () => {
    clearDataButton.disabled = true;

    try {
        await chrome.storage.local.remove([
            "attendanceMap",
            "attendanceSavedAt"
        ]);

        statusEl.textContent =
            "Saved attendance data cleared successfully!";

    } catch (error) {
        statusEl.textContent =
            `Error: ${error.message}`;

        console.error(error);

    } finally {
        await updateClearButton();
    }
});
