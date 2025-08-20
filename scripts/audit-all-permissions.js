const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function auditAllPermissions() {
  console.log('🔍 Starting comprehensive permission audit...\n');

  try {
    // 1. Check all user groups and their permissions
    console.log('📋 1. USER GROUPS PERMISSION AUDIT');
    console.log('=====================================');
    
    const userGroups = await prisma.userGroup.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        permissions: true,
        isDefault: true,
        isSystemRole: true,
        _count: {
          select: {
            users: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    for (const group of userGroups) {
      console.log(`\n📁 Group: ${group.name}`);
      console.log(`   ID: ${group.id}`);
      console.log(`   Description: ${group.description}`);
      console.log(`   Default: ${group.isDefault ? 'Yes' : 'No'}`);
      console.log(`   System Role: ${group.isSystemRole ? 'Yes' : 'No'}`);
      console.log(`   Users: ${group._count.users}`);
      console.log(`   Permissions (${group.permissions.length}):`);
      
      // Group permissions by category for better readability
      const permissionCategories = {
        'Candidate Management': ['CANDIDATES_VIEW', 'CANDIDATES_MANAGE', 'CANDIDATES_IMPORT', 'CANDIDATES_EXPORT', 'CANDIDATES_COMMENTS', 'CANDIDATES_RESUMES', 'CANDIDATES_TRANSITIONS', 'CANDIDATES_RECRUITER_ASSIGN'],
        'Task Board': ['TASK_BOARD_VIEW', 'TASK_BOARD_MANAGE_ALL'],
        'Position Management': ['POSITIONS_VIEW', 'POSITIONS_MANAGE', 'POSITIONS_IMPORT', 'POSITIONS_EXPORT'],
        'User Management': ['USERS_MANAGE', 'USER_GROUPS_MANAGE'],
        'System Configuration': ['SYSTEM_SETTINGS_MANAGE', 'USER_PREFERENCES_MANAGE', 'RECRUITMENT_STAGES_MANAGE', 'CUSTOM_FIELDS_MANAGE', 'WEBHOOK_MAPPING_MANAGE', 'AI_INTEGRATION_MANAGE'],
        'Upload & Automation': ['UPLOAD_QUEUE_MANAGE', 'AUTOMATION_UPLOAD', 'BULK_UPLOAD'],
        'Logging & Audit': ['LOGS_VIEW', 'AUDIT_LOGS_VIEW', 'WEBHOOK_LOGS_VIEW'],
        'Analytics & Reporting': ['DASHBOARD_VIEW', 'ANALYTICS_VIEW', 'WEBHOOK_ANALYTICS_VIEW'],
        'Department Management': ['HR_DEPARTMENT_MANAGE', 'IT_DEPARTMENT_MANAGE', 'FINANCE_DEPARTMENT_MANAGE', 'MARKETING_DEPARTMENT_MANAGE']
      };

      for (const [category, permissions] of Object.entries(permissionCategories)) {
        const groupPermissionsInCategory = group.permissions.filter(p => permissions.includes(p));
        if (groupPermissionsInCategory.length > 0) {
          console.log(`     ${category}:`);
          groupPermissionsInCategory.forEach(perm => {
            console.log(`       ✅ ${perm}`);
          });
        }
      }
    }

    // 2. Check all users and their permission assignments
    console.log('\n\n👥 2. USER PERMISSION ASSIGNMENT AUDIT');
    console.log('==========================================');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        module_permissions: true,
        userGroups: {
          select: {
            group: {
              select: {
                id: true,
                name: true,
                permissions: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    for (const user of users) {
      console.log(`\n👤 User: ${user.name} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   User Groups: ${user.userGroups.map(ug => ug.group.name).join(', ') || 'None'}`);
      
      // Check individual permissions
      const individualPermissions = user.module_permissions || [];
      if (individualPermissions.length > 0) {
        console.log(`   Individual Permissions (${individualPermissions.length}): ${individualPermissions.join(', ')}`);
      } else {
        console.log(`   Individual Permissions: None (uses group permissions)`);
      }

      // Calculate effective permissions
      const groupPermissions = user.userGroups.flatMap(ug => ug.group.permissions || []);
      const effectivePermissions = [...new Set([...groupPermissions, ...individualPermissions])];
      
      console.log(`   Effective Permissions (${effectivePermissions.length}):`);
      
      // Check critical permissions
      const criticalPermissions = ['DASHBOARD_VIEW', 'TASK_BOARD_VIEW', 'CANDIDATES_VIEW', 'POSITIONS_VIEW'];
      for (const perm of criticalPermissions) {
        const hasPermission = effectivePermissions.includes(perm);
        console.log(`     ${perm}: ${hasPermission ? '✅' : '❌'}`);
      }

      // Check for permission mismatches
      const roleToExpectedPermissions = {
        'Admin': ['DASHBOARD_VIEW', 'TASK_BOARD_VIEW', 'CANDIDATES_VIEW', 'POSITIONS_VIEW', 'USERS_MANAGE'],
        'Recruiter': ['DASHBOARD_VIEW', 'TASK_BOARD_VIEW', 'CANDIDATES_VIEW', 'POSITIONS_VIEW'],
        'Hiring Manager': ['DASHBOARD_VIEW', 'TASK_BOARD_VIEW', 'CANDIDATES_VIEW', 'POSITIONS_VIEW']
      };

      const expectedPermissions = roleToExpectedPermissions[user.role] || [];
      const missingPermissions = expectedPermissions.filter(perm => !effectivePermissions.includes(perm));
      
      if (missingPermissions.length > 0) {
        console.log(`   ⚠️  Missing expected permissions for ${user.role} role: ${missingPermissions.join(', ')}`);
      } else {
        console.log(`   ✅ All expected permissions for ${user.role} role are present`);
      }
    }

    // 3. Check permission consistency
    console.log('\n\n🔧 3. PERMISSION CONSISTENCY AUDIT');
    console.log('=====================================');
    
    // Check if all users have group assignments
    const usersWithoutGroupAssignments = users.filter(user => user.userGroups.length === 0);
    if (usersWithoutGroupAssignments.length > 0) {
      console.log(`❌ Users without group assignments (${usersWithoutGroupAssignments.length}):`);
      usersWithoutGroupAssignments.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - Role: ${user.role}`);
      });
    } else {
      console.log('✅ All users have group assignments');
    }

    // Check if group permissions match role expectations
    console.log('\n📊 Group Permission Analysis:');
    for (const group of userGroups) {
      const groupUsers = users.filter(user => user.userGroups.some(ug => ug.group.id === group.id));
      const userRoles = [...new Set(groupUsers.map(user => user.role))];
      
      console.log(`\n   ${group.name} Group:`);
      console.log(`     Users: ${groupUsers.length} (${userRoles.join(', ')})`);
      
      // Check if group has expected permissions for its role
      const expectedPermissions = roleToExpectedPermissions[group.name] || [];
      const missingGroupPermissions = expectedPermissions.filter(perm => !group.permissions.includes(perm));
      
      if (missingGroupPermissions.length > 0) {
        console.log(`     ❌ Missing expected permissions: ${missingGroupPermissions.join(', ')}`);
      } else {
        console.log(`     ✅ Has all expected permissions`);
      }
    }

    // 4. Check for orphaned or invalid permissions
    console.log('\n\n🚨 4. PERMISSION VALIDATION AUDIT');
    console.log('====================================');
    
    const allPermissions = new Set();
    userGroups.forEach(group => group.permissions.forEach(perm => allPermissions.add(perm)));
    users.forEach(user => user.module_permissions.forEach(perm => allPermissions.add(perm)));

    const validPermissions = [
      'CANDIDATES_VIEW', 'CANDIDATES_MANAGE', 'CANDIDATES_IMPORT', 'CANDIDATES_EXPORT', 'CANDIDATES_COMMENTS', 'CANDIDATES_RESUMES', 'CANDIDATES_TRANSITIONS', 'CANDIDATES_RECRUITER_ASSIGN',
      'TASK_BOARD_VIEW', 'TASK_BOARD_MANAGE_ALL',
      'POSITIONS_VIEW', 'POSITIONS_MANAGE', 'POSITIONS_IMPORT', 'POSITIONS_EXPORT',
      'USERS_MANAGE', 'USER_GROUPS_MANAGE',
      'SYSTEM_SETTINGS_MANAGE', 'USER_PREFERENCES_MANAGE', 'RECRUITMENT_STAGES_MANAGE', 'CUSTOM_FIELDS_MANAGE', 'WEBHOOK_MAPPING_MANAGE', 'AI_INTEGRATION_MANAGE',
      'UPLOAD_QUEUE_MANAGE', 'AUTOMATION_UPLOAD', 'BULK_UPLOAD',
      'LOGS_VIEW', 'AUDIT_LOGS_VIEW', 'WEBHOOK_LOGS_VIEW',
      'DASHBOARD_VIEW', 'ANALYTICS_VIEW', 'WEBHOOK_ANALYTICS_VIEW',
      'HR_DEPARTMENT_MANAGE', 'IT_DEPARTMENT_MANAGE', 'FINANCE_DEPARTMENT_MANAGE', 'MARKETING_DEPARTMENT_MANAGE'
    ];

    const invalidPermissions = Array.from(allPermissions).filter(perm => !validPermissions.includes(perm));
    if (invalidPermissions.length > 0) {
      console.log(`❌ Invalid permissions found: ${invalidPermissions.join(', ')}`);
    } else {
      console.log('✅ All permissions are valid');
    }

    // 5. Summary and recommendations
    console.log('\n\n📈 5. AUDIT SUMMARY & RECOMMENDATIONS');
    console.log('========================================');
    
    const totalUsers = users.length;
    const totalGroups = userGroups.length;
    const usersWithIndividualPermissions = users.filter(user => user.module_permissions.length > 0).length;
    const usersWithoutGroupsCount = usersWithoutGroupAssignments.length;

    console.log(`📊 System Overview:`);
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   Total Groups: ${totalGroups}`);
    console.log(`   Users with Individual Permissions: ${usersWithIndividualPermissions}`);
    console.log(`   Users without Group Assignments: ${usersWithoutGroupsCount}`);

    console.log(`\n🔧 Recommendations:`);
    
    if (usersWithoutGroupsCount > 0) {
      console.log(`   ❌ Run user role assignment fix: node scripts/fix-user-role-assignments.js`);
    }
    
    if (usersWithIndividualPermissions > 0) {
      console.log(`   ⚠️  Consider moving individual permissions to group-based permissions for better management`);
    }
    
    if (invalidPermissions.length > 0) {
      console.log(`   ❌ Clean up invalid permissions from the system`);
    }

    console.log(`\n✅ Permission audit completed successfully`);

  } catch (error) {
    console.error('❌ Error during permission audit:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the audit
auditAllPermissions()
  .then(() => {
    console.log('Permission audit completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Permission audit failed:', error);
    process.exit(1);
  });
