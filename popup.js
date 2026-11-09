
const extractButton = document.getElementById("extract");
const fillButton = document.getElementById("fill");
const clearDataButton = document.getElementById("clearData");
const statusEl = document.getElementById("status");

const DATA_KEYS = ["attendanceMap", "attendanceSavedAt"];
const FIVE_MINUTES = 5 * 60 * 1000;

// Show generic errors without revealing student information.
function showError(message) {
    statusEl.textContent = `Error: ${message}`;
}

// Check whether saved attendance data has expired.
async function getSavedAttendance() {
    const data = await chrome.storage.session.get(DATA_KEYS);

    if (
        data.attendanceMap &&
        (
            !data.attendanceSavedAt ||
            Date.now() - data.attendanceSavedAt >= FIVE_MINUTES
        )
    ) {
        await chrome.storage.session.remove(DATA_KEYS);
        return {};
    }

    return data;
}

// Update the Clear button based on stored data.
async function updateClearButton() {
    try {
        const { attendanceMap } = await getSavedAttendance();

        clearDataButton.disabled = !(
            attendanceMap &&
            Object.keys(attendanceMap).length > 0
        );
    } catch {
        clearDataButton.disabled = true;
    }
}

// Remove any records left in the old local storage.
async function initialisePrivacy() {
    extractButton.disabled = true;
    fillButton.disabled = true;
    clearDataButton.disabled = true;

    try {
        await chrome.storage.local.remove(DATA_KEYS);
        await updateClearButton();
    } catch {
        showError("Could not initialise secure storage.");
        return;
    } finally {
        extractButton.disabled = false;
        fillButton.disabled = false;
    }
}

initialisePrivacy();

// Keep button state updated when session data changes.
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (
        areaName === "session" &&
        (
            "attendanceMap" in changes ||
            "attendanceSavedAt" in changes
        )
    ) {
        updateClearButton();
    }
});

// 1. EXTRACT ATTENDANCE

extractButton.addEventListener("click", async () => {
    extractButton.disabled = true;

    try {
        statusEl.textContent = "Extracting attendance...";

        // Delete any previously saved attendance.
        await chrome.storage.session.remove(DATA_KEYS);

        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

        if (!tab?.id) {
            throw new Error("No active tab.");
        }

        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["attendance.js"]
        });

        const result = results[0]?.result;

        if (!result?.success || !result.count) {
            throw new Error("Attendance extraction failed.");
        }

        await chrome.storage.session.set({
            attendanceMap: result.attendanceMap,
            attendanceSavedAt: Date.now()
        });

        statusEl.textContent =
            `Successfully extracted ${result.count} students!`;

    } catch {
        try {
            await chrome.storage.session.remove(DATA_KEYS);
        } catch {
            // Do not log student information.
        }

        showError(
            "Could not extract attendance. Check the page and try again."
        );

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

        const { attendanceMap } = await getSavedAttendance();

        if (
            !attendanceMap ||
            !Object.keys(attendanceMap).length
        ) {
            throw new Error("No saved attendance.");
        }

        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

        if (!tab?.id) {
            throw new Error("No active GPA tab.");
        }

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["gpa.js"]
        });

        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },

            func: (data) => {
                if (
                    typeof processGpaAttendance !== "function"
                ) {
                    return {
                        success: false,
                        message: "GPA function unavailable."
                    };
                }

                const preview = processGpaAttendance(
                    data,
                    false
                );

                if (!preview.success || !preview.matched) {
                    return {
                        success: false,
                        message: "GPA validation failed."
                    };
                }

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
            throw new Error("GPA autofill failed.");
        }

        // Delete saved records after successful autofill.
        await chrome.storage.session.remove(DATA_KEYS);

        statusEl.textContent =
            `Filled ${result.applied} students! ` +
            `${result.skipped ?? 0} skipped. ` +
            "Saved attendance data deleted.";

    } catch {
        showError(
            "Could not complete GPA autofill. Check the page and try again."
        );

    } finally {
        fillButton.disabled = false;
        await updateClearButton();
    }
});

// 3. CLEAR SAVED ATTENDANCE DATA

clearDataButton.addEventListener("click", async () => {
    clearDataButton.disabled = true;

    try {
        await chrome.storage.session.remove(DATA_KEYS);

        statusEl.textContent =
            "Saved attendance data cleared successfully!";

    } catch {
        showError("Could not clear saved data.");

    } finally {
        await updateClearButton();
    }
});
