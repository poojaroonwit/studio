#!/usr/bin/env node

/**
 * Comprehensive Permission System Verification Script
 * This script verifies that the permission system is correctly set up and aligned
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Create database connection pool
const pool = new Pool({
  connectionString: 'postgresql://studio_user:local_dev_password@localhost:8521/studio_dev',
  ssl: false,
});

async function verifyPermissionSystem() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Comprehensive Permission System Verification\n');
    
    // 1. Check UserGroup structure
    console.log('📊 1. UserGroup Structure:');
    const userGroups = await client.query(`
      SELECT id, name, permissions, "is_default", "is_system_role"
      FROM "UserGroup"
      ORDER BY name
    `);
    
    userGroups.rows.forEach(group => {
      console.log(`  ${group.name}: ${group.permissions.length} permissions`);
      console.log(`    Default: ${group.is_default}, System: ${group.is_system_role}`);
    });
    
    // 2. Check User assignments
    console.log('\n👥 2. User Group Assignments:');
    const userAssignments = await client.query(`
      SELECT 
        u.name,
        u.email,
        u.role as current_role,
        array_agg(DISTINCT ug.name) as user_groups,
        array_agg(DISTINCT perm) as all_permissions
      FROM "User" u
      LEFT JOIN "User_UserGroup" uug ON u.id = uug."userId"
      LEFT JOIN "UserGroup" ug ON uug."groupId" = ug.id
      LEFT JOIN LATERAL unnest(ug.permissions) AS perm ON true
      GROUP BY u.id, u.name, u.email, u.role
      ORDER BY u.name
    `);
    
    userAssignments.rows.forEach(user => {
      console.log(`  ${user.name} (${user.email}): ${user.current_role}`);
      console.log(`    Groups: [${user.user_groups.join(', ')}]`);
      console.log(`    Permissions: ${user.all_permissions.length} total`);
    });
    
    // 3. Check for permission alignment issues
    console.log('\n⚠️  3. Permission Alignment Issues:');
    
    // Check users with admin permissions but wrong role
    const adminMismatch = await client.query(`
      SELECT 
        u.name,
        u.email,
        u.role as current_role,
        array_agg(DISTINCT ug.name) as user_groups
      FROM "User" u
      JOIN "User_UserGroup" uug ON u.id = uug."userId"
      JOIN "UserGroup" ug ON uug."groupId" = ug.id
      WHERE (
        'USERS_PERMISSIONS_MANAGE' = ANY(ug.permissions) OR
        'USER_GROUPS_EDIT' = ANY(ug.permissions) OR
        'SYSTEM_SETTINGS_VIEW' = ANY(ug.permissions) OR
        'SYSTEM_SETTINGS_EDIT' = ANY(ug.permissions)
      ) AND u.role != 'Admin'
      GROUP BY u.id, u.name, u.email, u.role
    `);
    
    if (adminMismatch.rows.length > 0) {
      console.log('  Users with admin-level permissions but non-admin role:');
      adminMismatch.rows.forEach(user => {
        console.log(`    ${user.name} (${user.email}): ${user.current_role} -> Groups: [${user.user_groups.join(', ')}]`);
      });
    } else {
      console.log('  ✅ No permission alignment issues found');
    }
    
    // 4. Check for users without group assignments
    console.log('\n🔍 4. Users Without Group Assignments:');
    const usersWithoutGroups = await client.query(`
      SELECT u.id, u.name, u.email, u.role
      FROM "User" u
      LEFT JOIN "User_UserGroup" uug ON u.id = uug."userId"
      WHERE uug."userId" IS NULL
      ORDER BY u.name
    `);
    
    if (usersWithoutGroups.rows.length > 0) {
      console.log(`  Found ${usersWithoutGroups.rows.length} users without group assignments:`);
      usersWithoutGroups.rows.forEach(user => {
        console.log(`    ${user.name} (${user.email}): ${user.role}`);
      });
    } else {
      console.log('  ✅ All users have group assignments');
    }
    
    // 5. Verify permission consistency
    console.log('\n✅ 5. Permission System Summary:');
    const totalUsers = userAssignments.rows.length;
    const usersWithPermissions = userAssignments.rows.filter(u => u.all_permissions.length > 0).length;
    const adminUsers = userAssignments.rows.filter(u => u.current_role === 'Admin').length;
    
    console.log(`  Total Users: ${totalUsers}`);
    console.log(`  Users with Permissions: ${usersWithPermissions}`);
    console.log(`  Admin Users: ${adminUsers}`);
    console.log(`  Permission Coverage: ${((usersWithPermissions / totalUsers) * 100).toFixed(1)}%`);
    
    // 6. Check for common permission patterns
    console.log('\n📋 6. Common Permission Patterns:');
    const permissionCounts = {};
    userAssignments.rows.forEach(user => {
      user.all_permissions.forEach(perm => {
        permissionCounts[perm] = (permissionCounts[perm] || 0) + 1;
      });
    });
    
    const sortedPermissions = Object.entries(permissionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    console.log('  Most common permissions:');
    sortedPermissions.forEach(([perm, count]) => {
      console.log(`    ${perm}: ${count} users`);
    });
    
    console.log('\n🎉 Permission system verification completed!');
    
    // Summary recommendations
    if (usersWithoutGroups.rows.length > 0) {
      console.log('\n⚠️  RECOMMENDATIONS:');
      console.log('  1. Run migration script to assign users to groups');
      console.log('  2. Update user roles to match their group permissions');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the verification
verifyPermissionSystem().catch(console.error);
