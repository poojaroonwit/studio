require('dotenv').config();
const { Pool } = require('pg');

// Database configuration
console.log('Database URL:', process.env.DATABASE_URL);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function debugRecruiterPermissions() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Debugging Recruiter Permissions...\n');

    // 0. Check database info
    console.log('0. Database Info:');
    const dbInfo = await client.query(`SELECT current_database(), current_user`);
    console.log(`   Database: ${dbInfo.rows[0].current_database}`);
    console.log(`   User: ${dbInfo.rows[0].current_user}`);
    
    // Check what tables exist
    console.log('\n1. Available tables:');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (tables.rows.length === 0) {
      console.log('   ❌ No tables found in the database!');
      console.log('   This might mean the database is empty or not initialized.');
      return;
    }
    
    tables.rows.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });
    console.log('');

    // 2. Check all users with Recruiter role
    console.log('2. Users with Recruiter role:');
    const recruiterUsers = await client.query(`
      SELECT id, name, email, role, "module_permissions"
      FROM "User" 
      WHERE role = 'Recruiter'
      ORDER BY "createdAt"
    `);
    
    if (recruiterUsers.rows.length === 0) {
      console.log('   ❌ No users found with Recruiter role');
      return;
    }
    
    recruiterUsers.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.email})`);
      console.log(`      ID: ${user.id}`);
      console.log(`      Role: ${user.role}`);
      console.log(`      Module Permissions: ${JSON.stringify(user.modulePermissions || [])}`);
      console.log('');
    });

    // 2. Check User_UserGroup assignments for Recruiter users
    console.log('2. User Group Assignments:');
    for (const user of recruiterUsers.rows) {
      const groupAssignments = await client.query(`
        SELECT ug.name as group_name, ug.permissions as group_permissions
        FROM "User_UserGroup" uug
        JOIN "UserGroup" ug ON uug."groupId" = ug.id
        WHERE uug."userId" = $1
      `, [user.id]);
      
      console.log(`   User: ${user.name} (${user.email})`);
      if (groupAssignments.rows.length === 0) {
        console.log(`      ❌ No group assignments found!`);
      } else {
        groupAssignments.rows.forEach(group => {
          console.log(`      ✅ Group: ${group.group_name}`);
          console.log(`         Permissions: ${JSON.stringify(group.group_permissions)}`);
        });
      }
      console.log('');
    }

    // 3. Check what permissions should be merged
    console.log('3. Expected Merged Permissions:');
    for (const user of recruiterUsers.rows) {
      const mergedPermissions = await client.query(`
        SELECT array_agg(DISTINCT perm) AS group_permissions
        FROM (
          SELECT unnest(permissions) AS perm
          FROM "UserGroup" ug
          JOIN "User_UserGroup" uug ON ug.id = uug."groupId"
          WHERE uug."userId" = $1
        ) AS perms
      `, [user.id]);
      
      const permissions = mergedPermissions.rows[0]?.group_permissions || [];
      console.log(`   User: ${user.name} (${user.email})`);
      console.log(`      Expected Permissions: ${JSON.stringify(permissions)}`);
      
      // Check if they have the required dashboard permissions
      const hasCandidatesView = permissions.includes('CANDIDATES_VIEW');
      const hasPositionsView = permissions.includes('POSITIONS_VIEW');
      const hasDashboardView = permissions.includes('DASHBOARD_VIEW');
      const hasUsersManage = permissions.includes('USERS_MANAGE');
      
      console.log(`      CANDIDATES_VIEW: ${hasCandidatesView ? '✅' : '❌'}`);
      console.log(`      POSITIONS_VIEW: ${hasPositionsView ? '✅' : '❌'}`);
      console.log(`      DASHBOARD_VIEW: ${hasDashboardView ? '✅' : '❌'}`);
      console.log(`      USERS_MANAGE: ${hasUsersManage ? '✅' : '❌'}`);
      
      // Check if they can access dashboard
      const canAccessDashboard = hasUsersManage || hasDashboardView || hasCandidatesView || hasPositionsView;
      console.log(`      Can Access Dashboard: ${canAccessDashboard ? '✅' : '❌'}`);
      console.log('');
    }

    // 4. Check Recruiter group definition
    console.log('4. Recruiter Group Definition:');
    const recruiterGroup = await client.query(`
      SELECT id, name, description, permissions
      FROM "UserGroup"
      WHERE name = 'Recruiter'
    `);
    
    if (recruiterGroup.rows.length === 0) {
      console.log('   ❌ Recruiter group not found!');
    } else {
      const group = recruiterGroup.rows[0];
      console.log(`   Group ID: ${group.id}`);
      console.log(`   Name: ${group.name}`);
      console.log(`   Description: ${group.description}`);
      console.log(`   Permissions: ${JSON.stringify(group.permissions)}`);
    }
    console.log('');

    // 5. Check for any users without group assignments
    console.log('5. Users without Group Assignments:');
    const usersWithoutGroups = await client.query(`
      SELECT u.id, u.name, u.email, u.role
      FROM "User" u
      LEFT JOIN "User_UserGroup" uug ON u.id = uug."userId"
      WHERE uug."userId" IS NULL
      ORDER BY u."createdAt"
    `);
    
    if (usersWithoutGroups.rows.length === 0) {
      console.log('   ✅ All users have group assignments');
    } else {
      console.log('   ❌ Users without group assignments:');
      usersWithoutGroups.rows.forEach(user => {
        console.log(`      - ${user.name} (${user.email}) - Role: ${user.role}`);
      });
    }

  } catch (error) {
    console.error('Error debugging permissions:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the diagnostic
debugRecruiterPermissions().catch(console.error);
