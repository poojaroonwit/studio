const { Pool } = require('pg');
const { validate: validateUuid } = require('uuid');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function debugUuidIssues() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking for UUID issues in the database...\n');
    
    // Check User table for invalid UUIDs
    console.log('1. Checking User table...');
    const userResult = await client.query('SELECT id, name, email, "azure_oid" FROM "User" LIMIT 10');
    
    for (const user of userResult.rows) {
      const isValidUuid = validateUuid(user.id);
      console.log(`   User: ${user.name} (${user.email})`);
      console.log(`     ID: ${user.id} - Valid UUID: ${isValidUuid ? '✅' : '❌'}`);
      console.log(`     Azure OID: ${user.azure_oid || 'N/A'}`);
      console.log('');
    }
    
    // Check Notification table for invalid UUIDs
    console.log('2. Checking Notification table...');
    const notificationResult = await client.query('SELECT id, "userId", type, title FROM "Notification" LIMIT 10');
    
    for (const notification of notificationResult.rows) {
      const isValidId = validateUuid(notification.id);
      const isValidUserId = validateUuid(notification.userId);
      console.log(`   Notification: ${notification.title} (${notification.type})`);
      console.log(`     ID: ${notification.id} - Valid UUID: ${isValidId ? '✅' : '❌'}`);
      console.log(`     User ID: ${notification.userId} - Valid UUID: ${isValidUserId ? '✅' : '❌'}`);
      console.log('');
    }
    
    // Check for any users with azure_oid that might be causing issues
    console.log('3. Checking Azure AD users...');
    const azureUsers = await client.query('SELECT id, name, email, "azure_oid" FROM "User" WHERE "azure_oid" IS NOT NULL');
    
    console.log(`   Found ${azureUsers.rows.length} Azure AD users:`);
    for (const user of azureUsers.rows) {
      const isValidUuid = validateUuid(user.id);
      const isValidOid = validateUuid(user.azure_oid);
      console.log(`     ${user.name} (${user.email})`);
      console.log(`       User ID: ${user.id} - Valid UUID: ${isValidUuid ? '✅' : '❌'}`);
      console.log(`       Azure OID: ${user.azure_oid} - Valid UUID: ${isValidOid ? '✅' : '❌'}`);
      console.log('');
    }
    
  } catch (error) {
    console.error('Error debugging UUID issues:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

debugUuidIssues().catch(console.error);
