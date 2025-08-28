#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

async function checkUsers() {
  console.log('🔍 Checking Database Users\n');
  
  let pool;
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
    
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Check for users
    const usersResult = await client.query('SELECT id, name, email, role, "authentication_method" FROM "User" LIMIT 10');
    
    console.log(`\n📊 Found ${usersResult.rows.length} users in database:`);
    
    if (usersResult.rows.length === 0) {
      console.log('   ❌ No users found in database');
      console.log('   💡 You need to create at least one user to test login');
    } else {
      usersResult.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name} (${user.email}) - Role: ${user.role} - Auth: ${user.authentication_method || 'password'}`);
      });
    }
    
    // Check for users with passwords (for regular login)
    const passwordUsersResult = await client.query('SELECT COUNT(*) as count FROM "User" WHERE password IS NOT NULL');
    console.log(`\n🔐 Users with passwords (can login with username/password): ${passwordUsersResult.rows[0].count}`);
    
    // Check for Azure AD users
    const azureUsersResult = await client.query('SELECT COUNT(*) as count FROM "User" WHERE "azure_oid" IS NOT NULL OR "authentication_method" = \'azure\'');
    console.log(`🔗 Azure AD users: ${azureUsersResult.rows[0].count}`);
    
    client.release();
  } catch (error) {
    console.log('❌ Database check failed:', error.message);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

checkUsers().catch(console.error);
