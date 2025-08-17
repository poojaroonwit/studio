# Personal Color Configuration

## Overview

The personal color configuration system allows users to customize their UI experience by setting a personal color that is applied throughout the application. This feature is now integrated into the unified user preferences system.

## Features

### Personal Color Selection
- **Preset Colors**: 12 predefined color options for quick selection
- **Custom Colors**: Full hex color picker for custom color selection
- **Real-time Preview**: Live preview of how the color will appear in different UI elements
- **Database Storage**: Colors are stored securely in the database and synced across devices

### UI Integration
Personal colors are applied to:
- Candidate card borders and backgrounds
- Recruiter avatars and thumbnails
- UI element highlights and accents
- Card borders and focus states

## Technical Implementation

### Database Schema
Personal colors are stored in the `UserUIDisplayPreference` table:
```sql
model UserUIDisplayPreference {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String   @map("userId") @db.Uuid
  modelType    String   @map("model_type")        // 'appearance'
  attributeKey String   @map("attribute_key")     // 'personalColor'
  uiPreference String   @map("ui_preference")     // Hex color code (e.g., "#3B82F6")
  customNote   String?  @map("custom_note")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, modelType, attributeKey])
}
```

### API Endpoints

#### GET /api/user-preferences
Retrieves all user preferences including personal color:
```json
{
  "taskBoard": { ... },
  "positions": { ... },
  "appearance": {
    "personalColor": "#3B82F6"
  }
}
```

#### POST /api/user-preferences
Updates appearance preferences:
```json
{
  "modelType": "appearance",
  "updates": {
    "personalColor": "#EF4444"
  }
}
```

#### GET /api/user-preferences/[userId] (Admin)
Retrieves preferences for a specific user (admin only)

#### POST /api/user-preferences/[userId] (Admin)
Updates preferences for a specific user (admin only)

### Components

#### PersonalColorPicker
A reusable component for color selection:
```tsx
<PersonalColorPicker
  personalColor={preferences.appearance.personalColor}
  onColorChange={(color) => updateAppearancePreferences({ personalColor: color })}
  className="w-full"
/>
```

#### useUserPreferences Hook
Provides unified access to all user preferences:
```tsx
const {
  preferences,
  appearance,
  updateAppearancePreferences,
  resetAppearancePreferences,
  // ... other methods
} = useUserPreferences();
```

## User Interface

### User Preferences Page
- **Appearance Tab**: Primary location for personal color configuration
- **Color Preview**: Shows current color with visual preview
- **Preset Selection**: Grid of predefined colors for quick selection
- **Custom Input**: Hex color input and color picker for custom colors
- **Reset Functionality**: Reset to default color (#3B82F6)

### Admin User Management
- **UserPreferencesModal**: Admin interface for managing user preferences
- **Appearance Tab**: Personal color configuration for specific users
- **Real-time Updates**: Changes are applied immediately

## Default Values

```typescript
const defaultAppearancePreferences = {
  personalColor: '#3B82F6', // Blue
};
```

## Preset Colors

The system includes 12 preset colors:
- `#3B82F6` - Blue (default)
- `#EF4444` - Red
- `#10B981` - Green
- `#F59E0B` - Amber
- `#8B5CF6` - Purple
- `#EC4899` - Pink
- `#06B6D4` - Cyan
- `#84CC16` - Lime
- `#F97316` - Orange
- `#6366F1` - Indigo
- `#14B8A6` - Teal
- `#F43F5E` - Rose

## Migration from Legacy System

The personal color system has been migrated from a separate field in the User model to the unified preferences system:

### Before
- Personal color stored in `User.personalColor` field
- Separate API endpoint (`/api/settings/personal-color`)
- Independent from other user preferences

### After
- Personal color stored in `UserUIDisplayPreference` table
- Integrated with unified preferences API
- Part of the appearance preferences category
- Consistent with other preference management

### Backward Compatibility
- The legacy personal color field is still available in the User model
- The old API endpoint continues to work for existing integrations
- New implementations should use the unified preferences system

## Security and Permissions

### User Access
- Users can only modify their own personal color
- Changes require authentication
- All modifications are logged for audit purposes

### Admin Access
- Admins can view and modify any user's personal color
- Admin operations require admin role verification
- All admin actions are logged with user context

## Best Practices

### Color Selection
- Use colors with sufficient contrast for accessibility
- Consider dark mode compatibility
- Test colors across different UI elements

### Performance
- Colors are cached in user preferences
- No additional database queries for color retrieval
- Efficient updates using upsert operations

### User Experience
- Provide immediate visual feedback
- Include reset functionality
- Show preview of color application
- Use consistent color application across UI

## Future Enhancements

### Planned Features
- Color scheme presets (light/dark variants)
- Advanced color customization (hue, saturation, brightness)
- Color accessibility validation
- Bulk color management for admins

### Integration Opportunities
- Theme system integration
- Brand color customization
- Seasonal color themes
- User preference analytics
