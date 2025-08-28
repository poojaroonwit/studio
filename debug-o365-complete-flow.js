#!/usr/bin/env node

/**
 * Complete O365 Authentication Flow Debug Script
 * Tests the entire authentication pipeline from Azure AD to dashboard redirect
 */

const https = require('https');
const http = require('http');

// Configuration - Test locally since production is down
const BASE_URL = 'http://localhost:8021';
const TEST_EMAIL = 'jaroonwit.poo@qsncc.com';

console.log('🔍 O365 Authentication Flow Debug Script (Local)');
console.log('================================================\n');

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'O365-Debug-Script/1.0',
        'Accept': 'application/json, text/html, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          url: url
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testStep(stepName, testFunction) {
  console.log(`\n📋 Step: ${stepName}`);
  console.log('─'.repeat(50));
  
  try {
    const result = await testFunction();
    console.log(`✅ ${stepName} - SUCCESS`);
    return { success: true, result };
  } catch (error) {
    console.log(`❌ ${stepName} - FAILED`);
    console.log(`   Error: ${error.message || error.toString()}`);
    console.log(`   Details:`, error);
    return { success: false, error };
  }
}

async function main() {
  const results = {};

  // Step 1: Check if the application is accessible
  results.step1 = await testStep('Application Accessibility', async () => {
    const response = await makeRequest(`${BASE_URL}/`);
    if (response.statusCode !== 200) {
      throw new Error(`Expected 200, got ${response.statusCode}`);
    }
    return { statusCode: response.statusCode, hasNextAuth: response.data.includes('next-auth') };
  });

  // Step 2: Check NextAuth configuration
  results.step2 = await testStep('NextAuth Configuration', async () => {
    const response = await makeRequest(`${BASE_URL}/api/auth/providers`);
    if (response.statusCode !== 200) {
      throw new Error(`Expected 200, got ${response.statusCode}`);
    }
    const providers = JSON.parse(response.data);
    const hasAzureAD = providers['azure-ad'];
    if (!hasAzureAD) {
      throw new Error('Azure AD provider not configured');
    }
    return { providers, hasAzureAD };
  });

  // Step 3: Check Azure AD environment variables (via API)
  results.step3 = await testStep('Azure AD Environment Check', async () => {
    const response = await makeRequest(`${BASE_URL}/api/settings/system-settings`);
    if (response.statusCode !== 200) {
      throw new Error(`Expected 200, got ${response.statusCode}`);
    }
    const data = JSON.parse(response.data);
    const isConfigured = data.isAzureAdConfigured;
    if (!isConfigured) {
      throw new Error('Azure AD not configured in system settings');
    }
    return { isConfigured, settings: data };
  });

  // Step 4: Check sign-in page accessibility
  results.step4 = await testStep('Sign-in Page Accessibility', async () => {
    const response = await makeRequest(`${BASE_URL}/auth/signin`);
    if (response.statusCode !== 200) {
      throw new Error(`Expected 200, got ${response.statusCode}`);
    }
    const hasAzureButton = response.data.includes('Sign in with Microsoft') || 
                          response.data.includes('azure-ad');
    if (!hasAzureButton) {
      throw new Error('Azure AD sign-in button not found on sign-in page');
    }
    return { statusCode: response.statusCode, hasAzureButton };
  });

  // Step 5: Check current session status
  results.step5 = await testStep('Current Session Status', async () => {
    const response = await makeRequest(`${BASE_URL}/api/auth/session`);
    if (response.statusCode !== 200) {
      throw new Error(`Expected 200, got ${response.statusCode}`);
    }
    const session = JSON.parse(response.data);
    return { 
      hasSession: !!session.user, 
      user: session.user ? {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        hasPermissions: session.user.modulePermissions?.length > 0
      } : null
    };
  });

  // Step 6: Check middleware behavior
  results.step6 = await testStep('Middleware Protection', async () => {
    // Test accessing dashboard without session
    const response = await makeRequest(`${BASE_URL}/dashboard`);
    // Should redirect to sign-in or return 401/403
    const isProtected = response.statusCode === 302 || 
                       response.statusCode === 401 || 
                       response.statusCode === 403 ||
                       response.data.includes('signin');
    return { 
      statusCode: response.statusCode, 
      isProtected,
      redirectsToSignin: response.data.includes('signin') || response.headers.location?.includes('signin')
    };
  });

  // Step 7: Check database connectivity (via API)
  results.step7 = await testStep('Database Connectivity', async () => {
    const response = await makeRequest(`${BASE_URL}/api/users`);
    if (response.statusCode !== 200 && response.statusCode !== 401) {
      throw new Error(`Expected 200 or 401, got ${response.statusCode}`);
    }
    return { statusCode: response.statusCode, canConnect: true };
  });

  // Step 8: Check Azure AD user in database
  results.step8 = await testStep('Azure AD User Database Check', async () => {
    const response = await makeRequest(`${BASE_URL}/api/users/search?email=${encodeURIComponent(TEST_EMAIL)}`);
    if (response.statusCode !== 200 && response.statusCode !== 401) {
      throw new Error(`Expected 200 or 401, got ${response.statusCode}`);
    }
    if (response.statusCode === 200) {
      const data = JSON.parse(response.data);
      const user = data.users?.find(u => u.email === TEST_EMAIL);
      if (user) {
        return { 
          found: true, 
          user: {
            id: user.id,
            email: user.email,
            authenticationMethod: user.authentication_method,
            hasAzureOid: !!user.azure_oid
          }
        };
      }
    }
    return { found: false, statusCode: response.statusCode };
  });

  // Summary
  console.log('\n📊 SUMMARY');
  console.log('===========');
  
  const totalSteps = Object.keys(results).length;
  const successfulSteps = Object.values(results).filter(r => r.success).length;
  const failedSteps = totalSteps - successfulSteps;

  console.log(`Total Steps: ${totalSteps}`);
  console.log(`Successful: ${successfulSteps}`);
  console.log(`Failed: ${failedSteps}`);

  if (failedSteps > 0) {
    console.log('\n❌ FAILED STEPS:');
    Object.entries(results).forEach(([step, result]) => {
      if (!result.success) {
        console.log(`   Step ${step}: ${result.error.message}`);
      }
    });
  }

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (results.step5?.success && results.step5.result.hasSession) {
    console.log('   • User is already authenticated - try logging out first');
  }
  
  if (results.step6?.success && !results.step6.result.isProtected) {
    console.log('   • Dashboard is not properly protected by middleware');
  }
  
  if (results.step8?.success && !results.step8.result.found) {
    console.log('   • Azure AD user not found in database - may need to sign in first');
  }

  // Next steps
  console.log('\n🚀 NEXT STEPS:');
  console.log('   1. If user is already authenticated, sign out first');
  console.log('   2. Clear browser cookies and cache');
  console.log('   3. Try O365 login in incognito/private window');
  console.log('   4. Check browser console for JavaScript errors');
  console.log('   5. Verify Azure AD app registration redirect URIs');

  return results;
}

// Run the debug script
main().catch(console.error);
