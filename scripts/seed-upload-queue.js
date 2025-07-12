#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedUploadQueue() {
  console.log('🌱 Starting upload queue seeding...');
  
  try {
    // Get admin user for association
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@ncc.com' }
    });

    if (!adminUser) {
      console.log('❌ Admin user not found. Please run the main seed first.');
      return;
    }

    // Upload queue sample data
    console.log('Creating upload queue sample data...');
    const uploadQueueItems = [
      {
        id: '40000000-0000-0000-0000-000000000001',
        fileName: 'john_doe_resume.pdf',
        fileSize: BigInt(245760), // 240KB
        status: 'pending',
        source: 'manual_upload',
        filePath: '/uploads/resumes/john_doe_resume.pdf',
        positionId: '11111111-1111-1111-1111-111111111111',
        webhookPayload: {
          candidate: {
            name: 'John Doe',
            email: 'john.doe@example.com',
            phone: '+1-555-0123'
          },
          position: {
            title: 'Software Engineer',
            department: 'Engineering'
          }
        }
      },
      {
        id: '40000000-0000-0000-0000-000000000002',
        fileName: 'jane_smith_cv.docx',
        fileSize: BigInt(512000), // 500KB
        status: 'processing',
        source: 'bulk_import',
        filePath: '/uploads/resumes/jane_smith_cv.docx',
        positionId: '22222222-2222-2222-2222-222222222222',
        webhookPayload: {
          candidate: {
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
            phone: '+1-555-0456'
          },
          position: {
            title: 'Product Manager',
            department: 'Product'
          }
        }
      },
      {
        id: '40000000-0000-0000-0000-000000000003',
        fileName: 'mike_johnson_resume.pdf',
        fileSize: BigInt(102400), // 100KB
        status: 'completed',
        completedDate: new Date('2024-01-15T10:30:00Z'),
        source: 'api_upload',
        filePath: '/uploads/resumes/mike_johnson_resume.pdf',
        positionId: '11111111-1111-1111-1111-111111111111',
        webhookPayload: {
          candidate: {
            name: 'Mike Johnson',
            email: 'mike.johnson@example.com',
            phone: '+1-555-0789'
          },
          position: {
            title: 'Software Engineer',
            department: 'Engineering'
          }
        }
      },
      {
        id: '40000000-0000-0000-0000-000000000004',
        fileName: 'sarah_wilson_cv.pdf',
        fileSize: BigInt(768000), // 750KB
        status: 'failed',
        error: 'Invalid file format',
        errorDetails: 'File appears to be corrupted or in unsupported format',
        source: 'manual_upload',
        filePath: '/uploads/resumes/sarah_wilson_cv.pdf',
        positionId: '22222222-2222-2222-2222-222222222222'
      },
      {
        id: '40000000-0000-0000-0000-000000000005',
        fileName: 'david_brown_resume.docx',
        fileSize: BigInt(307200), // 300KB
        status: 'pending',
        source: 'webhook_trigger',
        filePath: '/uploads/resumes/david_brown_resume.docx',
        positionId: '11111111-1111-1111-1111-111111111111',
        webhookPayload: {
          candidate: {
            name: 'David Brown',
            email: 'david.brown@example.com',
            phone: '+1-555-0321'
          },
          position: {
            title: 'Software Engineer',
            department: 'Engineering'
          }
        }
      },
      {
        id: '40000000-0000-0000-0000-000000000006',
        fileName: 'emma_davis_cv.pdf',
        fileSize: BigInt(409600), // 400KB
        status: 'processing',
        source: 'bulk_import',
        filePath: '/uploads/resumes/emma_davis_cv.pdf',
        positionId: '22222222-2222-2222-2222-222222222222',
        webhookPayload: {
          candidate: {
            name: 'Emma Davis',
            email: 'emma.davis@example.com',
            phone: '+1-555-0654'
          },
          position: {
            title: 'Product Manager',
            department: 'Product'
          }
        }
      },
      {
        id: '40000000-0000-0000-0000-000000000007',
        fileName: 'alex_taylor_resume.pdf',
        fileSize: BigInt(153600), // 150KB
        status: 'completed',
        completedDate: new Date('2024-01-14T15:45:00Z'),
        source: 'manual_upload',
        filePath: '/uploads/resumes/alex_taylor_resume.pdf',
        positionId: '11111111-1111-1111-1111-111111111111',
        webhookPayload: {
          candidate: {
            name: 'Alex Taylor',
            email: 'alex.taylor@example.com',
            phone: '+1-555-0987'
          },
          position: {
            title: 'Software Engineer',
            department: 'Engineering'
          }
        }
      },
      {
        id: '40000000-0000-0000-0000-000000000008',
        fileName: 'lisa_anderson_cv.docx',
        fileSize: BigInt(614400), // 600KB
        status: 'failed',
        error: 'File size exceeds limit',
        errorDetails: 'File size (600KB) exceeds maximum allowed size of 500KB',
        source: 'api_upload',
        filePath: '/uploads/resumes/lisa_anderson_cv.docx',
        positionId: '22222222-2222-2222-2222-222222222222'
      },
      {
        id: '40000000-0000-0000-0000-000000000009',
        fileName: 'robert_lee_resume.pdf',
        fileSize: BigInt(204800), // 200KB
        status: 'pending',
        source: 'webhook_trigger',
        filePath: '/uploads/resumes/robert_lee_resume.pdf',
        positionId: '11111111-1111-1111-1111-111111111111',
        webhookPayload: {
          candidate: {
            name: 'Robert Lee',
            email: 'robert.lee@example.com',
            phone: '+1-555-0123'
          },
          position: {
            title: 'Software Engineer',
            department: 'Engineering'
          }
        }
      },
      {
        id: '40000000-0000-0000-0000-000000000010',
        fileName: 'maria_garcia_cv.pdf',
        fileSize: BigInt(358400), // 350KB
        status: 'processing',
        source: 'bulk_import',
        filePath: '/uploads/resumes/maria_garcia_cv.pdf',
        positionId: '22222222-2222-2222-2222-222222222222',
        webhookPayload: {
          candidate: {
            name: 'Maria Garcia',
            email: 'maria.garcia@example.com',
            phone: '+1-555-0456'
          },
          position: {
            title: 'Product Manager',
            department: 'Product'
          }
        }
      }
    ];

    for (const item of uploadQueueItems) {
      await prisma.uploadQueue.upsert({
        where: { id: item.id },
        update: {},
        create: {
          ...item,
          createdBy: adminUser.id
        }
      });
    }
    console.log('✅ Upload queue sample data created/updated');

    // Sample webhooks
    console.log('Creating sample webhooks...');
    const sampleWebhooks = [
      {
        id: '50000000-0000-0000-0000-000000000001',
        name: 'Slack Notifications',
        url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
        events: ['candidate.created', 'candidate.updated', 'position.created'],
        method: 'POST',
        is_active: true,
        auth_type: 'none',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CandiTrack-Webhook/1.0'
        },
        retry_count: 3,
        timeout: 30
      },
      {
        id: '50000000-0000-0000-0000-000000000002',
        name: 'CRM Integration',
        url: 'https://api.crm.example.com/webhooks/candidates',
        events: ['candidate.created', 'candidate.stage_changed'],
        method: 'POST',
        is_active: true,
        auth_type: 'bearer',
        auth_token: 'sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        headers: {
          'Content-Type': 'application/json'
        },
        retry_count: 5,
        timeout: 60
      }
    ];

    for (const webhook of sampleWebhooks) {
      await prisma.webhook.upsert({
        where: { id: webhook.id },
        update: {},
        create: webhook
      });
    }
    console.log('✅ Sample webhooks created/updated');

    // Sample webhook logs
    console.log('Creating sample webhook logs...');
    const sampleWebhookLogs = [
      {
        id: '60000000-0000-0000-0000-000000000001',
        webhook_id: '50000000-0000-0000-0000-000000000001',
        event_type: 'candidate.created',
        payload: {
          candidate: {
            id: '70000000-0000-0000-0000-000000000001',
            name: 'John Doe',
            email: 'john.doe@example.com',
            status: 'Applied'
          },
          timestamp: '2024-01-15T10:30:00Z'
        },
        response_status: 200,
        response_body: '{"success": true, "message": "Notification sent"}',
        success: true,
        duration_ms: 245
      },
      {
        id: '60000000-0000-0000-0000-000000000002',
        webhook_id: '50000000-0000-0000-0000-000000000002',
        event_type: 'candidate.stage_changed',
        payload: {
          candidate: {
            id: '70000000-0000-0000-0000-000000000002',
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
            status: 'Interviewing'
          },
          previous_stage: 'Screening',
          new_stage: 'Interviewing',
          timestamp: '2024-01-15T14:20:00Z'
        },
        response_status: 200,
        response_body: '{"success": true, "crm_updated": true}',
        success: true,
        duration_ms: 189
      }
    ];

    for (const log of sampleWebhookLogs) {
      await prisma.webhookLog.upsert({
        where: { id: log.id },
        update: {},
        create: log
      });
    }
    console.log('✅ Sample webhook logs created/updated');

    console.log('🎉 Upload queue seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedUploadQueue(); 