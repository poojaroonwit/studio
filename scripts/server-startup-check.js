#!/usr/bin/env node

/**
 * Server Startup Check Script
 * 
 * This script performs comprehensive checks to ensure the server can start properly:
 * - Database connectivity
 * - Environment variables
 * - Queue status
 * - Memory usage
 * - Port availability
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const net = require('net');
require('dotenv').config();

// Check environment variables
function checkEnvironmentVariables() {
  console.log('🔍 Checking environment variables...');
  
  const requiredVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ];

  const missingVars = [];
  const presentVars = [];

  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    } else {
      presentVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.log('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    return false;
  } else {
    console.log('✅ All required environment variables are set');
    presentVars.forEach(varName => {
      console.log(`   - ${varName}: ${varName.includes('SECRET') ? '***' : process.env[varName]}`);
    });
    return true;
  }
}

// Check database connectivity
async function checkDatabaseConnectivity() {
  console.log('\n🗄️  Checking database connectivity...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Database connection successful');

    // Check if required tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('User', 'Candidate', 'Position', 'UploadQueue')
    `);

    const requiredTables = ['User', 'Candidate', 'Position', 'UploadQueue'];
    const existingTables = tablesResult.rows.map(row => row.table_name);
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));

    if (missingTables.length > 0) {
      console.log('❌ Missing required tables:');
      missingTables.forEach(table => console.log(`   - ${table}`));
      return false;
    } else {
      console.log('✅ All required tables exist');
    }

    // Check database size
    const sizeResult = await client.query(`
      SELECT 
        pg_size_pretty(pg_database_size(current_database())) as db_size,
        pg_database_size(current_database()) as db_size_bytes
    `);
    
    const dbSize = sizeResult.rows[0];
    console.log(`📊 Database size: ${dbSize.db_size}`);

    // Check connection pool status
    const poolStatus = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    };
    console.log('📊 Connection pool status:', poolStatus);

    client.release();
    await pool.end();
    return true;

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    await pool.end();
    return false;
  }
}

// Check port availability
function checkPortAvailability(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

async function checkPorts() {
  console.log('\n🔌 Checking port availability...');
  
  const ports = [8021, 9000, 9001]; // Main app, MinIO, MinIO console
  
  for (const port of ports) {
    const isAvailable = await checkPortAvailability(port);
    if (isAvailable) {
      console.log(`✅ Port ${port} is available`);
    } else {
      console.log(`❌ Port ${port} is in use`);
    }
  }
}

// Check memory usage
function checkMemoryUsage() {
  console.log('\n🧠 Checking memory usage...');
  
  const memUsage = process.memoryUsage();
  const usedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const totalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  
  console.log(`📊 Current memory usage: ${usedMB}MB / ${totalMB}MB`);
  
  if (usedMB > 500) {
    console.log('⚠️  High memory usage detected');
    return false;
  } else {
    console.log('✅ Memory usage is normal');
    return true;
  }
}

// Check file system
function checkFileSystem() {
  console.log('\n📁 Checking file system...');
  
  const requiredDirs = [
    'src',
    'prisma',
    'logs',
    '.next'
  ];

  const requiredFiles = [
    'package.json',
    'next.config.js',
    'prisma/schema.prisma',
    '.env.local'
  ];

  let allGood = true;

  requiredDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`✅ Directory exists: ${dir}`);
    } else {
      console.log(`❌ Missing directory: ${dir}`);
      allGood = false;
    }
  });

  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ File exists: ${file}`);
    } else {
      console.log(`❌ Missing file: ${file}`);
      allGood = false;
    }
  });

  return allGood;
}

// Check queue status
async function checkQueueStatus() {
  console.log('\n📋 Checking queue status...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    const queueResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'queued' THEN 1 END) as queued,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM "UploadQueue"
    `);

    const stats = queueResult.rows[0];
    console.log(`📊 Queue status: ${stats.total} total, ${stats.queued} queued, ${stats.processing} processing, ${stats.failed} failed`);

    if (parseInt(stats.failed) > 0) {
      console.log('⚠️  Failed jobs detected in queue');
    }

    await pool.end();
    return parseInt(stats.failed) === 0;

  } catch (error) {
    console.error('❌ Error checking queue status:', error.message);
    await pool.end();
    return false;
  }
}

// Main check function
async function performStartupChecks() {
  console.log('🚀 Performing server startup checks...\n');

  const checks = [
    { name: 'Environment Variables', fn: checkEnvironmentVariables },
    { name: 'File System', fn: checkFileSystem },
    { name: 'Memory Usage', fn: checkMemoryUsage },
    { name: 'Database Connectivity', fn: checkDatabaseConnectivity },
    { name: 'Queue Status', fn: checkQueueStatus },
    { name: 'Port Availability', fn: checkPorts }
  ];

  const results = [];
  
  for (const check of checks) {
    try {
      const result = await check.fn();
      results.push({ name: check.name, passed: result });
    } catch (error) {
      console.error(`❌ Error in ${check.name}:`, error.message);
      results.push({ name: check.name, passed: false });
    }
  }

  // Summary
  console.log('\n📊 Startup Check Summary:');
  const passedChecks = results.filter(r => r.passed).length;
  const totalChecks = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
  });

  console.log(`\n${passedChecks}/${totalChecks} checks passed`);

  if (passedChecks === totalChecks) {
    console.log('\n🎉 All checks passed! Server should start successfully.');
    return true;
  } else {
    console.log('\n⚠️  Some checks failed. Please fix the issues before starting the server.');
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  performStartupChecks()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Startup check failed:', error);
      process.exit(1);
    });
}

module.exports = { performStartupChecks };
