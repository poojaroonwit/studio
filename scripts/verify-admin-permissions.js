const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// All permissions from PLATFORM_MODULES in src/lib/types.ts
const ALL_PERMISSIONS = [
  // Candidate Management
  'CANDIDATES_VIEW',
  'CANDIDATES_VIEW_DETAILED',
  'CANDIDATES_CREATE',
  'CANDIDATES_EDIT_BASIC',
  'CANDIDATES_EDIT_SENSITIVE',
  'CANDIDATES_EDIT_BASIC_OWN',
  'CANDIDATES_EDIT_SENSITIVE_OWN',
  'CANDIDATES_EDIT_BASIC_ALL',
  'CANDIDATES_EDIT_SENSITIVE_ALL',
  'CANDIDATES_DELETE',
  'CANDIDATES_SOURCE_ASSIGN',
  'CANDIDATES_SOURCE_ASSIGN_BULK',
  'CANDIDATES_RECRUITER_ASSIGN',
  'CANDIDATES_RECRUITER_ASSIGN_OWN',
  'CANDIDATES_RECRUITER_ASSIGN_ALL',
  'CANDIDATES_RECRUITER_ASSIGN_BULK',
  'CANDIDATES_PIPELINE_STAGE_UPDATE',
  'CANDIDATES_PIPELINE_STAGE_UPDATE_OWN',
  'CANDIDATES_PIPELINE_STAGE_UPDATE_ALL',
  'CANDIDATES_PIPELINE_STAGE_BULK_UPDATE',
  'CANDIDATES_RESUMES_UPLOAD',
  'CANDIDATES_RESUMES_UPLOAD_OWN',
  'CANDIDATES_RESUMES_UPLOAD_ALL',
  'CANDIDATES_RESUMES_DELETE',
  'CANDIDATES_COMMENTS_VIEW',
  'CANDIDATES_COMMENTS_ADD',
  'CANDIDATES_COMMENTS_ADD_OWN',
  'CANDIDATES_COMMENTS_ADD_ALL',
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
  'USER_PREFERENCES_MANAGE_ALL',
];

async function verifyAdminPermissions() {
  console.log('🔍 Verifying Admin Role Permissions...\n');
  
  try {
    // Get Admin user group
    const adminGroup = await prisma.userGroup.findUnique({
      where: { name: 'Admin' }
    });
    
    if (!adminGroup) {
      console.log('❌ Admin user group not found!');
      return;
    }
    
    console.log(`✅ Found Admin group: ${adminGroup.name}`);
    console.log(`📋 Current permissions count: ${adminGroup.permissions.length}`);
    console.log(`📋 Total system permissions: ${ALL_PERMISSIONS.length}\n`);
    
    // Check for missing permissions
    const adminPermissions = new Set(adminGroup.permissions);
    const allPermissionsSet = new Set(ALL_PERMISSIONS);
    const missingPermissions = ALL_PERMISSIONS.filter(p => !adminPermissions.has(p));
    const extraPermissions = adminGroup.permissions.filter(p => !allPermissionsSet.has(p));
    
    if (missingPermissions.length > 0) {
      console.log('❌ MISSING PERMISSIONS:');
      missingPermissions.forEach(perm => {
        console.log(`   - ${perm}`);
      });
      console.log('');
    } else {
      console.log('✅ All system permissions are assigned to Admin role!\n');
    }
    
    if (extraPermissions.length > 0) {
      console.log('⚠️  EXTRA PERMISSIONS (not in system definition):');
      extraPermissions.forEach(perm => {
        console.log(`   - ${perm}`);
      });
      console.log('');
    }
    
    // Summary
    console.log('📊 Summary:');
    console.log(`   Total system permissions: ${ALL_PERMISSIONS.length}`);
    console.log(`   Admin has: ${adminGroup.permissions.length}`);
    console.log(`   Missing: ${missingPermissions.length}`);
    console.log(`   Extra: ${extraPermissions.length}`);
    
    if (missingPermissions.length > 0) {
      console.log('\n⚠️  ACTION REQUIRED: Update Admin role to include missing permissions.');
      return { missing: missingPermissions, extra: extraPermissions };
    } else {
      console.log('\n✅ Admin role has all required permissions!');
      return { missing: [], extra: extraPermissions };
    }
    
  } catch (error) {
    console.error('❌ Error verifying permissions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyAdminPermissions()
  .then(result => {
    if (result && result.missing.length > 0) {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

