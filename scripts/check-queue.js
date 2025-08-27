#!/usr/bin/env node

/**
 * Queue Status Check Script
 * 
 * This script checks the status of the upload queue and reports any issues.
 */

const { Pool } = require('pg');
require('dotenv').config();

async function checkQueueStatus() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Check queue status
    const queueResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'queued' THEN 1 END) as queued,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as error
      FROM "UploadQueue"
    `);

    const queueStats = queueResult.rows[0];
 

    // Check for stuck jobs (processing for more than 10 minutes)
    const stuckJobsResult = await pool.query(`
      SELECT COUNT(*) as stuck_count
      FROM "UploadQueue"
      WHERE status = 'processing' 
      AND "updatedAt" < NOW() - INTERVAL '10 minutes'
    `);

    const stuckCount = stuckJobsResult.rows[0].stuck_count;
    if (stuckCount > 0) {
      console.log(`⚠️  Found ${stuckCount} stuck jobs (processing for >10 minutes)`);
    }

    // Check for recent failures
    const recentFailuresResult = await pool.query(`
      SELECT COUNT(*) as recent_failures
      FROM "UploadQueue"
      WHERE status IN ('failed', 'error')
      AND "updatedAt" > NOW() - INTERVAL '1 hour'
    `);

    const recentFailures = recentFailuresResult.rows[0].recent_failures;
    if (recentFailures > 0) {
      console.log(`⚠️  Found ${recentFailures} recent failures (last hour)`);
    }

    // Return summary for the performance fix script
    const summary = {
      total: parseInt(queueStats.total),
      queued: parseInt(queueStats.queued),
      processing: parseInt(queueStats.processing),
      completed: parseInt(queueStats.completed),
      failed: parseInt(queueStats.failed),
      error: parseInt(queueStats.error),
      stuck: stuckCount,
      recentFailures: recentFailures
    };

    console.log('Summary:', JSON.stringify(summary));
    return summary;

  } catch (error) {
    console.error('Error checking queue status:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  checkQueueStatus()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Failed to check queue status:', error);
      process.exit(1);
    });
}

module.exports = { checkQueueStatus };
