#!/usr/bin/env node

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

/**
 * Fix users with null passwords and check for other potential issues
 */
async function fixAzureUsers() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🔍 Checking for user data issues...');
  console.log(`📊 Database URL: ${databaseUrl.replace(/\/\/.*@/, '//***:***@')}`);

  const pool = new Pool({ connectionString: databaseUrl });
  
  try {
    const client = await pool.connect();
    
    // Check for users with null passwords
    const nullPasswordQuery = `
      SELECT id, name, email, "authentication_method", "createdAt"
      FROM "User" 
      WHERE password IS NULL OR password = ''
      ORDER BY "createdAt" DESC;
    `;
    
    const nullPasswordResult = await client.query(nullPasswordQuery);
    const usersWithNullPassword = nullPasswordResult.rows;
    
    console.log(`\n📋 Found ${usersWithNullPassword.length} users with null/empty passwords:`);
    
    if (usersWithNullPassword.length === 0) {
      console.log('   ✅ No users with null passwords found');
    } else {
      usersWithNullPassword.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - ${user.authentication_method || 'basic'}`);
      });
    }
    
    // Check for Azure users specifically
    const azureUsersQuery = `
      SELECT id, name, email, password, "authentication_method", "createdAt"
      FROM "User" 
      WHERE "authentication_method" = 'azure'
      ORDER BY "createdAt" DESC;
    `;
    
    const azureUsersResult = await client.query(azureUsersQuery);
    const azureUsers = azureUsersResult.rows;
    
    console.log(`\n🔐 Found ${azureUsers.length} Azure users:`);
    azureUsers.forEach(user => {
      const hasPassword = user.password && user.password.trim() !== '';
      console.log(`   - ${user.name} (${user.email}) - Password: ${hasPassword ? '✅ Set' : '❌ Missing'}`);
    });
    
    // Check for users with null modulePermissions
    const nullPermissionsQuery = `
      SELECT id, name, email, "modulePermissions", "createdAt"
      FROM "User" 
      WHERE "modulePermissions" IS NULL
      ORDER BY "createdAt" DESC;
    `;
    
    const nullPermissionsResult = await client.query(nullPermissionsQuery);
    const usersWithNullPermissions = nullPermissionsResult.rows;
    
    console.log(`\n📋 Found ${usersWithNullPermissions.length} users with null modulePermissions:`);
    if (usersWithNullPermissions.length > 0) {
      usersWithNullPermissions.forEach(user => {
        console.log(`   - ${user.name} (${user.email})`);
      });
    }
    
    // Check for orphaned user groups
    const orphanedGroupsQuery = `
      SELECT uug."userId", uug."groupId", u.name as user_name, g.name as group_name
      FROM "User_UserGroup" uug
      LEFT JOIN "User" u ON uug."userId" = u.id
      LEFT JOIN "UserGroup" g ON uug."groupId" = g.id
      WHERE u.id IS NULL OR g.id IS NULL;
    `;
    
    const orphanedGroupsResult = await client.query(orphanedGroupsQuery);
    const orphanedGroups = orphanedGroupsResult.rows;
    
    console.log(`\n📋 Found ${orphanedGroups.length} orphaned user group relationships:`);
    if (orphanedGroups.length > 0) {
      orphanedGroups.forEach(orphan => {
        console.log(`   - User: ${orphan.user_name || 'DELETED'} (${orphan.userId}) - Group: ${orphan.group_name || 'DELETED'} (${orphan.groupId})`);
      });
    }
    
    // Fix users with null passwords
    if (usersWithNullPassword.length > 0) {
      console.log('\n🔧 Fixing users with null passwords...');
      
      for (const user of usersWithNullPassword) {
        try {
          // Generate a secure placeholder password for Azure users
          const placeholderPassword = await bcrypt.hash(`azure-placeholder-${Date.now()}-${user.id}`, 10);
          
          const updateQuery = `
            UPDATE "User" 
            SET password = $1, "updatedAt" = NOW()
            WHERE id = $2;
          `;
          
          await client.query(updateQuery, [placeholderPassword, user.id]);
          
          console.log(`   ✅ Fixed password for ${user.name} (${user.email})`);
          
        } catch (error) {
          console.error(`   ❌ Failed to fix password for ${user.name} (${user.email}):`, error.message);
        }
      }
    }
    
    // Fix users with null modulePermissions
    if (usersWithNullPermissions.length > 0) {
      console.log('\n🔧 Fixing users with null modulePermissions...');
      
      for (const user of usersWithNullPermissions) {
        try {
          const updateQuery = `
            UPDATE "User" 
            SET "modulePermissions" = '{}', "updatedAt" = NOW()
            WHERE id = $1;
          `;
          
          await client.query(updateQuery, [user.id]);
          
          console.log(`   ✅ Fixed modulePermissions for ${user.name} (${user.email})`);
          
        } catch (error) {
          console.error(`   ❌ Failed to fix modulePermissions for ${user.name} (${user.email}):`, error.message);
        }
      }
    }
    
    // Clean up orphaned user groups
    if (orphanedGroups.length > 0) {
      console.log('\n🔧 Cleaning up orphaned user group relationships...');
      
      try {
        const cleanupQuery = `
          DELETE FROM "User_UserGroup" uug
          WHERE uug."userId" NOT IN (SELECT id FROM "User")
          OR uug."groupId" NOT IN (SELECT id FROM "UserGroup");
        `;
        
        await client.query(cleanupQuery);
        
        console.log(`   ✅ Cleaned up ${orphanedGroups.length} orphaned user group relationships`);
        
      } catch (error) {
        console.error(`   ❌ Failed to cleanup orphaned user groups:`, error.message);
      }
    }
    
    // Test the user fetching query that's failing
    console.log('\n🧪 Testing user fetching query...');
    try {
      const testQuery = `
        SELECT u.*, 
               json_agg(json_build_object('id', g.id, 'name', g.name)) FILTER (WHERE g.id IS NOT NULL) as groups
        FROM "User" u
        LEFT JOIN "User_UserGroup" uug ON u.id = uug."userId"
        LEFT JOIN "UserGroup" g ON uug."groupId" = g.id
        GROUP BY u.id
        ORDER BY u.name ASC;
      `;
      
      const testResult = await client.query(testQuery);
      console.log(`   ✅ User fetching query works - found ${testResult.rows.length} users`);
      
    } catch (error) {
      console.error(`   ❌ User fetching query failed:`, error.message);
      console.error(`   Error details:`, error);
    }
    
    client.release();
    
    console.log('\n✅ User data check and fix completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Restart your application: npm run dev');
    console.log('2. Try accessing the users page again');
    console.log('3. The error should now be resolved');
    
  } catch (error) {
    console.error('❌ Error fixing user data:', error.message);
    console.log('\n🔍 Troubleshooting:');
    console.log('1. Ensure PostgreSQL is running');
    console.log('2. Verify DATABASE_URL is correct');
    console.log('3. Check if the database exists');
    console.log('4. Ensure the user has proper permissions');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the fix
fixAzureUsers().catch(console.error); 