# Enhanced Custom Attribute System

## Overview

The Enhanced Custom Attribute System provides a comprehensive solution for managing custom fields across Candidates, Positions, and Users with advanced configuration options, role-based permissions, and flexible visibility settings.

## Features

### 1. Multi-Model Support
- **Candidates**: Custom fields for candidate profiles and applications
- **Positions**: Custom fields for job position requirements and metadata
- **Users**: Custom fields for user profiles and preferences

### 2. Field Types
- **Text**: Single-line text input
- **Text Area**: Multi-line text input
- **Number**: Numeric input with validation
- **Boolean**: True/False checkbox
- **Date**: Date picker
- **Single Select**: Dropdown with predefined options
- **Multi Select**: Multi-select dropdown with predefined options

### 3. Advanced Configuration

#### Basic Information
- **Field Code**: Unique identifier (uppercase, alphanumeric, underscores)
- **Display Label**: User-friendly label shown in the interface
- **Attribute Label**: Optional detailed label for documentation

#### Role-Based Permissions
- **View Roles**: Which user roles can see this field
- **Edit Roles**: Which user roles can edit this field
- Available roles: Admin, Recruiter, Manager, Viewer, HR, Interviewer

#### Visibility Settings
- **Show in Filter**: Display in list filters
- **Show in Candidate Detail**: Display in candidate detail view
- **Show in Full Candidate Detail**: Display in full candidate detail page
- **Show in Task Board Filter**: Display in task board filters
- **Show in Position Settings**: Display in position settings page (Position fields only)

#### Field Properties
- **Required**: Field must be filled when creating/editing
- **Allow Custom Options**: Users can add new options for select fields
- **Sort Order**: Display order in lists (lower numbers appear first)

### 4. Option Management (Select/Multi-Select Fields)
- **Value**: Internal value stored in database
- **Label**: Display text shown to users
- **Color**: Visual color for the option (with color picker)
- **Active Status**: Enable/disable options
- **Sort Order**: Order within the options list

## Database Schema

### CustomFieldDefinition Table
```sql
CREATE TABLE "CustomFieldDefinition" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name VARCHAR NOT NULL, -- 'Candidate', 'Position', 'User'
  field_key VARCHAR NOT NULL,
  field_code VARCHAR NOT NULL,
  label VARCHAR NOT NULL,
  field_type VARCHAR NOT NULL,
  options JSONB,
  is_required BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  
  -- Enhanced fields
  attribute_code VARCHAR,
  attribute_label VARCHAR,
  view_roles VARCHAR[] DEFAULT '{}',
  edit_roles VARCHAR[] DEFAULT '{}',
  show_in_filter BOOLEAN DEFAULT FALSE,
  show_in_candidate_detail BOOLEAN DEFAULT FALSE,
  show_in_full_candidate_detail BOOLEAN DEFAULT FALSE,
  show_in_task_board_filter BOOLEAN DEFAULT FALSE,
  show_in_position_settings BOOLEAN DEFAULT FALSE,
  allow_custom_options BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(model_name, field_key),
  UNIQUE(model_name, field_code)
);
```

### CustomFieldOption Table
```sql
CREATE TABLE "CustomFieldOption" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_field_definition_id UUID NOT NULL REFERENCES "CustomFieldDefinition"(id) ON DELETE CASCADE,
  value VARCHAR NOT NULL,
  label VARCHAR NOT NULL,
  color VARCHAR DEFAULT '#3B82F6',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(custom_field_definition_id, value)
);
```

## API Endpoints

### GET /api/settings/custom-field-definitions
Retrieve all custom field definitions with optional model filtering.

**Query Parameters:**
- `model`: Filter by model type ('Candidate', 'Position', 'User')

**Response:**
```json
[
  {
    "id": "uuid",
    "model_name": "Candidate",
    "field_key": "custom_status",
    "field_code": "CUSTOM_STATUS",
    "label": "Custom Status",
    "field_type": "select_single",
    "options": [...],
    "attributeLabel": "Custom Status Attribute",
    "viewRoles": ["Admin", "Recruiter"],
    "editRoles": ["Admin"],
    "showInFilter": true,
    "showInCandidateDetail": true,
    "showInFullCandidateDetail": false,
    "showInTaskBoardFilter": true,
    "showInPositionSettings": false,
    "is_required": false,
    "allowCustomOptions": true,
    "sort_order": 0,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
]
```

### POST /api/settings/custom-field-definitions
Create a new custom field definition.

