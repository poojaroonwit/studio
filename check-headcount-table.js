const { Pool } = require('pg');

async function checkHeadcountTable() {
  const databaseUrl = 'postgresql://postgres:secure_password@localhost:8521/studio_production';
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: false,
  });

  try {
    console.log('Checking Headcount table structure...');
    
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Get Headcount table structure
    const headcountStructureQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Headcount'
      ORDER BY ordinal_position;
    `;
    
    const structureResult = await client.query(headcountStructureQuery);
    console.log('Headcount table structure:');
    structureResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check if specific columns exist
    const requiredColumns = ['id', 'positionId', 'candidateId', 'status'];
    for (const column of requiredColumns) {
      const columnExists = structureResult.rows.some(row => row.column_name === column);
      console.log(`${column} column exists: ${columnExists}`);
    }
    
    // Test a simple query on Headcount table
    const testQuery = `SELECT id, "positionId", "candidateId", status FROM "Headcount" LIMIT 5`;
    console.log('Testing Headcount table query...');
    const testResult = await client.query(testQuery);
    console.log('✅ Headcount table query successful');
    console.log('Number of headcount records:', testResult.rows.length);
    
    if (testResult.rows.length > 0) {
      console.log('Sample headcount data:');
      console.log(JSON.stringify(testResult.rows[0], null, 2));
    }
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Headcount table check failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

checkHeadcountTable();
