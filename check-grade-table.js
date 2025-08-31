const { Pool } = require('pg');

async function checkGradeTable() {
  const databaseUrl = 'postgresql://postgres:secure_password@localhost:8521/studio_production';
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: false,
  });

  try {
    console.log('Checking Grade table structure...');
    
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Get Grade table structure
    const gradeStructureQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Grade'
      ORDER BY ordinal_position;
    `;
    
    const structureResult = await client.query(gradeStructureQuery);
    console.log('Grade table structure:');
    structureResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check if specific columns exist
    const requiredColumns = ['id', 'name', 'label', 'sla_days', 'color'];
    for (const column of requiredColumns) {
      const columnExists = structureResult.rows.some(row => row.column_name === column);
      console.log(`${column} column exists: ${columnExists}`);
    }
    
    // Test a simple query on Grade table
    const testQuery = `SELECT id, name, label, "sla_days", color FROM "Grade" LIMIT 5`;
    console.log('Testing Grade table query...');
    const testResult = await client.query(testQuery);
    console.log('✅ Grade table query successful');
    console.log('Number of grades:', testResult.rows.length);
    
    if (testResult.rows.length > 0) {
      console.log('Sample grade data:');
      console.log(JSON.stringify(testResult.rows[0], null, 2));
    }
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Grade table check failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

checkGradeTable();
