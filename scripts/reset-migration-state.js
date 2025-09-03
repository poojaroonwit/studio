#!/usr/bin/env node

/**
 * Reset Migration State Script
 * 
 * This script resets the migration state to allow for a fresh start.
 * Use this when you want to clear the migration history and start over.
 */

const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  console.log('🔄 Resetting migration state...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database');

    // Check if _prisma_migrations table exists
    const migrationsTableExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
      );
    `);

    if (migrationsTableExists.rows[0].exists) {
      console.log('🗑️  Clearing migration history...');
      await client.query('DELETE FROM "_prisma_migrations";');
      console.log('✅ Migration history cleared');
    } else {
      console.log('ℹ️  No migration history found');
    }

    // Check if there are any existing tables that might conflict
    const existingTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('Candidate', 'RecruitmentStage')
      ORDER BY table_name;
    `);

    if (existingTables.rows.length > 0) {
      console.log('\n📋 Found existing tables:');
      existingTables.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
      
      console.log('\n⚠️  Warning: Existing tables found!');
      console.log('   This script will NOT drop existing data.');
      console.log('   You may need to manually handle schema conflicts.');
    }

    console.log('\n🎯 Migration state reset complete!');
    console.log('📝 Next steps:');
    console.log('   1. Run: npx prisma migrate dev --name init');
    console.log('   2. Or run: npx prisma db push');
    console.log('   3. Run: npx prisma generate');

    client.release();
  } catch (error) {
    console.error('❌ Error during reset:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
