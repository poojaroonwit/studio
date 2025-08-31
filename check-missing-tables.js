const { Pool } = require('pg');

async function checkMissingTables() {
  const databaseUrl = 'postgresql://postgres:secure_password@localhost:8521/studio_production';
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: false,
  });

  try {
    console.log('Checking for missing tables...');
    
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Check all tables referenced in the API query
    const tablesToCheck = ['Position', 'User', 'Grade', 'Headcount', 'Candidate', 'JobMatch'];
    
    for (const tableName of tablesToCheck) {
      const query = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `;
      
      const result = await client.query(query, [tableName]);
      console.log(`${tableName} table exists: ${result.rows[0].exists}`);
    }
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Table check failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

checkMissingTables();
