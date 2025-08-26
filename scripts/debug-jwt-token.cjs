const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function debugJWTToken() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Debugging JWT Token Structure...\n');
    
    // Get a user to test with
    const userResult = await client.query('SELECT id, name, email, role FROM "User" WHERE role = \'Recruiter\' LIMIT 1');
    const user = userResult.rows[0];
    
    if (!user) {
      console.log('❌ No Recruiter user found');
      return;
    }
    
    console.log(`Testing with user: ${user.name} (${user.email})`);
    
    // Get user's permissions
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
    
    console.log(`User permissions from database: ${JSON.stringify(permissions)}`);
    
    // Simulate what the JWT token should contain
    const mockTokenPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      modulePermissions: permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
    };
    
    console.log('\n📋 Mock JWT Token Payload:');
    console.log(JSON.stringify(mockTokenPayload, null, 2));
    
    // Test middleware logic
    console.log('\n🧪 Testing Middleware Logic:');
    
    const requiredPermissions = ['USERS_MANAGE', 'DASHBOARD_VIEW', 'CANDIDATES_VIEW', 'POSITIONS_VIEW', 'TASK_BOARD_VIEW', 'LOGS_VIEW'];
    
    console.log(`Required permissions for dashboard: ${JSON.stringify(requiredPermissions)}`);
    console.log(`User permissions: ${JSON.stringify(permissions)}`);
    
    const hasPermission = requiredPermissions.some(permission => 
      permissions.includes(permission)
    );
    
    console.log(`Has any required permission: ${hasPermission}`);
    console.log(`Has any permissions: ${permissions.length > 0}`);
    
    if (hasPermission) {
      console.log('✅ User should be able to access dashboard');
    } else if (permissions.length > 0) {
      console.log('⚠️  User has permissions but not dashboard-specific ones');
    } else {
      console.log('❌ User has no permissions at all');
    }
    
  } catch (error) {
    console.error('❌ Error debugging JWT token:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

debugJWTToken();
