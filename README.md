# AttendSync

**A Chrome extension that helps teachers transfer attendance percentages into GPA attendance fields.**

AttendSync is designed to reduce repetitive manual data entry when transferring student attendance information between supported Compass School Management pages.

## Features

- **Attendance extraction:** Reads student IDs and school attendance percentages from a supported Compass attendance table.
- **Automatic GPA filling:** Matches students by ID and fills the corresponding attendance GPA dropdowns.
- **Duplicate detection:** Detects duplicate student IDs to reduce the risk of incorrect matching.
- **Attendance conversion:** Converts attendance percentages into GPA scores from 0 to 5.
- **Temporary storage:** Uses Chrome's session storage to hold attendance information temporarily.
- **Automatic data deletion:** Removes saved attendance data after successful autofill.
- **Five-minute expiry:** Expires saved attendance data after five minutes, with background cleanup when Chrome permits.
- **Manual data clearing:** Provides a Clear Saved Data button to delete temporary attendance records.

## How It Works

1. Open a supported Compass attendance summary page.
2. Click the AttendSync extension.
3. Select **Extract Attendance**.
4. Navigate to the corresponding GPA reporting page.
5. Click **Fill GPA Attendance**.
6. AttendSync matches students by ID and automatically fills supported attendance dropdowns.
7. After successful autofill, AttendSync deletes the saved attendance records.

Users should review the filled GPA values and follow their school's normal process for saving or submitting reports.

## Attendance to GPA Conversion

| Attendance percentage | GPA score |
|---|---|
| 95–100% | 5 |
| 85–94% | 4 |
| 75–84% | 3 |
| 65–74% | 2 |
| 55–64% | 1 |
| Below 55% | 0 |

Attendance percentages are rounded to whole numbers during extraction before being converted into GPA scores.

## Privacy and Security

AttendSync is designed to minimise the storage and exposure of student information.

**Data processed**

The extension processes student identification codes and school attendance percentages needed to match and fill GPA attendance fields.

**Temporary storage**

Attendance information is stored using `chrome.storage.session`, rather than persistent local storage. Session storage is cleared when the browser session ends.

**Automatic deletion**

Saved attendance records are deleted after successful autofill. A five-minute expiry check and background cleanup provide additional protection. Background deletion may be delayed when Chrome is closed or inactive.

**Manual deletion**

Users can delete saved attendance information at any time using the Clear Saved Data button.

**Data sharing**

The current extension code does not intentionally upload attendance records to an AttendSync server, external database, or analytics service. Data is processed locally in Chrome and used to fill the relevant Compass webpage.

**Error handling**

AttendSync uses generic error messages to reduce the risk of exposing student information through its own application logs.

**Limitations**

These measures reduce privacy risks but do not guarantee complete security. Student data remains temporarily accessible to the browser and relevant page-processing code. AttendSync does not control how Compass stores or processes submitted GPA information.

## Installation for Development

1. Download or clone this repository.
2. Open Google Chrome.
3. Navigate to `chrome://extensions`.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the AttendSync project folder.
7. Pin AttendSync to the Chrome toolbar.


## Important Notice

AttendSync is an independent project and is not affiliated with, endorsed by, or officially supported by Compass Education.

Teachers should obtain any required approval from their school or organisation before using AttendSync with real student information.

AttendSync does not replace normal attendance verification, assessment procedures, or school reporting requirements.


## Contributing

Contributions, bug reports, and suggestions are welcome through GitHub Issues and pull requests.

Do not include real student names, student IDs, attendance records, screenshots containing personal information, or school credentials in issues, commits, or pull requests.

## License

AttendSync is released under the MIT License.

You are free to use, modify and distribute the software under the terms of the MIT License.

See the LICENSE file for details.