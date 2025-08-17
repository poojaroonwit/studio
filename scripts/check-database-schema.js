#!/usr/bin/env node

/**
 * Database Schema Check Script
 * 
 * This script checks if the database connection is working and verifies
 * that the required tables exist in the database.
 */

const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env.local') });

// Colors for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    const timestamp = new Date().toISOString();
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

async function checkDatabaseConnection() {
    const prisma = new PrismaClient();
    
    try {
        logInfo('Checking database connection...');
        
        // Test basic connection
        await prisma.$connect();
        logSuccess('Database connection successful');
        
        // Try to query the database
        const result = await prisma.$queryRaw`SELECT version() as version`;
        if (result && result.length > 0) {
            logSuccess(`Connected to PostgreSQL: ${result[0].version.split(' ')[0]} ${result[0].version.split(' ')[1]}`);
        }
        
        return true;
    } catch (error) {
        logError(`Database connection failed: ${error.message}`);
        
        if (error.code === 'ECONNREFUSED') {
            logWarning('Connection refused - make sure PostgreSQL is running');
            logInfo('For Docker: npm run start:docker');
            logInfo('For local PostgreSQL: check if the service is running');
        } else if (error.message.includes('authentication failed')) {
            logWarning('Authentication failed - check your database credentials in .env.local');
        } else if (error.message.includes('database') && error.message.includes('does not exist')) {
            logWarning('Database does not exist - you may need to create it first');
        }
        
        return false;
    } finally {
        await prisma.$disconnect();
    }
}

const { Pool } = require('pg');

async function checkDatabaseSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    
    console.log('🔍 Checking database schema...\n');
    
    // Check if tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('SystemPrompt', 'SystemPromptCategory')
      ORDER BY table_name
    `);
    
    console.log('📋 Existing tables:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    if (tables.rows.length === 0) {
      console.log('❌ No SystemPrompt or SystemPromptCategory tables found!');
      return;
    }
    
    // Check SystemPrompt table structure
    if (tables.rows.some(row => row.table_name === 'SystemPrompt')) {
      console.log('\n📝 SystemPrompt table structure:');
      const systemPromptColumns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'SystemPrompt' 
        ORDER BY ordinal_position
      `);
      
      systemPromptColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'} ${col.column_default ? `DEFAULT: ${col.column_default}` : ''}`);
      });
      
      // Check SystemPrompt data
      const systemPromptCount = await client.query('SELECT COUNT(*) as count FROM "SystemPrompt"');
      console.log(`\n📊 SystemPrompt records: ${systemPromptCount.rows[0].count}`);
      
      if (systemPromptCount.rows[0].count > 0) {
        const samplePrompts = await client.query('SELECT id, name, "categoryId", category FROM "SystemPrompt" LIMIT 3');
        console.log('Sample records:');
        samplePrompts.rows.forEach(prompt => {
          console.log(`  - ${prompt.name} (categoryId: ${prompt.categoryId}, category: ${prompt.category})`);
        });
      }
    }
    
    // Check SystemPromptCategory table structure
    if (tables.rows.some(row => row.table_name === 'SystemPromptCategory')) {
      console.log('\n📂 SystemPromptCategory table structure:');
      const categoryColumns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'SystemPromptCategory' 
        ORDER BY ordinal_position
      `);
      
      categoryColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'} ${col.column_default ? `DEFAULT: ${col.column_default}` : ''}`);
      });
      
      // Check SystemPromptCategory data
      const categoryCount = await client.query('SELECT COUNT(*) as count FROM "SystemPromptCategory"');
      console.log(`\n📊 SystemPromptCategory records: ${categoryCount.rows[0].count}`);
      
      if (categoryCount.rows[0].count > 0) {
        const categories = await client.query('SELECT id, name, description FROM "SystemPromptCategory"');
        console.log('Categories:');
        categories.rows.forEach(category => {
          console.log(`  - ${category.name} (${category.description || 'No description'})`);
        });
      } else {
        console.log('❌ No categories found! This is why system prompts are failing.');
      }
    }
    
    // Check foreign key constraints
    console.log('\n🔗 Foreign key constraints:');
    const foreignKeys = await client.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name IN ('SystemPrompt', 'SystemPromptCategory')
    `);
    
    foreignKeys.rows.forEach(fk => {
      console.log(`  - ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });
    
    client.release();
  } catch (error) {
    console.error('❌ Error checking database schema:', error.message);
  } finally {
    await pool.end();
  }
}

async function checkMigrationStatus() {
    const prisma = new PrismaClient();
    
    try {
        logInfo('Checking migration status...');
        
        // Check if _prisma_migrations table exists
        const migrationTableExists = await prisma.$queryRaw`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = '_prisma_migrations'
            );
        `;
        
        if (migrationTableExists[0].exists) {
            // Get migration status
            const migrations = await prisma.$queryRaw`
                SELECT migration_name, finished_at, applied_steps_count 
                FROM _prisma_migrations 
                ORDER BY started_at DESC 
                LIMIT 5;
            `;
            
            if (migrations.length > 0) {
                logSuccess(`Found ${migrations.length} recent migrations`);
                migrations.forEach((migration, index) => {
                    const status = migration.finished_at ? '✅' : '⏳';
                    logInfo(`  ${status} ${migration.migration_name} (${migration.applied_steps_count} steps)`);
                });
            } else {
                logWarning('No migrations found in the database');
            }
        } else {
            logWarning('Migration table does not exist - database may not be initialized');
            logInfo('Run: npm run db:migrate');
        }
        
        return true;
    } catch (error) {
        logError(`Migration status check failed: ${error.message}`);
        return false;
    } finally {
        await prisma.$disconnect();
    }
}

async function main() {
    console.log('');
    log('🔍 Database Health Check', 'blue');
    console.log('');
    
    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
        logError('DATABASE_URL environment variable is not set');
        logInfo('Make sure you have .env.local configured with DATABASE_URL');
        process.exit(1);
    }
    
    logInfo(`Using database: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@')}`);
    console.log('');
    
    let exitCode = 0;
    
    // Step 1: Check database connection
    const connectionOk = await checkDatabaseConnection();
    if (!connectionOk) {
        exitCode = 1;
    }
    console.log('');
    
    // Step 2: Check database schema (only if connection works)
    if (connectionOk) {
        const schemaOk = await checkDatabaseSchema();
        if (!schemaOk) {
            exitCode = 1;
        }
        console.log('');
        
        // Step 3: Check migration status
        await checkMigrationStatus();
        console.log('');
    }
    
    if (exitCode === 0) {
        logSuccess('Database health check completed successfully!');
    } else {
        logWarning('Database health check completed with issues');
        logInfo('Please address the issues above before running the application');
    }
    
    process.exit(exitCode);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    logError(`Uncaught exception: ${error.message}`);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logError(`Unhandled rejection at ${promise}: ${reason}`);
    process.exit(1);
});

// Run the check
main().catch((error) => {
    logError(`Unexpected error: ${error.message}`);
    process.exit(1);
});