const { Pool } = require('pg');

// Different possible server database configurations
const serverConfigs = [
  {
    name: 'Server Dev Database (studio_user)',
    config: { 
      host: '10.0.10.71',
      port: 8521,
      database: 'studio_dev',
      user: 'studio_user',
      password: 'local_dev_password'
    }
  },
  {
    name: 'Server Dev Database (postgres)',
    config: { 
      host: '10.0.10.71',
      port: 8521,
      database: 'studio_dev',
      user: 'postgres',
      password: 'secure_password'
    }
  },
  {
    name: 'Server Production Database (studio_user)',
    config: { 
      host: '10.0.10.71',
      port: 8521,
      database: 'studio_production',
      user: 'studio_user',
      password: 'local_dev_password'
    }
  },
  {
    name: 'Server Production Database (postgres)',
    config: { 
      host: '10.0.10.71',
      port: 8521,
      database: 'studio_production',
      user: 'postgres',
      password: 'secure_password'
    }
  },
  {
    name: 'Server Default Database (postgres)',
    config: { 
      host: '10.0.10.71',
      port: 8521,
      database: 'postgres',
      user: 'postgres',
      password: 'secure_password'
    }
  }
];

async function checkServerDatabase(config, name) {
  const pool = new Pool(config);
  
  try {
    const client = await pool.connect();
    
    console.log(`\n🔍 Checking ${name}...`);
    console.log(`  Host: ${client.connectionParameters.host}:${client.connectionParameters.port}`);
    console.log(`  Database: ${client.connectionParameters.database}`);
    console.log(`  User: ${client.connectionParameters.user}`);
    
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
      return 0;
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

async function checkServerQueue() {
  console.log('🔍 Checking your server database (10.0.10.71:8521) for upload queue jobs...\n');
  
  let totalJobsFound = 0;
  let foundConfig = null;
  
  for (const dbConfig of serverConfigs) {
    const count = await checkServerDatabase(dbConfig.config, dbConfig.name);
    if (count > 0) {
      totalJobsFound = count;
      foundConfig = dbConfig;
      break; // Found the right database
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  Total jobs found: ${totalJobsFound}`);
  
  if (totalJobsFound === 0) {
    console.log(`\n❌ No upload queue jobs found on server.`);
    console.log(`   Possible reasons:`);
    console.log(`   1. Wrong database credentials`);
    console.log(`   2. Jobs were cleared recently`);
    console.log(`   3. Server is using a different database`);
    console.log(`   4. Server is not running on 10.0.10.71:8521`);
  } else if (totalJobsFound === 16) {
    console.log(`\n✅ Found exactly 16 jobs on server!`);
    console.log(`   Database: ${foundConfig.name}`);
  } else {
    console.log(`\n⚠️  Found ${totalJobsFound} jobs on server, but you mentioned 16.`);
    console.log(`   Database: ${foundConfig.name}`);
  }
}

checkServerQueue();
