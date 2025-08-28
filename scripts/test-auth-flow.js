require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testAuthFlow() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing Authentication Flow...\n');
    
    // 1. Check if we have any non-admin users
    const usersResult = await client.query('SELECT id, name, email, role FROM "User" ORDER BY "createdAt"');
    const users = usersResult.rows;
    
    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - Role: ${user.role}`);
    });
    console.log('');
    
    // 2. Check user group assignments
    console.log('Checking user group assignments:');
    for (const user of users) {
      const groupAssignmentsResult = await client.query(`
        SELECT ug.name as group_name, ug.id as group_id
        FROM "User_UserGroup" uug
        JOIN "UserGroup" ug ON uug."groupId" = ug.id
        WHERE uug."userId" = $1
      `, [user.id]);
      
      const groupAssignments = groupAssignmentsResult.rows;
      
      if (groupAssignments.length === 0) {
        console.log(`  ❌ ${user.name}: No group assignments`);
      } else {
        console.log(`  ✅ ${user.name}: ${groupAssignments.length} group(s)`);
        groupAssignments.forEach(group => {
          console.log(`    - ${group.group_name} (${group.group_id})`);
        });
      }
    }
    console.log('');
    
    // 3. Check permissions for each user
    console.log('Checking user permissions:');
    for (const user of users) {
      const permissionsResult = await client.query(`
        SELECT array_agg(DISTINCT perm) AS group_permissions
        FROM (
          SELECT unnest(permissions) AS perm
          FROM "UserGroup" ug
          JOIN "User_UserGroup" uug ON ug.id = uug."groupId"
          WHERE uug."userId" = $1
        ) AS perms
      `, [user.id]);
      
      const permissions = permissionsResult.rows[0]?.group_permissions || [];
      
      if (permissions.length === 0) {
        console.log(`  ❌ ${user.name}: No permissions`);
      } else {
        console.log(`  ✅ ${user.name}: ${permissions.length} permissions`);
        console.log(`    Permissions: ${JSON.stringify(permissions)}`);
      }
    }
    console.log('');
    
    // 4. Check if Recruiter group has DASHBOARD_VIEW permission
    console.log('Checking Recruiter group permissions:');
    const recruiterGroupResult = await client.query(`
      SELECT name, permissions
      FROM "UserGroup"
      WHERE id = '00000000-0000-0000-0000-000000000002'
    `);
    
    if (recruiterGroupResult.rows.length > 0) {
      const recruiterGroup = recruiterGroupResult.rows[0];
      console.log(`  Group: ${recruiterGroup.name}`);
      console.log(`  Permissions: ${JSON.stringify(recruiterGroup.permissions)}`);
      
      const hasDashboardView = recruiterGroup.permissions.includes('DASHBOARD_VIEW');
      console.log(`  Has DASHBOARD_VIEW: ${hasDashboardView ? '✅' : '❌'}`);
      
      if (!hasDashboardView) {
        console.log('  ⚠️  Recruiter group missing DASHBOARD_VIEW permission!');
      }
    } else {
      console.log('  ❌ Recruiter group not found!');
    }
    console.log('');
    
    // 5. Simulate what would happen during login
    console.log('Simulating login flow:');
    for (const user of users) {
      console.log(`\nTesting login for: ${user.name} (${user.email})`);
      
      // Check if user would have dashboard access
      const permissionsResult = await client.query(`
        SELECT array_agg(DISTINCT perm) AS group_permissions
        FROM (
          SELECT unnest(permissions) AS perm
          FROM "UserGroup" ug
          JOIN "User_UserGroup" uug ON ug.id = uug."groupId"
          WHERE uug."userId" = $1
        ) AS perms
      `, [user.id]);
      
      const permissions = permissionsResult.rows[0]?.group_permissions || [];
      
      const canViewDashboard = permissions.includes('USERS_MANAGE') ||
                              permissions.includes('DASHBOARD_VIEW') ||
                              permissions.includes('CANDIDATES_VIEW') ||
                              permissions.includes('POSITIONS_VIEW') ||
                              permissions.includes('TASK_BOARD_VIEW') ||
                              permissions.includes('LOGS_VIEW') ||
                              permissions.includes('ANALYTICS_VIEW') ||
                              permissions.includes('USER_PREFERENCES_MANAGE') ||
                              permissions.includes('RECRUITMENT_STAGES_MANAGE') ||
                              permissions.includes('BULK_UPLOAD') ||
                              permissions.includes('AUTOMATION_UPLOAD') ||
                              permissions.length > 0 ||
                              user.role === 'Admin';
      
      console.log(`  Role: ${user.role}`);
      console.log(`  Permissions count: ${permissions.length}`);
      console.log(`  Can view dashboard: ${canViewDashboard ? '✅' : '❌'}`);
      
      if (!canViewDashboard && user.role !== 'Admin') {
        console.log(`  ⚠️  This user would be redirected to /my-tasks`);
      } else if (canViewDashboard) {
        console.log(`  ✅ This user can access the dashboard`);
      }
    }
    
    console.log('\n📊 Summary:');
    console.log('  - Check if all users have proper group assignments');
    console.log('  - Check if Recruiter group has DASHBOARD_VIEW permission');
    console.log('  - Non-admin users without dashboard permissions will be redirected to /my-tasks');
    
  } catch (error) {
    console.error('❌ Error testing auth flow:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testAuthFlow().catch(console.error);
