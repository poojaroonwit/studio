#!/usr/bin/env node

/**
 * Check Production Database Script
 * 
 * This script examines the current production database structure to understand
 * what needs to be migrated.
 */

const { Pool } = require('pg');
require('dotenv').config();

async function main() {

  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();


    // Check if Candidate table exists and its structure

    const candidateColumns = await client.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Candidate'
      ORDER BY ordinal_position;
    `);
    
    if (candidateColumns.rows.length > 0) {

    } else {
      console.log('   - Candidate table does not exist');
    }

    // Check if RecruitmentStage table exists

    const recruitmentStageColumns = await client.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'RecruitmentStage'
      ORDER BY ordinal_position;
    `);
    
    if (recruitmentStageColumns.rows.length > 0) {

    } else {
      console.log('   - RecruitmentStage table does not exist');
    }

    // Check existing data in Candidate table

    const candidateCount = await client.query(`
      SELECT COUNT(*) as count FROM "Candidate";
    `);
    
    if (candidateCount.rows[0].count > 0) {
      
      
      // Check if status column exists and what values it has
      const statusExists = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Candidate' AND column_name = 'status'
        );
      `);
      
      if (statusExists.rows[0].exists) {
        const statusValues = await client.query(`
          SELECT status, COUNT(*) as count
          FROM "Candidate"
          GROUP BY status
          ORDER BY count DESC;
        `);
        

      } else {
        console.log('   - Status column does not exist');
      }
    } else {
      console.log('   - No candidates found');
    }

    // Check migration state

    const migrationTableExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
      );
    `);
    
    if (migrationTableExists.rows[0].exists) {
      const migrations = await client.query(`
        SELECT migration_name, started_at, finished_at
        FROM "_prisma_migrations"
        ORDER BY started_at DESC
        LIMIT 10;
      `);
      
      console.log('   - Recent migrations:');
      migrations.rows.forEach(row => {
        const status = row.finished_at ? '✅ Completed' : '🔄 Running';
        console.log(`     - ${row.migration_name}: ${status}`);
      });
    } else {
      console.log('   - No migration history found');
    }

    client.release();
  } catch (error) {
    console.error('❌ Error during database check:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
