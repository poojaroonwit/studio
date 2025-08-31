const { Pool } = require('pg');

// Test script to verify retry functionality
async function testRetryFunctionality() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Testing retry functionality...\n');

    // 1. Check for jobs in error or fail state
    const errorJobs = await pool.query(`
      SELECT id, file_name, file_path, status, error 
      FROM upload_queue 
      WHERE status IN ('error', 'fail') 
      ORDER BY upload_date DESC 
      LIMIT 5
    `);

    console.log(`Found ${errorJobs.rows.length} jobs in error/fail state:`);
    errorJobs.rows.forEach(job => {
      console.log(`- ${job.id.slice(0, 8)}... | ${job.file_name} | ${job.status} | ${job.error || 'No error'}`);
    });

    if (errorJobs.rows.length === 0) {
      console.log('No jobs in error/fail state found. Creating a test job...');
      
      // Create a test job in error state
      const testJob = await pool.query(`
        INSERT INTO upload_queue (id, file_name, file_size, status, file_path, error, error_details)
        VALUES (
          gen_random_uuid(), 
          'test-retry-file.pdf', 
          1024, 
          'error', 
          'test/retry-file.pdf', 
          'Test error for retry functionality', 
          'This is a test error to verify retry functionality'
        )
        RETURNING id, file_name, status, error
      `);
      
      console.log(`Created test job: ${testJob.rows[0].id.slice(0, 8)}... | ${testJob.rows[0].file_name} | ${testJob.rows[0].status}`);
    }

    // 2. Check for potential unique constraint conflicts
    const queuedJobs = await pool.query(`
      SELECT file_path, COUNT(*) as count
      FROM upload_queue 
      WHERE status = 'queued'
      GROUP BY file_path
      HAVING COUNT(*) > 1
    `);

    if (queuedJobs.rows.length > 0) {
      console.log('\n⚠️  Found potential unique constraint conflicts:');
      queuedJobs.rows.forEach(row => {
        console.log(`- File path: ${row.file_path} has ${row.count} queued jobs`);
      });
    } else {
      console.log('\n✅ No unique constraint conflicts found');
    }

    // 3. Check for jobs that could be retried
    const retryableJobs = await pool.query(`
      SELECT id, file_name, file_path, status, error
      FROM upload_queue 
      WHERE status IN ('error', 'fail')
      AND file_path NOT IN (
        SELECT file_path 
        FROM upload_queue 
        WHERE status = 'queued'
      )
      ORDER BY upload_date DESC 
      LIMIT 5
    `);

    console.log(`\nFound ${retryableJobs.rows.length} jobs that can be retried (no conflicts):`);
    retryableJobs.rows.forEach(job => {
      console.log(`- ${job.id.slice(0, 8)}... | ${job.file_name} | ${job.status} | ${job.error || 'No error'}`);
    });

    // 4. Show recent upload queue activity
    const recentActivity = await pool.query(`
      SELECT id, file_name, status, upload_date, process_date, completed_date, error
      FROM upload_queue 
      ORDER BY updated_at DESC 
      LIMIT 10
    `);

    console.log('\nRecent upload queue activity:');
    recentActivity.rows.forEach(job => {
      const duration = job.completed_date && job.process_date 
        ? Math.round((new Date(job.completed_date) - new Date(job.process_date)) / 1000)
        : null;
      
      console.log(`- ${job.id.slice(0, 8)}... | ${job.file_name} | ${job.status} | ${duration ? `${duration}s` : 'N/A'} | ${job.error ? 'Has error' : 'No error'}`);
    });

  } catch (error) {
    console.error('Error testing retry functionality:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testRetryFunctionality().catch(console.error);
