#!/usr/bin/env node

/**
 * Permission Alignment Fix Script
 * 
 * This script fixes permission alignment issues by:
 * 1. Removing undefined permissions that are not in PLATFORM_MODULES
 * 2. Adding missing permissions that should be in PLATFORM_MODULES
 * 3. Updating permission references to use correct permission names
 * 4. Cleaning up the database to ensure consistency
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Define the valid permissions from PLATFORM_MODULES
const VALID_PERMISSIONS = [
  // Candidate Management
  'CANDIDATES_VIEW',
  'CANDIDATES_VIEW_DETAILED',
  'CANDIDATES_CREATE',
  'CANDIDATES_EDIT_BASIC',
  'CANDIDATES_EDIT_SENSITIVE',
  'CANDIDATES_DELETE',
  'CANDIDATES_SOURCE_ASSIGN',
  'CANDIDATES_SOURCE_ASSIGN_BULK',
  'CANDIDATES_RECRUITER_ASSIGN',
  'CANDIDATES_RECRUITER_ASSIGN_BULK',
  'CANDIDATES_PIPELINE_STAGE_UPDATE',
  'CANDIDATES_PIPELINE_STAGE_BULK_UPDATE',
  'CANDIDATES_RESUMES_UPLOAD',
  'CANDIDATES_RESUMES_DELETE',
  'CANDIDATES_COMMENTS_VIEW',
  'CANDIDATES_COMMENTS_ADD',
  'CANDIDATES_COMMENTS_EDIT',
  'CANDIDATES_IMPORT',
  'CANDIDATES_EXPORT',
  
  // Position Management
  'POSITIONS_VIEW',
  'POSITIONS_CREATE',
  'POSITIONS_EDIT_BASIC',
  'POSITIONS_EDIT_DETAILED',
  'POSITIONS_RECRUITER_ASSIGN',
  'POSITIONS_DELETE',
  'POSITIONS_IMPORT',
  'POSITIONS_EXPORT',
  
  // User Access Control
  'USERS_VIEW',
  'USERS_CREATE',
  'USERS_EDIT',
  'USERS_DELETE',
  'USERS_PERMISSIONS_MANAGE',
  'USER_GROUPS_VIEW',
  'USER_GROUPS_CREATE',
  'USER_GROUPS_EDIT',
  'USER_GROUPS_DELETE',
  
  // System Configuration
  'SYSTEM_SETTINGS_VIEW',
  'SYSTEM_SETTINGS_EDIT',
  'RECRUITMENT_STAGES_VIEW',
  'RECRUITMENT_STAGES_EDIT',
  'CUSTOM_FIELDS_VIEW',
  'CUSTOM_FIELDS_EDIT',
  
  // Automation & Integration
  'WEBHOOKS_VIEW',
  'WEBHOOKS_EDIT',
  'AI_INTEGRATION_VIEW',
  'AI_INTEGRATION_EDIT',
  'UPLOAD_QUEUE_VIEW',
  'UPLOAD_QUEUE_MANAGE',
  'BULK_UPLOAD_EXECUTE',
  
  // Analytics & Reporting
  'DASHBOARD_VIEW',
  'REPORTS_GENERATE',
  'WEBHOOK_ANALYTICS_VIEW',
  
  // Logging & Audit
  'LOGS_VIEW',
  'LOGS_EXPORT',
  'APP_PERFORMANCE_VIEW',
  
  // Task Management
  'TASK_BOARD_VIEW',
  'TASK_BOARD_MANAGE_OWN',
  'TASK_BOARD_MANAGE_ALL',
  
  // Job Matching
  'JOB_MATCH_VIEW',
  'JOB_MATCH_MANAGE',
  
  // Warning System
  'WARNING_CONFIGURATIONS_VIEW',
  'WARNING_CONFIGURATIONS_MANAGE',
  
  // User Preferences
  'USER_PREFERENCES_MANAGE_OWN',
  'USER_PREFERENCES_MANAGE_ALL'
];

// Permission mapping for deprecated/incorrect permissions
const PERMISSION_MAPPINGS = {
  // Map undefined permissions to valid ones
  'USERS_MANAGE': ['USERS_VIEW', 'USERS_CREATE', 'USERS_EDIT', 'USERS_DELETE', 'USERS_PERMISSIONS_MANAGE'],
  'AUTOMATION_UPLOAD': ['BULK_UPLOAD_EXECUTE'],
  'WEBHOOK_MAPPING_MANAGE': ['WEBHOOKS_EDIT'],
  'CANDIDATES_MANAGE': ['CANDIDATES_VIEW', 'CANDIDATES_CREATE', 'CANDIDATES_EDIT_BASIC', 'CANDIDATES_EDIT_SENSITIVE'],
  'POSITIONS_MANAGE': ['POSITIONS_VIEW', 'POSITIONS_CREATE', 'POSITIONS_EDIT_BASIC', 'POSITIONS_EDIT_DETAILED'],
  'USER_GROUPS_MANAGE': ['USER_GROUPS_VIEW', 'USER_GROUPS_CREATE', 'USER_GROUPS_EDIT', 'USER_GROUPS_DELETE'],
  'CUSTOM_FIELDS_MANAGE': ['CUSTOM_FIELDS_VIEW', 'CUSTOM_FIELDS_EDIT'],
  'AI_INTEGRATION_MANAGE': ['AI_INTEGRATION_VIEW', 'AI_INTEGRATION_EDIT'],
  'BULK_UPLOAD': ['BULK_UPLOAD_EXECUTE'],
  'WEBHOOK_ANALYTICS_MANAGE': ['WEBHOOK_ANALYTICS_VIEW'],
  'LOGS_MANAGE': ['LOGS_VIEW', 'LOGS_EXPORT'],
  'APP_PERFORMANCE_MANAGE': ['APP_PERFORMANCE_VIEW'],
  'SYSTEM_SETTINGS_MANAGE': ['SYSTEM_SETTINGS_VIEW', 'SYSTEM_SETTINGS_EDIT'],
  'RECRUITMENT_STAGES_MANAGE': ['RECRUITMENT_STAGES_VIEW', 'RECRUITMENT_STAGES_EDIT'],
  'UPLOAD_QUEUE_MANAGE': ['UPLOAD_QUEUE_VIEW', 'UPLOAD_QUEUE_MANAGE'],
  'WEBHOOKS_MANAGE': ['WEBHOOKS_VIEW', 'WEBHOOKS_EDIT'],
  'DASHBOARD_MANAGE': ['DASHBOARD_VIEW'],
  'REPORTS_MANAGE': ['REPORTS_GENERATE'],
  'WARNING_CONFIGURATIONS_MANAGE': ['WARNING_CONFIGURATIONS_VIEW', 'WARNING_CONFIGURATIONS_MANAGE'],
  'USER_PREFERENCES_MANAGE': ['USER_PREFERENCES_MANAGE_OWN', 'USER_PREFERENCES_MANAGE_ALL']
};

async function main() {
  console.log('🔧 Starting Permission Alignment Fix...\n');

  try {
    // Step 1: Get all user groups
    console.log('📋 Step 1: Analyzing current user groups...');
    const userGroups = await prisma.userGroup.findMany();
    console.log(`Found ${userGroups.length} user groups`);

    // Step 2: Get all users with module permissions
    console.log('\n📋 Step 2: Analyzing current user permissions...');
    const users = await prisma.user.findMany({
      where: {
        module_permissions: {
          not: []
        }
      }
    });
    console.log(`Found ${users.length} users with module permissions`);

    // Step 3: Collect all invalid permissions
    const invalidPermissions = new Set();
    const validPermissions = new Set(VALID_PERMISSIONS);

    // Check user groups
    for (const group of userGroups) {
      for (const permission of group.permissions) {
        if (!validPermissions.has(permission)) {
          invalidPermissions.add(permission);
        }
      }
    }

    // Check users
    for (const user of users) {
      for (const permission of user.module_permissions) {
        if (!validPermissions.has(permission)) {
          invalidPermissions.add(permission);
        }
      }
    }

    console.log(`\n❌ Found ${invalidPermissions.size} invalid permissions:`, Array.from(invalidPermissions));

    // Step 4: Fix user groups
    console.log('\n🔧 Step 3: Fixing user group permissions...');
    let groupsUpdated = 0;
    let totalPermissionsFixed = 0;

    for (const group of userGroups) {
      const originalPermissions = [...group.permissions];
      const newPermissions = new Set();

      for (const permission of group.permissions) {
        if (validPermissions.has(permission)) {
          newPermissions.add(permission);
        } else if (PERMISSION_MAPPINGS[permission]) {
          // Map deprecated permission to valid ones
          PERMISSION_MAPPINGS[permission].forEach(p => newPermissions.add(p));
          console.log(`  🔄 Mapped ${permission} → [${PERMISSION_MAPPINGS[permission].join(', ')}] in group "${group.name}"`);
        } else {
          console.log(`  ⚠️  Removed invalid permission "${permission}" from group "${group.name}"`);
        }
      }

      const finalPermissions = Array.from(newPermissions);
      
      if (JSON.stringify(originalPermissions.sort()) !== JSON.stringify(finalPermissions.sort())) {
        await prisma.userGroup.update({
          where: { id: group.id },
          data: { permissions: finalPermissions }
        });
        groupsUpdated++;
        totalPermissionsFixed += Math.abs(originalPermissions.length - finalPermissions.length);
        console.log(`  ✅ Updated group "${group.name}": ${originalPermissions.length} → ${finalPermissions.length} permissions`);
      }
    }

    // Step 5: Fix user permissions
    console.log('\n🔧 Step 4: Fixing user permissions...');
    let usersUpdated = 0;
    let totalUserPermissionsFixed = 0;

    for (const user of users) {
      const originalPermissions = [...user.module_permissions];
      const newPermissions = new Set();

      for (const permission of user.module_permissions) {
        if (validPermissions.has(permission)) {
          newPermissions.add(permission);
        } else if (PERMISSION_MAPPINGS[permission]) {
          // Map deprecated permission to valid ones
          PERMISSION_MAPPINGS[permission].forEach(p => newPermissions.add(p));
          console.log(`  🔄 Mapped ${permission} → [${PERMISSION_MAPPINGS[permission].join(', ')}] for user "${user.email}"`);
        } else {
          console.log(`  ⚠️  Removed invalid permission "${permission}" from user "${user.email}"`);
        }
      }

      const finalPermissions = Array.from(newPermissions);
      
      if (JSON.stringify(originalPermissions.sort()) !== JSON.stringify(finalPermissions.sort())) {
        await prisma.user.update({
          where: { id: user.id },
          data: { module_permissions: finalPermissions }
        });
        usersUpdated++;
        totalUserPermissionsFixed += Math.abs(originalPermissions.length - finalPermissions.length);
        console.log(`  ✅ Updated user "${user.email}": ${originalPermissions.length} → ${finalPermissions.length} permissions`);
      }
    }

    // Step 6: Verify Admin group has all permissions
    console.log('\n🔧 Step 5: Ensuring Admin group has all permissions...');
    const adminGroup = await prisma.userGroup.findFirst({
      where: { name: 'Admin' }
    });

    if (adminGroup) {
      const adminPermissions = new Set(adminGroup.permissions);
      const missingPermissions = VALID_PERMISSIONS.filter(p => !adminPermissions.has(p));
      
      if (missingPermissions.length > 0) {
        const updatedPermissions = Array.from(new Set([...adminGroup.permissions, ...missingPermissions]));
        await prisma.userGroup.update({
          where: { id: adminGroup.id },
          data: { permissions: updatedPermissions }
        });
        console.log(`  ✅ Added ${missingPermissions.length} missing permissions to Admin group:`, missingPermissions);
      } else {
        console.log('  ✅ Admin group already has all valid permissions');
      }
    }

    // Step 7: Summary
    console.log('\n📊 Summary:');
    console.log(`  • User Groups Updated: ${groupsUpdated}`);
    console.log(`  • Users Updated: ${usersUpdated}`);
    console.log(`  • Total Group Permissions Fixed: ${totalPermissionsFixed}`);
    console.log(`  • Total User Permissions Fixed: ${totalUserPermissionsFixed}`);
    console.log(`  • Invalid Permissions Removed: ${invalidPermissions.size}`);
    console.log(`  • Valid Permissions: ${VALID_PERMISSIONS.length}`);

    // Step 8: Create a report of what needs to be updated in code
    console.log('\n📝 Code Update Recommendations:');
    console.log('The following permission references in your code should be updated:');
    
    const codeUpdates = [];
    for (const [oldPermission, newPermissions] of Object.entries(PERMISSION_MAPPINGS)) {
      codeUpdates.push({
        old: oldPermission,
        new: newPermissions,
        files: [
          'src/app/settings/layout.tsx',
          'src/app/settings/page.tsx',
          'src/components/users/UnifiedUserModal.tsx',
          'src/components/layout/SidebarNav.tsx',
          'src/components/dashboard/DashboardPageClient.tsx',
          'src/components/tasks/MyTasksPageClient.tsx',
          'src/components/candidates/AutomationUploadModal.tsx'
        ]
      });
    }

    for (const update of codeUpdates) {
      console.log(`\n  🔄 Replace "${update.old}" with: ${update.new.join(' || ')}`);
      console.log(`     Files to check: ${update.files.join(', ')}`);
    }

    console.log('\n✅ Permission alignment fix completed successfully!');

  } catch (error) {
    console.error('❌ Error during permission alignment fix:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { main, VALID_PERMISSIONS, PERMISSION_MAPPINGS };
