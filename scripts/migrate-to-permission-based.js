#!/usr/bin/env node

/**
 * Migration Script: Ensure all users have proper user group assignments
 * This script ensures that all users are assigned to appropriate user groups
 * based on their current role, moving from role-based to permission-based access
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Create database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting user group assignment migration...');
    
    // Step 1: Show current state
    console.log('\n📊 Current user group assignments:');
    const currentState = await client.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role as current_role,
        array_agg(DISTINCT ug.name) as user_groups,
        array_length(array_agg(DISTINCT perm), 1) as permission_count
      FROM "User" u
      LEFT JOIN "User_UserGroup" uug ON u.id = uug."userId"
      LEFT JOIN "UserGroup" ug ON uug."groupId" = ug.id
      LEFT JOIN LATERAL unnest(ug.permissions) AS perm ON true
      GROUP BY u.id, u.name, u.email, u.role
      ORDER BY u.name
    `);
    
    currentState.rows.forEach(row => {
      console.log(`  ${row.name} (${row.email}): ${row.current_role} -> Groups: [${row.user_groups.join(', ')}] (${row.permission_count || 0} permissions)`);
    });
    
    // Step 2: Find users without group assignments
    console.log('\n🔍 Finding users without group assignments...');
    const usersWithoutGroups = await client.query(`
      SELECT u.id, u.name, u.email, u.role
      FROM "User" u
      LEFT JOIN "User_UserGroup" uug ON u.id = uug."userId"
      WHERE uug."userId" IS NULL
      ORDER BY u.name
    `);
    
    if (usersWithoutGroups.rows.length > 0) {
      console.log(`  Found ${usersWithoutGroups.rows.length} users without group assignments:`);
      usersWithoutGroups.rows.forEach(row => {
        console.log(`    ${row.name} (${row.email}): ${row.role}`);
      });
    } else {
      console.log('  All users already have group assignments!');
    }
    
    // Step 3: Assign users to appropriate groups
    console.log('\n🔧 Assigning users to groups...');
    
    // Admin users
    const adminResult = await client.query(`
      INSERT INTO "User_UserGroup" ("userId", "groupId")
      SELECT u.id, '00000000-0000-0000-0000-000000000001'
      FROM "User" u
      LEFT JOIN "User_UserGroup" uug ON u.id = uug."userId" AND uug."groupId" = '00000000-0000-0000-0000-000000000001'
      WHERE u.role = 'Admin' AND uug."userId" IS NULL
      ON CONFLICT ("userId", "groupId") DO NOTHING
    `);
    console.log(`  Assigned ${adminResult.rowCount} users to Admin group`);
    
    // Recruiter users
    const recruiterResult = await client.query(`
      INSERT INTO "User_UserGroup" ("userId", "groupId")
      SELECT u.id, '00000000-0000-0000-0000-000000000002'
      FROM "User" u
      LEFT JOIN "User_UserGroup" uug ON u.id = uug."userId" AND uug."groupId" = '00000000-0000-0000-0000-000000000002'
      WHERE u.role = 'Recruiter' AND uug."userId" IS NULL
      ON CONFLICT ("userId", "groupId") DO NOTHING
    `);
    console.log(`  Assigned ${recruiterResult.rowCount} users to Recruiter group`);
    
    // Hiring Manager users
    const hiringManagerResult = await client.query(`
      INSERT INTO "User_UserGroup" ("userId", "groupId")
      SELECT u.id, ug.id
      FROM "User" u
      CROSS JOIN "UserGroup" ug
      LEFT JOIN "User_UserGroup" uug ON u.id = uug."userId" AND uug."groupId" = ug.id
      WHERE u.role = 'Hiring Manager' 
        AND ug.name = 'Hiring Manager'
        AND uug."userId" IS NULL
      ON CONFLICT ("userId", "groupId") DO NOTHING
    `);
    console.log(`  Assigned ${hiringManagerResult.rowCount} users to Hiring Manager group`);
    
    // Step 4: Update user roles for consistency
    console.log('\n🔄 Updating user roles for consistency...');
    
    const adminRoleUpdate = await client.query(`
      UPDATE "User" 
      SET role = 'Admin'
      WHERE id IN (
        SELECT DISTINCT u.id
        FROM "User" u
        JOIN "User_UserGroup" uug ON u.id = uug."userId"
        JOIN "UserGroup" ug ON uug."groupId" = ug.id
        WHERE ug.name = 'Admin' AND u.role != 'Admin'
      )
    `);
    console.log(`  Updated ${adminRoleUpdate.rowCount} users to Admin role`);
    
    const recruiterRoleUpdate = await client.query(`
      UPDATE "User" 
      SET role = 'Recruiter'
      WHERE id IN (
        SELECT DISTINCT u.id
        FROM "User" u
        JOIN "User_UserGroup" uug ON u.id = uug."userId"
        JOIN "UserGroup" ug ON uug."groupId" = ug.id
        WHERE ug.name = 'Recruiter' AND u.role != 'Recruiter'
      )
    `);
    console.log(`  Updated ${recruiterRoleUpdate.rowCount} users to Recruiter role`);
    
    const hiringManagerRoleUpdate = await client.query(`
      UPDATE "User" 
      SET role = 'Hiring Manager'
      WHERE id IN (
        SELECT DISTINCT u.id
        FROM "User" u
        JOIN "User_UserGroup" uug ON u.id = uug."userId"
        JOIN "UserGroup" ug ON uug."groupId" = ug.id
        WHERE ug.name = 'Hiring Manager' AND u.role != 'Hiring Manager'
      )
    `);
    console.log(`  Updated ${hiringManagerRoleUpdate.rowCount} users to Hiring Manager role`);
    
    // Step 5: Final verification
    console.log('\n✅ Final verification:');
    const finalState = await client.query(`
      SELECT 
        u.id,
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
    
    finalState.rows.forEach(row => {
      console.log(`  ${row.name} (${row.email}): ${row.current_role} -> Groups: [${row.user_groups.join(', ')}] (${row.all_permissions.length} permissions)`);
    });
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('📝 All users now have proper group assignments and consistent roles.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration().catch(console.error);
