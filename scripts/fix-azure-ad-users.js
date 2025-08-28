const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/studio_production',
});

async function fixAzureADUsers() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Azure AD User Fix Tool\n');
    
    // 1. Find all Azure AD users
    const azureUsers = await client.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u."authentication_method",
        u."azure_oid"
      FROM "User" u
      WHERE u."authentication_method" = 'azure'
    `);
    
    if (azureUsers.rows.length === 0) {
      console.log('No Azure AD users found.');
      return;
    }
    
    console.log(`Found ${azureUsers.rows.length} Azure AD user(s) to fix.\n`);
    
    let fixedCount = 0;
    
    for (const user of azureUsers.rows) {
      console.log(`🔧 Fixing user: ${user.name} (${user.email})`);
      let userFixed = false;
      
      // 1. Fix role if missing
      if (!user.role || user.role === '') {
        try {
          await client.query(`
            UPDATE "User" 
            SET role = 'Recruiter' 
            WHERE id = $1
          `, [user.id]);
          console.log(`   ✅ Fixed role: set to 'Recruiter'`);
          userFixed = true;
        } catch (error) {
          console.log(`   ❌ Failed to fix role: ${error.message}`);
        }
      }
      
      // 2. Check and fix group assignment
      const groupAssignments = await client.query(`
        SELECT ug.id, ug.name
        FROM "User_UserGroup" uug
        JOIN "UserGroup" ug ON uug."groupId" = ug.id
        WHERE uug."userId" = $1
      `, [user.id]);
      
      if (groupAssignments.rows.length === 0) {
        try {
          // Assign to Recruiter group
          await client.query(`
            INSERT INTO "User_UserGroup" ("userId", "groupId") 
            VALUES ($1, '00000000-0000-0000-0000-000000000002') 
            ON CONFLICT ("userId", "groupId") DO NOTHING
          `, [user.id]);
          console.log(`   ✅ Fixed group assignment: assigned to Recruiter group`);
          userFixed = true;
        } catch (error) {
          console.log(`   ❌ Failed to assign to group: ${error.message}`);
        }
      } else {
        console.log(`   ✅ Group assignment: ${groupAssignments.rows.map(g => g.name).join(', ')}`);
      }
      
      // 3. Verify permissions are working
      const permissions = await client.query(`
        SELECT array_agg(DISTINCT perm) AS group_permissions
        FROM (
          SELECT unnest(permissions) AS perm
          FROM "UserGroup" ug
          JOIN "User_UserGroup" uug ON ug.id = uug."groupId"
          WHERE uug."userId" = $1
        ) AS perms
      `, [user.id]);
      
      const userPermissions = permissions.rows[0]?.group_permissions || [];
      if (userPermissions.length === 0) {
        console.log(`   ❌ No permissions found after fix attempt`);
      } else {
        console.log(`   ✅ Permissions: ${userPermissions.length} permissions found`);
        userFixed = true;
      }
      
      if (userFixed) {
        fixedCount++;
      }
      
      console.log('');
    }
    
    console.log(`✅ Fix complete! Fixed ${fixedCount} out of ${azureUsers.rows.length} users.\n`);
    
    // Final verification
    console.log('🔍 Final Verification:');
    for (const user of azureUsers.rows) {
      const finalCheck = await client.query(`
        SELECT 
          u.role,
          array_agg(DISTINCT ug.name) as groups,
          array_agg(DISTINCT perm) as permissions
        FROM "User" u
        LEFT JOIN "User_UserGroup" uug ON u.id = uug."userId"
        LEFT JOIN "UserGroup" ug ON uug."groupId" = ug.id
        LEFT JOIN LATERAL unnest(ug.permissions) AS perm ON true
        WHERE u.id = $1
        GROUP BY u.role
      `, [user.id]);
      
      const result = finalCheck.rows[0];
      const hasPermissions = result?.permissions && result.permissions.length > 0;
      const status = hasPermissions ? '✅' : '❌';
      
      console.log(`${status} ${user.name} (${user.email}):`);
      console.log(`   Role: ${result?.role || 'None'}`);
      console.log(`   Groups: ${JSON.stringify(result?.groups || [])}`);
      console.log(`   Permissions: ${result?.permissions?.length || 0} permissions`);
      console.log('');
    }
    
    console.log('📋 Next Steps:');
    console.log('1. Users should log out and log back in to refresh their session');
    console.log('2. If issues persist, check the browser console for errors');
    console.log('3. Verify Azure AD configuration in environment variables');
    
  } catch (error) {
    console.error('❌ Error during fix:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixAzureADUsers().catch(console.error);
