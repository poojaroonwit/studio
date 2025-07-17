#!/usr/bin/env node

import { Pool } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

/**
 * Check existing database schema and determine what needs to be created
 */
async function checkDatabaseSchema() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🔍 Checking database schema...');
  console.log(`📊 Database URL: ${databaseUrl.replace(/\/\/.*@/, '//***:***@')}`);

  const pool = new Pool({ connectionString: databaseUrl });
  
  try {
    const client = await pool.connect();
    
    // Check if tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const tablesResult = await client.query(tablesQuery);
    const existingTables = tablesResult.rows.map(row => row.table_name);
    
    console.log('\n📋 Existing tables:');
    if (existingTables.length === 0) {
      console.log('   No tables found');
    } else {
      existingTables.forEach(table => console.log(`   - ${table}`));
    }
    
    // Check for specific required tables
    const requiredTables = [
      'User', 'Candidate', 'Position', 'RecruitmentStage', 
      'TransitionRecord', 'LogEntry', 'UserGroup', 'User_UserGroup',
      'JobMatch', 'UploadQueue', 'ResumeHistory', 'NotificationEvent',
      'NotificationChannel', 'NotificationSetting', 'CustomFieldDefinition',
      'SystemSetting', 'WebhookFieldMapping', 'AuditLog', 'Account',
      'DataModel', 'SystemPreference', 'UserUIDisplayPreference'
    ];
    
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    const existingRequiredTables = requiredTables.filter(table => existingTables.includes(table));
    
    console.log('\n✅ Required tables found:');
    existingRequiredTables.forEach(table => console.log(`   - ${table}`));
    
    if (missingTables.length > 0) {
      console.log('\n❌ Missing required tables:');
      missingTables.forEach(table => console.log(`   - ${table}`));
    }
    
    // Check if admin user exists
    let hasAdminUser = false;
    if (existingTables.includes('User')) {
      const adminCheck = await client.query('SELECT COUNT(*) FROM "User" WHERE email = $1', ['admin@ncc.com']);
      hasAdminUser = parseInt(adminCheck.rows[0].count) > 0;
    }
    
    console.log('\n👤 Admin user exists:', hasAdminUser ? '✅ Yes' : '❌ No');
    
    // Check if positions exist
    let hasPositions = false;
    if (existingTables.includes('Position')) {
      const positionCheck = await client.query('SELECT COUNT(*) FROM "Position"');
      hasPositions = parseInt(positionCheck.rows[0].count) > 0;
    }
    
    console.log('💼 Positions exist:', hasPositions ? '✅ Yes' : '❌ No');
    
    // Check if recruitment stages exist
    let hasStages = false;
    if (existingTables.includes('RecruitmentStage')) {
      const stageCheck = await client.query('SELECT COUNT(*) FROM "RecruitmentStage"');
      hasStages = parseInt(stageCheck.rows[0].count) > 0;
    }
    
    console.log('📊 Recruitment stages exist:', hasStages ? '✅ Yes' : '❌ No');
    
    // Determine what needs to be done
    console.log('\n🔧 Required actions:');
    
    if (missingTables.length > 0) {
      console.log('   1. Run database migrations to create missing tables');
      console.log('      npx prisma migrate deploy');
    }
    
    if (!hasAdminUser || !hasPositions || !hasStages) {
      console.log('   2. Seed the database with initial data');
      console.log('      npx prisma db seed');
    }
    
    if (missingTables.length === 0 && hasAdminUser && hasPositions && hasStages) {
      console.log('   ✅ Database is fully configured and ready to use!');
    }
    
    // Database connection info
    console.log('\n📊 Database connection info:');
    const urlParts = new URL(databaseUrl);
    console.log(`   Host: ${urlParts.hostname}`);
    console.log(`   Port: ${urlParts.port || '8521'}`);
    console.log(`   Database: ${urlParts.pathname.slice(1)}`);
    console.log(`   User: ${urlParts.username}`);
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error checking database schema:', error.message);
    console.log('\n🔍 Troubleshooting:');
    console.log('   1. Ensure PostgreSQL is running');
    console.log('   2. Verify DATABASE_URL is correct');
    console.log('   3. Check if the database exists');
    console.log('   4. Ensure the user has proper permissions');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the check
checkDatabaseSchema().catch(console.error); 