#!/usr/bin/env node

/**
 * Test Candidate Query Performance
 * 
 * This script tests the candidate query performance to identify bottlenecks
 */

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

async function testCandidateQuery() {
  console.log('🔍 Testing Candidate Query Performance');
  console.log('=====================================\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set in .env.local');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    statement_timeout: 30000, // 30 seconds
  });

  try {
    console.log('✅ Database connection established');

    // First, get a sample candidate ID
    console.log('\n📋 Getting sample candidate ID...');
    const sampleResult = await pool.query('SELECT id FROM "Candidate" LIMIT 1');
    
    if (sampleResult.rows.length === 0) {
      console.log('❌ No candidates found in database');
      return;
    }

    const candidateId = sampleResult.rows[0].id;
    console.log(`✅ Found candidate ID: ${candidateId}`);

    // Test the original query (3 separate queries)
    console.log('\n🔍 Testing original query approach (3 separate queries)...');
    const startTime1 = Date.now();
    
    try {
      // Query 1: Candidate with joins
      const candidateQuery = `
        SELECT c.*, p.title as "positionTitle", p.department as "positionDepartment", r.name as "recruiterName",
               cs.name as "sourceName", cs.description as "sourceDescription", cs.logo as "sourceLogo"
        FROM "Candidate" c
        LEFT JOIN "Position" p ON c."positionId" = p.id
        LEFT JOIN "User" r ON c."recruiterId" = r.id
        LEFT JOIN "CandidateSource" cs ON c."sourceId" = cs.id
        WHERE c.id = $1::uuid;
      `;
      const candidateResult = await pool.query(candidateQuery, [candidateId]);
      
      // Query 2: Job matches
      const jobMatchesQuery = `
        SELECT 
          jm.*,
          p.title as "positionTitle",
          p.department as "positionDepartment",
          p.description as "positionDescription"
        FROM "JobMatch" jm
        LEFT JOIN "Position" p ON jm."jobId" = p.id
        WHERE jm."candidateId" = $1::uuid
        ORDER BY jm."fitScore" DESC;
      `;
      const jobMatchesResult = await pool.query(jobMatchesQuery, [candidateId]);
      
      // Query 3: Attachments
      const attachmentsQuery = `
        SELECT a.*, u.name as "uploadedByUserName"
        FROM "Attachment" a
        LEFT JOIN "User" u ON a."uploadedById" = u.id
        WHERE a."candidateId" = $1::uuid
        ORDER BY a."uploadedAt" DESC;
      `;
      const attachmentsResult = await pool.query(attachmentsQuery, [candidateId]);
      
      const endTime1 = Date.now();
      console.log(`✅ Original approach completed in ${endTime1 - startTime1}ms`);
      console.log(`   - Candidate data: ${candidateResult.rows.length} rows`);
      console.log(`   - Job matches: ${jobMatchesResult.rows.length} rows`);
      console.log(`   - Attachments: ${attachmentsResult.rows.length} rows`);
      
    } catch (error) {
      console.error('❌ Original query approach failed:', error.message);
    }

    // Test the optimized query (single query with CTEs)
    console.log('\n🔍 Testing optimized query approach (single query with CTEs)...');
    const startTime2 = Date.now();
    
    try {
      const optimizedQuery = `
        WITH candidate_data AS (
          SELECT c.*, p.title as "positionTitle", p.department as "positionDepartment", 
                 r.name as "recruiterName", cs.name as "sourceName", 
                 cs.description as "sourceDescription", cs.logo as "sourceLogo"
          FROM "Candidate" c
          LEFT JOIN "Position" p ON c."positionId" = p.id
          LEFT JOIN "User" r ON c."recruiterId" = r.id
          LEFT JOIN "CandidateSource" cs ON c."sourceId" = cs.id
          WHERE c.id = $1::uuid
        ),
        job_matches_data AS (
          SELECT 
            jm.*,
            p.title as "positionTitle",
            p.department as "positionDepartment",
            p.description as "positionDescription"
          FROM "JobMatch" jm
          LEFT JOIN "Position" p ON jm."jobId" = p.id
          WHERE jm."candidateId" = $1::uuid
          ORDER BY jm."fitScore" DESC
        ),
        attachments_data AS (
          SELECT a.*, u.name as "uploadedByUserName"
          FROM "Attachment" a
          LEFT JOIN "User" u ON a."uploadedById" = u.id
          WHERE a."candidateId" = $1::uuid
          ORDER BY a."uploadedAt" DESC
        )
        SELECT 
          (SELECT row_to_json(cd.*) FROM candidate_data cd) as candidate,
          (SELECT COALESCE(json_agg(jm.*), '[]'::json) FROM job_matches_data jm) as job_matches,
          (SELECT COALESCE(json_agg(ad.*), '[]'::json) FROM attachments_data ad) as attachments;
      `;
      
      const result = await pool.query(optimizedQuery, [candidateId]);
      
      const endTime2 = Date.now();
      console.log(`✅ Optimized approach completed in ${endTime2 - startTime2}ms`);
      
      if (result.rows[0] && result.rows[0].candidate) {
        const candidate = result.rows[0].candidate;
        const jobMatches = result.rows[0].job_matches || [];
        const attachments = result.rows[0].attachments || [];
        
        console.log(`   - Candidate data: 1 row`);
        console.log(`   - Job matches: ${jobMatches.length} rows`);
        console.log(`   - Attachments: ${attachments.length} rows`);
      }
      
    } catch (error) {
      console.error('❌ Optimized query approach failed:', error.message);
    }

    // Test database connection pool status
    console.log('\n📊 Database Connection Pool Status:');
    console.log(`   - Total connections: ${pool.totalCount}`);
    console.log(`   - Idle connections: ${pool.idleCount}`);
    console.log(`   - Waiting connections: ${pool.waitingCount}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
    console.log('\n✅ Database connection closed');
  }
}

testCandidateQuery();
