#!/usr/bin/env node

/**
 * Create Test Upload Queue Data Script
 * 
 * This script creates test data in the upload_queue table to help test
 * the process queue UI functionality.
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function createTestUploadQueueData() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Creating test upload queue data...');
    
    // First, get a user ID to use as created_by
    const userResult = await client.query('SELECT id FROM "User" LIMIT 1');
    if (userResult.rows.length === 0) {
      throw new Error('No users found in database. Please run the seed script first.');
    }
    const userId = userResult.rows[0].id;
    console.log(`📝 Using user ID: ${userId}`);
    
    // Get a position ID to use
    const positionResult = await client.query('SELECT id FROM "Position" LIMIT 1');
    const positionId = positionResult.rows.length > 0 ? positionResult.rows[0].id : null;
    console.log(`📝 Using position ID: ${positionId || 'null'}`);
    
    // Create test upload queue records
    const testRecords = [
      {
        id: uuidv4(),
        file_name: 'test-resume-1.pdf',
        file_size: 1024000,
        status: 'queued',
        source: 'bulk',
        upload_id: uuidv4(),
        created_by: userId,
        file_path: 'uploads/test-resume-1.pdf',
        position_id: positionId,
        upload_date: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        process_date: null,
        completed_date: null,
        error: null,
        error_details: null,
        webhook_payload: JSON.stringify({ targetPositionId: positionId, uploadBatch: uuidv4() })
      },
      {
        id: uuidv4(),
        file_name: 'test-resume-2.pdf',
        file_size: 2048000,
        status: 'inprocess',
        source: 'bulk',
        upload_id: uuidv4(),
        created_by: userId,
        file_path: 'uploads/test-resume-2.pdf',
        position_id: positionId,
        upload_date: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        process_date: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        completed_date: null,
        error: null,
        error_details: null,
        webhook_payload: JSON.stringify({ targetPositionId: positionId, uploadBatch: uuidv4() })
      },
      {
        id: uuidv4(),
        file_name: 'test-resume-3.pdf',
        file_size: 1536000,
        status: 'success',
        source: 'bulk',
        upload_id: uuidv4(),
        created_by: userId,
        file_path: 'uploads/test-resume-3.pdf',
        position_id: positionId,
        upload_date: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        process_date: new Date(Date.now() - 2.5 * 60 * 60 * 1000), // 2.5 hours ago
        completed_date: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        error: null,
        error_details: null,
        webhook_payload: JSON.stringify({ targetPositionId: positionId, uploadBatch: uuidv4() })
      },
      {
        id: uuidv4(),
        file_name: 'test-resume-4.pdf',
        file_size: 512000,
        status: 'failed',
        source: 'bulk',
        upload_id: uuidv4(),
        created_by: userId,
        file_path: 'uploads/test-resume-4.pdf',
        position_id: positionId,
        upload_date: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        process_date: new Date(Date.now() - 3.5 * 60 * 60 * 1000), // 3.5 hours ago
        completed_date: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        error: 'File parsing failed',
        error_details: 'Unable to extract text from PDF file. File may be corrupted or password protected.',
        webhook_payload: JSON.stringify({ targetPositionId: positionId, uploadBatch: uuidv4() })
      },
      {
        id: uuidv4(),
        file_name: 'test-resume-5.pdf',
        file_size: 768000,
        status: 'queued',
        source: 'manual',
        upload_id: uuidv4(),
        created_by: userId,
        file_path: 'uploads/test-resume-5.pdf',
        position_id: positionId,
        upload_date: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        process_date: null,
        completed_date: null,
        error: null,
        error_details: null,
        webhook_payload: null
      }
    ];
    
    // Insert test records
    for (const record of testRecords) {
      await client.query(`
        INSERT INTO upload_queue (
          id, file_name, file_size, status, source, upload_id, created_by, 
          file_path, position_id, upload_date, process_date, completed_date, 
          error, error_details, webhook_payload, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      `, [
        record.id,
        record.file_name,
        record.file_size,
        record.status,
        record.source,
        record.upload_id,
        record.created_by,
        record.file_path,
        record.position_id,
        record.upload_date,
        record.process_date,
        record.completed_date,
        record.error,
        record.error_details,
        record.webhook_payload
      ]);
      
      console.log(`✅ Created test record: ${record.file_name} (${record.status})`);
    }
    
    // Verify the data was created
    const countResult = await client.query('SELECT COUNT(*) as count FROM upload_queue');
    const summaryResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'queued') as queued,
        COUNT(*) FILTER (WHERE status = 'inprocess') as inprocess,
        COUNT(*) FILTER (WHERE status = 'success') as success,
        COUNT(*) FILTER (WHERE status = 'failed') as error
      FROM upload_queue
    `);
    
    const summary = summaryResult.rows[0];
    console.log('\n📊 Upload Queue Summary:');
    console.log(`   Total records: ${countResult.rows[0].count}`);
    console.log(`   Queued: ${summary.queued}`);
    console.log(`   In Process: ${summary.inprocess}`);
    console.log(`   Success: ${summary.success}`);
    console.log(`   Failed: ${summary.error}`);
    
    console.log('\n🎉 Test upload queue data created successfully!');
    console.log('💡 You can now test the process queue UI to see the data.');
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
createTestUploadQueueData()
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
