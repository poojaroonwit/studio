#!/usr/bin/env node

/**
 * Debug script for O365/Azure AD authentication issues
 * This script helps identify common problems with O365 login
 */

const { Pool } = require('pg');
require('dotenv').config();

async function debugO365Auth() {
  console.log('🔍 O365/Azure AD Authentication Debug Tool\n');

  // Check environment variables
  console.log('1. Environment Variables Check:');
  const requiredVars = [
    'AZURE_AD_CLIENT_ID',
    'AZURE_AD_CLIENT_SECRET', 
    'AZURE_AD_TENANT_ID',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ];

  let configIssues = 0;
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value || value.includes('your_') || value === '') {
      console.log(`   ❌ ${varName}: Not configured or using placeholder`);
      configIssues++;
    } else {
      console.log(`   ✅ ${varName}: Configured`);
    }
  });

  if (configIssues > 0) {
    console.log(`\n⚠️  Found ${configIssues} configuration issues. Please check your environment variables.`);
  } else {
    console.log('\n✅ All required environment variables are configured.');
  }

  // Check database connection
  console.log('\n2. Database Connection Check:');
  let pool;
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
    
    const client = await pool.connect();
    console.log('   ✅ Database connection successful');
    client.release();
  } catch (error) {
    console.log('   ❌ Database connection failed:', error.message);
    return;
  }

  // Check Azure AD users in database
  console.log('\n3. Azure AD Users Check:');
  try {
    const client = await pool.connect();
    
    // Check for users with azure_oid
    const azureUsers = await client.query('SELECT id, name, email, "azure_oid", role FROM "User" WHERE "azure_oid" IS NOT NULL');
    console.log(`   Found ${azureUsers.rows.length} Azure AD users:`);
    
    if (azureUsers.rows.length === 0) {
      console.log('   ⚠️  No Azure AD users found in database');
    } else {
      azureUsers.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name} (${user.email}) - Role: ${user.role} - OID: ${user.azure_oid}`);
      });
    }

    // Check for users with azure authentication method
    const azureAuthUsers = await client.query('SELECT id, name, email, "authentication_method", role FROM "User" WHERE "authentication_method" = \'azure\'');
    console.log(`\n   Found ${azureAuthUsers.rows.length} users with Azure authentication method:`);
    
    if (azureAuthUsers.rows.length === 0) {
      console.log('   ⚠️  No users with Azure authentication method found');
    } else {
      azureAuthUsers.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name} (${user.email}) - Role: ${user.role}`);
      });
    }

    // Check Account table for Azure AD entries
    const azureAccounts = await client.query('SELECT * FROM "Account" WHERE provider = \'azure-ad\'');
    console.log(`\n   Found ${azureAccounts.rows.length} Azure AD account entries:`);
    
    if (azureAccounts.rows.length === 0) {
      console.log('   ⚠️  No Azure AD account entries found');
    } else {
      azureAccounts.rows.forEach((account, index) => {
        console.log(`   ${index + 1}. Provider: ${account.provider} - Account ID: ${account.providerAccountId} - User ID: ${account.userId}`);
      });
    }

    client.release();
  } catch (error) {
    console.log('   ❌ Error checking Azure AD users:', error.message);
  }

  // Check user permissions
  console.log('\n4. User Permissions Check:');
  try {
    const client = await pool.connect();
    
    // Check for users without permissions
    const usersWithoutPermissions = await client.query(`
      SELECT u.id, u.name, u.email, u.role, 
             COUNT(ug."groupId") as group_count
      FROM "User" u
      LEFT JOIN "User_UserGroup" ug ON u.id = ug."userId"
      WHERE u."authentication_method" = 'azure' OR u."azure_oid" IS NOT NULL
      GROUP BY u.id, u.name, u.email, u.role
      HAVING COUNT(ug."groupId") = 0
    `);

    console.log(`   Found ${usersWithoutPermissions.rows.length} Azure AD users without groups:`);
    
    if (usersWithoutPermissions.rows.length > 0) {
      usersWithoutPermissions.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name} (${user.email}) - Role: ${user.role} - Groups: ${user.group_count}`);
      });
      console.log('   ⚠️  Users without groups may have login issues');
    } else {
      console.log('   ✅ All Azure AD users have groups');
    }

    client.release();
  } catch (error) {
    console.log('   ❌ Error checking user permissions:', error.message);
  }

  // Summary and recommendations
  console.log('\n5. Summary and Recommendations:');
  console.log('   • Check browser console for authentication errors');
  console.log('   • Verify Azure AD app registration settings');
  console.log('   • Ensure redirect URIs are configured correctly');
  console.log('   • Check if users exist in database with correct Azure OID');
  console.log('   • Verify user permissions are assigned correctly');
  console.log('   • Check network connectivity to Azure AD endpoints');

  await pool.end();
}

// Run the debug script
debugO365Auth().catch(console.error);
