# Requirements Document

## Introduction

This feature adds bulk action capabilities to the Analysis Reports table by introducing a dropdown menu in the header that allows users to perform delete and save operations on selected reports. The feature enhances user productivity by enabling batch operations instead of individual row actions.

## Glossary

- **Analysis_Reports_Table**: The data table component that displays user's analysis reports with selection capabilities
- **Bulk_Actions_Dropdown**: A dropdown menu in the Analysis Reports header containing bulk operation options
- **Selected_Reports**: Reports that have been checked using the row selection checkboxes
- **Saved_List_Table**: Database table that stores user's saved report sessions
- **Agent_Reports_Table**: Primary database table containing analysis report data
- **Session_ID**: Unique identifier for each analysis report session

## Requirements

### Requirement 1

**User Story:** As a user, I want to access bulk actions for selected reports, so that I can efficiently manage multiple reports at once

#### Acceptance Criteria

1. WHEN the Analysis Reports header is displayed, THE Analysis_Reports_Table SHALL display a dropdown menu button next to the existing filters
2. WHEN no reports are selected, THE Bulk_Actions_Dropdown SHALL be disabled with appropriate visual indication
3. WHEN one or more reports are selected, THE Bulk_Actions_Dropdown SHALL be enabled and show the count of selected items
4. THE Bulk_Actions_Dropdown SHALL contain exactly two options: "Delete Selected" and "Save Selected"
5. WHEN the dropdown is opened, THE Analysis_Reports_Table SHALL display the available actions with appropriate icons

### Requirement 2

**User Story:** As a user, I want to delete multiple selected reports at once, so that I can quickly clean up unwanted analysis reports

#### Acceptance Criteria

1. WHEN "Delete Selected" is clicked from the dropdown, THE Analysis_Reports_Table SHALL display a confirmation dialog
2. THE confirmation dialog SHALL show the count of reports to be deleted and list the ticker symbols
3. WHEN deletion is confirmed, THE Analysis_Reports_Table SHALL remove all selected reports from the Agent_Reports_Table and related child tables
4. WHEN deletion is successful, THE Analysis_Reports_Table SHALL display a success toast message with the count of deleted reports
5. WHEN deletion fails, THE Analysis_Reports_Table SHALL display an error toast message and retain the original data

### Requirement 3

**User Story:** As a user, I want to save multiple selected reports to my saved list, so that I can quickly bookmark important analysis reports

#### Acceptance Criteria

1. WHEN "Save Selected" is clicked from the dropdown, THE Analysis_Reports_Table SHALL add all selected session IDs to the Saved_List_Table
2. WHEN reports are already in the saved list, THE Analysis_Reports_Table SHALL skip duplicate entries without error
3. WHEN saving is successful, THE Analysis_Reports_Table SHALL display a success toast message with the count of newly saved reports
4. WHEN saving fails, THE Analysis_Reports_Table SHALL display an error toast message
5. THE Analysis_Reports_Table SHALL clear the row selection after successful save operation

### Requirement 4

**User Story:** As a user, I want the bulk actions to work consistently across both the main page and table page, so that I have the same functionality regardless of where I access the reports

#### Acceptance Criteria

1. THE Bulk_Actions_Dropdown SHALL be available on both the root page (/) and table page (/table)
2. THE Bulk_Actions_Dropdown SHALL maintain identical functionality and appearance on both pages
3. WHEN bulk operations are performed, THE Analysis_Reports_Table SHALL update the data consistently across both page contexts
4. THE Analysis_Reports_Table SHALL preserve existing individual row actions alongside the new bulk actions
5. WHEN bulk operations complete, THE Analysis_Reports_Table SHALL refresh the table data to reflect changes