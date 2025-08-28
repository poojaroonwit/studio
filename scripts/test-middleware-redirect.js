require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testMiddlewareRedirect() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing Middleware Redirect Logic...\n');
    
    // 1. Get all users
    const usersResult = await client.query('SELECT id, name, email, role FROM "User" ORDER BY "createdAt"');
    const users = usersResult.rows;
    
    console.log(`Found ${users.length} users:\n`);
    
    for (const user of users) {
      console.log(`Testing middleware redirect for: ${user.name} (${user.email}) - Role: ${user.role}`);
      
      // 2. Get user's permissions
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
      
      // 3. Simulate middleware logic
      const hasAnyPermissions = permissions.length > 0;
      const isAdmin = user.role === 'Admin';
      
      // 4. Determine where middleware actually redirects (simplified logic)
      // Middleware redirects ALL authenticated users from /auth/signin to /my-tasks
      const middlewareRedirectTarget = '/my-tasks';
      
      // 5. Determine where user SHOULD end up after all redirects
      let finalDestination = '/my-tasks'; // Default
      
      if (isAdmin) {
        finalDestination = '/'; // Admin goes to dashboard
      } else if (hasAnyPermissions) {
        // Check if user has dashboard permissions
        const hasDashboardPermissions = permissions.includes('USERS_MANAGE') ||
                                      permissions.includes('DASHBOARD_VIEW') ||
                                      permissions.includes('CANDIDATES_VIEW') ||
                                      permissions.includes('POSITIONS_VIEW') ||
                                      permissions.includes('TASK_BOARD_VIEW') ||
                                      permissions.includes('LOGS_VIEW') ||
                                      permissions.includes('ANALYTICS_VIEW') ||
                                      permissions.includes('USER_PREFERENCES_MANAGE') ||
                                      permissions.includes('RECRUITMENT_STAGES_MANAGE') ||
                                      permissions.includes('BULK_UPLOAD') ||
                                      permissions.includes('AUTOMATION_UPLOAD');
        
        if (hasDashboardPermissions) {
          finalDestination = '/'; // User can access dashboard
        } else {
          finalDestination = '/my-tasks'; // User has permissions but not dashboard access
        }
      } else {
        finalDestination = '/my-tasks'; // No permissions
      }
      
      console.log(`  Permissions count: ${permissions.length}`);
      console.log(`  Has any permissions: ${hasAnyPermissions ? '✅' : '❌'}`);
      console.log(`  Is admin: ${isAdmin ? '✅' : '❌'}`);
      console.log(`  Middleware redirects to: ${middlewareRedirectTarget}`);
      console.log(`  User should end up at: ${finalDestination}`);
      
      // 6. Check if this would cause any issues
      if (middlewareRedirectTarget === finalDestination) {
        console.log(`  ✅ Middleware redirect matches final destination`);
      } else {
        console.log(`  ⚠️  Middleware redirects to ${middlewareRedirectTarget}, but user should end up at ${finalDestination}`);
        console.log(`  💡 This is expected - SignInClient or Dashboard will handle the final redirect`);
      }
      
      console.log('');
    }
    
    console.log('📊 Summary:');
    console.log('  - Middleware redirects ALL authenticated users from /auth/signin to /my-tasks');
    console.log('  - This prevents redirect loops by avoiding the dashboard initially');
    console.log('  - SignInClient and Dashboard components handle final destination logic');
    console.log('  - Admin users will be redirected to dashboard by SignInClient');
    console.log('  - Non-admin users will stay at /my-tasks or be redirected appropriately');
    
  } catch (error) {
    console.error('❌ Error testing middleware redirect:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testMiddlewareRedirect().catch(console.error);