**Request Body:**
```json
{
  "model_name": "Candidate",
  "field_code": "CUSTOM_STATUS",
  "label": "Custom Status",
  "field_type": "select_single",
  "attributeLabel": "Custom Status Attribute",
  "viewRoles": ["Admin", "Recruiter"],
  "editRoles": ["Admin"],
  "showInFilter": true,
  "showInCandidateDetail": true,
  "showInFullCandidateDetail": false,
  "showInTaskBoardFilter": true,
  "showInPositionSettings": false,
  "is_required": false,
  "allowCustomOptions": true,
  "sort_order": 0,
  "options": [
    {
      "value": "active",
      "label": "Active",
      "color": "#10B981",
      "sortOrder": 0,
      "isActive": true
    }
  ]
}
```

### PUT /api/settings/custom-field-definitions?id={fieldId}
Update an existing custom field definition.

**Query Parameters:**
- `id`: The field ID to update

**Request Body:** Same as POST, but all fields are optional.

### DELETE /api/settings/custom-field-definitions/{fieldId}
Delete a custom field definition.

## Usage Examples

### Creating a Candidate Status Field
```javascript
const statusField = {
  model_name: "Candidate",
  field_key: "candidate_status",
  label: "Candidate Status",
  field_type: "select_single",
  attributeCode: "CANDIDATE_STATUS",
  viewRoles: ["Admin", "Recruiter", "Manager"],
  editRoles: ["Admin", "Recruiter"],
  showInFilter: true,
  showInCandidateDetail: true,
  showInTaskBoardFilter: true,
  is_required: true,
  options: [
    { value: "new", label: "New", color: "#3B82F6" },
    { value: "reviewing", label: "Under Review", color: "#F59E0B" },
    { value: "interviewed", label: "Interviewed", color: "#8B5CF6" },
    { value: "hired", label: "Hired", color: "#10B981" },
    { value: "rejected", label: "Rejected", color: "#EF4444" }
  ]
};
```

### Creating a Position Priority Field
```javascript
const priorityField = {
  model_name: "Position",
  field_key: "priority_level",
  label: "Priority Level",
  field_type: "select_single",
  attributeCode: "PRIORITY_LEVEL",
  viewRoles: ["Admin", "Recruiter", "Manager"],
  editRoles: ["Admin", "Manager"],
  showInFilter: true,
  showInPositionSettings: true,
  is_required: false,
  options: [
    { value: "low", label: "Low", color: "#10B981" },
    { value: "medium", label: "Medium", color: "#F59E0B" },
    { value: "high", label: "High", color: "#EF4444" },
    { value: "urgent", label: "Urgent", color: "#DC2626" }
  ]
};
```

### Creating a User Department Field
```javascript
const departmentField = {
  model_name: "User",
  field_code: "USER_DEPARTMENT",
  label: "Department",
  field_type: "select_single",
  viewRoles: ["Admin", "Manager"],
  editRoles: ["Admin"],
  showInFilter: true,
  allowCustomOptions: true,
  options: [
    { value: "hr", label: "Human Resources", color: "#3B82F6" },
    { value: "engineering", label: "Engineering", color: "#8B5CF6" },
    { value: "marketing", label: "Marketing", color: "#EC4899" },
    { value: "sales", label: "Sales", color: "#10B981" }
  ]
};
```

## Migration

To upgrade from the basic custom field system to the enhanced version:

1. Run the migration script:
```bash
node scripts/migrate-custom-fields-enhanced.cjs
```

2. The migration will:
   - Add new columns to the existing `CustomFieldDefinition` table
   - Create the new `CustomFieldOption` table
   - Add necessary indexes
   - Set default values for existing records

## Permissions

The custom field management requires one of the following:
- Admin role
- `CUSTOM_FIELDS_MANAGE` module permission

## Best Practices

1. **Field Codes**: Use descriptive, uppercase names with underscores (e.g., `CANDIDATE_STATUS`, `POSITION_PRIORITY`)
2. **Labels**: Use clear, user-friendly labels
3. **Permissions**: Grant minimum required permissions
4. **Visibility**: Only enable visibility settings that are actually needed
5. **Options**: Use consistent color schemes and clear labels
6. **Sort Order**: Use increments of 10 (0, 10, 20, 30) for easy reordering

## Integration Points

The enhanced custom attribute system integrates with:

1. **Candidate Management**: Custom fields appear in candidate forms, lists, and detail views
2. **Position Management**: Custom fields appear in position forms and settings
3. **User Management**: Custom fields appear in user profiles and lists
4. **Task Board**: Custom fields can be used as filters and display columns
5. **Reporting**: Custom field data is available for analytics and reporting
6. **API**: All custom field data is accessible via the REST API

## Future Enhancements

Potential future improvements:
- Field validation rules
- Conditional field visibility
- Field dependencies
- Bulk field operations
- Field templates
- Import/export functionality
- Field usage analytics
- Custom field widgets
- Field versioning
- Field inheritance
