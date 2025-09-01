# Database Design Comparison: User Role Management

## **Current Design (Many-to-Many)**
```sql
User {
  role: String                    -- 'Admin', 'Recruiter', 'Hiring Manager'
  module_permissions: String[]    -- NOT USED
  userGroups: User_UserGroup[]    -- Junction table
  userTeams: User_UserTeam[]      -- Junction table
}

User_UserGroup {
  userId: UUID
  groupId: UUID
}

User_UserTeam {
  userId: UUID
  teamId: UUID
}
```

## **Recommended Design (Direct Foreign Keys)**
```sql
User {
  role: String                    -- Synced with UserGroup.name
  userGroupId: UUID               -- Direct reference
  userTeamId: UUID                -- Direct reference
}

UserGroup {
  id: UUID
  name: String
  permissions: String[]
}

UserTeam {
  id: UUID
  name: String
  color: String
}
```

## **Benefits of Direct Foreign Keys:**

### **1. Performance**
- **Faster Queries**: Direct foreign key lookups vs complex joins
- **Better Indexing**: Simple indexes on foreign keys
- **Reduced Complexity**: No junction table overhead

### **2. Simplicity**
- **Clearer Logic**: One user = one role + one team
- **Easier Maintenance**: No junction table management
- **Straightforward Queries**: Simple WHERE clauses

### **3. Data Integrity**
- **Automatic Constraints**: Foreign key constraints prevent orphaned records
- **Consistent State**: Role always matches UserGroup
- **Atomic Updates**: Single transaction for role changes

### **4. Code Simplicity**
```typescript
// Current (Complex)
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    userGroups: {
      include: { group: true }
    }
  }
});
const permissions = user.userGroups.flatMap(ug => ug.group.permissions);

// New (Simple)
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    userGroup: true,
    userTeam: true
  }
});
const permissions = user.userGroup?.permissions || [];
```

## **Migration Strategy:**

### **Phase 1: Add New Columns**
```sql
ALTER TABLE "User" ADD COLUMN "userGroupId" UUID;
ALTER TABLE "User" ADD COLUMN "userTeamId" UUID;
```

### **Phase 2: Migrate Data**
```sql
-- Set primary UserGroup for each user
UPDATE "User" 
SET "userGroupId" = (
  SELECT uug."groupId" 
  FROM "User_UserGroup" uug 
  WHERE uug."userId" = "User".id 
  LIMIT 1
);

-- Set primary UserTeam for each user
UPDATE "User" 
SET "userTeamId" = (
  SELECT uut."teamId" 
  FROM "User_UserTeam" uut 
  WHERE uut."userId" = "User".id 
  LIMIT 1
);
```

### **Phase 3: Add Constraints**
```sql
ALTER TABLE "User" ADD CONSTRAINT "User_userGroupId_fkey" 
  FOREIGN KEY ("userGroupId") REFERENCES "UserGroup"("id");
```

### **Phase 4: Clean Up**
```sql
-- Remove unused columns
ALTER TABLE "User" DROP COLUMN "module_permissions";

-- Optionally remove junction tables
-- DROP TABLE "User_UserGroup";
-- DROP TABLE "User_UserTeam";
```

## **Recommendation:**

**YES, you should change to direct foreign keys!**

The current many-to-many design is overkill for this use case. Most users have:
- **One primary role** (Admin, Recruiter, Hiring Manager)
- **One primary team** (Engineering, Sales, HR)

The direct foreign key approach is:
- ✅ **More performant**
- ✅ **Easier to maintain**
- ✅ **Clearer business logic**
- ✅ **Better for your use case**

The junction tables (`User_UserGroup`, `User_UserTeam`) should be removed unless you have a specific need for users to belong to multiple groups/teams simultaneously.
