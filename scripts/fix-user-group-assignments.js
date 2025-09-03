#!/usr/bin/env node

/**
 * Fix User Group Assignments
 * 
 * This script checks for users who don't have a userGroupId set and assigns them
 * to appropriate groups based on their current role or assigns them to the default group.
 */

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function fixUserGroupAssignments() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing User Group Assignments...\n');
    
    // Step 1: Check if UserGroup table exists
    const checkUserGroupTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'UserGroup'
      )
    `);
    
    if (!checkUserGroupTable.rows[0].exists) {
      console.log('❌ UserGroup table does not exist. Please run the database migrations first.');
      return;
    }
    
    // Step 2: Check if userGroupId column exists in User table
    const checkUserGroupIdColumn = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'userGroupId'
      )
    `);
    
    if (!checkUserGroupIdColumn.rows[0].exists) {
      console.log('❌ userGroupId column does not exist in User table. Please run the database migrations first.');
      return;
    }
    
    // Step 3: Get all user groups
    const userGroupsResult = await client.query(`
      SELECT id, name, "is_default", "is_system_role" 
      FROM "UserGroup" 
      ORDER BY "is_default" DESC, "is_system_role" DESC, name
    `);
    
    if (userGroupsResult.rows.length === 0) {
      console.log('❌ No user groups found. Please create user groups first.');
      return;
    }
    
    const userGroups = userGroupsResult.rows;
    console.log('📋 Available user groups:');
    userGroups.forEach(group => {
      const flags = [];
      if (group.is_default) flags.push('Default');
      if (group.is_system_role) flags.push('System');
      const flagStr = flags.length > 0 ? ` (${flags.join(', ')})` : '';
      console.log(`   - ${group.name}${flagStr}`);
    });
    
    // Step 4: Find users without userGroupId
    const usersWithoutGroup = await client.query(`
      SELECT id, name, email, role, "userGroupId"
      FROM "User" 
      WHERE "userGroupId" IS NULL
      ORDER BY name
    `);
    
    if (usersWithoutGroup.rows.length === 0) {
      console.log('\n✅ All users have group assignments.');
      return;
    }
    
    console.log(`\n⚠️  Found ${usersWithoutGroup.rows.length} users without group assignments:`);
    usersWithoutGroup.rows.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - Role: ${user.role || 'None'}`);
    });
    
    // Step 5: Find the default group
    const defaultGroup = userGroups.find(g => g.is_default);
    if (!defaultGroup) {
      console.log('\n❌ No default user group found. Please set a default group.');
      return;
    }
    
    console.log(`\n🎯 Using default group: ${defaultGroup.name}`);
    
    // Step 6: Assign users to appropriate groups
    let assignedCount = 0;
    let skippedCount = 0;
    
    for (const user of usersWithoutGroup.rows) {
      let targetGroupId = null;
      
      // Try to find a group that matches the user's role
      if (user.role) {
        const roleBasedGroup = userGroups.find(g => 
          g.name.toLowerCase().includes(user.role.toLowerCase()) ||
          user.role.toLowerCase().includes(g.name.toLowerCase())
        );
        if (roleBasedGroup) {
          targetGroupId = roleBasedGroup.id;
          console.log(`   📝 Assigning ${user.name} to ${roleBasedGroup.name} (role-based match)`);
        }
      }
      
      // If no role-based match, use the default group
      if (!targetGroupId) {
        targetGroupId = defaultGroup.id;
        console.log(`   📝 Assigning ${user.name} to ${defaultGroup.name} (default group)`);
      }
      
      // Update the user
      try {
        await client.query(`
          UPDATE "User" 
          SET "userGroupId" = $1, "updatedAt" = NOW()
          WHERE id = $2
        `, [targetGroupId, user.id]);
        
        assignedCount++;
      } catch (error) {
        console.error(`   ❌ Failed to assign ${user.name}:`, error.message);
        skippedCount++;
      }
    }
    
    console.log(`\n✅ Assignment complete:`);
    console.log(`   - ${assignedCount} users assigned to groups`);
    if (skippedCount > 0) {
      console.log(`   - ${skippedCount} users skipped due to errors`);
    }
    
    // Step 7: Verify the fix
    const verifyResult = await client.query(`
      SELECT COUNT(*) as count
      FROM "User" 
      WHERE "userGroupId" IS NULL
    `);
    
    const remainingUsers = parseInt(verifyResult.rows[0].count);
    if (remainingUsers === 0) {
      console.log('\n🎉 All users now have group assignments!');
    } else {
      console.log(`\n⚠️  ${remainingUsers} users still don't have group assignments.`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing user group assignments:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  fixUserGroupAssignments()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixUserGroupAssignments };
