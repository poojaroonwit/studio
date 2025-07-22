const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seedSampleLogs() {
  const client = await pool.connect();
  
  try {
    
    // First, let's get a user ID to use for actingUserId
    const userResult = await client.query('SELECT id FROM "User" LIMIT 1');
    const userId = userResult.rows[0]?.id;
    
    if (!userId) {
      console.log('❌ No users found in database. Please create a user first.');
      return;
    }
    
    const sampleLogs = [
      {
        level: 'INFO',
        message: 'Application started successfully',
        source: 'System:Startup',
        actingUserId: userId,
        details: { version: '1.0.0', environment: 'development' }
      },
      {
        level: 'INFO',
        message: 'User logged in successfully',
        source: 'Auth:Login',
        actingUserId: userId,
        details: { method: 'credentials', ip: '192.168.1.100' }
      },
      {
        level: 'AUDIT',
        message: 'Candidate created',
        source: 'API:Candidates:Create',
        actingUserId: userId,
        details: { candidateId: 'sample-candidate-1', positionId: 'sample-position-1' }
      },
      {
        level: 'INFO',
        message: 'Position updated',
        source: 'API:Positions:Update',
        actingUserId: userId,
        details: { positionId: 'sample-position-1', changes: ['title', 'description'] }
      },
      {
        level: 'WARN',
        message: 'Database connection slow',
        source: 'Database:Connection',
        actingUserId: null,
        details: { responseTime: 2500, threshold: 1000 }
      },
      {
        level: 'ERROR',
        message: 'Failed to upload resume file',
        source: 'API:Resumes:Upload',
        actingUserId: userId,
        details: { fileName: 'resume.pdf', error: 'File size exceeds limit' }
      },
      {
        level: 'DEBUG',
        message: 'Processing webhook payload',
        source: 'Webhook:Processor',
        actingUserId: null,
        details: { webhookId: 'webhook-1', eventType: 'candidate.created' }
      },
      {
        level: 'AUDIT',
        message: 'User permissions updated',
        source: 'API:Users:UpdatePermissions',
        actingUserId: userId,
        details: { targetUserId: 'target-user-1', permissions: ['LOGS_VIEW', 'CANDIDATES_MANAGE'] }
      },
      {
        level: 'INFO',
        message: 'System settings updated',
        source: 'API:Settings:Update',
        actingUserId: userId,
        details: { setting: 'appName', oldValue: 'Old App Name', newValue: 'New App Name' }
      },
      {
        level: 'ERROR',
        message: 'External API call failed',
        source: 'Integration:ExternalAPI',
        actingUserId: null,
        details: { endpoint: '/api/external/data', statusCode: 500, error: 'Service unavailable' }
      },
      {
        level: 'INFO',
        message: 'Bulk import completed',
        source: 'Import:BulkCandidates',
        actingUserId: userId,
        details: { totalProcessed: 150, successful: 145, failed: 5 }
      },
      {
        level: 'WARN',
        message: 'Disk space running low',
        source: 'System:Monitoring',
        actingUserId: null,
        details: { availableSpace: '2.1GB', threshold: '5GB' }
      },
      {
        level: 'AUDIT',
        message: 'User role changed',
        source: 'API:Users:UpdateRole',
        actingUserId: userId,
        details: { targetUserId: 'target-user-2', oldRole: 'Recruiter', newRole: 'Hiring Manager' }
      },
      {
        level: 'INFO',
        message: 'Email notification sent',
        source: 'Notification:Email',
        actingUserId: null,
        details: { recipient: 'user@example.com', subject: 'New candidate assigned', template: 'candidate-assigned' }
      },
      {
        level: 'DEBUG',
        message: 'Cache miss for user preferences',
        source: 'Cache:UserPreferences',
        actingUserId: userId,
        details: { cacheKey: 'user_prefs_123', action: 'fallback_to_database' }
      }
    ];
    
    // Insert sample logs with different timestamps to simulate real usage
    for (let i = 0; i < sampleLogs.length; i++) {
      const log = sampleLogs[i];
      const timestamp = new Date(Date.now() - (i * 1000 * 60 * 30)); // Each log 30 minutes apart
      
      const query = `
        INSERT INTO "LogEntry" (timestamp, level, message, source, "actingUserId", details, "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `;
      
      await client.query(query, [
        timestamp,
        log.level,
        log.message,
        log.source,
        log.actingUserId,
        JSON.stringify(log.details)
      ]);
    }
    
    console.log(`✅ Successfully seeded ${sampleLogs.length} sample log entries`);
    
    // Verify the logs were created
    const countResult = await client.query('SELECT COUNT(*) FROM "LogEntry"');
    console.log(`📊 Total log entries in database: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error seeding sample logs:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seeding function
seedSampleLogs().catch(console.error); 