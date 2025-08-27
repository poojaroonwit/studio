#!/usr/bin/env node

/**
 * Fix Stuck Queue Script
 * 
 * This script fixes stuck jobs in the upload queue by resetting their status.
 */

const { Pool } = require('pg');
require('dotenv').config();

async function fixStuckQueue() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔧 Fixing stuck queue jobs...');

    // Reset stuck jobs (processing for more than 10 minutes)
    const stuckJobsResult = await pool.query(`
      UPDATE "UploadQueue"
      SET 
        status = 'queued',
        "updatedAt" = NOW(),
        "processingStartedAt" = NULL,
        error_message = 'Reset due to timeout'
      WHERE status = 'processing' 
      AND "updatedAt" < NOW() - INTERVAL '10 minutes'
      RETURNING id, "fileName"
    `);

    const resetCount = stuckJobsResult.rowCount;
    console.log(`✅ Reset ${resetCount} stuck jobs back to queued status`);

    if (resetCount > 0) {
      console.log('Reset jobs:');
      stuckJobsResult.rows.forEach(row => {
        console.log(`  - ID: ${row.id}, File: ${row.fileName}`);
      });
    }

    // Reset failed jobs that are older than 1 hour
    const failedJobsResult = await pool.query(`
      UPDATE "UploadQueue"
      SET 
        status = 'queued',
        "updatedAt" = NOW(),
        "processingStartedAt" = NULL,
        error_message = 'Retry after failure'
      WHERE status IN ('failed', 'error')
      AND "updatedAt" < NOW() - INTERVAL '1 hour'
      RETURNING id, "fileName"
    `);

    const retryCount = failedJobsResult.rowCount;
    console.log(`✅ Reset ${retryCount} failed jobs for retry`);

    if (retryCount > 0) {
      console.log('Retry jobs:');
      failedJobsResult.rows.forEach(row => {
        console.log(`  - ID: ${row.id}, File: ${row.fileName}`);
      });
    }

    // Clean up old completed jobs (older than 7 days)
    const cleanupResult = await pool.query(`
      DELETE FROM "UploadQueue"
      WHERE status = 'completed'
      AND "updatedAt" < NOW() - INTERVAL '7 days'
    `);

    const cleanupCount = cleanupResult.rowCount;
    console.log(`🧹 Cleaned up ${cleanupCount} old completed jobs`);

    const totalFixed = resetCount + retryCount;
    console.log(`\n✅ Queue fix completed: ${totalFixed} jobs fixed, ${cleanupCount} jobs cleaned up`);

    return {
      resetStuck: resetCount,
      retryFailed: retryCount,
      cleanedUp: cleanupCount,
      totalFixed: totalFixed
    };

  } catch (error) {
    console.error('❌ Error fixing stuck queue:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  fixStuckQueue()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Failed to fix stuck queue:', error);
      process.exit(1);
    });
}

module.exports = { fixStuckQueue };
