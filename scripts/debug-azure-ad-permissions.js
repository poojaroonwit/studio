const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/studio_production',
});

async function debugAzureADPermissions() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Azure AD Permission Diagnostic Tool\n');
    
    // 1. Check all Azure AD users
    console.log('1. Azure AD Users:');
    const azureUsers = await client.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u."authentication_method",
        u."azure_oid",
        u."createdAt"
      FROM "User" u
      WHERE u."authentication_method" = 'azure'
      ORDER BY u."createdAt" DESC
    `);
    
    if (azureUsers.rows.length === 0) {
      console.log('   ❌ No Azure AD users found!');
      return;
    }
    
    console.log(`   Found ${azureUsers.rows.length} Azure AD user(s):`);
    azureUsers.rows.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - Role: ${user.role}`);
    });
    console.log('');
    
    // 2. Check User Group assignments for Azure AD users
    console.log('2. User Group Assignments:');
    for (const user of azureUsers.rows) {
      const groupAssignments = await client.query(`
        SELECT ug.id, ug.name as group_name, ug.permissions as group_permissions
        FROM "User_UserGroup" uug
        JOIN "UserGroup" ug ON uug."groupId" = ug.id
        WHERE uug."userId" = $1
      `, [user.id]);
      
      console.log(`   User: ${user.name} (${user.email})`);
      if (groupAssignments.rows.length === 0) {
        console.log(`      ❌ No group assignments found!`);
        console.log(`      🔧 Attempting to fix...`);
        
        // Try to assign to Recruiter group
        try {
          await client.query(`
            INSERT INTO "User_UserGroup" ("userId", "groupId") 
            VALUES ($1, '00000000-0000-0000-0000-000000000002') 
            ON CONFLICT ("userId", "groupId") DO NOTHING
          `, [user.id]);
          console.log(`      ✅ Assigned to Recruiter group`);
        } catch (error) {
          console.log(`      ❌ Failed to assign to Recruiter group: ${error.message}`);
        }
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
    for (const user of azureUsers.rows) {
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
      if (permissions.length === 0) {
        console.log(`      ❌ No permissions found!`);
      } else {
        console.log(`      ✅ Permissions: ${JSON.stringify(permissions)}`);
      }
      console.log('');
    }
    
    // 4. Check for any orphaned Azure AD users without proper role
    console.log('4. Role Validation:');
    for (const user of azureUsers.rows) {
      if (!user.role || user.role === '') {
        console.log(`   User: ${user.name} (${user.email})`);
        console.log(`      ❌ No role assigned!`);
        console.log(`      🔧 Attempting to fix...`);
        
        try {
          await client.query(`
            UPDATE "User" 
            SET role = 'Recruiter' 
            WHERE id = $1
          `, [user.id]);
          console.log(`      ✅ Role set to 'Recruiter'`);
        } catch (error) {
          console.log(`      ❌ Failed to set role: ${error.message}`);
        }
        console.log('');
      }
    }
    
    // 5. Check for missing Account entries
    console.log('5. Account Entries:');
    for (const user of azureUsers.rows) {
      const accountEntries = await client.query(`
        SELECT * FROM "Account" 
        WHERE "userId" = $1 AND provider = 'azure-ad'
      `, [user.id]);
      
      console.log(`   User: ${user.name} (${user.email})`);
      if (accountEntries.rows.length === 0) {
        console.log(`      ❌ No Azure AD account entry found!`);
      } else {
        console.log(`      ✅ Account entry found`);
      }
      console.log('');
    }
    
    console.log('✅ Diagnostic complete!');
    console.log('\n📋 Summary:');
    console.log(`- Total Azure AD users: ${azureUsers.rows.length}`);
    
    // Final verification
    console.log('\n🔍 Final Verification:');
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
      console.log(`   ${user.name} (${user.email}):`);
      console.log(`      Role: ${result?.role || 'None'}`);
      console.log(`      Groups: ${JSON.stringify(result?.groups || [])}`);
      console.log(`      Permissions: ${JSON.stringify(result?.permissions || [])}`);
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error during diagnostic:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the diagnostic
debugAzureADPermissions().catch(console.error);
