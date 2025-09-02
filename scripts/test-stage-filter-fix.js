#!/usr/bin/env node

/**
 * Test script to verify the stage filter fix works correctly
 * This script tests the API endpoints with different stage filters
 */

const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'studio2',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

async function testStageFilterFix() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🧪 Testing Stage Filter Fix...\n');
    
    // Test 1: Check current database statuses
    console.log('📊 Test 1: Current Database Statuses');
    console.log('=====================================');
    
    const statusResult = await pool.query(`
      SELECT DISTINCT status, COUNT(*) as count 
      FROM "Candidate" 
      WHERE status IS NOT NULL AND status != ''
      GROUP BY status 
      ORDER BY count DESC
    `);
    
    console.log('Current candidate statuses in database:');
    console.table(statusResult.rows);
    
    // Test 2: Check recruitment stages
    console.log('\n📋 Test 2: Recruitment Stages');
    console.log('==============================');
    
    const stagesResult = await pool.query(`
      SELECT * FROM "RecruitmentStage" ORDER BY "sort_order"
    `);
    
    console.log('Recruitment stages defined:');
    console.table(stagesResult.rows);
    
    // Test 3: Test case-insensitive matching logic
    console.log('\n🔍 Test 3: Case-Insensitive Matching Test');
    console.log('==========================================');
    
    // Test with different case variations
    const testCases = [
      { input: 'Applied', description: 'Title case' },
      { input: 'applied', description: 'Lowercase' },
      { input: 'APPLIED', description: 'Uppercase' },
      { input: 'Interview Scheduled', description: 'Multi-word title case' },
      { input: 'interview scheduled', description: 'Multi-word lowercase' },
      { input: 'INTERVIEW SCHEDULED', description: 'Multi-word uppercase' }
    ];
    
    for (const testCase of testCases) {
      console.log(`\nTesting: "${testCase.input}" (${testCase.description})`);
      
      // Simulate the case-insensitive matching logic
      const query = `
        SELECT COUNT(*) as count
        FROM "Candidate" c
        WHERE LOWER(c.status) = LOWER($1)
      `;
      
      const result = await pool.query(query, [testCase.input]);
      const count = parseInt(result.rows[0].count);
      
      console.log(`  → Found ${count} candidates with case-insensitive match`);
      
      // Also test exact match for comparison
      const exactResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM "Candidate" c
        WHERE c.status = $1
      `, [testCase.input]);
      
      const exactCount = parseInt(exactResult.rows[0].count);
      console.log(`  → Found ${exactCount} candidates with exact match`);
      
      if (count > exactCount) {
        console.log(`  ✅ Case-insensitive matching would help find ${count - exactCount} more candidates`);
      } else if (count === exactCount) {
        console.log(`  ℹ️  No difference between case-sensitive and case-insensitive matching`);
      }
    }
    
    // Test 4: Check for potential mismatches
    console.log('\n⚠️  Test 4: Potential Mismatches');
    console.log('================================');
    
    const mismatchQuery = `
      SELECT 
        rs.name as stage_name,
        c.status as candidate_status,
        COUNT(*) as count
      FROM "RecruitmentStage" rs
      CROSS JOIN (
        SELECT DISTINCT status 
        FROM "Candidate" 
        WHERE status IS NOT NULL AND status != ''
      ) c
      WHERE rs.name != c.status
      GROUP BY rs.name, c.status
      ORDER BY rs.name, count DESC
    `;
    
    const mismatchResult = await pool.query(mismatchQuery);
    
    if (mismatchResult.rows.length > 0) {
      console.log('Found potential mismatches between stages and candidate statuses:');
      console.table(mismatchResult.rows);
      
      console.log('\n💡 Recommendation: Run the migration script to fix these mismatches');
      console.log('   npm run fix:stages:dry-run  # See what would change');
      console.log('   npm run fix:stages          # Apply the changes');
    } else {
      console.log('✅ No mismatches found! Stages and candidate statuses are aligned.');
    }
    
    // Test 5: Summary and recommendations
    console.log('\n📋 Test 5: Summary & Recommendations');
    console.log('=====================================');
    
    const totalCandidates = await pool.query(`
      SELECT COUNT(*) as total FROM "Candidate" WHERE status IS NOT NULL AND status != ''
    `);
    
    const totalStages = stagesResult.rows.length;
    const totalStatuses = statusResult.rows.length;
    
    console.log(`Total candidates with status: ${totalCandidates.rows[0].total}`);
    console.log(`Total recruitment stages: ${totalStages}`);
    console.log(`Total unique status values: ${totalStatuses}`);
    
    if (totalStatuses > totalStages) {
      console.log('\n⚠️  More status values than stages - some candidates may have non-standard statuses');
    } else if (totalStatuses < totalStages) {
      console.log('\n⚠️  More stages than status values - some stages may be unused');
    } else {
      console.log('\n✅ Status count matches stage count - good alignment');
    }
    
    // Final recommendations
    console.log('\n🎯 Recommendations:');
    
    if (mismatchResult.rows.length > 0) {
      console.log('1. 🔧 Run the migration script to fix stage mismatches');
      console.log('2. 📊 Verify the fix resolves the task board filtering issue');
      console.log('3. 🧪 Test stage filters in the UI after migration');
    } else {
      console.log('1. ✅ Stages and statuses are already aligned');
      console.log('2. 🧪 Test stage filters in the UI to verify they work');
      console.log('3. 📝 If issues persist, check for other causes (permissions, etc.)');
    }
    
    console.log('\n4. 📚 Check the documentation: docs/stage-filter-fix.md');
    console.log('5. 🚀 Monitor the system after any changes');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Stage Filter Fix Test Script

Usage: node test-stage-filter-fix.js [options]

Options:
  --help, -h     Show this help message

Environment Variables:
  DB_HOST         Database host (default: localhost)
  DB_PORT         Database port (default: 5432)
  DB_NAME         Database name (default: studio2)
  DB_USER         Database user (default: postgres)
  DB_PASSWORD     Database password
  DB_SSL          Enable SSL (true/false)

Example:
  DB_PASSWORD=mypassword node test-stage-filter-fix.js

This script will:
1. Check current database statuses
2. Verify recruitment stages
3. Test case-insensitive matching
4. Identify potential mismatches
5. Provide recommendations
`);
  process.exit(0);
}

// Run the test
testStageFilterFix();
