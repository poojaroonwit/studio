#!/usr/bin/env node

/**
 * Debug script for JWT and authentication issues
 * This script helps identify JWT-related problems that could affect O365 login
 */

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function debugJWTIssues() {
  console.log('🔍 JWT and Authentication Debug Tool\n');

  // Check JWT-related environment variables
  console.log('1. JWT Environment Variables Check:');
  const jwtVars = [
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'AZURE_AD_CLIENT_ID',
    'AZURE_AD_CLIENT_SECRET',
    'AZURE_AD_TENANT_ID'
  ];

  let jwtIssues = 0;
  jwtVars.forEach(varName => {
    const value = process.env[varName];
    if (!value || value.includes('your_') || value === '') {
      console.log(`   ❌ ${varName}: Not configured or using placeholder`);
      jwtIssues++;
    } else {
      console.log(`   ✅ ${varName}: Configured`);
    }
  });

  if (jwtIssues > 0) {
    console.log(`\n⚠️  Found ${jwtIssues} JWT configuration issues.`);
  } else {
    console.log('\n✅ All JWT environment variables are configured.');
  }

  // Test JWT signing and verification
  console.log('\n2. JWT Signing and Verification Test:');
  try {
    const testPayload = { 
      id: 'test-user-id', 
      email: 'test@example.com', 
      role: 'Admin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    };

    if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.includes('your_')) {
      console.log('   ❌ NEXTAUTH_SECRET is not properly configured - JWT operations will fail');
      console.log('   💡 Fix: Generate a secure secret using: openssl rand -base64 32');
    } else {
      // Test JWT signing
      const token = jwt.sign(testPayload, process.env.NEXTAUTH_SECRET);
      console.log('   ✅ JWT signing successful');
      
      // Test JWT verification
      const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
      console.log('   ✅ JWT verification successful');
      
      // Test token structure
      console.log('   📋 Token structure:', {
        hasId: !!decoded.id,
        hasEmail: !!decoded.email,
        hasRole: !!decoded.role,
        hasIat: !!decoded.iat,
        hasExp: !!decoded.exp
      });
    }
  } catch (error) {
    console.log('   ❌ JWT test failed:', error.message);
  }

  // Check database connection for JWT-related queries
  console.log('\n3. Database JWT Support Check:');
  let pool;
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
    
    const client = await pool.connect();
    console.log('   ✅ Database connection successful');
    
    // Check if Account table exists (needed for OAuth/JWT)
    const accountTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Account'
      );
    `);
    
    if (accountTableCheck.rows[0].exists) {
      console.log('   ✅ Account table exists (required for OAuth/JWT)');
      
      // Check Account table structure
      const accountColumns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'Account' 
        ORDER BY column_name;
      `);
      
      console.log('   📋 Account table columns:');
      accountColumns.rows.forEach(col => {
        console.log(`      - ${col.column_name}: ${col.data_type}`);
      });
      
      // Check for existing OAuth accounts
      const oauthAccounts = await client.query('SELECT provider, COUNT(*) as count FROM "Account" GROUP BY provider');
      console.log('   📊 Existing OAuth accounts:');
      if (oauthAccounts.rows.length === 0) {
        console.log('      No OAuth accounts found');
      } else {
        oauthAccounts.rows.forEach(account => {
          console.log(`      - ${account.provider}: ${account.count} accounts`);
        });
      }
    } else {
      console.log('   ❌ Account table missing (required for OAuth/JWT)');
    }
    
    // Check User table for JWT-related fields
    const userColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND column_name IN ('id', 'email', 'role', 'azure_oid', 'authentication_method')
      ORDER BY column_name;
    `);
    
    console.log('   📋 User table JWT-related columns:');
    userColumns.rows.forEach(col => {
      console.log(`      - ${col.column_name}: ${col.data_type}`);
    });
    
    client.release();
  } catch (error) {
    console.log('   ❌ Database check failed:', error.message);
  }

  // Check NextAuth configuration
  console.log('\n4. NextAuth Configuration Check:');
  try {
    // Check if NextAuth is properly configured
    const hasNextAuthSecret = process.env.NEXTAUTH_SECRET && !process.env.NEXTAUTH_SECRET.includes('your_');
    const hasNextAuthUrl = process.env.NEXTAUTH_URL;
    const hasAzureConfig = process.env.AZURE_AD_CLIENT_ID && !process.env.AZURE_AD_CLIENT_ID.includes('your_');
    
    console.log(`   NextAuth Secret: ${hasNextAuthSecret ? '✅' : '❌'}`);
    console.log(`   NextAuth URL: ${hasNextAuthUrl ? '✅' : '❌'}`);
    console.log(`   Azure AD Config: ${hasAzureConfig ? '✅' : '❌'}`);
    
    if (!hasNextAuthSecret) {
      console.log('   💡 Fix: Set a secure NEXTAUTH_SECRET in your .env file');
    }
    
    if (!hasNextAuthUrl) {
      console.log('   💡 Fix: Set NEXTAUTH_URL in your .env file');
    }
    
    if (!hasAzureConfig) {
      console.log('   💡 Fix: Configure Azure AD environment variables for O365 login');
    }
  } catch (error) {
    console.log('   ❌ NextAuth check failed:', error.message);
  }

  // Check for common JWT issues
  console.log('\n5. Common JWT Issues Check:');
  
  // Check for weak secrets
  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
    console.log('   ⚠️  NEXTAUTH_SECRET might be too short (should be at least 32 characters)');
  }
  
  // Check for development secrets in production
  if (process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_SECRET && 
      process.env.NEXTAUTH_SECRET.includes('your_')) {
    console.log('   ❌ Using development secret in production environment');
  }
  
  // Check for missing Azure AD configuration
  if (!process.env.AZURE_AD_CLIENT_ID || process.env.AZURE_AD_CLIENT_ID.includes('your_')) {
    console.log('   ❌ Azure AD not configured - O365 login will not work');
  }

  // Summary and recommendations
  console.log('\n6. Summary and Recommendations:');
  console.log('   JWT Issues that could affect O365 login:');
  console.log('   • Weak or missing NEXTAUTH_SECRET');
  console.log('   • Missing Azure AD configuration');
  console.log('   • Database schema issues');
  console.log('   • NextAuth configuration problems');
  console.log('   • Token validation failures');
  
  console.log('\n   To fix O365 authentication:');
  console.log('   1. Generate a secure NEXTAUTH_SECRET: openssl rand -base64 32');
  console.log('   2. Configure Azure AD environment variables');
  console.log('   3. Ensure database has proper OAuth tables');
  console.log('   4. Check NextAuth callbacks for errors');
  console.log('   5. Verify token signing/verification works');

  if (pool) {
    await pool.end();
  }
}

// Run the debug script
debugJWTIssues().catch(console.error);
