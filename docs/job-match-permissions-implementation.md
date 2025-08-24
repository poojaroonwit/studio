# Job Match Permissions Implementation Guide

## Overview

This document describes the implementation of role-based permissions for job match features across all pages, with default disabled state for all roles except admin.

## Implementation Summary

### ✅ **Completed Changes**

1. **New Permissions Added**
   - `JOB_MATCH_VIEW` - View job match information for candidates
   - `JOB_MATCH_MANAGE` - Add, edit, and delete job matches for candidates

2. **Database Updates**
   - Updated `prisma/init-db.sql` to include new permissions for Admin role
   - Created migration script `prisma/add_job_match_permissions.sql`
   - Created migration runner `scripts/add-job-match-permissions.cjs`

3. **API Endpoint Protection**
   - Updated all job match API endpoints to use new permissions
   - GET endpoints require `JOB_MATCH_VIEW`
   - POST/PUT/PATCH/DELETE endpoints require `JOB_MATCH_MANAGE`

4. **Frontend Component Protection**
   - Updated `JobMatchTab` component with permission checks
   - Updated `JobsTab` component with permission checks
   - Updated `JobMatchModal` component with permission checks
   - Added access denied UI for unauthorized users

5. **Documentation**
   - Updated `docs/admin-permissions-setup.md`
   - Created `docs/job-match-permissions.md`
   - Created this implementation guide

## Default Permission Configuration

### Admin Role
- ✅ `JOB_MATCH_VIEW` - Enabled
- ✅ `JOB_MATCH_MANAGE` - Enabled

### Recruiter Role (Default)
- ❌ `JOB_MATCH_VIEW` - Disabled
- ❌ `JOB_MATCH_MANAGE` - Disabled

### Hiring Manager Role (Default)
- ❌ `JOB_MATCH_VIEW` - Disabled
- ❌ `JOB_MATCH_MANAGE` - Disabled

## Files Modified

### Core Permission System
- `src/lib/types.ts` - Added new permissions to PLATFORM_MODULES

### Database
- `prisma/init-db.sql` - Updated Admin role permissions
- `prisma/add_job_match_permissions.sql` - Migration script
- `scripts/add-job-match-permissions.cjs` - Migration runner

### API Endpoints
- `src/app/api/v1/candidates/[id]/job-matches/route.ts`
- `src/app/api/v1/candidates/[id]/job-matches/[matchId]/route.ts`
- `src/app/api/v1/candidates/[id]/job-matches/add/route.ts`

### Frontend Components
- `src/components/candidates/tabs/JobMatchTab.tsx`
- `src/components/candidates/tabs/JobsTab.tsx`
- `src/components/candidates/JobMatchModal.tsx`

### Documentation
- `docs/admin-permissions-setup.md`
- `docs/job-match-permissions.md`
- `docs/job-match-permissions-implementation.md`

## Migration Instructions

### For New Installations
1. The new permissions are automatically included in `prisma/init-db.sql`
2. Run the database initialization script as usual
3. Admin role will have job match permissions enabled
4. Other roles will have job match permissions disabled by default

### For Existing Installations
1. Run the migration script:
   ```bash
   node scripts/add-job-match-permissions.cjs
   ```
2. Verify the migration was successful
3. Admin role will now have job match permissions enabled
4. Other roles will remain unchanged (permissions disabled)

## Permission Behavior

### View Permission (`JOB_MATCH_VIEW`)
- **Required for**: Viewing job match information in any UI component
- **API endpoints**: All GET endpoints for job matches
- **UI behavior**: Shows access denied message if permission is missing
- **Default**: Admin only

### Manage Permission (`JOB_MATCH_MANAGE`)
- **Required for**: Adding, editing, deleting job matches
- **API endpoints**: All POST/PUT/PATCH/DELETE endpoints for job matches
- **UI behavior**: Hides copy buttons and disables click interactions
- **Default**: Admin only

## UI Changes

### Access Denied UI
When users lack `JOB_MATCH_VIEW` permission:
- Shows a lock icon with "Access Denied" message
- Explains that permission is required
- Provides guidance to contact administrator

### Conditional UI Elements
When users lack `JOB_MATCH_MANAGE` permission:
- Copy buttons are hidden
- Click interactions are disabled
- Cards lose hover effects
- Modal actions are restricted

## API Security

### Endpoint Protection
All job match API endpoints now check for appropriate permissions:
- **GET** requests require `JOB_MATCH_VIEW`
- **POST/PUT/PATCH/DELETE** requests require `JOB_MATCH_MANAGE`
- Returns 403 Forbidden for unauthorized requests

### Error Messages
- Clear error messages indicating which permission is required
- Consistent error format across all endpoints
- Proper HTTP status codes (401 for unauthorized, 403 for forbidden)

## Testing Checklist

### Permission Testing
- [ ] Admin user can view and manage job matches
- [ ] Recruiter user cannot access job match features (default)
- [ ] Hiring Manager user cannot access job match features (default)
- [ ] Custom roles can be configured with job match permissions

### UI Testing
- [ ] Access denied messages appear for unauthorized users
- [ ] Copy buttons are hidden for users without manage permission
- [ ] Click interactions are disabled for users without manage permission
- [ ] Modal shows access denied for unauthorized users

### API Testing
- [ ] GET requests return 403 for users without view permission
- [ ] POST/PUT/PATCH/DELETE requests return 403 for users without manage permission
- [ ] Admin user can access all endpoints successfully

### Migration Testing
- [ ] Migration script runs successfully
- [ ] Admin role has new permissions after migration
- [ ] Other roles remain unchanged after migration

## Troubleshooting

### Common Issues

1. **Permissions not appearing in UI**
   - Check if user is logged in as Admin
   - Verify permissions exist in database
   - Clear browser cache

2. **API returning 403 errors**
   - Verify user has correct permissions
   - Check role assignments
   - Ensure API endpoints are checking right permissions

3. **Migration script fails**
   - Check database connection
   - Verify Admin role exists
   - Check SQL syntax

### Debug Steps

1. **Check user permissions**:
   ```sql
   SELECT u.email, u.role, ug.name as group_name, ug.permissions
   FROM "User" u
   LEFT JOIN "User_UserGroup" uug ON u.id = uug."userId"
   LEFT JOIN "UserGroup" ug ON uug."groupId" = ug.id
   WHERE u.email = 'user@example.com';
   ```

2. **Verify Admin role permissions**:
   ```sql
   SELECT name, permissions
   FROM "UserGroup"
   WHERE name = 'Admin';
   ```

3. **Check API permissions**:
   - Use browser dev tools to inspect API requests
   - Check response status codes and error messages
   - Verify authentication headers are present

## Future Enhancements

### Potential Improvements
1. **Granular permissions**: Split manage permission into create/update/delete
2. **Department-based permissions**: Allow job match access by department
3. **Audit logging**: Track job match permission usage
4. **Bulk operations**: Add permissions for bulk job match operations

### Configuration Options
1. **Default permissions**: Make job match permissions configurable by default
2. **Permission inheritance**: Allow permissions to be inherited from parent roles
3. **Temporary permissions**: Add time-limited permission grants

## Support

For questions or issues with the job match permissions system:
1. Check the troubleshooting section above
2. Review the job match permissions documentation
3. Contact the development team with specific error messages and steps to reproduce
