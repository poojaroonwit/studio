#!/usr/bin/env node

import { Pool } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

/**
 * Check the actual User table structure
 */
async function checkUserTable() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🔍 Checking User table structure...');
  console.log(`📊 Database URL: ${databaseUrl.replace(/\/\/.*@/, '//***:***@')}`);

  const pool = new Pool({ connectionString: databaseUrl });
  
  try {
    const client = await pool.connect();
    
    // Check User table columns
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'User' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
    
    const columnsResult = await client.query(columnsQuery);
    const columns = columnsResult.rows;
    
    console.log('\n📋 User table columns:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check for users with null passwords
    const nullPasswordQuery = `
      SELECT id, name, email, "createdAt"
      FROM "User" 
      WHERE password IS NULL OR password = '';
    `;
    
    const nullPasswordResult = await client.query(nullPasswordQuery);
    const usersWithNullPassword = nullPasswordResult.rows;
    
    console.log(`\n📋 Found ${usersWithNullPassword.length} users with null/empty passwords:`);
    
    if (usersWithNullPassword.length === 0) {
      console.log('   ✅ No users with null passwords found');
    } else {
      usersWithNullPassword.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - Created: ${user.createdAt.toISOString().split('T')[0]}`);
      });
    }
    
    // Check total users
    const totalUsersQuery = `SELECT COUNT(*) as count FROM "User";`;
    const totalUsersResult = await client.query(totalUsersQuery);
    const totalUsers = parseInt(totalUsersResult.rows[0].count);
    
    console.log(`\n📊 Total users in database: ${totalUsers}`);
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error checking User table:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the check
checkUserTable().catch(console.error); 