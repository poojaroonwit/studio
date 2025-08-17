# User Preferences Feature

## Overview

The User Preferences feature allows users to save and persist their filter settings and display preferences across browser sessions and devices. This ensures that users can maintain their preferred view of data without having to reconfigure filters every time they visit the application.

## Features

### Persistent Filter Settings

- **Task Board Filters**: Search terms, priority filters, assignee filters, and selected stages are automatically saved
- **Positions Page Filters**: Search terms, department filters, status filters, and selected recruiter filters are persisted
- **Display Options**: Task board display preferences (show/hide assignee, priority, due date, tags) are saved
- **Pagination Settings**: Page size and sorting preferences for the positions page are remembered

### Database Storage

- All preferences are automatically saved to the database
- Changes are persisted immediately when users modify filters or settings
- No manual save action is required
- **Cross-device synchronization**: Preferences are synced across all devices and browsers
- **Secure storage**: User preferences are stored securely in the database with user authentication

### Reset Functionality

- **Individual Reset**: Reset specific page preferences (Task Board or Positions)
- **Global Reset**: Reset all preferences to default values
- **Visual Feedback**: Toast notifications confirm when preferences are reset

## Implementation Details

### Database Schema

Preferences are stored in the `UserUIDisplayPreference` table with the following structure:

```sql
model UserUIDisplayPreference {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String   @map("userId") @db.Uuid
  modelType    String   @map("model_type")        // 'taskBoard' or 'positions'
  attributeKey String   @map("attribute_key")     // e.g., 'searchTerm', 'showAssignee'
  uiPreference String   @map("ui_preference")     // The actual preference value
  customNote   String?  @map("custom_note")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, modelType, attributeKey])
}
```

### API Endpoints

#### GET /api/user-preferences
Retrieves all user preferences for the authenticated user.

#### POST /api/user-preferences
Updates user preferences with the following body:
```json
{
  "modelType": "taskBoard" | "positions",
  "updates": {
    "searchTerm": "example",
    "showAssignee": true
  }
}
```

#### DELETE /api/user-preferences
Resets user preferences. Optional query parameter `modelType` to reset specific section.

### Default Values

```typescript
const defaultTaskBoardPreferences = {
  searchTerm: '',
  filterPriority: 'all',
  filterAssignee: 'all',
  selectedStages: [],
  viewMode: 'kanban',
  showAssignee: true,
  showPriority: false,
  showDueDate: false,
  showTags: true,
};

const defaultPositionsPreferences = {
  searchTerm: '',
  departmentFilter: 'all',
  statusFilter: 'all',
  selectedRecruiterId: null,
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};
```

### Components

#### useUserPreferences Hook

A custom React hook that manages the user preferences state and database synchronization:

```typescript
const {
  preferences,
  taskBoard,
  positions,
  updateTaskBoardPreferences,
  updatePositionsPreferences,
  resetTaskBoardPreferences,
  resetPositionsPreferences,
  resetAllPreferences,
  isLoaded,
  isLoading,
  isAuthenticated,
} = useUserPreferences();
```

#### User Preferences Page

A dedicated settings page at `/settings/user-preferences` where users can:
- View current preference values
- Toggle display options for task boards
- Reset individual or all preferences
- See information about how preferences work
- View database storage status

## Usage

### In Task Board Pages

```typescript
import { useUserPreferences } from '@/hooks/use-user-preferences';

export function TaskBoardPage() {
  const { 
    taskBoard: preferences, 
    updateTaskBoardPreferences, 
    resetTaskBoardPreferences,
    isLoaded,
    isAuthenticated
  } = useUserPreferences();

  // Wait for preferences to load
  if (!isLoaded) {
    return <div>Loading preferences...</div>;
  }

  // Initialize local state with preferences
  const [searchTerm, setSearchTerm] = useState(preferences.searchTerm);
  const [filterPriority, setFilterPriority] = useState(preferences.filterPriority);

  // Update preferences when local state changes
  useEffect(() => {
    if (isAuthenticated) {
      updateTaskBoardPreferences({
        searchTerm,
        filterPriority,
      });
    }
  }, [searchTerm, filterPriority, updateTaskBoardPreferences, isAuthenticated]);

  // Add reset button to UI
  return (
    <Button onClick={resetTaskBoardPreferences}>
      Reset Filters
    </Button>
  );
}
```

### In Positions Page

```typescript
import { useUserPreferences } from '@/hooks/use-user-preferences';

export function PositionsPage() {
  const { 
    positions: preferences, 
    updatePositionsPreferences, 
    resetPositionsPreferences,
    isLoaded,
    isAuthenticated
  } = useUserPreferences();

  // Initialize with preferences
  const [searchTerm, setSearchTerm] = useState(preferences.searchTerm);
  const [pageSize, setPageSize] = useState(preferences.pageSize);

  // Sync with preferences
  useEffect(() => {
    if (isAuthenticated) {
      updatePositionsPreferences({
        searchTerm,
        pageSize,
      });
    }
  }, [searchTerm, pageSize, updatePositionsPreferences, isAuthenticated]);
}
```

## Benefits

1. **Improved User Experience**: Users don't need to reconfigure their preferred view every session
2. **Cross-device Synchronization**: Preferences are synced across all devices and browsers
3. **Increased Productivity**: Faster access to frequently used filter combinations
4. **Personalization**: Each user can have their own preferred settings
5. **Consistency**: Settings persist across browser sessions, devices, and page refreshes
6. **Security**: User preferences are stored securely in the database with authentication

## Authentication Requirements

- Users must be authenticated to save and load preferences
- Unauthenticated users will see default preferences
- Preferences are automatically loaded when users sign in
- All preference operations require valid user session

## Error Handling

- Graceful fallback to default values if database operations fail
- Console warnings for debugging purposes
- Toast notifications for user feedback
- Loading states to indicate when preferences are being fetched

## Security Considerations

- Preferences are stored securely in the database
- User authentication is required for all preference operations
- No sensitive data is stored in preferences
- Preferences are isolated per user account
- Database-level constraints ensure data integrity

## Future Enhancements

Potential improvements for future versions:

1. **Preference Templates**: Predefined preference templates for different use cases
2. **Advanced Filtering**: More complex filter combinations and saved filter sets
3. **Collaborative Preferences**: Share preference templates between team members
4. **Preference Analytics**: Track which preferences are most commonly used
5. **Bulk Operations**: Import/export preference sets
6. **Preference History**: Track changes and allow rollback to previous settings
