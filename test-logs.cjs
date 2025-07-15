const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/studiodb'
});

async function testLogs() {
  const client = await pool.connect();
  
  try {
    // Check if LogEntry table exists and has data
    console.log('Checking LogEntry table...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'LogEntry'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ LogEntry table does not exist!');
      return;
    }
    
    console.log('✅ LogEntry table exists');
    
    // Check how many log entries exist
    const countResult = await client.query('SELECT COUNT(*) FROM "LogEntry"');
    const count = parseInt(countResult.rows[0].count);
    console.log(`📊 Found ${count} log entries in database`);
    
    if (count === 0) {
      console.log('📝 Adding a test log entry...');
      
      // Add a test log entry
      const insertResult = await client.query(`
        INSERT INTO "LogEntry" (timestamp, level, message, source, "actingUserId", details, "createdAt")
        VALUES (NOW(), 'INFO', 'Test log entry from script', 'TestScript', NULL, '{"test": true}', NOW())
        RETURNING *;
      `);
      
      console.log('✅ Added test log entry:', insertResult.rows[0]);
    } else {
      // Show some recent log entries
      console.log('📋 Recent log entries:');
      const recentLogs = await client.query(`
        SELECT l.*, u.name as "actingUserName"
        FROM "LogEntry" l
        LEFT JOIN "User" u ON l."actingUserId" = u.id
        ORDER BY l.timestamp DESC
        LIMIT 5;
      `);
      
      recentLogs.rows.forEach((log, index) => {
        console.log(`${index + 1}. [${log.level}] ${log.message} (${log.timestamp})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testLogs(); 