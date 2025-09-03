const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'studio2',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function testPermissions() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testing permission system...\n');
    
    // Test 1: Check if User_UserGroup table exists and has data
    console.log('1. Checking User_UserGroup table...');
    const userGroupResult = await client.query(`
      SELECT COUNT(*) as count FROM "User_UserGroup"
    `);
    console.log(`   Found ${userGroupResult.rows[0].count} user-group assignments\n`);
    
    // Test 2: Check a specific user's permissions using the new approach
    console.log('2. Testing new permission fetching approach...');
    const testUserResult = await client.query(`
      SELECT u.id, u.name, u.email, u.role
      FROM "User" u
      LIMIT 1
    `);
    
    if (testUserResult.rows.length > 0) {
      const testUser = testUserResult.rows[0];
      console.log(`   Testing with user: ${testUser.name} (${testUser.email}) - Role: ${testUser.role}`);
      
      // Get permissions using the new approach
      const permissionsResult = await client.query(`
        SELECT DISTINCT unnest(ug.permissions) AS permission
        FROM "User" u
        JOIN "User_UserGroup" uug ON u.id = uug."userId"
        JOIN "UserGroup" ug ON uug."groupId" = ug.id
        WHERE u.id = $1
      `, [testUser.id]);
      
      const permissions = permissionsResult.rows.map(row => row.permission);
      console.log(`   User has ${permissions.length} permissions:`, permissions);
      
      // Check if user has task board access
      const hasTaskBoardView = permissions.includes('TASK_BOARD_VIEW');
      const hasCandidatesView = permissions.includes('CANDIDATES_VIEW');
      console.log(`   Has TASK_BOARD_VIEW: ${hasTaskBoardView}`);
      console.log(`   Has CANDIDATES_VIEW: ${hasCandidatesView}`);
      console.log(`   Can access task board: ${hasTaskBoardView || hasCandidatesView}\n`);
    }
    
    // Test 3: Check old vs new approach
    console.log('3. Comparing old vs new permission approach...');
    const oldApproachResult = await client.query(`
      SELECT ug.permissions AS group_permissions
      FROM "User" u
      LEFT JOIN "UserGroup" ug ON u."userGroupId" = ug.id
      WHERE u.id = $1
    `, [testUserResult.rows[0]?.id]);
    
    const oldPermissions = oldApproachResult.rows[0]?.group_permissions || [];
    console.log(`   Old approach permissions: ${oldPermissions.length} permissions`);
    console.log(`   New approach permissions: ${permissions.length} permissions`);
    console.log(`   Permissions match: ${JSON.stringify(oldPermissions.sort()) === JSON.stringify(permissions.sort())}\n`);
    
    // Test 4: Check user groups
    console.log('4. Checking user group assignments...');
    const userGroupsResult = await client.query(`
      SELECT 
        u.name as userName,
        array_agg(ug.name) as groupNames,
        array_agg(DISTINCT unnest(ug.permissions)) as allPermissions
      FROM "User" u
      JOIN "User_UserGroup" uug ON u.id = uug."userId"
      JOIN "UserGroup" ug ON uug."groupId" = ug.id
      GROUP BY u.id, u.name
      LIMIT 5
    `);
    
    console.log('   User group assignments:');
    userGroupsResult.rows.forEach(row => {
      console.log(`     ${row.userName}: ${row.groupNames.join(', ')} (${row.allPermissions.length} permissions)`);
    });
    
  } catch (error) {
    console.error('❌ Error testing permissions:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the test
testPermissions().catch(console.error);
