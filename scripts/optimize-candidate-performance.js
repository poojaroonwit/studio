#!/usr/bin/env node

/**
 * Candidate Performance Optimization Script
 * 
 * This script helps optimize database performance for candidate queries
 * and identifies potential issues that might cause timeouts.
 */

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.DATABASE_MAX_CONNECTIONS) || 10,
  idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT) || 1800000,
  statement_timeout: parseInt(process.env.DATABASE_STATEMENT_TIMEOUT) || 30000,
  allowExitOnIdle: false,
});

// Utility functions
function log(message, data = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data);
}

function logError(message, error) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR: ${message}`, error);
}

async function checkDatabaseHealth() {
  log('🔍 Checking database health...');
  
  try {
    const client = await pool.connect();
    
    // Check active connections
    const connectionsResult = await client.query(`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections,
        count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `);
    
    const connections = connectionsResult.rows[0];
    log('📊 Connection pool status:', connections);
    
    // Check for long-running queries
    const longRunningResult = await client.query(`
      SELECT 
        pid,
        now() - pg_stat_activity.query_start AS duration,
        query
      FROM pg_stat_activity 
      WHERE (now() - pg_stat_activity.query_start) > interval '30 seconds'
        AND state = 'active'
        AND datname = current_database()
      ORDER BY duration DESC
    `);
    
    if (longRunningResult.rows.length > 0) {
      log('⚠️  Long-running queries detected:', { count: longRunningResult.rows.length });
      longRunningResult.rows.forEach((row, index) => {
        log(`  Query ${index + 1}:`, {
          pid: row.pid,
          duration: row.duration,
          query: row.query.substring(0, 100) + '...'
        });
      });
    } else {
      log('✅ No long-running queries detected');
    }
    
    // Check table sizes
    const tableSizesResult = await client.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables 
      WHERE schemaname = 'public'
        AND tablename IN ('Candidate', 'JobMatch', 'Attachment', 'Position', 'User', 'CandidateSource')
      ORDER BY size_bytes DESC
    `);
    
    log('📦 Table sizes:', tableSizesResult.rows);
    
    // Check indexes
    const indexesResult = await client.query(`
      SELECT 
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
        AND tablename IN ('Candidate', 'JobMatch', 'Attachment', 'Position', 'User', 'CandidateSource')
      ORDER BY tablename, indexname
    `);
    
    log('🔍 Indexes found:', { count: indexesResult.rows.length });
    indexesResult.rows.forEach(row => {
      log(`  ${row.tablename}.${row.indexname}:`, { definition: row.indexdef });
    });
    
    client.release();
    
  } catch (error) {
    logError('Failed to check database health', error);
  }
}

async function createPerformanceIndexes() {
  log('🔧 Creating performance indexes...');
  
  try {
    const client = await pool.connect();
    
    // Set longer timeout for index creation
    await client.query('SET statement_timeout = 300000'); // 5 minutes
    
    const indexes = [
      // Candidate table indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidate_id ON "Candidate"(id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidate_position_id ON "Candidate"("positionId")',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidate_recruiter_id ON "Candidate"("recruiterId")',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidate_source_id ON "Candidate"("sourceId")',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidate_status ON "Candidate"(status)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidate_created_at ON "Candidate"("createdAt")',
      
      // JobMatch table indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobmatch_candidate_id ON "JobMatch"("candidateId")',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobmatch_job_id ON "JobMatch"("jobId")',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobmatch_fit_score ON "JobMatch"("fitScore")',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobmatch_created_at ON "JobMatch"("createdAt")',
      
      // Attachment table indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attachment_candidate_id ON "Attachment"("candidateId")',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attachment_uploaded_by_id ON "Attachment"("uploadedById")',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attachment_uploaded_at ON "Attachment"("uploadedAt")',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attachment_is_primary ON "Attachment"("isPrimary")',
      
      // Position table indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_position_id ON "Position"(id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_position_department ON "Position"(department)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_position_is_open ON "Position"("isOpen")',
      
      // User table indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_id ON "User"(id)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_role ON "User"(role)',
      
      // CandidateSource table indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidatesource_id ON "CandidateSource"(id)'
    ];
    
    for (const indexQuery of indexes) {
      try {
        log(`Creating index: ${indexQuery}`);
        await client.query(indexQuery);
        log(`✅ Index created successfully`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          log(`ℹ️  Index already exists`);
        } else {
          logError(`Failed to create index: ${indexQuery}`, error);
        }
      }
    }
    
    // Update table statistics
    log('📊 Updating table statistics...');
    const tables = ['Candidate', 'JobMatch', 'Attachment', 'Position', 'User', 'CandidateSource'];
    for (const table of tables) {
      try {
        await client.query(`ANALYZE "${table}"`);
        log(`✅ Analyzed table: ${table}`);
      } catch (error) {
        logError(`Failed to analyze table: ${table}`, error);
      }
    }
    
    client.release();
    
  } catch (error) {
    logError('Failed to create performance indexes', error);
  }
}

