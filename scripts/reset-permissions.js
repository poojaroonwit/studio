#!/usr/bin/env node

/**
 * Permission Reset Script
 * 
 * This script resets all user group permissions to use the correct granular permissions
 * instead of the invalid broad permissions (CANDIDATES_MANAGE, POSITIONS_MANAGE, etc.)
 * 
 * Usage:
 *   node scripts/reset-permissions.js
 *   npm run reset:permissions
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Define all valid granular permissions
const ALL_PERMISSIONS = [
  // Candidate permissions
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
  
  // Position permissions
  'POSITIONS_VIEW',
  'POSITIONS_CREATE',
  'POSITIONS_EDIT_BASIC',
  'POSITIONS_EDIT_DETAILED',
  'POSITIONS_RECRUITER_ASSIGN',
  'POSITIONS_DELETE',
  'POSITIONS_IMPORT',
  'POSITIONS_EXPORT',
  
  // User management permissions
  'USERS_VIEW',
  'USERS_CREATE',
  'USERS_EDIT',
  'USERS_DELETE',
  'USERS_PERMISSIONS_MANAGE',
  'USER_GROUPS_VIEW',
  'USER_GROUPS_CREATE',
  'USER_GROUPS_EDIT',
  'USER_GROUPS_DELETE',
  
  // System permissions
  'SYSTEM_SETTINGS_VIEW',
  'SYSTEM_SETTINGS_EDIT',
  'RECRUITMENT_STAGES_VIEW',
  'RECRUITMENT_STAGES_EDIT',
  'CUSTOM_FIELDS_VIEW',
  'CUSTOM_FIELDS_EDIT',
  'WEBHOOKS_VIEW',
  'WEBHOOKS_EDIT',
  'AI_INTEGRATION_VIEW',
  'AI_INTEGRATION_EDIT',
  
  // Other permissions
  'UPLOAD_QUEUE_VIEW',
  'UPLOAD_QUEUE_MANAGE',
  'BULK_UPLOAD_EXECUTE',
  'DASHBOARD_VIEW',
  'REPORTS_GENERATE',
  'WEBHOOK_ANALYTICS_VIEW',
  'LOGS_VIEW',
  'LOGS_EXPORT',
  'APP_PERFORMANCE_VIEW',
  'TASK_BOARD_VIEW',
  'TASK_BOARD_MANAGE_OWN',
  'TASK_BOARD_MANAGE_ALL',
  'JOB_MATCH_VIEW',
  'JOB_MATCH_MANAGE',
  'WARNING_CONFIGURATIONS_VIEW',
  'WARNING_CONFIGURATIONS_MANAGE',
  'USER_PREFERENCES_MANAGE_OWN',
  'USER_PREFERENCES_MANAGE_ALL'
];

// Define role permissions mapping
const ROLE_PERMISSIONS = {
  'Admin': [
    // Full access to everything
    ...ALL_PERMISSIONS
  ],
  
  'Recruiter': [
    // Candidate management
    'CANDIDATES_VIEW',
    'CANDIDATES_VIEW_DETAILED',
    'CANDIDATES_CREATE',
    'CANDIDATES_EDIT_BASIC',
    'CANDIDATES_SOURCE_ASSIGN',
    'CANDIDATES_RECRUITER_ASSIGN',
    'CANDIDATES_PIPELINE_STAGE_UPDATE',
    'CANDIDATES_RESUMES_UPLOAD',
    'CANDIDATES_COMMENTS_VIEW',
    'CANDIDATES_COMMENTS_ADD',
    'CANDIDATES_IMPORT',
    'CANDIDATES_EXPORT',
    
    // Position management
    'POSITIONS_VIEW',
    'POSITIONS_CREATE',
    'POSITIONS_EDIT_BASIC',
    'POSITIONS_RECRUITER_ASSIGN',
    'POSITIONS_IMPORT',
    'POSITIONS_EXPORT',
    
    // Other permissions
    'TASK_BOARD_VIEW',
    'TASK_BOARD_MANAGE_OWN',
    'RECRUITMENT_STAGES_VIEW',
    'USER_PREFERENCES_MANAGE_OWN',
    'BULK_UPLOAD_EXECUTE',
    'DASHBOARD_VIEW',
    'REPORTS_GENERATE'
  ],
  
  'Hiring Manager': [
    // Read-only access to candidates and positions
    'CANDIDATES_VIEW',
    'CANDIDATES_VIEW_DETAILED',
    'CANDIDATES_COMMENTS_VIEW',
    'POSITIONS_VIEW',
    'TASK_BOARD_VIEW',
    'DASHBOARD_VIEW',
    'USER_PREFERENCES_MANAGE_OWN'
  ]
};

// Invalid permissions that should be removed
const INVALID_PERMISSIONS = [
  'CANDIDATES_MANAGE',
  'POSITIONS_MANAGE', 
  'USERS_MANAGE',
  'USER_GROUPS_MANAGE',
  'SYSTEM_SETTINGS_MANAGE'
];

async function validatePermissions(permissions) {
  const invalid = permissions.filter(p => !ALL_PERMISSIONS.includes(p));
  if (invalid.length > 0) {
    console.warn(`⚠️  Found invalid permissions: ${invalid.join(', ')}`);
    return false;
  }
  return true;
}

async function resetUserGroupPermissions() {
  console.log('🔄 Starting permission reset process...');
  
  try {
    // Get all user groups
    const userGroups = await prisma.userGroup.findMany();
    console.log(`📋 Found ${userGroups.length} user groups to update`);
    
    for (const group of userGroups) {
      console.log(`\n🔧 Processing group: ${group.name}`);
      
      // Get current permissions
      const currentPermissions = group.permissions || [];
      console.log(`   Current permissions: ${currentPermissions.length}`);
      
      // Check for invalid permissions
      const invalidFound = currentPermissions.filter(p => INVALID_PERMISSIONS.includes(p));
      if (invalidFound.length > 0) {
        console.log(`   ⚠️  Found invalid permissions: ${invalidFound.join(', ')}`);
      }
      
      // Determine new permissions based on role
      let newPermissions = [];
      
      if (group.name === 'Admin') {
        newPermissions = ROLE_PERMISSIONS['Admin'];
      } else if (group.name === 'Recruiter') {
        newPermissions = ROLE_PERMISSIONS['Recruiter'];
      } else if (group.name === 'Hiring Manager') {
        newPermissions = ROLE_PERMISSIONS['Hiring Manager'];
      } else {
        // For custom groups, remove invalid permissions but keep valid ones
        newPermissions = currentPermissions.filter(p => !INVALID_PERMISSIONS.includes(p));
        console.log(`   📝 Custom group - keeping valid permissions only`);
      }
      
      // Validate new permissions
      const isValid = await validatePermissions(newPermissions);
      if (!isValid) {
        console.error(`   ❌ Invalid permissions found for ${group.name}, skipping...`);
        continue;
      }
      
      // Update the group
      await prisma.userGroup.update({
        where: { id: group.id },
        data: { permissions: newPermissions }
      });
      
      console.log(`   ✅ Updated ${group.name}: ${newPermissions.length} permissions`);
      console.log(`   📊 Permission count: ${currentPermissions.length} → ${newPermissions.length}`);
    }
    
    console.log('\n🎉 Permission reset completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during permission reset:', error);
    throw error;
  }
}

async function verifyPermissions() {
  console.log('\n🔍 Verifying permissions...');
  
  try {
    const userGroups = await prisma.userGroup.findMany();
    let allValid = true;
    
    for (const group of userGroups) {
      const permissions = group.permissions || [];
      const invalid = permissions.filter(p => !ALL_PERMISSIONS.includes(p));
      
      if (invalid.length > 0) {
        console.error(`❌ ${group.name} still has invalid permissions: ${invalid.join(', ')}`);
        allValid = false;
      } else {
        console.log(`✅ ${group.name}: All permissions valid (${permissions.length} total)`);
      }
    }
    
    if (allValid) {
      console.log('\n🎉 All permissions are now valid!');
    } else {
      console.log('\n⚠️  Some invalid permissions remain. Please check the output above.');
    }
    
    return allValid;
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Permission Reset Script');
  console.log('==========================\n');
  
  try {
    // Reset permissions
    await resetUserGroupPermissions();
    
    // Verify the changes
    const isValid = await verifyPermissions();
    
    if (isValid) {
      console.log('\n✅ Permission reset completed successfully!');
      console.log('📝 All user groups now use granular permissions.');
      console.log('🔒 Invalid broad permissions have been removed.');
    } else {
      console.log('\n⚠️  Permission reset completed with warnings.');
      console.log('📋 Please review the output above for any remaining issues.');
    }
    
  } catch (error) {
    console.error('\n❌ Permission reset failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  resetUserGroupPermissions,
  verifyPermissions,
  ROLE_PERMISSIONS,
  ALL_PERMISSIONS,
  INVALID_PERMISSIONS
};
