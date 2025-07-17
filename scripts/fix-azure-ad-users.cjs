const { Pool } = require('pg');
require('dotenv').config();

async function fixAzureAdUsers() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const client = await pool.connect();
  
  try {
    console.log('Checking for Azure AD users with potential ID issues...');
    
    // Check for users with authenticationMethod = 'azure'
    const result = await client.query('SELECT id, name, email, "authenticationMethod" FROM "User" WHERE "authenticationMethod" = $1', ['azure']);
    
    console.log(`Found ${result.rows.length} Azure AD users:`);
    result.rows.forEach(user => {
      console.log(`- ${user.name} (${user.email}): ID = ${user.id}`);
    });
    
    // Check for Account entries that might have wrong userId
    const accountResult = await client.query('SELECT a.id, a."userId", a.provider, a."providerAccountId", u.email FROM "Account" a LEFT JOIN "User" u ON a."userId" = u.id WHERE a.provider = $1', ['azure-ad']);
    
    console.log(`\nFound ${accountResult.rows.length} Azure AD account entries:`);
    accountResult.rows.forEach(account => {
      console.log(`- Account ID: ${account.id}, User ID: ${account.userId}, Provider Account ID: ${account.providerAccountId}, User Email: ${account.email || 'NOT FOUND'}`);
    });
    
    // Find orphaned account entries (where userId doesn't exist in User table)
    const orphanedResult = await client.query(`
      SELECT a.id, a."userId", a.provider, a."providerAccountId" 
      FROM "Account" a 
      LEFT JOIN "User" u ON a."userId" = u.id 
      WHERE a.provider = 'azure-ad' AND u.id IS NULL
    `);
    
    if (orphanedResult.rows.length > 0) {
      console.log(`\n⚠️  Found ${orphanedResult.rows.length} orphaned Azure AD account entries:`);
      orphanedResult.rows.forEach(account => {
        console.log(`- Account ID: ${account.id}, Orphaned User ID: ${account.userId}, Provider Account ID: ${account.providerAccountId}`);
      });
      
      console.log('\nTo fix these orphaned accounts, you would need to:');
      console.log('1. Find the correct user ID for each provider account ID');
      console.log('2. Update the Account entries with the correct userId');
      console.log('3. Or delete the orphaned entries if they are no longer needed');
    } else {
      console.log('\n✅ No orphaned Azure AD account entries found.');
    }
    
  } catch (error) {
    console.error('Error checking Azure AD users:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixAzureAdUsers().catch(console.error); 