# Implementation Plan

- [x] 1. Create bulk operation server actions
  - Implement `bulkDeleteReports` function in `src/actions/agent-reports.ts`
  - Implement `bulkSaveReports` function in `src/actions/agent-reports.ts`
  - Add proper error handling and user ownership verification
  - Return detailed results with success/failure counts
  - _Requirements: 2.3, 2.4, 2.5, 3.1, 3.3, 3.4_

- [x] 2. Add bulk actions dropdown component to ReportDataTable
  - Create bulk actions dropdown in the header section next to existing filters
  - Implement dropdown with "Delete Selected" and "Save Selected" options
  - Add proper icons and styling to match existing UI components
  - Show selected count in button label when reports are selected
  - Disable dropdown when no reports are selected
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3. Implement bulk delete functionality
  - Add confirmation dialog for bulk delete operations
  - Display count and ticker symbols of reports to be deleted
  - Call `bulkDeleteReports` server action on confirmation
  - Update local table state after successful deletion
  - Show appropriate success/error toast messages
  - Clear row selection after successful operation
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 4. Implement bulk save functionality
  - Call `bulkSaveReports` server action when "Save Selected" is clicked
  - Handle duplicate entries gracefully without showing errors
  - Show success toast with count of newly saved reports
  - Clear row selection after successful save operation
  - Handle and display appropriate error messages for failures
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.5_

- [x] 5. Enhance confirmation dialogs and user feedback
  - Update existing confirmation dialog to handle bulk operations
  - Add specific messaging for bulk delete vs single delete
  - Implement proper loading states during bulk operations
  - Add comprehensive error handling with specific error messages
  - Ensure consistent behavior across both main page and table page
  - _Requirements: 2.1, 2.2, 3.3, 3.4, 4.1, 4.2, 4.3_

- [ ]\* 6. Add comprehensive error handling and edge cases
  - Handle network failures and timeout scenarios
  - Implement proper error recovery mechanisms
  - Add validation for batch size limits
  - Handle partial failure scenarios with detailed feedback
  - _Requirements: 2.5, 3.4_

- [ ]\* 7. Write unit tests for bulk operations
  - Test bulk delete server action with various scenarios
  - Test bulk save server action with duplicate handling
  - Test dropdown component states and interactions
  - Test error handling and edge cases
  - _Requirements: All requirements validation_
