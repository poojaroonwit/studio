#!/usr/bin/env node

const { Client } = require('pg');

async function checkN8nDatabase() {
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'secure_password',
    database: 'postgres', // Connect to default database first
  });

  try {
    console.log('🔍 Checking n8n database status...');
    
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Check if n8n database exists
    const result = await client.query(`
      SELECT datname 
      FROM pg_database 
      WHERE datname = 'n8n'
    `);

    if (result.rows.length > 0) {
      console.log('✅ n8n database exists');
      
      // Try to connect to n8n database
      await client.end();
      
      const n8nClient = new Client({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'secure_password',
        database: 'n8n',
      });

      await n8nClient.connect();
      console.log('✅ Successfully connected to n8n database');
      await n8nClient.end();
      
    } else {
      console.log('❌ n8n database does not exist');
      console.log('📝 Creating n8n database...');
      
      await client.query('CREATE DATABASE n8n');
      await client.query('GRANT ALL PRIVILEGES ON DATABASE n8n TO postgres');
      
      console.log('✅ n8n database created successfully');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Check if PostgreSQL container is running');
    console.log('2. Verify database credentials in environment variables');
    console.log('3. Check if the init-n8n-db.sql script is being executed');
    console.log('4. Try running the manual database creation script');
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// Load environment variables if .env file exists
try {
  require('dotenv').config();
} catch (error) {
  // dotenv not available, continue without it
}

checkN8nDatabase(); 