#!/usr/bin/env node

/**
 * Debug script for production authentication issues
 * This script helps identify problems with O365 authentication in production
 */

const { Pool } = require('pg');
require('dotenv').config();

async function debugProductionAuth() {
  console.log('🔍 Production Authentication Debug Tool\n');

  // Check production environment variables
  console.log('1. Production Environment Check:');
  const productionVars = [
    'NODE_ENV',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'AZURE_AD_CLIENT_ID',
    'AZURE_AD_CLIENT_SECRET',
    'AZURE_AD_TENANT_ID',
    'DATABASE_URL'
  ];

  let configIssues = 0;
  productionVars.forEach(varName => {
    const value = process.env[varName];
    if (!value || value.includes('your_') || value === '') {
      console.log(`   ❌ ${varName}: Not configured`);
      configIssues++;
    } else {
      console.log(`   ✅ ${varName}: Configured`);
    }
  });

  if (configIssues > 0) {
    console.log(`\n⚠️  Found ${configIssues} configuration issues.`);
  } else {
    console.log('\n✅ All production environment variables are configured.');
  }

  // Check database connection
  console.log('\n2. Production Database Connection Check:');
  let pool;
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
    
    const client = await pool.connect();
    console.log('   ✅ Database connection successful');
    
    // Check for users
    const usersResult = await client.query('SELECT id, name, email, role, "authentication_method", "azure_oid" FROM "User" LIMIT 10');
    console.log(`\n   📊 Found ${usersResult.rows.length} users in database:`);
    
    if (usersResult.rows.length === 0) {
      console.log('   ❌ No users found in database');
    } else {
      usersResult.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name} (${user.email}) - Role: ${user.role} - Auth: ${user.authentication_method || 'password'} - Azure OID: ${user.azure_oid || 'N/A'}`);
      });
    }

    // Check for Azure AD accounts
    const azureAccountsResult = await client.query('SELECT provider, COUNT(*) as count FROM "Account" WHERE provider = \'azure-ad\' GROUP BY provider');
    console.log(`\n   🔗 Azure AD accounts: ${azureAccountsResult.rows.length > 0 ? azureAccountsResult.rows[0].count : 0}`);

    client.release();
  } catch (error) {
    console.log('   ❌ Database connection failed:', error.message);
    return;
  }

  // Check Azure AD configuration
  console.log('\n3. Azure AD Configuration Check:');
  const azureClientId = process.env.AZURE_AD_CLIENT_ID;
  const azureTenantId = process.env.AZURE_AD_TENANT_ID;
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  
  console.log(`   Azure Client ID: ${azureClientId ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   Azure Tenant ID: ${azureTenantId ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   NextAuth URL: ${nextAuthUrl ? '✅ Configured' : '❌ Missing'}`);
  
  if (nextAuthUrl && azureClientId && azureTenantId) {
    console.log(`\n   🔗 Expected Azure AD redirect URI: ${nextAuthUrl}/api/auth/callback/azure-ad`);
    console.log('   💡 Make sure this URI is configured in your Azure AD app registration');
  }

  // Check for common production issues
  console.log('\n4. Common Production Issues Check:');
  
  // Check if NEXTAUTH_URL matches the actual domain
  const currentDomain = process.env.NEXTAUTH_URL;
  if (currentDomain && !currentDomain.includes('dev-ncc-cv-screening.qsncc.com')) {
    console.log('   ⚠️  NEXTAUTH_URL might not match your actual domain');
  }
  
  // Check for HTTPS
  if (currentDomain && !currentDomain.startsWith('https://')) {
    console.log('   ⚠️  NEXTAUTH_URL should use HTTPS in production');
  }

  // Summary and recommendations
  console.log('\n5. Summary and Recommendations:');
  console.log('   Production Authentication Issues:');
  console.log('   • Azure AD app registration redirect URI mismatch');
  console.log('   • Network connectivity to Azure AD endpoints');
  console.log('   • Session cookie domain issues');
  console.log('   • HTTPS/SSL certificate issues');
  
  console.log('\n   To fix production authentication:');
  console.log('   1. Verify Azure AD app registration redirect URI');
  console.log('   2. Check network connectivity to Azure AD');
  console.log('   3. Verify SSL certificate is valid');
  console.log('   4. Check browser console for authentication errors');
  console.log('   5. Verify session cookies are being set correctly');

  if (pool) {
    await pool.end();
  }
}

// Run the debug script
debugProductionAuth().catch(console.error);
