#!/usr/bin/env node

/**
 * Performance Optimization Application Script
 * This script applies all performance optimizations for handling large datasets
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function applyPerformanceOptimizations() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting performance optimizations...\n');

    // 1. Apply database indexes
    console.log('📊 Applying database indexes...');
    const indexScript = fs.readFileSync(
      path.join(__dirname, 'optimize-candidate-indexes.sql'), 
      'utf8'
    );
    
    const indexStatements = indexScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of indexStatements) {
      try {
        await client.query(statement);
        console.log(`✅ Applied: ${statement.substring(0, 50)}...`);
      } catch (error) {
        if (error.code === '42710') { // Index already exists
          console.log(`⏭️  Skipped (already exists): ${statement.substring(0, 50)}...`);
        } else {
          console.error(`❌ Error applying: ${statement.substring(0, 50)}...`);
          console.error(`   Error: ${error.message}`);
        }
      }
    }

    // 2. Verify indexes were created
    console.log('\n🔍 Verifying indexes...');
    const indexCheckQuery = `
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname LIKE 'idx_candidate_%'
      ORDER BY indexname;
    `;
    
    const indexResult = await client.query(indexCheckQuery);
    console.log(`✅ Found ${indexResult.rows.length} candidate indexes:`);
    indexResult.rows.forEach(row => {
      console.log(`   - ${row.indexname} on ${row.tablename}`);
    });

    // 3. Check table statistics
    console.log('\n📈 Checking table statistics...');
    const statsQuery = `
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      AND tablename IN ('Candidate', 'JobMatch', 'Attachment', 'CandidateComment')
      ORDER BY n_live_tup DESC;
    `;
    
    const statsResult = await client.query(statsQuery);
    console.log('📊 Table statistics:');
    statsResult.rows.forEach(row => {
      console.log(`   - ${row.tablename}: ${row.live_rows} live rows, ${row.dead_rows} dead rows`);
    });

    // 4. Test query performance
    console.log('\n⚡ Testing query performance...');
    const performanceTestQuery = `
      SELECT 
        c.id,
        c.name,
        c.email,
        c."fitScore",
        c.status,
        c."updatedAt",
        p.title as "positionTitle",
        u.name as "recruiterName"
      FROM "Candidate" c
      LEFT JOIN "Position" p ON c."positionId" = p.id
      LEFT JOIN "User" u ON c."recruiterId" = u.id
      WHERE c.status = 'Applied'
      ORDER BY c."updatedAt" DESC
      LIMIT 10;
    `;

    const startTime = Date.now();
    const testResult = await client.query(performanceTestQuery);
    const queryTime = Date.now() - startTime;

    console.log(`✅ Test query completed in ${queryTime}ms`);
    console.log(`   - Retrieved ${testResult.rows.length} candidates`);
    console.log(`   - Query time: ${queryTime}ms`);

    if (queryTime < 100) {
      console.log('🟢 Excellent performance (< 100ms)');
    } else if (queryTime < 500) {
      console.log('🟡 Good performance (100-500ms)');
    } else if (queryTime < 1000) {
      console.log('🟠 Acceptable performance (500-1000ms)');
    } else {
      console.log('🔴 Poor performance (> 1000ms) - further optimization needed');
    }

    // 5. Check for slow queries
    console.log('\n🐌 Checking for slow queries...');
    const slowQueryCheck = `
      SELECT 
        query,
        mean_time,
        calls,
        total_time
      FROM pg_stat_statements 
      WHERE query LIKE '%FROM "Candidate"%'
      AND mean_time > 100
      ORDER BY mean_time DESC 
      LIMIT 5;
    `;

    try {
      const slowQueryResult = await client.query(slowQueryCheck);
      if (slowQueryResult.rows.length > 0) {
        console.log('⚠️  Found slow queries:');
        slowQueryResult.rows.forEach((row, index) => {
          console.log(`   ${index + 1}. ${row.mean_time.toFixed(2)}ms avg (${row.calls} calls)`);
          console.log(`      Query: ${row.query.substring(0, 100)}...`);
        });
      } else {
        console.log('✅ No slow queries found');
      }
    } catch (error) {
      console.log('ℹ️  pg_stat_statements extension not available (normal for some setups)');
    }

    // 6. Performance recommendations
    console.log('\n💡 Performance Recommendations:');
    
    const totalCandidates = statsResult.rows.find(r => r.tablename === 'Candidate')?.live_rows || 0;
    
    if (totalCandidates > 10000) {
      console.log('   - Large dataset detected (>10k candidates)');
      console.log('   - Consider implementing data archiving');
      console.log('   - Monitor query performance regularly');
    }
    
    if (totalCandidates > 50000) {
      console.log('   - Very large dataset detected (>50k candidates)');
      console.log('   - Consider database partitioning');
      console.log('   - Implement read replicas for heavy read operations');
    }

    console.log('   - Monitor cache hit rates in application');
    console.log('   - Use pagination for all list views');
    console.log('   - Implement lazy loading for large datasets');

    // 7. Final status
    console.log('\n🎉 Performance optimizations completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Applied ${indexResult.rows.length} database indexes`);
    console.log(`   - Test query performance: ${queryTime}ms`);
    console.log(`   - Total candidates: ${totalCandidates}`);
    
    if (queryTime < 500) {
      console.log('   - Status: ✅ Optimized for good performance');
    } else {
      console.log('   - Status: ⚠️  Further optimization may be needed');
    }

  } catch (error) {
    console.error('❌ Error applying performance optimizations:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the optimization script
if (require.main === module) {
  applyPerformanceOptimizations()
    .then(() => {
      console.log('\n✨ All optimizations applied successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Failed to apply optimizations:', error);
      process.exit(1);
    });
}

module.exports = { applyPerformanceOptimizations };
