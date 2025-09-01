# User Role Management Migration Guide

## **Overview**

This migration converts the current many-to-many user role management system to a simplified direct foreign key approach. This improves performance, simplifies queries, and makes the system easier to maintain.

## **Files Created**

1. **`prisma/migrations/20250127000000_simplify_user_roles/migration.sql`** - Main migration script
2. **`prisma/migrations/20250127010000_rollback_user_roles/migration.sql`** - Rollback script
3. **`prisma/schema.prisma`** - Updated Prisma schema
4. **`database-design-comparison.md`** - Design comparison document

## **Migration Steps**

### **Step 1: Backup Your Database**
```bash
# Create a backup before running migration
pg_dump your_database > backup_before_migration.sql
```

### **Step 2: Run the Migration**
```bash
# Apply the migration using Prisma
npx prisma migrate deploy
```

Or manually execute the SQL:
```sql
-- Execute the migration script step by step
-- File: prisma/migrations/20250127000000_simplify_user_roles/migration.sql
```

### **Step 3: Update Prisma Schema**
```bash
# Generate Prisma client with new schema
npx prisma generate
```

### **Step 4: Update Application Code**
The following files need to be updated to use the new schema:

#### **Authentication Logic (`src/lib/authUtils.ts`)**
```typescript
// OLD: Complex many-to-many query
const permissionsResult = await client.query(`
  SELECT array_agg(DISTINCT perm) AS group_permissions
  FROM (
    SELECT unnest(permissions) AS perm
    FROM "UserGroup" ug
    JOIN "User_UserGroup" uug ON ug.id = uug."groupId"
    WHERE uug."userId" = $1
  ) AS perms
`, [user.id]);

// NEW: Simple direct foreign key query
const permissionsResult = await client.query(`
  SELECT ug.permissions AS group_permissions
  FROM "User" u
  LEFT JOIN "UserGroup" ug ON u."userGroupId" = ug.id
  WHERE u.id = $1
`, [user.id]);
```

#### **User Management API (`src/app/api/users/[id]/route.ts`)**
```typescript
// OLD: Complex user update with junction tables
// NEW: Simple direct foreign key update
await prisma.user.update({
  where: { id },
  data: {
    userGroupId: newUserGroupId,
    userTeamId: newUserTeamId,
    role: newRole // Will be synced with UserGroup.name
  }
});
```

## **Benefits After Migration**

### **1. Performance Improvements**
- **Faster Queries**: Direct foreign key lookups vs complex joins
- **Better Indexing**: Simple indexes on foreign keys
- **Reduced Complexity**: No junction table overhead

### **2. Code Simplification**
```typescript
// OLD: Complex user query
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    userGroups: {
      include: { group: true }
    }
  }
});
const permissions = user.userGroups.flatMap(ug => ug.group.permissions);

// NEW: Simple user query
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    userGroup: true,
    userTeam: true
  }
});
const permissions = user.userGroup?.permissions || [];
```

### **3. Data Integrity**
- **Automatic Constraints**: Foreign key constraints prevent orphaned records
- **Consistent State**: Role always matches UserGroup
- **Atomic Updates**: Single transaction for role changes

## **Verification Commands**

### **Check Migration Status**
```sql
-- Verify user roles and groups are aligned
SELECT 
  u.name,
  u.email,
  u.role,
  ug.name as group_name,
  CASE 
    WHEN ug.name = u.role THEN '✅ Aligned'
    ELSE '⚠️ Mismatch'
  END as status
FROM "User" u
LEFT JOIN "UserGroup" ug ON u."userGroupId" = ug.id
ORDER BY u.name;
```

### **Check User Distribution**
```sql
-- Count users by role
SELECT 
  u.role,
  COUNT(*) as user_count
FROM "User" u
GROUP BY u.role
ORDER BY user_count DESC;

-- Count users by team
SELECT 
  ut.name as team_name,
  COUNT(*) as user_count
FROM "User" u
LEFT JOIN "UserTeam" ut ON u."userTeamId" = ut.id
GROUP BY ut.name
ORDER BY user_count DESC;
```

## **Rollback Instructions**

If you need to rollback the migration:

1. **Stop the application**
2. **Run the rollback script**: `prisma/migrations/20250127010000_rollback_user_roles/migration.sql`
3. **Revert the Prisma schema** to the old version
4. **Regenerate Prisma client**: `npx prisma generate`
5. **Restart the application**

## **Post-Migration Tasks**

### **1. Update Application Code**
- Update all user queries to use the new schema
- Remove references to junction tables
- Update permission checking logic

### **2. Test Thoroughly**
- Test user authentication
- Test permission checks
- Test user management features
- Test role assignment

### **3. Monitor Performance**
- Monitor query performance
- Check for any errors in logs
- Verify data integrity

## **Important Notes**

1. **Backup First**: Always backup your database before running migrations
2. **Test Environment**: Test the migration in a development environment first
3. **Downtime**: Plan for minimal downtime during migration
4. **Rollback Plan**: Keep the rollback script ready
5. **Code Updates**: Update application code to match the new schema

## **Support**

If you encounter issues during migration:
1. Check the verification queries for data integrity
2. Review the rollback script if needed
3. Check application logs for errors
4. Verify Prisma schema is correctly updated
