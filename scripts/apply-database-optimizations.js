#!/usr/bin/env node

/**
 * Database Optimization Script
 * Applies performance optimizations to the database
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function applyDatabaseOptimizations() {
  console.log('🚀 Applying Database Performance Optimizations');
  console.log('==============================================\n');

  try {
    // Read the SQL optimization script
    const sqlPath = path.join(__dirname, 'optimize-database-performance.sql');
    const sqlContent = await fs.readFile(sqlPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        console.log(`[${i + 1}/${statements.length}] Executing: ${statement.substring(0, 100)}...`);
        
        await pool.query(statement);
        successCount++;
        console.log(`✅ Success`);
        
      } catch (error) {
        errorCount++;
        console.log(`❌ Error: ${error.message}`);
        
        // Continue with other statements even if one fails
        if (error.code === '42710') {
          console.log(`   (Index already exists - this is normal)`);
        } else if (error.code === '42P07') {
          console.log(`   (Table already exists - this is normal)`);
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📈 Total: ${statements.length}`);

    if (errorCount === 0) {
      console.log('\n🎉 All optimizations applied successfully!');
    } else {
      console.log('\n⚠️  Some optimizations failed. Check the errors above.');
    }

    // Run ANALYZE on all tables
    console.log('\n📊 Running ANALYZE on tables...');
    const tables = ['Position', 'Headcount', 'upload_queue', 'Candidate', 'JobMatch', 'User', 'Grade'];
    
    for (const table of tables) {
      try {
        await pool.query(`ANALYZE "${table}"`);
        console.log(`✅ Analyzed table: ${table}`);
      } catch (error) {
        console.log(`❌ Failed to analyze ${table}: ${error.message}`);
      }
    }

    // Show index usage statistics
    console.log('\n📈 Index Usage Statistics:');
    const indexStats = await pool.query(`
      SELECT 
        schemaname,
        relname as tablename,
        indexrelname as indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes 
      WHERE schemaname = 'public'
      ORDER BY idx_scan DESC
      LIMIT 10
    `);

    if (indexStats.rows.length > 0) {
      console.log('Top 10 most used indexes:');
      indexStats.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.tablename}.${row.indexname} (scans: ${row.idx_scan})`);
      });
    }

    console.log('\n✅ Database optimization complete!');
    console.log('\n💡 Next steps:');
    console.log('1. Monitor performance with: node scripts/monitor-performance.js');
    console.log('2. Test the position page loading speed');
    console.log('3. Monitor memory usage during file uploads');

  } catch (error) {
    console.error('❌ Error applying database optimizations:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the optimization
if (require.main === module) {
  applyDatabaseOptimizations().catch(console.error);
}

module.exports = { applyDatabaseOptimizations };
