#!/usr/bin/env node

/**
 * Script to apply fit score query optimizations
 * This script adds database indexes and optimizes queries for better performance
 */

const { Pool } = require('pg');
require('dotenv').config();

async function applyOptimizations() {
  console.log('🔧 Applying fit score query optimizations...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  try {
    const client = await pool.connect();
    
    console.log('📊 Adding database indexes for fit score queries...');
    
    // Add composite indexes for better fit score query performance
    const indexes = [
      // Composite index for fit score filtering
      `CREATE INDEX IF NOT EXISTS idx_candidate_fitscore_status 
       ON "Candidate" ("fitScore", status) 
       WHERE "fitScore" IS NOT NULL`,
      
      // Composite index for fit score with position
      `CREATE INDEX IF NOT EXISTS idx_candidate_fitscore_position 
       ON "Candidate" ("fitScore", "positionId") 
       WHERE "fitScore" IS NOT NULL`,
      
      // Composite index for fit score with recruiter
      `CREATE INDEX IF NOT EXISTS idx_candidate_fitscore_recruiter 
       ON "Candidate" ("fitScore", "recruiterId") 
       WHERE "fitScore" IS NOT NULL`,
      
      // Composite index for fit score with application date
      `CREATE INDEX IF NOT EXISTS idx_candidate_fitscore_application_date 
       ON "Candidate" ("fitScore", "applicationDate") 
       WHERE "fitScore" IS NOT NULL`,
      
      // Index for JobMatch fit scores
      `CREATE INDEX IF NOT EXISTS idx_jobmatch_candidate_fitscore 
       ON "JobMatch" ("candidateId", "fitScore") 
       WHERE "fitScore" IS NOT NULL`,
      
      // Partial index for non-zero fit scores
      `CREATE INDEX IF NOT EXISTS idx_candidate_fitscore_nonzero 
       ON "Candidate" ("fitScore") 
       WHERE "fitScore" > 0`,
      
      // GIN indexes for JSON data searches
      `CREATE INDEX IF NOT EXISTS idx_candidate_parseddata_location 
       ON "Candidate" USING GIN (("parsedData"->>'location'))`,
      
      `CREATE INDEX IF NOT EXISTS idx_candidate_parseddata_skills 
       ON "Candidate" USING GIN (("parsedData"->>'skills'))`,
      
      `CREATE INDEX IF NOT EXISTS idx_candidate_parseddata_experience 
       ON "Candidate" USING GIN (("parsedData"->>'totalExperienceYears'))`,
      
      `CREATE INDEX IF NOT EXISTS idx_candidate_parseddata_education 
       ON "Candidate" USING GIN (("parsedData"->>'education'))`
    ];

    for (const indexQuery of indexes) {
      try {
        await client.query(indexQuery);
        console.log('✅ Index created successfully');
      } catch (error) {
        if (error.code === '42710') { // Index already exists
          console.log('ℹ️  Index already exists, skipping...');
        } else {
          console.error('❌ Error creating index:', error.message);
        }
      }
    }

    console.log('📈 Updating table statistics...');
    
    // Update table statistics for better query planning
    await client.query('ANALYZE "Candidate"');
    await client.query('ANALYZE "JobMatch"');
    
    console.log('✅ Table statistics updated');

    // Show current index usage
    console.log('📊 Current index usage statistics:');
    const indexStats = await client.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes 
      WHERE tablename IN ('Candidate', 'JobMatch')
      ORDER BY idx_scan DESC
    `);
    
    console.table(indexStats.rows);

    // Test query performance
    console.log('🧪 Testing query performance...');
    
    const testQueries = [
      {
        name: 'Applied Fit Score Counts',
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
          ORDER BY grade
        `
      },
      {
        name: 'Matching Fit Score Counts',
        query: `
          WITH candidate_scores AS (
            SELECT 
              c.id,
              c."fitScore",
              COALESCE(c."fitScore", 0) as applied_score,
              GREATEST(
                COALESCE(c."fitScore", 0),
                COALESCE((
                  SELECT MAX(jm."fitScore")
                  FROM "JobMatch" jm
                  WHERE jm."candidateId" = c.id
                  AND jm."fitScore" IS NOT NULL
                ), 0)
              ) as best_match_score
            FROM "Candidate" c
          )
          SELECT 
            CASE 
              WHEN best_match_score IS NULL OR best_match_score = 0 THEN 'no-score'
              WHEN best_match_score >= 0.81 THEN 'A'
              WHEN best_match_score >= 0.61 THEN 'B'
              WHEN best_match_score >= 0.41 THEN 'C'
              WHEN best_match_score >= 0.21 THEN 'D'
              ELSE 'E'
            END as grade,
            COUNT(*) as count
          FROM candidate_scores
          GROUP BY 
            CASE 
              WHEN best_match_score IS NULL OR best_match_score = 0 THEN 'no-score'
              WHEN best_match_score >= 0.81 THEN 'A'
              WHEN best_match_score >= 0.61 THEN 'B'
              WHEN best_match_score >= 0.41 THEN 'C'
              WHEN best_match_score >= 0.21 THEN 'D'
              ELSE 'E'
            END
          ORDER BY grade
        `
      }
    ];

    for (const testQuery of testQueries) {
      console.log(`\n🔍 Testing: ${testQuery.name}`);
      const startTime = Date.now();
      
      try {
        const result = await client.query(testQuery.query);
        const duration = Date.now() - startTime;
        
        console.log(`✅ Query completed in ${duration}ms`);
        console.log(`📊 Results: ${result.rows.length} grade categories`);
        console.log('📋 Grade distribution:');
        result.rows.forEach(row => {
          console.log(`   ${row.grade}: ${row.count} candidates`);
        });
        
      } catch (error) {
        console.error(`❌ Query failed: ${error.message}`);
      }
    }

    client.release();
    console.log('\n🎉 Fit score optimizations applied successfully!');
    
  } catch (error) {
    console.error('❌ Error applying optimizations:', error);
  } finally {
    await pool.end();
  }
}

// Run the optimizations
applyOptimizations().catch(console.error);