async function testCandidateQuery(candidateId = null) {
  log('🧪 Testing candidate query performance...');
  
  try {
    const client = await pool.connect();
    
    // Get a test candidate ID if not provided
    if (!candidateId) {
      const candidateResult = await client.query('SELECT id FROM "Candidate" LIMIT 1');
      if (candidateResult.rows.length === 0) {
        log('❌ No candidates found in database');
        client.release();
        return;
      }
      candidateId = candidateResult.rows[0].id;
    }
    
    log(`Testing with candidate ID: ${candidateId}`);
    
    // Test the optimized query
    const startTime = Date.now();
    const testQuery = `
      WITH candidate_data AS (
        SELECT 
          c.*,
          p.title as "positionTitle", 
          p.department as "positionDepartment",
          r.name as "recruiterName", 
          r."avatarUrl" as "recruiterAvatarUrl",
          cs.name as "sourceName", 
          cs.description as "sourceDescription", 
          cs.logo as "sourceLogo"
        FROM "Candidate" c
        LEFT JOIN "Position" p ON c."positionId" = p.id
        LEFT JOIN "User" r ON c."recruiterId" = r.id
        LEFT JOIN "CandidateSource" cs ON c."sourceId" = cs.id
        WHERE c.id = $1::uuid
      ),
      job_matches_data AS (
        SELECT 
          jm.id,
          jm."candidateId",
          jm."jobId",
          jm."fitScore",
          jm."createdAt",
          jm."updatedAt",
          p.title as "positionTitle",
          p.department as "positionDepartment",
          p.description as "positionDescription"
        FROM "JobMatch" jm
        LEFT JOIN "Position" p ON jm."jobId" = p.id
        WHERE jm."candidateId" = $1::uuid
        ORDER BY jm."fitScore" DESC NULLS LAST
        LIMIT 5
      ),
      attachments_data AS (
        SELECT 
          a.id,
          a."candidateId",
          a."uploadedById",
          a."filePath",
          a."fileName",
          a.label,
          a."isPrimary",
          a."uploadedAt",
          a."updatedAt",
          a."headcountId",
          u.name as "uploadedByUserName"
        FROM "Attachment" a
        LEFT JOIN "User" u ON a."uploadedById" = u.id
        WHERE a."candidateId" = $1::uuid
        ORDER BY a."uploadedAt" DESC NULLS LAST
        LIMIT 3
      )
      SELECT 
        'candidate' as data_type,
        to_json(c.*) as data
      FROM candidate_data c
      UNION ALL
      SELECT 
        'job_matches' as data_type,
        COALESCE(json_agg(to_json(jm.*)), '[]'::json) as data
      FROM job_matches_data jm
      UNION ALL
      SELECT 
        'attachments' as data_type,
        COALESCE(json_agg(to_json(a.*)), '[]'::json) as data
      FROM attachments_data a
    `;
    
    const result = await client.query(testQuery, [candidateId]);
    const queryTime = Date.now() - startTime;
    
    log(`✅ Query completed in ${queryTime}ms`);
    log(`📊 Results:`, {
      rows: result.rows.length,
      candidateFound: result.rows.some(row => row.data_type === 'candidate'),
      jobMatchesCount: result.rows.find(row => row.data_type === 'job_matches')?.data?.length || 0,
      attachmentsCount: result.rows.find(row => row.data_type === 'attachments')?.data?.length || 0
    });
    
    if (queryTime > 5000) {
      log('⚠️  Query is taking longer than expected (>5s)');
    } else if (queryTime > 1000) {
      log('⚠️  Query is taking longer than ideal (>1s)');
    } else {
      log('✅ Query performance is good');
    }
    
    client.release();
    
  } catch (error) {
    logError('Failed to test candidate query', error);
  }
}

async function main() {
  log('🚀 Starting candidate performance optimization...');
  
  try {
    // Check database health
    await checkDatabaseHealth();
    
    // Create performance indexes
    await createPerformanceIndexes();
    
    // Test candidate query
    await testCandidateQuery();
    
    log('✅ Performance optimization completed');
    
  } catch (error) {
    logError('Performance optimization failed', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  checkDatabaseHealth,
  createPerformanceIndexes,
  testCandidateQuery
};
