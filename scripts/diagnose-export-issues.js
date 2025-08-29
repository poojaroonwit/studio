#!/usr/bin/env node

/**
 * Diagnostic script for export issues
 * Run with: node scripts/diagnose-export-issues.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function checkDatabaseConnection() {
  console.log('🔍 Checking database connection...');
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    return false;
  }
  
  try {
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 1,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 10000,
    });
    
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    client.release();
    await pool.end();
    
    console.log('✅ Database connection successful');
    console.log(`   Current time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL version: ${result.rows[0].pg_version.split(' ')[0]}`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function checkCandidateTable() {
  console.log('\n🔍 Checking candidate table...');
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not available');
    return false;
  }
  
  try {
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 1,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 10000,
    });
    
    const client = await pool.connect();
    
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Candidate'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.error('❌ Candidate table does not exist');
      client.release();
      await pool.end();
      return false;
    }
    
    // Get table size and row count
    const stats = await client.query(`
      SELECT 
        COUNT(*) as row_count,
        pg_size_pretty(pg_total_relation_size('"Candidate"')) as table_size
      FROM "Candidate";
    `);
    
    const rowCount = parseInt(stats.rows[0].row_count);
    const tableSize = stats.rows[0].table_size;
    
    console.log(`✅ Candidate table exists`);
    console.log(`   Row count: ${rowCount.toLocaleString()}`);
    console.log(`   Table size: ${tableSize}`);
    
    // Check for large datasets that might cause timeout
    if (rowCount > 10000) {
      console.log('⚠️  Large dataset detected - exports may timeout');
    }
    
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    console.error('❌ Error checking candidate table:', error.message);
    return false;
  }
}

async function checkPermissions() {
  console.log('\n🔍 Checking export permissions...');
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not available');
    return false;
  }
  
  try {
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 1,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 10000,
    });
    
    const client = await pool.connect();
    
    // Check if we can read from Candidate table
    const permissionCheck = await client.query(`
      SELECT 
        has_table_privilege(current_user, 'Candidate', 'SELECT') as can_select,
        has_table_privilege(current_user, 'Candidate', 'INSERT') as can_insert,
        has_table_privilege(current_user, 'Candidate', 'UPDATE') as can_update,
        has_table_privilege(current_user, 'Candidate', 'DELETE') as can_delete
      FROM "Candidate" LIMIT 1;
    `);
    
    const permissions = permissionCheck.rows[0];
    
    console.log('✅ Database permissions:');
    console.log(`   SELECT: ${permissions.can_select ? '✅' : '❌'}`);
    console.log(`   INSERT: ${permissions.can_insert ? '✅' : '❌'}`);
    console.log(`   UPDATE: ${permissions.can_update ? '✅' : '❌'}`);
    console.log(`   DELETE: ${permissions.can_delete ? '✅' : '❌'}`);
    
    if (!permissions.can_select) {
      console.error('❌ No SELECT permission on Candidate table');
      client.release();
      await pool.end();
      return false;
    }
    
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    console.error('❌ Error checking permissions:', error.message);
    return false;
  }
}

function checkSystemResources() {
  console.log('\n🔍 Checking system resources...');
  
  try {
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    };
    
    console.log('✅ Memory usage:');
    console.log(`   RSS: ${memUsageMB.rss} MB`);
    console.log(`   Heap Total: ${memUsageMB.heapTotal} MB`);
    console.log(`   Heap Used: ${memUsageMB.heapUsed} MB`);
    console.log(`   External: ${memUsageMB.external} MB`);
    
    // Check Node.js version
    console.log(`✅ Node.js version: ${process.version}`);
    
    // Check if we're in production mode
    console.log(`✅ NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error checking system resources:', error.message);
    return false;
  }
}

function checkEnvironmentVariables() {
  console.log('\n🔍 Checking environment variables...');
  
  const requiredVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ];
  
  const optionalVars = [
    'DATABASE_SSL',
    'DATABASE_MAX_CONNECTIONS',
    'DATABASE_CONNECTION_TIMEOUT',
    'DATABASE_STATEMENT_TIMEOUT'
  ];
  
  console.log('Required variables:');
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      console.log(`   ${varName}: ✅ Set`);
    } else {
      console.log(`   ${varName}: ❌ Missing`);
    }
  }
  
  console.log('\nOptional variables:');
  for (const varName of optionalVars) {
    const value = process.env[varName];
    if (value) {
      console.log(`   ${varName}: ✅ Set to "${value}"`);
    } else {
      console.log(`   ${varName}: ⚠️  Not set (using default)`);
    }
  }
  
  return true;
}

async function runExportTest() {
  console.log('\n🔍 Testing export query...');
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not available');
    return false;
  }
  
  try {
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 1,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 10000,
    });
    
    const client = await pool.connect();
    
    // Test the actual export query with a small limit
    const startTime = Date.now();
    const testQuery = `
      SELECT 
        c.id,
        c.name,
        c.email,
        c.phone,
        c."positionId",
        p.title as "positionTitle",
        c."recruiterId",
        u.name as "recruiterName",
        c."appliedJobFitScore",
        c.status,
        c."applicationDate",
        c."appliedJob",
        c."appliedJobJustification",
        c.location,
        c.introduction,
        c.education,
        c.experience,
        c.skills,
        c."customAttributes"
      FROM "Candidate" c
      LEFT JOIN "Position" p ON c."positionId" = p.id
      LEFT JOIN "User" u ON c."recruiterId" = u.id
      ORDER BY c."applicationDate" DESC
      LIMIT 10;
    `;
    
    const result = await client.query(testQuery);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Export query test successful`);
    console.log(`   Query duration: ${duration}ms`);
    console.log(`   Rows returned: ${result.rows.length}`);
    
    if (duration > 5000) {
      console.log('⚠️  Query is slow - may cause timeout issues');
    }
    
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    console.error('❌ Export query test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting export diagnostics...\n');
  
  const checks = [
    { name: 'Environment Variables', fn: checkEnvironmentVariables },
    { name: 'Database Connection', fn: checkDatabaseConnection },
    { name: 'Candidate Table', fn: checkCandidateTable },
    { name: 'Permissions', fn: checkPermissions },
    { name: 'System Resources', fn: checkSystemResources },
    { name: 'Export Query Test', fn: runExportTest },
  ];
  
  const results = [];
  
  for (const check of checks) {
    try {
      const result = await check.fn();
      results.push({ name: check.name, success: result });
    } catch (error) {
      console.error(`❌ ${check.name} check failed:`, error.message);
      results.push({ name: check.name, success: false, error: error.message });
    }
  }
  
  console.log('\n📊 Summary:');
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`   ${successful}/${total} checks passed`);
  
  if (successful === total) {
    console.log('✅ All checks passed! Export should work correctly.');
  } else {
    console.log('❌ Some checks failed. Please review the issues above.');
    
    const failedChecks = results.filter(r => !r.success);
    console.log('\n🔧 Recommended fixes:');
    
    for (const check of failedChecks) {
      switch (check.name) {
        case 'Database Connection':
          console.log('   - Check DATABASE_URL environment variable');
          console.log('   - Verify database server is running');
          console.log('   - Check network connectivity');
          break;
        case 'Candidate Table':
          console.log('   - Run database migrations: npm run db:migrate');
          console.log('   - Check if Candidate table exists');
          break;
        case 'Permissions':
          console.log('   - Check database user permissions');
          console.log('   - Verify user has SELECT access to Candidate table');
          break;
        case 'Export Query Test':
          console.log('   - Check for database locks or slow queries');
          console.log('   - Consider adding database indexes');
          console.log('   - Try with fewer filters');
          break;
      }
    }
  }
  
  console.log('\n💡 Additional troubleshooting tips:');
  console.log('   - Check browser console for detailed error messages');
  console.log('   - Try exporting with fewer filters');
  console.log('   - Check server logs for detailed error information');
  console.log('   - Verify your user has export permissions in the application');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
