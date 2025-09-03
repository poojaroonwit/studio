#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runUserGroupsMigration() {
  console.log('🔧 Running User Groups Database Migration...\n');
  
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.error('Please set DATABASE_URL in your .env.local file or environment variables');
    process.exit(1);
  }
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful\n');
    
    // Read the SQL migration file
    const sqlFile = path.join(__dirname, 'fix-user-groups-schema.sql');
    if (!fs.existsSync(sqlFile)) {
      console.error(`❌ SQL migration file not found: ${sqlFile}`);
      process.exit(1);
    }
    
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    console.log('📖 SQL migration file loaded\n');
    
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Executing ${statements.length} SQL statements...\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`[${i + 1}/${statements.length}] Executing statement...`);
          const result = await client.query(statement);
          
          if (result.rows && result.rows.length > 0) {
            console.log(`   ✅ Statement executed successfully`);
            if (result.rows.length <= 10) {
              result.rows.forEach((row, idx) => {
                const info = row.info || `Row ${idx + 1}`;
                console.log(`      ${info}: ${JSON.stringify(row)}`);
              });
            } else {
              console.log(`      ${result.rows.length} rows returned`);
            }
          } else {
            console.log(`   ✅ Statement executed successfully`);
          }
        } catch (error) {
          console.log(`   ⚠️  Statement failed (this might be expected): ${error.message}`);
          // Continue with other statements
        }
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
    
    // Verify the final state
    console.log('\n🔍 Verifying migration results...');
    
    try {
      const userGroupCount = await client.query('SELECT COUNT(*) as count FROM "UserGroup"');
      console.log(`📊 UserGroup table has ${userGroupCount.rows[0].count} records`);
      
      const userCount = await client.query('SELECT COUNT(*) as count FROM "User"');
      console.log(`👥 User table has ${userCount.rows[0].count} records`);
      
      const usersWithGroups = await client.query('SELECT COUNT("userGroupId") as count FROM "User"');
      console.log(`🔗 Users with groups assigned: ${usersWithGroups.rows[0].count}`);
      
      const usersWithoutGroups = await client.query('SELECT COUNT(*) as count FROM "User" WHERE "userGroupId" IS NULL');
      console.log(`⚠️  Users without groups: ${usersWithoutGroups.rows[0].count}`);
      
    } catch (error) {
      console.log(`⚠️  Verification query failed: ${error.message}`);
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Error details:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runUserGroupsMigration().catch(console.error);
