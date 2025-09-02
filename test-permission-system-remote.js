#!/usr/bin/env node

/**
 * Test script to verify permission system functionality with remote database
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPermissionSystem() {
  try {
    console.log('🔍 Testing permission system with remote database...\n');

    // Test 1: Check if User_UserGroup table exists and has data
    console.log('📊 Test 1: Checking User_UserGroup table...');
    try {
      const userGroups = await prisma.user_UserGroup.findMany({
        include: {
          user: { select: { email: true, role: true } },
          group: { select: { name: true, permissions: true } }
        }
      });
      
      console.log(`   Found ${userGroups.length} user-group assignments`);
      for (const ug of userGroups) {
        console.log(`   - ${ug.user.email} (${ug.user.role}) → ${ug.group.name} [${ug.group.permissions.length} permissions]`);
      }
    } catch (error) {
      console.log(`   ❌ Error accessing User_UserGroup table: ${error.message}`);
    }

    // Test 2: Check if default groups exist
    console.log('\n📊 Test 2: Checking default groups...');
    try {
      const defaultGroups = await prisma.userGroup.findMany({
        where: { isDefault: true },
        select: { name: true, permissions: true, isSystemRole: true }
      });
      
      console.log(`   Found ${defaultGroups.length} default groups`);
      for (const group of defaultGroups) {
        console.log(`   - ${group.name}: ${group.permissions.length} permissions (system: ${group.isSystemRole})`);
      }
    } catch (error) {
      console.log(`   ❌ Error accessing UserGroup table: ${error.message}`);
    }

    // Test 3: Check users and their roles
    console.log('\n📊 Test 3: Checking users and roles...');
    try {
      const users = await prisma.user.findMany({
        select: { email: true, role: true }
      });
      
      console.log(`   Found ${users.length} users`);
      for (const user of users) {
        console.log(`   - ${user.email}: ${user.role}`);
      }
    } catch (error) {
      console.log(`   ❌ Error accessing User table: ${error.message}`);
    }

    // Test 4: Check permission alignment
    console.log('\n📊 Test 4: Checking permission alignment...');
    try {
      const usersWithGroups = await prisma.user.findMany({
        include: {
          userGroups: {
            include: {
              group: { select: { name: true, permissions: true } }
            }
          }
        }
      });

      for (const user of usersWithGroups) {
        const totalPermissions = user.userGroups.flatMap(ug => ug.group.permissions);
        const uniquePermissions = [...new Set(totalPermissions)];
        
        console.log(`   - ${user.email} (${user.role}): ${user.userGroups.length} groups, ${uniquePermissions.length} unique permissions`);
        
        if (user.userGroups.length === 0) {
          console.log(`     ⚠️  No group assignments`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Error checking permission alignment: ${error.message}`);
    }

    console.log('\n✅ Permission system test completed!');
    
  } catch (error) {
    console.error('❌ Error testing permission system:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPermissionSystem();
