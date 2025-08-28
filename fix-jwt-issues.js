#!/usr/bin/env node

/**
 * Fix script for JWT and O365 authentication issues
 * This script helps fix common JWT configuration problems
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function fixJWTIssues() {
  console.log('🔧 JWT and O365 Authentication Fix Tool\n');

  // Check if .env file exists
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found. Please create one first.');
    return;
  }

  console.log('1. Fixing NEXTAUTH_SECRET...');
  
  // Read current .env file
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check if NEXTAUTH_SECRET needs to be updated
  if (envContent.includes('your-local-development-secret-key-change-this')) {
    try {
      // Generate a secure secret
      const newSecret = execSync('openssl rand -base64 32', { encoding: 'utf8' }).trim();
      
      // Replace the placeholder secret
      envContent = envContent.replace(
        'NEXTAUTH_SECRET=your-local-development-secret-key-change-this',
        `NEXTAUTH_SECRET=${newSecret}`
      );
      
      console.log('   ✅ Generated and set secure NEXTAUTH_SECRET');
    } catch (error) {
      console.log('   ⚠️  Could not generate secret with openssl, using fallback method');
      // Fallback: use a secure random string
      const fallbackSecret = require('crypto').randomBytes(32).toString('base64');
      envContent = envContent.replace(
        'NEXTAUTH_SECRET=your-local-development-secret-key-change-this',
        `NEXTAUTH_SECRET=${fallbackSecret}`
      );
      console.log('   ✅ Generated and set secure NEXTAUTH_SECRET (fallback method)');
    }
  } else {
    console.log('   ✅ NEXTAUTH_SECRET already configured');
  }

  console.log('\n2. Azure AD Configuration Instructions:');
  console.log('   To enable O365 authentication, you need to:');
  console.log('   1. Create an Azure AD app registration in Azure Portal');
  console.log('   2. Get the Client ID, Client Secret, and Tenant ID');
  console.log('   3. Configure redirect URIs: http://localhost:8021/api/auth/callback/azure-ad');
  console.log('   4. Uncomment and update the Azure AD variables in your .env file:');
  console.log('');
  console.log('   AZURE_AD_CLIENT_ID=your_actual_client_id');
  console.log('   AZURE_AD_CLIENT_SECRET=your_actual_client_secret');
  console.log('   AZURE_AD_TENANT_ID=your_actual_tenant_id');
  console.log('   NEXT_PUBLIC_AZURE_AD_CLIENT_ID=your_actual_client_id');
  console.log('   NEXT_PUBLIC_AZURE_AD_TENANT_ID=your_actual_tenant_id');

  // Check if Azure AD variables are commented out
  const azureVars = [
    'AZURE_AD_CLIENT_ID',
    'AZURE_AD_CLIENT_SECRET', 
    'AZURE_AD_TENANT_ID',
    'NEXT_PUBLIC_AZURE_AD_CLIENT_ID',
    'NEXT_PUBLIC_AZURE_AD_TENANT_ID'
  ];

  console.log('\n3. Current Azure AD Configuration Status:');
  azureVars.forEach(varName => {
    if (envContent.includes(`# ${varName}=`)) {
      console.log(`   ❌ ${varName}: Commented out`);
    } else if (envContent.includes(`${varName}=your_`)) {
      console.log(`   ❌ ${varName}: Using placeholder value`);
    } else if (envContent.includes(`${varName}=`)) {
      console.log(`   ✅ ${varName}: Configured`);
    } else {
      console.log(`   ❌ ${varName}: Not found`);
    }
  });

  // Write updated .env file
  fs.writeFileSync(envPath, envContent);
  
  console.log('\n4. Environment file updated successfully!');
  console.log('   Next steps:');
  console.log('   1. Configure Azure AD environment variables as shown above');
  console.log('   2. Restart your application');
  console.log('   3. Test O365 authentication');
  
  console.log('\n5. Additional troubleshooting:');
  console.log('   • Check browser console for authentication errors');
  console.log('   • Verify Azure AD app registration settings');
  console.log('   • Ensure redirect URIs are configured correctly');
  console.log('   • Check network connectivity to Azure AD endpoints');
  
  console.log('\n6. Run these commands to test:');
  console.log('   node debug-jwt-issues.js    # Check JWT configuration');
  console.log('   node debug-o365-auth.js     # Check O365 authentication');
}

// Run the fix script
fixJWTIssues();
