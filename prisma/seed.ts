import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');
  
  try {
    // Create default admin user
    console.log('Creating admin user...');
    const adminEmail = 'admin@qsncc.com';
    const adminPassword = '$2a$10$dwiCxbUtCqnXeB2O8BmiyeWHL0e7rOqahafQAUACsnD4EZ9nGqPx2'; // bcrypt hash for 'nccadmin'
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        name: 'Admin User',
        email: adminEmail,
        password: adminPassword,
        role: 'Admin',
        authenticationMethod: 'basic',
        forcePasswordChange: false,
        modulePermissions: [
          'CANDIDATES_VIEW','CANDIDATES_MANAGE','CANDIDATES_IMPORT','CANDIDATES_EXPORT','POSITIONS_VIEW','POSITIONS_MANAGE','POSITIONS_IMPORT','POSITIONS_EXPORT','USERS_MANAGE','USER_GROUPS_MANAGE','SYSTEM_SETTINGS_MANAGE','USER_PREFERENCES_MANAGE','RECRUITMENT_STAGES_MANAGE','CUSTOM_FIELDS_MANAGE','LOGS_VIEW'
        ]
      }
    });
    console.log('✅ Admin user created/updated');

    // Create default positions
    console.log('Creating default positions...');
    await prisma.position.upsert({
      where: { id: '11111111-1111-1111-1111-111111111111' },
      update: {},
      create: {
        id: '11111111-1111-1111-1111-111111111111',
        title: 'Software Engineer',
        department: 'Engineering',
        description: 'Develops and maintains software.',
        positionLevel: 'Senior',
      }
    });
    await prisma.position.upsert({
      where: { id: '22222222-2222-2222-2222-222222222222' },
      update: {},
      create: {
        id: '22222222-2222-2222-2222-222222222222',
        title: 'Product Manager',
        department: 'Product',
        description: 'Oversees product development.',
        positionLevel: 'Manager',
      }
    });
    console.log('✅ Default positions created/updated');

    // Create default recruitment stages
    console.log('Creating recruitment stages...');
    const stages = [
      { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Applied', description: 'Candidate has submitted their application', isSystem: true, sortOrder: 1, color_complete: '#60a5fa', color_badge: '#60a5fa' }, // blue-400
      { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Screening', description: 'Initial screening of candidate qualifications', isSystem: true, sortOrder: 2, color_complete: '#60a5fa', color_badge: '#60a5fa' },
      { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Shortlisted', description: 'Candidate has been shortlisted for further consideration', isSystem: true, sortOrder: 3, color_complete: '#60a5fa', color_badge: '#60a5fa' },
      { id: '550e8400-e29b-41d4-a716-446655440004', name: 'Interview Scheduled', description: 'Interview has been scheduled with the candidate', isSystem: true, sortOrder: 4, color_complete: '#60a5fa', color_badge: '#60a5fa' },
      { id: '550e8400-e29b-41d4-a716-446655440005', name: 'Interviewing', description: 'Candidate is currently in the interview process', isSystem: true, sortOrder: 5, color_complete: '#60a5fa', color_badge: '#60a5fa' },
      { id: '550e8400-e29b-41d4-a716-446655440006', name: 'Offer Extended', description: 'Job offer has been extended to the candidate', isSystem: true, sortOrder: 6, color_complete: '#22c55e', color_badge: '#22c55e' }, // green-500
      { id: '550e8400-e29b-41d4-a716-446655440007', name: 'Offer Accepted', description: 'Candidate has accepted the job offer', isSystem: true, sortOrder: 7, color_complete: '#22c55e', color_badge: '#22c55e' },
      { id: '550e8400-e29b-41d4-a716-446655440008', name: 'Hired', description: 'Candidate has been hired and started employment', isSystem: true, sortOrder: 8, color_complete: '#22c55e', color_badge: '#22c55e' },
      { id: '550e8400-e29b-41d4-a716-446655440009', name: 'Rejected', description: 'Candidate has been rejected from the process', isSystem: true, sortOrder: 9, color_complete: '#ef4444', color_badge: '#ef4444' }, // red-500
      { id: '550e8400-e29b-41d4-a716-446655440010', name: 'On Hold', description: 'Candidate application is temporarily on hold', isSystem: true, sortOrder: 10, color_complete: '#6b7280', color_badge: '#6b7280' } // gray-500
    ];
    for (const stage of stages) {
      await prisma.recruitmentStage.upsert({
        where: { name: stage.name },
        update: { color_complete: stage.color_complete, color_badge: stage.color_badge },
        create: stage
      });
    }
    console.log('✅ Recruitment stages created/updated');

    // Create default user groups (roles)
    console.log('Creating user groups...');
    const userGroups = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Admin',
        description: 'Full system access',
        permissions: [
          'CANDIDATES_VIEW','CANDIDATES_MANAGE','CANDIDATES_IMPORT','CANDIDATES_EXPORT','CANDIDATES_COMMENTS','CANDIDATES_RESUMES','CANDIDATES_TRANSITIONS','CANDIDATES_RECRUITER_ASSIGN',
          'POSITIONS_VIEW','POSITIONS_MANAGE','POSITIONS_IMPORT','POSITIONS_EXPORT',
          'USERS_MANAGE','USER_GROUPS_MANAGE','API_KEYS_MANAGE',
          'SYSTEM_SETTINGS_MANAGE','USER_PREFERENCES_MANAGE','RECRUITMENT_STAGES_MANAGE','CUSTOM_FIELDS_MANAGE','WEBHOOK_MAPPING_MANAGE','AI_INTEGRATION_MANAGE',
          'UPLOAD_QUEUE_MANAGE','AUTOMATION_UPLOAD','BULK_UPLOAD',
          'LOGS_VIEW','AUDIT_LOGS_VIEW','WEBHOOK_LOGS_VIEW',
          'DASHBOARD_VIEW','ANALYTICS_VIEW','WEBHOOK_ANALYTICS_VIEW',
          'HR_DEPARTMENT_MANAGE','IT_DEPARTMENT_MANAGE','FINANCE_DEPARTMENT_MANAGE','MARKETING_DEPARTMENT_MANAGE'
        ],
        isDefault: true,
        isSystemRole: true
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        name: 'Recruiter',
        description: 'Can manage candidates and positions',
        permissions: [
          'CANDIDATES_VIEW','CANDIDATES_MANAGE','CANDIDATES_IMPORT','CANDIDATES_EXPORT','CANDIDATES_COMMENTS','CANDIDATES_RESUMES','CANDIDATES_TRANSITIONS','CANDIDATES_RECRUITER_ASSIGN',
          'POSITIONS_VIEW','POSITIONS_MANAGE','POSITIONS_IMPORT','POSITIONS_EXPORT',
          'RECRUITMENT_STAGES_MANAGE','USER_PREFERENCES_MANAGE',
          'BULK_UPLOAD','AUTOMATION_UPLOAD',
          'DASHBOARD_VIEW','ANALYTICS_VIEW'
        ],
        isDefault: true,
        isSystemRole: false
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        name: 'Hiring Manager',
        description: 'Can view candidates and positions',
        permissions: [
          'CANDIDATES_VIEW','POSITIONS_VIEW','DASHBOARD_VIEW','USER_PREFERENCES_MANAGE'
        ],
        isDefault: true,
        isSystemRole: false
      },
      {
        id: '00000000-0000-0000-0000-000000000011',
        name: 'HR',
        description: 'HR Department group',
        permissions: [
          'HR_MANAGE','HR_CREATE','HR_UPDATE','HR_DELETE'
        ],
        isDefault: true,
        isSystemRole: false
      },
      {
        id: '00000000-0000-0000-0000-000000000012',
        name: 'IT',
        description: 'IT Department group',
        permissions: [
          'IT_MANAGE','IT_CREATE','IT_UPDATE','IT_DELETE'
        ],
        isDefault: true,
        isSystemRole: false
      }
    ];
    for (const group of userGroups) {
      await prisma.userGroup.upsert({
        where: { id: group.id },
        update: {},
        create: group
      });
    }
    console.log('✅ User groups created/updated');

    // Assign default admin user to Admin group
    console.log('Assigning admin user to Admin group...');
    const adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (adminUser) {
      await prisma.user_UserGroup.upsert({
        where: { userId_groupId: { userId: adminUser.id, groupId: '00000000-0000-0000-0000-000000000001' } },
        update: {},
        create: { userId: adminUser.id, groupId: '00000000-0000-0000-0000-000000000001' }
      });
      console.log('✅ Admin user assigned to Admin group');
    }



    // Seed default system settings
    console.log('Creating default system settings...');
    const systemSettings = [
      { key: 'appName', value: 'CandiTrack' },
      { key: 'appThemePreference', value: 'system' },
      { key: 'primaryGradientStart', value: '179 67% 66%' },
      { key: 'primaryGradientEnd', value: '238 74% 61%' },
      { key: 'loginPageLayoutType', value: '2column' },
      // Add a default logo (simple SVG data URL)
      { key: 'appLogoDataUrl', value: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMjAwIDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjgwIiByeD0iOCIgZmlsbD0idXJsKCNncmFkaWVudCkiLz4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iMjAiIGZpbGw9IndoaXRlIi8+Cjx0ZXh0IHg9IjgwIiB5PSI0OCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiPkNhbmRpVHJhY2s8L3RleHQ+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWRpZW50IiB4MT0iMCIgeTE9IjAiIHgyPSIyMDAiIHkyPSI4MCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojM0I4MkZGO3N0b3Atb3BhY2l0eToxIiAvPgo8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM2MzY2RjA7c3RvcC1vcGFjaXR5OjEiIC8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+' },
      // Sidebar Light Theme
      { key: 'sidebarBgStartL', value: '220 25% 97%' },
      { key: 'sidebarTextL', value: '220 25% 30%' },
      { key: 'sidebarBorderL', value: '220 15% 85%' },
      { key: 'sidebarActiveBgStartL', value: '179 67% 66%' },
      { key: 'sidebarActiveTextL', value: '0 0% 100%' },
      { key: 'sidebarHoverBgL', value: '220 10% 92%' },
      { key: 'sidebarHoverTextL', value: '220 25% 25%' },
      // Sidebar Dark Theme
      { key: 'sidebarBgStartD', value: '220 15% 12%' },
      { key: 'sidebarTextD', value: '210 30% 85%' },
      { key: 'sidebarBorderD', value: '220 15% 18%' },
      { key: 'sidebarActiveBgStartD', value: '179 67% 66%' },
      { key: 'sidebarActiveTextD', value: '0 0% 100%' },
      { key: 'sidebarHoverBgD', value: '220 15% 20%' },
      { key: 'sidebarHoverTextD', value: '210 30% 90%' },
    ];
    for (const setting of systemSettings) {
      await prisma.systemSetting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: setting
      });
    }
    console.log('✅ System settings created/updated');

    // Seed upload queue with sample data
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
          createdBy: adminUser?.id // Associate with admin user
        }
      });
    }
    console.log('✅ Upload queue sample data created/updated');

    // Seed sample webhooks
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
      },
      {
        id: '50000000-0000-0000-0000-000000000003',
        name: 'Email Service',
        url: 'https://api.emailservice.com/webhook',
        events: ['candidate.created', 'position.filled'],
        method: 'POST',
        is_active: false,
        auth_type: 'basic',
        auth_username: 'webhook_user',
        auth_password: 'secure_password_123',
        headers: {},
        retry_count: 2,
        timeout: 45
      },
      {
        id: '50000000-0000-0000-0000-000000000004',
        name: 'Analytics Dashboard',
        url: 'https://analytics.example.com/webhook/recruitment',
        events: ['candidate.created', 'candidate.updated', 'candidate.deleted', 'position.created', 'position.updated'],
        method: 'POST',
        is_active: true,
        auth_type: 'header',
        auth_header_name: 'X-API-Key',
        auth_header_value: 'analytics_api_key_2024',
        headers: {
          'Content-Type': 'application/json',
          'X-Source': 'CandiTrack'
        },
        retry_count: 4,
        timeout: 30
      },
      {
        id: '50000000-0000-0000-0000-000000009999',
        name: 'Resume Processing Workflow',
        url: 'https://ncc-dify.qsncc.com/v1/workflows/run',
        events: [
          'upload_queue.created',
          'upload_queue.processing',
          'upload_queue.completed',
          'upload_queue.failed',
          'upload_queue.retry'
        ],
        method: 'POST',
        is_active: true,
        auth_type: 'bearer',
        auth_token: 'app-Q6ZQIUiGIRWSlTu5e4SXn0ZF',
        headers: {
          'Content-Type': 'application/json'
        },
        retry_count: 3,
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

    // Seed sample webhook logs
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
      },
      {
        id: '60000000-0000-0000-0000-000000000003',
        webhook_id: '50000000-0000-0000-0000-000000000003',
        event_type: 'candidate.created',
        payload: {
          candidate: {
            id: '70000000-0000-0000-0000-000000000003',
            name: 'Mike Johnson',
            email: 'mike.johnson@example.com',
            status: 'Applied'
          },
          timestamp: '2024-01-15T16:45:00Z'
        },
        response_status: 401,
        response_body: '{"error": "Unauthorized", "message": "Invalid credentials"}',
        success: false,
        error_message: 'Authentication failed',
        duration_ms: 156
      },
      {
        id: '60000000-0000-0000-0000-000000000004',
        webhook_id: '50000000-0000-0000-0000-000000000004',
        event_type: 'position.created',
        payload: {
          position: {
            id: '11111111-1111-1111-1111-111111111111',
            title: 'Software Engineer',
            department: 'Engineering',
            isOpen: true
          },
          timestamp: '2024-01-15T09:15:00Z'
        },
        response_status: 200,
        response_body: '{"success": true, "analytics_updated": true}',
        success: true,
        duration_ms: 312
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

    // Seed default data models for candidates and positions
    console.log('Creating default data models...');
    const dataModels = [
      {
        id: '30000000-0000-0000-0000-000000000001',
        name: 'Candidate Profile',
        modelType: 'Candidate',
        description: 'Standard candidate data model with personal and professional information',
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string', required: true, label: 'Full Name', description: 'Candidate\'s full name' },
            email: { type: 'string', format: 'email', required: true, label: 'Email Address', description: 'Primary email contact' },
            phone: { type: 'string', label: 'Phone Number', description: 'Contact phone number' },
            positionId: { type: 'string', label: 'Applied Position', description: 'Position the candidate applied for' },
            recruiterId: { type: 'string', label: 'Assigned Recruiter', description: 'Recruiter responsible for this candidate' },
            fitScore: { type: 'number', label: 'Fit Score', description: 'AI-generated fit score for the position' },
            status: { type: 'string', label: 'Application Status', description: 'Current status in recruitment process' },
            applicationDate: { type: 'date', label: 'Application Date', description: 'When the candidate applied' },
            avatarUrl: { type: 'string', label: 'Avatar URL', description: 'Profile picture URL' },
            dataAiHint: { type: 'string', label: 'AI Data Hint', description: 'Additional data for AI processing' },
            customAttributes: { type: 'object', label: 'Custom Attributes', description: 'Additional custom fields' }
          },
          required: ['name', 'email']
        },
        isActive: true
      },
      {
        id: '30000000-0000-0000-0000-000000000002',
        name: 'Job Position',
        modelType: 'Position',
        description: 'Job position data model with requirements and details',
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string', required: true, label: 'Job Title', description: 'Position title' },
            department: { type: 'string', required: true, label: 'Department', description: 'Department this position belongs to' },
            description: { type: 'string', label: 'Job Description', description: 'Detailed job description' },
            isOpen: { type: 'boolean', label: 'Position Open', description: 'Whether the position is currently open' },
            positionLevel: { type: 'string', label: 'Position Level', description: 'Seniority level of the position' },
            customAttributes: { type: 'object', label: 'Custom Attributes', description: 'Additional custom fields' }
          },
          required: ['title', 'department']
        },
        isActive: true
      },
      {
        id: '30000000-0000-0000-0000-000000000003',
        name: 'User Profile',
        modelType: 'User',
        description: 'User profile data model for system users',
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string', required: true, label: 'Full Name', description: 'User\'s full name' },
            email: { type: 'string', format: 'email', required: true, label: 'Email Address', description: 'User\'s email address' },
            role: { type: 'string', label: 'User Role', description: 'System role (Admin, Recruiter, etc.)' },
            avatarUrl: { type: 'string', label: 'Avatar URL', description: 'Profile picture URL' },
            modulePermissions: { type: 'array', items: { type: 'string' }, label: 'Module Permissions', description: 'List of module permissions' },
            authenticationMethod: { type: 'string', label: 'Authentication Method', description: 'How the user authenticates' },
            forcePasswordChange: { type: 'boolean', label: 'Force Password Change', description: 'Whether user must change password' }
          },
          required: ['name', 'email']
        },
        isActive: true
      }
    ];
    
    for (const dataModel of dataModels) {
      await prisma.dataModel.upsert({
        where: { id: dataModel.id },
        update: {},
        create: dataModel
      });
    }
    console.log('✅ Default data models created/updated');

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch(e => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 