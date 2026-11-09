
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

fillButton.addEventListener("click", () => {
    status.textContent = "GPA autofill is coming next!";
});
