#!/usr/bin/env node

/**
 * Database Performance Optimization Script for Fit Score Queries
 * This script helps optimize the database for better fit score query performance
 */

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

// Configuration
const config = {
  dbHost: process.env.POSTGRES_HOST || 'localhost',
  dbPort: process.env.POSTGRES_PORT || 5432,
  dbUser: process.env.POSTGRES_USER || 'postgres',
  dbPassword: process.env.POSTGRES_PASSWORD || 'password',
  dbName: process.env.POSTGRES_DB || 'studio',
};

console.log('Database configuration:', {
  host: config.dbHost,
  port: config.dbPort,
  user: config.dbUser,
  database: config.dbName,
  hasPassword: !!config.dbPassword
});

// Database connection
const pool = new Pool({
  host: config.dbHost,
  port: config.dbPort,
  user: config.dbUser,
  password: config.dbPassword,
  database: config.dbName,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased timeout
});

// Logging utility
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`, data);
}

// Test database connection
async function testConnection() {
  const client = await pool.connect();
  try {
    log('INFO', 'Testing database connection...');
    
    const result = await client.query('SELECT 1 as test');
    log('SUCCESS', 'Database connection successful', { result: result.rows[0] });
    
    return true;
  } catch (error) {
    log('ERROR', 'Database connection failed:', error.message);
    return false;
  } finally {
    client.release();
  }
}

// Check if indexes exist
async function checkIndexes() {
  const client = await pool.connect();
  try {
    log('INFO', 'Checking existing indexes...');
    
    const result = await client.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename IN ('Candidate', 'JobMatch')
      ORDER BY tablename, indexname;
    `);
    
    log('INFO', `Found ${result.rows.length} indexes for Candidate and JobMatch tables`);
    
    result.rows.forEach(row => {
      log('INFO', `Index: ${row.indexname} on ${row.tablename}`);
    });
    
    return result.rows;
  } catch (error) {
    log('ERROR', 'Failed to check indexes:', error.message);
    return [];
  } finally {
    client.release();
  }
}

// Create performance indexes if they don't exist
async function createPerformanceIndexes() {
  const client = await pool.connect();
  try {
    log('INFO', 'Creating performance indexes...');
    
    const indexes = [
      // Index for fit score queries
      {
        name: 'idx_candidate_fit_score',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidate_fit_score ON "Candidate" ("fitScore") WHERE "fitScore" IS NOT NULL;'
      },
      // Index for application date queries
      {
        name: 'idx_candidate_application_date',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidate_application_date ON "Candidate" ("applicationDate");'
      },
      // Index for status queries
      {
        name: 'idx_candidate_status',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidate_status ON "Candidate" (status);'
      }
    ];
    
    for (const index of indexes) {
      try {
        log('INFO', `Creating index: ${index.name}`);
        await client.query(index.query);
        log('SUCCESS', `Index created: ${index.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          log('INFO', `Index already exists: ${index.name}`);
        } else {
          log('ERROR', `Failed to create index ${index.name}:`, error.message);
        }
      }
    }
    
  } catch (error) {
    log('ERROR', 'Failed to create indexes:', error.message);
  } finally {
    client.release();
  }
}

// Analyze table statistics
async function analyzeTables() {
  const client = await pool.connect();
  try {
    log('INFO', 'Analyzing table statistics...');
    
    const tables = ['Candidate'];
    
    for (const table of tables) {
      try {
        log('INFO', `Analyzing table: ${table}`);
        await client.query(`ANALYZE "${table}";`);
        log('SUCCESS', `Table analyzed: ${table}`);
      } catch (error) {
        log('ERROR', `Failed to analyze table ${table}:`, error.message);
      }
    }
    
  } catch (error) {
    log('ERROR', 'Failed to analyze tables:', error.message);
  } finally {
    client.release();
  }
}

// Test query performance
async function testQueryPerformance() {
  const client = await pool.connect();
  try {
    log('INFO', 'Testing query performance...');
    
    const testQuery = {
      name: 'Simple fit score count',
      query: `
        SELECT 
          CASE 
            WHEN "fitScore" IS NULL OR "fitScore" = 0 THEN 'no-score'
            WHEN "fitScore" >= 0.81 THEN 'A'
            WHEN "fitScore" >= 0.61 THEN 'B'
            WHEN "fitScore" >= 0.41 THEN 'C'
            WHEN "fitScore" >= 0.21 THEN 'D'
            ELSE 'E'
          END as grade,
          COUNT(*) as count
        FROM "Candidate"
        GROUP BY 
          CASE 
            WHEN "fitScore" IS NULL OR "fitScore" = 0 THEN 'no-score'
            WHEN "fitScore" >= 0.81 THEN 'A'
            WHEN "fitScore" >= 0.61 THEN 'B'
            WHEN "fitScore" >= 0.41 THEN 'C'
            WHEN "fitScore" >= 0.21 THEN 'D'
            ELSE 'E'
          END
        ORDER BY grade;
      `
    };
    
    try {
      log('INFO', `Testing query: ${testQuery.name}`);
      
      const startTime = Date.now();
      const result = await client.query(testQuery.query);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      log('SUCCESS', `Query completed: ${testQuery.name}`, {
        duration: `${duration}ms`,
        rowCount: result.rows.length,
        results: result.rows
      });
      
    } catch (error) {
      log('ERROR', `Query failed: ${testQuery.name}`, error.message);
    }
    
  } catch (error) {
    log('ERROR', 'Failed to test query performance:', error.message);
  } finally {
    client.release();
  }
}

// Main execution
async function main() {
  try {
    log('INFO', 'Starting database performance optimization...');
    
    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      log('ERROR', 'Cannot proceed without database connection');
      return;
    }
    
    // Check existing indexes
    await checkIndexes();
    
    // Create performance indexes
    await createPerformanceIndexes();
    
    // Analyze tables
    await analyzeTables();
    
    // Test query performance
    await testQueryPerformance();
    
    log('SUCCESS', 'Database performance optimization completed');
    
  } catch (error) {
    log('ERROR', 'Performance optimization failed:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  testConnection,
  checkIndexes,
  createPerformanceIndexes,
  analyzeTables,
  testQueryPerformance
};
