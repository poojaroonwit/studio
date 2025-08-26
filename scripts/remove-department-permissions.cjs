#!/usr/bin/env node

/**
 * Script to remove department management permissions from existing databases
 * This script removes the 4 department management permissions that were not implemented
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEPARTMENT_PERMISSIONS = [
  'HR_DEPARTMENT_MANAGE',
  'IT_DEPARTMENT_MANAGE', 
  'FINANCE_DEPARTMENT_MANAGE',
  'MARKETING_DEPARTMENT_MANAGE'
];

async function removeDepartmentPermissions() {
  try {
    console.log('🔧 Removing department management permissions...');
    
    // Get all user groups
    const userGroups = await prisma.userGroup.findMany();
    console.log(`Found ${userGroups.length} user groups`);
    
    let updatedGroups = 0;
    
    for (const group of userGroups) {
      const originalPermissions = [...group.permissions];
      const updatedPermissions = group.permissions.filter(
        permission => !DEPARTMENT_PERMISSIONS.includes(permission)
      );
      
      if (originalPermissions.length !== updatedPermissions.length) {
        await prisma.userGroup.update({
          where: { id: group.id },
          data: { permissions: updatedPermissions }
        });
        
        const removedCount = originalPermissions.length - updatedPermissions.length;
        console.log(`✅ Updated group "${group.name}": removed ${removedCount} department permissions`);
        updatedGroups++;
      }
    }
    
    // Get all users with direct permissions
    const usersWithPermissions = await prisma.user.findMany({
      where: {
        modulePermissions: {
          not: null
        }
      }
    });
    
    console.log(`Found ${usersWithPermissions.length} users with direct permissions`);
    
    let updatedUsers = 0;
    
    for (const user of usersWithPermissions) {
      if (!user.modulePermissions) continue;
      
      const originalPermissions = [...user.modulePermissions];
      const updatedPermissions = user.modulePermissions.filter(
        permission => !DEPARTMENT_PERMISSIONS.includes(permission)
      );
      
      if (originalPermissions.length !== updatedPermissions.length) {
        await prisma.user.update({
          where: { id: user.id },
          data: { modulePermissions: updatedPermissions }
        });
        
        const removedCount = originalPermissions.length - updatedPermissions.length;
        console.log(`✅ Updated user "${user.email}": removed ${removedCount} department permissions`);
        updatedUsers++;
      }
    }
    
    console.log('\n📋 Summary:');
    console.log(`✅ Updated ${updatedGroups} user groups`);
    console.log(`✅ Updated ${updatedUsers} users with direct permissions`);
    console.log(`✅ Removed ${DEPARTMENT_PERMISSIONS.length} department management permissions`);
    console.log('\n🎯 Department management permissions have been successfully removed!');
    
  } catch (error) {
    console.error('❌ Error removing department permissions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  removeDepartmentPermissions()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { removeDepartmentPermissions };
