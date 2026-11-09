
const EXPIRY_ALARM = "attendance-expiry";
const DATA_KEYS = ["attendanceMap", "attendanceSavedAt"];
const FIVE_MINUTES = 5 * 60 * 1000;

async function clearExpiredAttendance() {
    try {
        const { attendanceMap, attendanceSavedAt } =
            await chrome.storage.session.get(DATA_KEYS);

        if (!attendanceMap) {
            await chrome.alarms.clear(EXPIRY_ALARM);
            return;
        }

        const expiryTime = attendanceSavedAt + FIVE_MINUTES;

        if (
            !attendanceSavedAt ||
            Date.now() >= expiryTime
        ) {
            await chrome.storage.session.remove(DATA_KEYS);
            await chrome.alarms.clear(EXPIRY_ALARM);
            return;
        }

        await chrome.alarms.create(EXPIRY_ALARM, {
            when: expiryTime
        });

    } catch {
        // Avoid logging student data or error details.
    }
}

// Delete records when the alarm fires.
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === EXPIRY_ALARM) {
        clearExpiredAttendance();
    }
});

// Check on browser startup.
chrome.runtime.onStartup.addListener(clearExpiredAttendance);

// Check when the extension is installed or updated.
chrome.runtime.onInstalled.addListener(clearExpiredAttendance);

// Schedule expiry when attendance is saved or changed.
chrome.storage.onChanged.addListener((changes, area) => {
    if (
        area === "session" &&
        (
            "attendanceMap" in changes ||
            "attendanceSavedAt" in changes
        )
    ) {
        clearExpiredAttendance();
    }
});

// Also check whenever the background worker starts.
clearExpiredAttendance();
