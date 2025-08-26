const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkAllTables() {
  console.log('🔍 Checking All Tables in Database...\n');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const client = await pool.connect();
    
    console.log('📊 Database Connection Info:');
    console.log(`  URL: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@')}`);
    console.log(`  Database: ${client.connectionParameters.database}`);
    console.log(`  Host: ${client.connectionParameters.host}`);
    console.log(`  Port: ${client.connectionParameters.port}`);
    console.log('');
    
    // List all tables
    const tables = await client.query(`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 All Tables in Database:');
    tables.rows.forEach(row => {
      console.log(`  ${row.table_name} (${row.table_type})`);
    });
    console.log('');
    
    // Check for any tables that might contain queue data
    const queueRelatedTables = tables.rows.filter(table => 
      table.table_name.toLowerCase().includes('queue') ||
      table.table_name.toLowerCase().includes('upload') ||
      table.table_name.toLowerCase().includes('job') ||
      table.table_name.toLowerCase().includes('process')
    );
    
    if (queueRelatedTables.length > 0) {
      console.log('🔍 Queue-related tables found:');
      queueRelatedTables.forEach(table => {
        console.log(`  ${table.table_name}`);
      });
      console.log('');
    }
    
    // Check if upload_queue table exists and has data
    const uploadQueueExists = tables.rows.some(table => table.table_name === 'upload_queue');
    
    if (uploadQueueExists) {
      console.log('✅ upload_queue table exists');
      
      // Check table structure
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'upload_queue'
        ORDER BY ordinal_position
      `);
      
      console.log('\n📋 upload_queue table structure:');
      columns.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Check row count
      const rowCount = await client.query('SELECT COUNT(*) as count FROM upload_queue');
      console.log(`\n📈 Total rows in upload_queue: ${rowCount.rows[0].count}`);
      
      if (rowCount.rows[0].count > 0) {
        // Show sample data
        const sampleData = await client.query('SELECT * FROM upload_queue LIMIT 3');
        console.log('\n📋 Sample data:');
        sampleData.rows.forEach((row, index) => {
          console.log(`  Row ${index + 1}:`, JSON.stringify(row, null, 2));
        });
      }
    } else {
      console.log('❌ upload_queue table does not exist');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

checkAllTables();
