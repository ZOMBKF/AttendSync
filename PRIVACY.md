# AttendSync Privacy Policy

**Last updated:** 9 November 2026

## 1. Overview

AttendSync is an independent Chrome extension designed to help teachers transfer student attendance percentages into GPA attendance fields on supported Compass School Management pages.

We take student privacy seriously and aim to minimise the information processed and stored.

## 2. Information Processed

AttendSync processes the following information:

- Student identification codes
- Student attendance percentages
- Calculated attendance GPA scores

This information is used to match students and fill the corresponding GPA attendance fields.

## 3. How Information Is Used

AttendSync uses attendance information only to perform the attendance extraction and GPA autofill functions requested by the user.

## 4. Data Storage and Retention

Attendance records are temporarily stored using Chrome's `chrome.storage.session` API.

- Records expire after five minutes.
- Saved records are deleted after successful GPA autofill.
- Users can manually clear records using the Clear Saved Data button.
- Session data is cleared when the browser session ends.

Background cleanup may be delayed when Chrome is inactive. The extension also checks whether data has expired before using it.

## 5. Data Sharing

AttendSync does not intentionally transmit student attendance records to an AttendSync-operated server or external analytics service.

The extension processes information locally in the user's Chrome browser and fills the relevant Compass webpage.

Compass may process information entered into its reporting system according to its own policies.

## 6. Security

AttendSync uses temporary storage, data expiry, student ID matching, and generic error messages to reduce unnecessary exposure of student information.

These measures reduce risks but cannot guarantee absolute security.

## 7. User Responsibilities

Users must follow their school's privacy, data protection and reporting requirements.

School approval may be required before using AttendSync with real student information.

Users should verify all automatically filled GPA values before saving or submitting reports.

## 8. Third-Party Affiliation

AttendSync is an independent project and is not affiliated with, endorsed by, or officially supported by Compass Education.

## 9. Changes to This Policy

This policy may be updated when AttendSync's features or data handling practices change.

## 10. Contact

Privacy questions can be raised through the project's GitHub repository:

https://github.com/ZOMBKF/AttendSync