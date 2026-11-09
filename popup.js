
const extractButton = document.getElementById("extract");
const fillButton = document.getElementById("fill");
const status = document.getElementById("status");

extractButton.addEventListener("click", () => {
    status.textContent = "Extract Attendance clicked!";
});

fillButton.addEventListener("click", () => {
    status.textContent = "Fill GPA Attendance clicked!";
});
