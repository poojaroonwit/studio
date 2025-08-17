# Field Code Merge Migration

## Overview

This migration merges the `field_key` and `attributeCode` fields into a single `field_code` field in the Custom Field system. This simplifies the system by having one unified identifier that serves both internal and external purposes.

## Changes Made

### Database Schema
- Added new `field_code` column to `CustomFieldDefinition` table
- `field_code` is now the primary identifier for custom fields
- Maintains backward compatibility by keeping `field_key` and `attribute_code` columns
- Added unique constraint on `(model_name, field_code)`

### API Changes
- Updated all API endpoints to use `field_code` as the primary identifier
- Modified validation schemas to require `field_code` instead of `field_key`
- Updated error messages and logging to reference `field_code`
- Maintained backward compatibility in API responses

### Frontend Changes
- Updated all form components to use `field_code` field
- Changed validation to require uppercase alphanumeric format with underscores
- Removed separate `attributeCode` field from forms
- Updated display labels and descriptions

### TypeScript Types
- Added `field_code` to `CustomFieldDefinition` interface
- Updated all related type definitions

## Migration Process

### 1. Run the Migration Script
```bash
npm run migrate:merge-field-codes
```

This script will:
- Add the `field_code` column to the database
- Populate `field_code` with existing `field_key` values
- Update `field_code` with `attributeCode` values where they exist and are different
- Add necessary constraints and indexes
- Provide a summary of the migration results

### 2. Update Application Code
The following files have been updated:
- `prisma/schema.prisma` - Added field_code field
- `src/lib/types.ts` - Updated TypeScript interfaces
- `src/app/api/settings/custom-field-definitions/route.ts` - Updated API endpoints
- `src/app/api/settings/custom-field-definitions/[id]/route.ts` - Updated individual field endpoints
- `src/components/settings/CustomFieldModal.tsx` - Updated form components
- `src/components/settings/CustomFieldDrawer.tsx` - Updated form components
- `src/components/settings/CustomFieldTable.tsx` - Updated display components
- `docs/enhanced-custom-attributes.md` - Updated documentation

## Field Code Format

The new `field_code` field follows these rules:
- **Format**: Uppercase alphanumeric with underscores only
- **Examples**: `CUSTOM_STATUS`, `USER_DEPARTMENT`, `POSITION_PRIORITY`
- **Validation**: Must match regex `/^[A-Z0-9_]+$/`
- **Uniqueness**: Must be unique per model (Candidate, Position, User)

## Backward Compatibility

The migration maintains backward compatibility by:
- Keeping existing `field_key` and `attribute_code` columns in the database
- Continuing to return these fields in API responses
- Allowing existing code to continue working
- Providing a gradual migration path

## Benefits

1. **Simplified System**: One identifier instead of two
2. **Consistent Format**: All field codes follow the same uppercase format
3. **Better Integration**: Single field serves both internal and external purposes
4. **Reduced Confusion**: No more confusion between field_key and attributeCode
5. **Cleaner API**: Simplified request/response structure

## Future Considerations

After the migration is complete and stable, you may consider:
1. Removing the old `field_key` and `attribute_code` columns
2. Updating any remaining references to use only `field_code`
3. Updating external integrations to use the new field_code format

## Rollback Plan

If issues arise, you can rollback by:
1. Reverting the code changes
2. Dropping the `field_code` column: `ALTER TABLE "CustomFieldDefinition" DROP COLUMN field_code;`
3. Restoring the unique constraint on `field_key`

## Testing

After migration, test the following:
1. Creating new custom fields with the new field_code format
2. Editing existing custom fields
3. Deleting custom fields
4. API endpoints for all CRUD operations
5. Frontend forms and displays
6. Any external integrations that use custom fields
