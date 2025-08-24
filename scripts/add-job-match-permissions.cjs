#!/usr/bin/env node

/**
 * Add Job Match Permissions Migration Script
 * 
 * This script adds the new JOB_MATCH_VIEW and JOB_MATCH_MANAGE permissions
 * to the Admin role. All other roles will have these permissions disabled by default.
 * 
 * Usage: node scripts/add-job-match-permissions.cjs
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  user: process.env.POSTGRES_USER || process.env.DB_USER || 'studio_user',
  host: process.env.POSTGRES_HOST || process.env.DB_HOST || 'localhost',
  database: process.env.POSTGRES_DB || process.env.DB_NAME || 'studio_dev',
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || 'local_dev_password',
  port: process.env.POSTGRES_PORT || process.env.DB_PORT || 5432,
};

async function runMigration() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🚀 Starting Job Match Permissions Migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../prisma/add_job_match_permissions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration SQL loaded');
    console.log('🔧 Executing migration...');
    
    // Execute the migration
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Execute the migration SQL
      await client.query(migrationSQL);
      
      // Verify the migration
      const result = await client.query(`
        SELECT name, permissions 
        FROM "UserGroup" 
        WHERE name = 'Admin'
      `);
      
      if (result.rows.length > 0) {
        const adminGroup = result.rows[0];
        const hasJobMatchView = adminGroup.permissions.includes('JOB_MATCH_VIEW');
        const hasJobMatchManage = adminGroup.permissions.includes('JOB_MATCH_MANAGE');
        
        console.log('✅ Migration completed successfully!');
        console.log(`📊 Admin role permissions:`);
        console.log(`   - JOB_MATCH_VIEW: ${hasJobMatchView ? '✅' : '❌'}`);
        console.log(`   - JOB_MATCH_MANAGE: ${hasJobMatchManage ? '✅' : '❌'}`);
        
        if (hasJobMatchView && hasJobMatchManage) {
          console.log('\n🎉 Job match permissions successfully added to Admin role!');
          console.log('📝 Note: Recruiter and Hiring Manager roles have these permissions disabled by default.');
        } else {
          console.log('\n⚠️  Some permissions may not have been added. Check the database manually.');
        }
      } else {
        console.log('❌ Admin role not found in database');
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('\n✨ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };
