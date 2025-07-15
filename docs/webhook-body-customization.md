# Webhook Body Customization

This document describes the webhook body customization feature that allows users to customize the structure and content of webhook payloads sent to external systems.

## Overview

The webhook body customization feature enables users to:

1. **Customize webhook payload structure** using JSON templates
2. **Map and transform fields** from the original data to custom field names
3. **Configure different payloads for different event types**
4. **Include or exclude metadata** in webhook payloads
5. **Preview payloads** before saving configurations

## Features

### 1. Global Body Template

A global JSON template that serves as the default payload structure for all events. Uses template variables with `{{variable}}` syntax.

**Example:**
```json
{
  "event": "{{event}}",
  "timestamp": "{{timestamp}}",
  "webhook_id": "{{webhook_id}}",
  "data": {{data}}
}
```

### 2. Event-Specific Configurations

Custom body templates and field mappings for specific event types, allowing different payload structures for different events.

### 3. Field Mappings

Transform and map fields from the original data to custom field names with optional transformations:

- **Source Field**: The original field path (e.g., `candidate.name`)
- **Target Field**: The new field name in the payload (e.g., `full_name`)
- **Transformations**: 
  - `uppercase`: Convert to uppercase
  - `lowercase`: Convert to lowercase
  - `trim`: Remove whitespace
  - `date`: Format as ISO date string
  - `number`: Convert to number
  - `boolean`: Convert to boolean
- **Default Value**: Fallback value if source field is missing

### 4. Template Variables

Available template variables:

- `{{event}}`: The event type (e.g., "candidate.created")
- `{{timestamp}}`: ISO timestamp
- `{{webhook_id}}`: The webhook ID
- `{{webhook_name}}`: The webhook name
- `{{data}}`: The complete event data (JSON stringified)
- Nested object access: `{{data.candidate.name}}`

## Database Schema

### New Fields in Webhook Table

```sql
-- Webhook body customization fields
body_template     TEXT,           -- JSON template for custom webhook body
field_mappings    JSONB,          -- Field mappings for each event type
include_metadata  BOOLEAN DEFAULT TRUE,  -- Whether to include event metadata
custom_payload    BOOLEAN DEFAULT FALSE, -- Whether to use custom payload instead of default
```

### New WebhookBodyConfig Table

```sql
CREATE TABLE webhook_body_config (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id        UUID REFERENCES webhook(id) ON DELETE CASCADE,
  event_type        TEXT NOT NULL,
  body_template     TEXT NOT NULL,
  field_mappings    JSONB,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(webhook_id, event_type)
);
```

## API Endpoints

### 1. Get Available Fields

**GET** `/api/settings/webhooks/available-fields`

Returns available fields for all event types or a specific event type.

**Query Parameters:**
- `event_type` (optional): Specific event type to get fields for

**Response:**
```json
{
  "event_types": [
    {
      "event_type": "candidate.created",
      "available_fields": ["id", "name", "email", "phone", "status", ...],
      "sample_payload": { ... }
    }
  ]
}
```

### 2. Validate Template

**POST** `/api/settings/webhooks/validate-template`

Validates a JSON template and optionally tests it with sample data.

**Request Body:**
```json
{
  "template": "{\n  \"event\": \"{{event}}\",\n  \"data\": {{data}}\n}",
  "event_type": "candidate.created",
  "sample_data": { ... }
}
```

**Response:**
```json
{
  "valid": true,
  "processed_payload": { ... },
  "message": "Template is valid and processed successfully"
}
```

### 3. Manage Body Configuration

**GET** `/api/settings/webhooks/{id}/body-config`

Get webhook body configuration.

**PUT** `/api/settings/webhooks/{id}/body-config`

Update webhook body configuration.

**Request Body:**
```json
{
  "body_template": "...",
  "field_mappings": [...],
  "include_metadata": true,
  "custom_payload": true,
  "body_configs": [...]
}
```

## Usage Examples

### Example 1: Simple Custom Payload

**Template:**
```json
{
  "notification": {
    "type": "{{event}}",
    "timestamp": "{{timestamp}}",
    "content": {
      "candidate_name": "{{data.candidate.name}}",
      "candidate_email": "{{data.candidate.email}}"
    }
  }
}
```

