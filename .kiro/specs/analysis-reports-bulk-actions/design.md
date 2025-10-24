# Design Document

## Overview

This design implements bulk action capabilities for the Analysis Reports table by adding a dropdown menu in the header that enables users to perform delete and save operations on multiple selected reports simultaneously. The solution leverages the existing row selection functionality and extends the current database operations to support batch processing.

## Architecture

### Component Structure
```
ReportDataTable (Enhanced)
├── Header Section
│   ├── Title: "Analysis Reports 📖"
│   ├── Filters (Status, Recommendation)
│   ├── Bulk Actions Dropdown (NEW)
│   └── Refresh Button
├── Table with Row Selection (Existing)
└── Confirmation Dialogs (Enhanced)
```

### Data Flow
1. **Selection State**: Utilize existing `rowSelection` state from TanStack Table
2. **Bulk Operations**: New server actions for batch delete and save operations
3. **State Management**: Update local table state after successful operations
4. **User Feedback**: Toast notifications for operation results

## Components and Interfaces

### 1. Bulk Actions Dropdown Component

**Location**: Integrated into `ReportDataTable` header section

**Props Interface**:
```typescript
interface BulkActionsDropdownProps {
  selectedCount: number;
  selectedReports: AgentReportRow[];
  onBulkDelete: (reportIds: string[]) => Promise<void>;
  onBulkSave: (sessionIds: string[]) => Promise<void>;
  disabled: boolean;
}
```

**Visual Design**:
- Button with "Actions" label and down chevron icon
- Shows selected count when enabled: "Actions (3)"
- Disabled state when no rows selected
- Dropdown contains two options with icons:
  - 🗑️ Delete Selected
  - 💾 Save Selected

### 2. Enhanced Server Actions

**New Actions in `src/actions/agent-reports.ts`**:

```typescript
// Bulk delete multiple reports
export async function bulkDeleteReports(
  reportIds: string[], 
  userId: string
): Promise<{ deleted: number; failed: string[] }>;

// Bulk save multiple reports to saved list
export async function bulkSaveReports(
  sessionIds: string[], 
  userId: string
): Promise<{ saved: number; skipped: number }>;
```

### 3. Database Operations

**Bulk Delete Strategy**:
- Use Prisma transaction for atomic operations
- Delete from `agent_reports` table (cascading deletes handle child tables)
- Verify user ownership before deletion
- Return success/failure counts

**Bulk Save Strategy**:
- Use Prisma `createMany` with `skipDuplicates: true`
- Insert into `saved_list` table
- Handle existing entries gracefully
- Return counts of new saves vs skipped duplicates

## Data Models

### Enhanced AgentReportRow Interface
```typescript
// Existing interface remains unchanged
export interface AgentReportRow {
  id: string;
  ticker: string;
  analysisDate: Date;
  updatedAt: Date;
  recommendation: string;
  status: 'queued' | 'processing' | 'done' | 'failed' | 'NEC';
  published: boolean;
  analystTeams: string[];
  sessionId: string;
  userId: string;
}
```

### Bulk Operation Result Types
```typescript
interface BulkDeleteResult {
  deleted: number;
  failed: string[];
  errors?: string[];
}

interface BulkSaveResult {
  saved: number;
  skipped: number;
  errors?: string[];
}
```

## Error Handling

### Client-Side Error Handling
1. **Network Errors**: Display "Network error - please check connection" toast
2. **Permission Errors**: Display "You don't have permission" toast
3. **Validation Errors**: Display specific validation message
4. **Partial Failures**: Display summary of successful vs failed operations

### Server-Side Error Handling
1. **Authentication**: Verify user session before operations
2. **Authorization**: Verify user owns all selected reports
3. **Database Constraints**: Handle foreign key and unique constraints
4. **Transaction Rollback**: Ensure atomic operations for bulk delete

### Error Recovery
- Failed operations don't affect successful ones in batch
- Table state remains consistent after partial failures
- Clear selection only after successful operations
- Provide retry mechanism through refresh button

## Testing Strategy

### Unit Tests
1. **Bulk Actions Component**:
   - Disabled state when no selection
   - Correct count display
   - Dropdown option rendering

2. **Server Actions**:
   - Bulk delete with valid/invalid IDs
   - Bulk save with new/existing sessions
   - User ownership verification
   - Transaction rollback scenarios

### Integration Tests
1. **End-to-End Workflows**:
   - Select multiple reports → bulk delete → verify removal
   - Select multiple reports → bulk save → verify in saved list
   - Mixed success/failure scenarios

2. **Database Integrity**:
   - Cascading deletes work correctly
   - Saved list entries created properly
   - No orphaned records after operations

### Error Scenario Tests
1. **Permission Violations**: User tries to delete reports they don't own
2. **Network Failures**: Operations interrupted mid-process
3. **Database Constraints**: Duplicate save attempts
4. **Partial Failures**: Some operations succeed, others fail

## Implementation Considerations

### Performance Optimizations
1. **Batch Size Limits**: Limit bulk operations to reasonable batch sizes (e.g., 50 reports)
2. **Database Transactions**: Use transactions for consistency without long locks
3. **Optimistic Updates**: Update UI immediately, rollback on failure

### User Experience
1. **Loading States**: Show loading indicators during bulk operations
2. **Progress Feedback**: Display operation progress for large batches
3. **Confirmation Dialogs**: Clear confirmation with operation details
4. **Undo Capability**: Consider implementing undo for delete operations

### Security Considerations
1. **User Ownership**: Verify user owns all selected reports before operations
2. **Rate Limiting**: Prevent abuse of bulk operations
3. **Input Validation**: Validate all report IDs and session IDs
4. **Audit Logging**: Log bulk operations for security monitoring

### Accessibility
1. **Keyboard Navigation**: Dropdown accessible via keyboard
2. **Screen Readers**: Proper ARIA labels and descriptions
3. **Focus Management**: Maintain focus after operations complete
4. **Color Contrast**: Ensure disabled states meet contrast requirements

## Migration Strategy

### Phase 1: Core Implementation
1. Add bulk actions dropdown to header
2. Implement server actions for bulk operations
3. Add confirmation dialogs
4. Basic error handling and feedback

### Phase 2: Enhanced Features
1. Progress indicators for large batches
2. Advanced error recovery
3. Undo functionality
4. Performance optimizations

### Phase 3: Polish
1. Accessibility improvements
2. Advanced user feedback
3. Analytics and monitoring
4. Documentation updates