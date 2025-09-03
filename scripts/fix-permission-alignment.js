#!/usr/bin/env node

/**
 * Fix Permission Alignment Script
 * 
 * This script fixes the issue where users have admin-level permissions
 * but their role field in the User table still shows as 'Recruiters'.
 * 
 * The system uses UserGroup.permissions as the primary permission source,
 * but User.role should be synchronized to reflect the user's permission level.
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Define permission levels
const ADMIN_PERMISSIONS = [
  'USERS_PERMISSIONS_MANAGE', 'USER_GROUPS_EDIT', 'SYSTEM_SETTINGS_VIEW', 
  'SYSTEM_SETTINGS_EDIT', 'LOGS_VIEW', 'UPLOAD_QUEUE_MANAGE'
];

const RECRUITER_PERMISSIONS = [
  'CANDIDATES_VIEW', 'CANDIDATES_CREATE', 'CANDIDATES_EDIT_BASIC',
  'POSITIONS_VIEW', 'POSITIONS_CREATE', 'POSITIONS_EDIT_BASIC',
  'TASK_BOARD_VIEW', 'TASK_BOARD_MANAGE_OWN'
];

const HIRING_MANAGER_PERMISSIONS = [
  'CANDIDATES_VIEW', 'POSITIONS_VIEW', 'TASK_BOARD_VIEW'
];

async function main() {
  console.log('🔧 Starting Permission Alignment Fix...\n');

  try {
    // Get all users with their current roles
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    console.log(`📊 Found ${users.length} users to check\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      console.log(`👤 Checking user: ${user.name} (${user.email})`);
      console.log(`   Current role: ${user.role}`);

      // Get user's permissions through the direct foreign key relationship
      const userWithGroup = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          userGroup: {
            select: {
              name: true,
              permissions: true
            }
          }
        }
      });

      // Get permissions from the user's group
      const userPermissions = userWithGroup?.userGroup?.permissions || [];
      
      const userGroupName = userWithGroup?.userGroup?.name || 'No group assigned';

      console.log(`   User group: ${userGroupName}`);
      console.log(`   Total permissions: ${userPermissions.length}`);

      // Determine the appropriate role based on permissions
      let newRole = user.role;

      // Check if user has admin-level permissions
      const hasAdminPermissions = ADMIN_PERMISSIONS.some(permission => 
        userPermissions.includes(permission)
      );

      if (hasAdminPermissions) {
        newRole = 'Admin';
      } else {
        // Check if user has recruiter-level permissions
        const hasRecruiterPermissions = RECRUITER_PERMISSIONS.some(permission => 
          userPermissions.includes(permission)
        );

        if (hasRecruiterPermissions) {
          newRole = 'Recruiters';
        } else {
          // Check if user has hiring manager permissions
          const hasHiringManagerPermissions = HIRING_MANAGER_PERMISSIONS.some(permission => 
            userPermissions.includes(permission)
          );

          if (hasHiringManagerPermissions) {
            newRole = 'Hiring Manager';
          } else {
            // Default to Recruiter if no specific permissions found
            newRole = 'Recruiters';
          }
        }
      }

      // Update role if it's different
      if (newRole !== user.role) {
        console.log(`   ⚠️  Role mismatch detected!`);
        console.log(`   🔄 Updating role from '${user.role}' to '${newRole}'...`);
        
        await prisma.user.update({
          where: { id: user.id },
          data: { role: newRole }
        });
        
        console.log(`   ✅ Role updated successfully`);
        updatedCount++;
      } else {
        console.log(`   ✅ Role correctly set to '${user.role}'`);
        skippedCount++;
      }
      
      console.log(''); // Empty line for readability
    }

    console.log('📈 Summary:');
    console.log(`   ✅ Updated: ${updatedCount} users`);
    console.log(`   ⏭️  Skipped: ${skippedCount} users`);
    console.log(`   📊 Total: ${users.length} users`);

    if (updatedCount > 0) {
      console.log('\n🎉 Permission alignment completed successfully!');
      console.log('💡 Users may need to sign out and sign back in for changes to take effect.');
    } else {
      console.log('\n✅ All user roles are already properly aligned!');
    }

  } catch (error) {
    console.error('❌ Error during permission alignment:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