**Result:**
```json
{
  "notification": {
    "type": "candidate.created",
    "timestamp": "2024-01-15T10:30:00Z",
    "content": {
      "candidate_name": "John Doe",
      "candidate_email": "john@example.com"
    }
  }
}
```

### Example 2: Field Mapping with Transformations

**Field Mappings:**
```json
[
  {
    "source_field": "candidate.name",
    "target_field": "full_name",
    "transform": "uppercase"
  },
  {
    "source_field": "candidate.status",
    "target_field": "is_active",
    "transform": "boolean"
  },
  {
    "source_field": "candidate.email",
    "target_field": "contact_email",
    "default_value": "no-email@example.com"
  }
]
```

**Template:**
```json
{
  "event": "{{event}}",
  "candidate": {
    "full_name": "{{full_name}}",
    "is_active": {{is_active}},
    "contact_email": "{{contact_email}}"
  }
}
```

### Example 3: Event-Specific Configuration

Different payload structures for different events:

**candidate.created:**
```json
{
  "action": "create",
  "entity": "candidate",
  "data": {{data}}
}
```

**candidate.updated:**
```json
{
  "action": "update",
  "entity": "candidate",
  "changes": "{{data.changes}}",
  "data": {{data}}
}
```

## UI Components

### WebhookBodyCustomization Component

A React component that provides:

1. **Global Settings Tab:**
   - Enable/disable custom payloads
   - Global body template editor
   - Global field mappings

2. **Event-Specific Tab:**
   - Individual event configurations
   - Event-specific templates and field mappings
   - Field selection from available fields

3. **Preview Tab:**
   - Live preview of processed payloads
   - Template validation results

### Integration with Webhook Management

The body customization feature is integrated into the existing webhook management interface:

1. **"Customize Body" button** in webhook actions dropdown
2. **Body configuration indicators** in webhook list
3. **Template validation** during save operations

## Implementation Details

### WebhookBodyProcessor Class

Core class responsible for:

- Processing webhook payloads using templates
- Applying field mappings and transformations
- Validating template syntax
- Providing available fields and sample data

### Template Processing

1. **Variable Replacement:** Replace `{{variable}}` placeholders with actual values
2. **Field Mapping:** Apply field mappings to transform data structure
3. **JSON Parsing:** Parse the processed template as JSON
4. **Validation:** Ensure the result is valid JSON

### Error Handling

- **Template Validation:** Check JSON syntax before processing
- **Fallback Payload:** Return default payload if processing fails
- **Error Logging:** Log processing errors for debugging

## Migration

To add this feature to existing installations:

1. **Run Database Migration:**
   ```bash
   npx prisma migrate dev --name add_webhook_body_customization
   ```

2. **Update Webhook Service:** The webhook service automatically uses the new body processor

3. **Deploy UI Components:** The new UI components are backward compatible

## Best Practices

1. **Template Design:**
   - Use clear, descriptive field names
   - Include error handling for missing fields
   - Test templates with sample data

2. **Field Mappings:**
   - Use meaningful target field names
   - Apply appropriate transformations
   - Provide default values for optional fields

3. **Performance:**
   - Keep templates simple and efficient
   - Avoid complex nested transformations
   - Use event-specific configs for large payloads

4. **Testing:**
   - Always preview templates before saving
   - Test with real event data
   - Validate webhook delivery with custom payloads

## Troubleshooting

### Common Issues

1. **Invalid JSON Template:**
   - Check for missing braces or quotes
   - Validate template syntax before saving

2. **Missing Fields:**
   - Verify field paths in mappings
   - Use default values for optional fields

3. **Template Processing Errors:**
   - Check template variable syntax
   - Ensure all referenced fields exist

### Debug Tools

1. **Template Preview:** Use the preview tab to see processed payloads
2. **Validation API:** Test templates via the validation endpoint
3. **Webhook Logs:** Check delivery logs for processing errors

## Future Enhancements

Potential improvements for future versions:

1. **Advanced Transformations:**
   - Custom JavaScript functions
   - Date formatting options
   - String manipulation functions

2. **Conditional Logic:**
   - If/else statements in templates
   - Conditional field inclusion
   - Dynamic payload structure

3. **Template Library:**
   - Pre-built template examples
   - Template sharing between webhooks
   - Template versioning

4. **Performance Optimizations:**
   - Template caching
   - Batch processing
   - Async field resolution 