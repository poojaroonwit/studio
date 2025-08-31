const { Pool } = require('pg');

async function checkDatabaseSchema() {
  const databaseUrl = 'postgresql://postgres:secure_password@localhost:8521/studio_production';
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: false,
  });

  try {
    console.log('Checking database schema...');
    
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Check if Position table exists
    const positionTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Position'
      );
    `;
    
    const positionTableResult = await client.query(positionTableQuery);
    console.log('Position table exists:', positionTableResult.rows[0].exists);
    
    if (positionTableResult.rows[0].exists) {
      // Get Position table structure
      const positionStructureQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'Position'
        ORDER BY ordinal_position;
      `;
      
      const structureResult = await client.query(positionStructureQuery);
      console.log('Position table structure:');
      structureResult.rows.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
      
      // Check if User table exists
      const userTableQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'User'
        );
      `;
      
      const userTableResult = await client.query(userTableQuery);
      console.log('User table exists:', userTableResult.rows[0].exists);
      
      // Check if Grade table exists
      const gradeTableQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'Grade'
        );
      `;
      
      const gradeTableResult = await client.query(gradeTableQuery);
      console.log('Grade table exists:', gradeTableResult.rows[0].exists);
      
      // Check if Headcount table exists
      const headcountTableQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'Headcount'
        );
      `;
      
      const headcountTableResult = await client.query(headcountTableQuery);
      console.log('Headcount table exists:', headcountTableResult.rows[0].exists);
    }
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Database schema check failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

checkDatabaseSchema();
