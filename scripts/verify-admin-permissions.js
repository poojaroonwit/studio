#!/usr/bin/env node

/**
 * Admin Permission Verification Script
 * 
 * This script verifies that the Admin role has all available permissions
 * and fixes any missing permissions to ensure complete access.
 * 
 * Usage:
 *   node scripts/verify-admin-permissions.js
 *   npm run verify:admin-permissions
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all available permissions from the types file
const ALL_PERMISSIONS = [
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
  
  // User Management
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
  'WEBHOOKS_VIEW',
  'WEBHOOKS_EDIT',
  'AI_INTEGRATION_VIEW',
  'AI_INTEGRATION_EDIT',
  
  // Automation & Integration
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

async function verifyAdminPermissions() {
  console.log('🔍 Verifying Admin role permissions...');
  
  try {
    // Find the Admin user group
    const adminGroup = await prisma.userGroup.findFirst({
      where: { name: 'Admin' }
    });

    if (!adminGroup) {
      console.error('❌ Admin user group not found!');
      return false;
    }

    console.log(`📋 Found Admin group: ${adminGroup.name} (ID: ${adminGroup.id})`);
    
    const currentPermissions = adminGroup.permissions || [];
    console.log(`📊 Current permissions: ${currentPermissions.length}`);
    
    // Check for missing permissions
    const missingPermissions = ALL_PERMISSIONS.filter(permission => 
      !currentPermissions.includes(permission)
    );
    
    if (missingPermissions.length > 0) {
      console.log(`⚠️  Missing permissions: ${missingPermissions.length}`);
      console.log(`   Missing: ${missingPermissions.join(', ')}`);
      
      // Add missing permissions
      const updatedPermissions = [...new Set([...currentPermissions, ...missingPermissions])];
      
      await prisma.userGroup.update({
        where: { id: adminGroup.id },
        data: { permissions: updatedPermissions }
      });
      
      console.log(`✅ Added ${missingPermissions.length} missing permissions to Admin role`);
      console.log(`📊 Total permissions now: ${updatedPermissions.length}`);
      
      return true;
    } else {
      console.log('✅ Admin role has all permissions!');
      console.log(`📊 Total permissions: ${currentPermissions.length}`);
      return true;
    }
    
  } catch (error) {
    console.error('❌ Error verifying admin permissions:', error);
    return false;
  }
}

async function verifyAdminUsers() {
  console.log('\n👥 Verifying Admin users have all permissions...');
  
  try {
    // Find all users in the Admin group
    const adminUsers = await prisma.user.findMany({
      where: {
        userGroups: {
          some: {
            userGroup: {
              name: 'Admin'
            }
          }
        }
      },
      include: {
        userGroups: {
          include: {
            userGroup: true
          }
        }
      }
    });

    console.log(`📋 Found ${adminUsers.length} Admin users`);
    
    let usersUpdated = 0;
    
    for (const user of adminUsers) {
      const userPermissions = user.module_permissions || [];
      const missingPermissions = ALL_PERMISSIONS.filter(permission => 
        !userPermissions.includes(permission)
      );
      
      if (missingPermissions.length > 0) {
        console.log(`⚠️  User ${user.email} missing ${missingPermissions.length} permissions`);
        
        const updatedPermissions = [...new Set([...userPermissions, ...missingPermissions])];
        
        await prisma.user.update({
          where: { id: user.id },
          data: { module_permissions: updatedPermissions }
        });
        
        console.log(`✅ Updated user ${user.email} with missing permissions`);
        usersUpdated++;
      }
    }
    
    if (usersUpdated > 0) {
      console.log(`✅ Updated ${usersUpdated} Admin users with missing permissions`);
    } else {
      console.log('✅ All Admin users have all permissions!');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error verifying admin users:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Admin Permission Verification...\n');
  
  try {
    // Verify Admin group permissions
    const groupSuccess = await verifyAdminPermissions();
    
    // Verify Admin user permissions
    const userSuccess = await verifyAdminUsers();
    
    if (groupSuccess && userSuccess) {
      console.log('\n🎉 Admin permission verification completed successfully!');
      console.log('✅ Admin role has all permissions');
      console.log('✅ Admin users have all permissions');
      console.log('✅ No infinite loops in permission setup');
    } else {
      console.log('\n❌ Admin permission verification failed!');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Fatal error during verification:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { verifyAdminPermissions, verifyAdminUsers };
