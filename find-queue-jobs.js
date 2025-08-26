const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Different database configurations to check
const databaseConfigs = [
  {
    name: 'Local Database',
    config: { connectionString: process.env.DATABASE_URL },
    envFile: '.env.local'
  },
  {
    name: 'Your Server Database (10.0.10.71)',
    config: { connectionString: 'postgresql://studio_user:local_dev_password@10.0.10.71:8521/studio_dev' },
    envFile: 'Server config'
  },
  {
    name: 'Server Production Database',
    config: { 
      host: '10.0.10.71',
      port: 8521,
      database: 'studio_production',
      user: 'studio_user',
      password: 'local_dev_password'
    },
    envFile: 'Server production config'
  },
  {
    name: 'Server Alternative Database',
    config: { 
      host: '10.0.10.71',
      port: 5432,
      database: 'studio_dev',
      user: 'studio_user',
      password: 'local_dev_password'
    },
    envFile: 'Server alternative config'
  }
];

async function checkDatabase(config, name) {
  const pool = new Pool(config);
  
  try {
    const client = await pool.connect();
    
    console.log(`\n🔍 Checking ${name}...`);
    console.log(`  Host: ${client.connectionParameters.host}:${client.connectionParameters.port}`);
    console.log(`  Database: ${client.connectionParameters.database}`);
    
    // Check if upload_queue table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'upload_queue'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log(`  ❌ upload_queue table does not exist`);
      client.release();
      return;
    }
    
    // Check total count
    const totalCount = await client.query('SELECT COUNT(*) as count FROM upload_queue');
    const count = parseInt(totalCount.rows[0].count, 10);
    console.log(`  📊 Total items: ${count}`);
    
    if (count > 0) {
      // Check status breakdown
      const statusBreakdown = await client.query(`
        SELECT status, COUNT(*) as count 
        FROM upload_queue 
        GROUP BY status 
        ORDER BY status
      `);
      
      console.log(`  📋 Status breakdown:`);
      statusBreakdown.rows.forEach(row => {
        console.log(`    ${row.status}: ${row.count}`);
      });
      
      // Show recent jobs
      const recentJobs = await client.query(`
        SELECT file_name, status, upload_date
        FROM upload_queue 
        ORDER BY upload_date DESC 
        LIMIT 5
      `);
      
      console.log(`  🕒 Recent jobs:`);
      recentJobs.rows.forEach((job, index) => {
        console.log(`    ${index + 1}. ${job.file_name} - ${job.status} (${job.upload_date})`);
      });
    }
    
    client.release();
    return count;
    
  } catch (error) {
    console.log(`  ❌ Connection failed: ${error.message}`);
    return 0;
  } finally {
    await pool.end();
  }
}

async function findQueueJobs() {
  console.log('🔍 Searching for upload queue jobs across all database configurations...\n');
  
  let totalJobsFound = 0;
  
  for (const dbConfig of databaseConfigs) {
    const count = await checkDatabase(dbConfig.config, dbConfig.name);
    totalJobsFound += count || 0;
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  Total jobs found across all databases: ${totalJobsFound}`);
  
  if (totalJobsFound === 0) {
    console.log(`\n❌ No upload queue jobs found in any database.`);
    console.log(`   This could mean:`);
    console.log(`   1. The jobs were cleared recently`);
    console.log(`   2. The server is using a different database configuration`);
    console.log(`   3. The jobs are in a different database not checked here`);
  } else if (totalJobsFound === 16) {
    console.log(`\n✅ Found exactly 16 jobs! This matches what you mentioned.`);
  } else {
    console.log(`\n⚠️  Found ${totalJobsFound} jobs, but you mentioned 16.`);
  }
}

findQueueJobs();
