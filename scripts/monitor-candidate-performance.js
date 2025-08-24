#!/usr/bin/env node

/**
 * Performance monitoring script for candidate detail page
 * This script helps identify slow queries and performance bottlenecks
 */

const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function checkCandidateQueryPerformance() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking candidate query performance...');
    
    // Test the main candidate query performance
    const candidateId = process.argv[2];
    if (!candidateId) {
      console.error('❌ Please provide a candidate ID as argument');
      console.log('Usage: node monitor-candidate-performance.js <candidate-id>');
      process.exit(1);
    }
    
    console.log(`Testing performance for candidate: ${candidateId}`);
    
    // 1. Test main candidate query
    console.log('\n📊 Testing main candidate query...');
    const startTime1 = Date.now();
    const candidateResult = await client.query(`
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
    `, [candidateId]);
    const time1 = Date.now() - startTime1;
    console.log(`✅ Main candidate query: ${time1}ms`);
    
    if (candidateResult.rows.length === 0) {
      console.error('❌ Candidate not found');
      process.exit(1);
    }
    
    // 2. Test job matches query
    console.log('\n📊 Testing job matches query...');
    const startTime2 = Date.now();
    const jobMatchesResult = await client.query(`
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
      ORDER BY jm."fitScore" DESC
      LIMIT 5
    `, [candidateId]);
    const time2 = Date.now() - startTime2;
    console.log(`✅ Job matches query: ${time2}ms (${jobMatchesResult.rows.length} matches)`);
    
    // 3. Test attachments query
    console.log('\n📊 Testing attachments query...');
    const startTime3 = Date.now();
    const attachmentsResult = await client.query(`
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
      ORDER BY a."uploadedAt" DESC
      LIMIT 3
    `, [candidateId]);
    const time3 = Date.now() - startTime3;
    console.log(`✅ Attachments query: ${time3}ms (${attachmentsResult.rows.length} attachments)`);
    
    // 4. Test comments query
    console.log('\n📊 Testing comments query...');
    const startTime4 = Date.now();
    const commentsResult = await client.query(`
      SELECT 
        cc.id,
        cc."candidateId",
        cc."authorId",
        cc.content,
        cc."attachmentIds",
        cc."createdAt",
        cc."updatedAt",
        u.name as "authorName"
      FROM "CandidateComment" cc
      LEFT JOIN "User" u ON cc."authorId" = u.id
      WHERE cc."candidateId" = $1::uuid
      ORDER BY cc."createdAt" DESC
      LIMIT 10
    `, [candidateId]);
    const time4 = Date.now() - startTime4;
    console.log(`✅ Comments query: ${time4}ms (${commentsResult.rows.length} comments)`);
    
    // 5. Calculate total time
    const totalTime = time1 + time2 + time3 + time4;
    console.log(`\n📈 Total query time: ${totalTime}ms`);
    
    // 6. Performance assessment
    console.log('\n📋 Performance Assessment:');
    if (totalTime < 1000) {
      console.log('🟢 Excellent performance (< 1s)');
    } else if (totalTime < 3000) {
      console.log('🟡 Acceptable performance (1-3s)');
    } else if (totalTime < 5000) {
      console.log('🟠 Slow performance (3-5s) - consider optimization');
    } else {
      console.log('🔴 Poor performance (> 5s) - optimization required');
    }
    
    // 7. Check for missing indexes
    console.log('\n🔍 Checking for potential missing indexes...');
    
    const indexChecks = [
      { table: 'JobMatch', column: 'candidateId', name: 'idx_job_match_candidate_id' },
      { table: 'Attachment', column: 'candidateId', name: 'idx_attachment_candidate_id' },
      { table: 'CandidateComment', column: 'candidateId', name: 'idx_candidate_comment_candidate_id' },
    ];
    
    for (const check of indexChecks) {
      const indexResult = await client.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = $1 AND indexdef LIKE $2
      `, [check.table, `%${check.column}%`]);
      
      if (indexResult.rows.length === 0) {
        console.log(`⚠️  Missing index on ${check.table}.${check.column}`);
      } else {
        console.log(`✅ Index exists on ${check.table}.${check.column}`);
      }
    }
    
    console.log('\n✨ Performance check complete!');
    
  } catch (error) {
    console.error('❌ Error during performance check:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Run the performance check
checkCandidateQueryPerformance().catch(console.error);