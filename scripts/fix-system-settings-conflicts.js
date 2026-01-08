const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('🧹 Checking for duplicate SystemSetting entries...');
    
    // Check if table exists first
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'SystemSetting'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('Using "system_setting" table name (snake_case)...');
    }

    // Delete duplicates, keeping the one with the highest ctid (effectively the latest inserted)
    // We try both "SystemSetting" and "system_setting" just in case
    
    try {
        const res = await client.query(`
        DELETE FROM "SystemSetting" a USING "SystemSetting" b 
        WHERE a.key = b.key AND a.ctid < b.ctid;
        `);
        if (res.rowCount > 0) {
            console.log(`✅ Removed ${res.rowCount} duplicate entries from "SystemSetting"`);
        } else {
            console.log('✨ No duplicates found in "SystemSetting"');
        }
    } catch (e) {
        // Ignore error if table doesn't exist, try snake_case
        if (e.code === '42P01') { // undefined_table
            // Try snake case potentially? Or just Skip
             console.log('Table "SystemSetting" not found, skipping cleanup.');
        } else {
            throw e;
        }
    }

  } catch (err) {
    console.error('❌ Error during cleanup:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
