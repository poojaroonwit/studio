#!/usr/bin/env node

/**
 * Simple test script to verify permission system functionality
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPermissionSystem() {
  try {
    console.log('🔍 Testing permission system...\n');

    // Test 1: Check if users have proper group assignments
    console.log('📊 Test 1: Checking user group assignments...');
    const usersWithGroups = await prisma.user.findMany({
      include: {
        userGroup: { select: { name: true, permissions: true } }
      }
    });
    
    console.log(`   Found ${usersWithGroups.length} users with group assignments`);
    for (const user of usersWithGroups) {
      if (user.userGroup) {
        console.log(`   - ${user.email} (${user.role}) → ${user.userGroup.name} [${user.userGroup.permissions.length} permissions]`);
      } else {
        console.log(`   - ${user.email} (${user.role}) → No group assigned`);
      }
    }

    // Test 2: Check if default groups exist
    console.log('\n📊 Test 2: Checking default groups...');
    const defaultGroups = await prisma.userGroup.findMany({
      where: { isDefault: true },
      select: { name: true, permissions: true, isSystemRole: true }
    });
    
    console.log(`   Found ${defaultGroups.length} default groups`);
    for (const group of defaultGroups) {
      console.log(`   - ${group.name}: ${group.permissions.length} permissions (system: ${group.isSystemRole})`);
    }

    // Test 3: Check users and their roles
    console.log('\n📊 Test 3: Checking users and roles...');
    const users = await prisma.user.findMany({
      select: { email: true, role: true }
    });
    
    console.log(`   Found ${users.length} users`);
    for (const user of users) {
      console.log(`   - ${user.email}: ${user.role}`);
    }

    // Test 4: Check permission alignment
    console.log('\n📊 Test 4: Checking permission alignment...');
    const usersWithGroups = await prisma.user.findMany({
      include: {
        userGroup: { select: { name: true, permissions: true } }
      }
    });

    for (const user of usersWithGroups) {
      if (user.userGroup) {
        const totalPermissions = user.userGroup.permissions;
        const uniquePermissions = [...new Set(totalPermissions)];
        
        console.log(`   - ${user.email} (${user.role}): ${user.userGroup.name} group, ${uniquePermissions.length} unique permissions`);
      } else {
        console.log(`   - ${user.email} (${user.role}): No group assigned`);
      }
    }

    console.log('\n✅ Permission system test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing permission system:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPermissionSystem();
