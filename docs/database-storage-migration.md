# User Preferences: Database Storage Migration

## Overview

The user preferences system has been migrated from browser localStorage to database storage. This change provides better persistence, cross-device synchronization, and improved security.

## What Changed

### Before (localStorage)
- Preferences stored in browser's localStorage
- Only persisted on the same device/browser
- Lost when browser data is cleared
- No authentication required
- Limited to ~5-10MB storage

### After (Database)
- Preferences stored securely in PostgreSQL database
- Synced across all devices and browsers
- Persistent across browser data clearing
- Requires user authentication
- No storage limitations
- Real-time synchronization

## Technical Changes

### 1. New API Endpoint
Created `/api/user-preferences` with three operations:
- `GET` - Retrieve user preferences
- `POST` - Update user preferences
- `DELETE` - Reset user preferences

### 2. Updated Hook
The `useUserPreferences` hook now:
- Requires user authentication
- Makes API calls instead of localStorage operations
- Provides loading states and authentication status
- Handles errors gracefully

### 3. Database Schema
Uses existing `UserUIDisplayPreference` table:
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

## Migration Process

### For Existing Users
1. **Automatic Migration**: When users sign in, their preferences will be loaded from the database
2. **Default Values**: If no preferences exist, default values will be used
3. **No Data Loss**: All existing functionality remains the same

### For Developers
1. **Updated Hook Usage**: The hook now returns additional properties:
   ```typescript
   const {
     preferences,
     isLoaded,
     isLoading,
     isAuthenticated,
     // ... other properties
   } = useUserPreferences();
   ```

2. **Authentication Required**: All preference operations now require user authentication
3. **Error Handling**: Added proper error handling for network issues

## Benefits

### For Users
- ✅ Preferences sync across all devices
- ✅ No data loss when clearing browser data
- ✅ Secure storage with authentication
- ✅ Real-time updates across tabs/windows

### For Developers
- ✅ Centralized data management
- ✅ Better error handling and loading states
- ✅ Scalable storage solution
- ✅ Audit trail of preference changes

## Backward Compatibility

The API maintains backward compatibility:
- Same preference structure
- Same default values
- Same reset functionality
- Same UI components

## Testing

### Manual Testing
1. Sign in to the application
2. Navigate to task board or positions page
3. Change filters and settings
4. Refresh the page - preferences should persist
5. Open in a different browser/device - preferences should sync

### API Testing
Run the test script to verify API endpoints:
```bash
node scripts/test-user-preferences.js
```

## Troubleshooting

### Common Issues

1. **Preferences not loading**
   - Check if user is authenticated
   - Verify network connectivity
   - Check browser console for errors

2. **Preferences not saving**
   - Ensure user is authenticated
   - Check API endpoint availability
   - Verify database connectivity

3. **Loading states stuck**
   - Check authentication status
   - Verify API responses
   - Clear browser cache if needed

### Debug Information
The hook provides debug information:
- `isLoaded`: Whether preferences have been loaded
- `isLoading`: Whether a request is in progress
- `isAuthenticated`: Whether user is authenticated

## Future Enhancements

1. **Preference Analytics**: Track usage patterns
2. **Template System**: Predefined preference sets
3. **Bulk Operations**: Import/export preferences
4. **Version History**: Track preference changes over time
5. **Collaborative Features**: Share preference templates

## Security Considerations

- All API endpoints require authentication
- User preferences are isolated per user account
- Database constraints prevent data corruption
- No sensitive data stored in preferences
- Secure session management required

## Performance Impact

- **Initial Load**: Slight delay when first loading preferences
- **Updates**: Real-time saving with minimal latency
- **Network**: Small API calls for preference changes
- **Database**: Efficient queries with proper indexing

## Monitoring

Monitor the following metrics:
- API response times for preference operations
- Error rates for preference API calls
- User engagement with preference settings
- Database storage usage for preferences
