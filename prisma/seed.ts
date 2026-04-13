import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Database Initialization Started');
  console.log('================================');

  try {
    // Create admin user if none exists
    const adminCount = await prisma.user.count({
      where: { role: 'Admin' }
    });

    let adminEmail = process.env.ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL || 'admin@example.com';

    if (adminCount === 0) {
      console.log('No admin user found. Creating initial admin...');
      const adminPassword = process.env.ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD || (Math.random().toString(36).slice(-10) + '!');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      await prisma.user.create({
        data: {
          name: 'Admin User',
          email: adminEmail,
          password: hashedPassword,
          role: 'Admin',
          authenticationMethods: ['basic'],
          forcePasswordChange: false
        }
      });
      console.log('✓ Admin user created:', adminEmail);
      if (!process.env.ADMIN_PASSWORD && !process.env.SEED_ADMIN_PASSWORD) {
        console.warn('⚠️ Generated random password for new admin:', adminPassword);
      }
    } else {
      console.log('Admin user(s) already exist. Skipping initial admin creation.');
      // Find the existing admin email to use for subsequent steps
      const existingAdmin = await prisma.user.findFirst({
        where: { role: 'Admin' },
        select: { email: true }
      });
      if (existingAdmin) {
        adminEmail = existingAdmin.email;
      }
    }

    // Create default recruitment stages
    console.log('Creating recruitment stages...');
    const stages = [
      { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Applied', description: 'applicant has submitted their application', isSystem: true, sortOrder: 1, color_complete: '#60a5fa', color_badge: '#60a5fa' },
      { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Screening', description: 'Initial screening of applicant qualifications', isSystem: true, sortOrder: 2, color_complete: '#60a5fa', color_badge: '#60a5fa' },
      { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Shortlisted', description: 'applicant has been shortlisted for further consideration', isSystem: true, sortOrder: 3, color_complete: '#60a5fa', color_badge: '#60a5fa' },
      { id: '550e8400-e29b-41d4-a716-446655440004', name: 'Interview Scheduled', description: 'Interview has been scheduled with the applicant', isSystem: true, sortOrder: 4, color_complete: '#60a5fa', color_badge: '#60a5fa' },
      { id: '550e8400-e29b-41d4-a716-446655440005', name: 'Interviewing', description: 'applicant is currently in the interview process', isSystem: true, sortOrder: 5, color_complete: '#60a5fa', color_badge: '#60a5fa' },
      { id: '550e8400-e29b-41d4-a716-446655440006', name: 'Offer Extended', description: 'Job offer has been extended to the applicant', isSystem: true, sortOrder: 6, color_complete: '#22c55e', color_badge: '#22c55e' },
      { id: '550e8400-e29b-41d4-a716-446655440007', name: 'Offer Accepted', description: 'applicant has accepted the job offer', isSystem: true, sortOrder: 7, color_complete: '#22c55e', color_badge: '#22c55e' },
      { id: '550e8400-e29b-41d4-a716-446655440008', name: 'Hired', description: 'applicant has been hired and started employment', isSystem: true, sortOrder: 8, color_complete: '#22c55e', color_badge: '#22c55e' },
      { id: '550e8400-e29b-41d4-a716-446655440009', name: 'Rejected', description: 'applicant has been rejected from the process', isSystem: true, sortOrder: 9, color_complete: '#ef4444', color_badge: '#ef4444' },
      { id: '550e8400-e29b-41d4-a716-446655440010', name: 'On Hold', description: 'applicant application is temporarily on hold', isSystem: true, sortOrder: 10, color_complete: '#6b7280', color_badge: '#6b7280' }
    ];

    for (const stage of stages) {
      await prisma.recruitmentStage.upsert({
        where: { id: stage.id },
        update: {
          name: stage.name,
          description: stage.description,
          isSystem: stage.isSystem,
          sortOrder: stage.sortOrder
        },
        create: stage
      });
    }
    console.log('✓ Recruitment stages created/updated');

    // Create default user groups with detailed permissions
    console.log('Creating default user groups...');

    // First, check if groups already exist by name
    const existingAdminGroup = await prisma.userGroup.findUnique({
      where: { name: 'Admin' }
    });

    const existingRecruiterGroup = await prisma.userGroup.findUnique({
      where: { name: 'Recruiter' }
    });

    const existingHiringManagerGroup = await prisma.userGroup.findUnique({
      where: { name: 'Hiring Manager' }
    });

    const existingPreRegisteredGroup = await prisma.userGroup.findUnique({
      where: { name: 'Pre-Registered User' }
    });

    // Create or update admin group
    let adminGroup;
    if (existingAdminGroup) {
      console.log('   Updating existing Administrators group...');
      adminGroup = await prisma.userGroup.update({
        where: { id: existingAdminGroup.id },
        data: {
          description: 'Full system access and management',
          permissions: [
            // applicant permissions
                        'applicantS_VIEW', 'applicantS_VIEW_DETAILED', 'applicantS_CREATE', 'applicantS_EDIT_BASIC', 'applicantS_EDIT_SENSITIVE', 'applicantS_EDIT_BASIC_OWN', 'applicantS_EDIT_SENSITIVE_OWN', 'applicantS_EDIT_BASIC_ALL', 'applicantS_EDIT_SENSITIVE_ALL', 'applicantS_DELETE', 'applicantS_SOURCE_ASSIGN', 'applicantS_SOURCE_ASSIGN_BULK', 'applicantS_RECRUITER_ASSIGN', 'applicantS_RECRUITER_ASSIGN_BULK', 'applicantS_RECRUITER_ASSIGN_OWN', 'applicantS_RECRUITER_ASSIGN_ALL', 'applicantS_PIPELINE_STAGE_UPDATE', 'applicantS_PIPELINE_STAGE_BULK_UPDATE', 'applicantS_PIPELINE_STAGE_UPDATE_OWN', 'applicantS_PIPELINE_STAGE_UPDATE_ALL', 'applicantS_RESUMES_UPLOAD', 'applicantS_RESUMES_UPLOAD_OWN', 'applicantS_RESUMES_UPLOAD_ALL', 'applicantS_RESUMES_DELETE', 'applicantS_COMMENTS_VIEW', 'applicantS_COMMENTS_ADD', 'applicantS_COMMENTS_ADD_OWN', 'applicantS_COMMENTS_ADD_ALL', 'applicantS_COMMENTS_EDIT', 'applicantS_IMPORT', 'applicantS_EXPORT', 'applicantS_ACTIVITIES_VIEW',
            // Position permissions
            'POSITIONS_VIEW', 'POSITIONS_CREATE', 'POSITIONS_EDIT_BASIC', 'POSITIONS_EDIT_DETAILED', 'POSITIONS_RECRUITER_ASSIGN', 'POSITIONS_DELETE', 'POSITIONS_IMPORT', 'POSITIONS_EXPORT',
            // User management permissions
            'USERS_VIEW', 'USERS_CREATE', 'USERS_EDIT', 'USERS_DELETE', 'USERS_PERMISSIONS_MANAGE', 'USER_GROUPS_VIEW', 'USER_GROUPS_CREATE', 'USER_GROUPS_EDIT', 'USER_GROUPS_DELETE',
            // System permissions
            'SYSTEM_SETTINGS_VIEW', 'SYSTEM_SETTINGS_EDIT', 'RECRUITMENT_STAGES_VIEW', 'RECRUITMENT_STAGES_EDIT', 'CUSTOM_FIELDS_VIEW', 'CUSTOM_FIELDS_EDIT', 'WEBHOOKS_VIEW', 'WEBHOOKS_EDIT', 'AI_INTEGRATION_VIEW', 'AI_INTEGRATION_EDIT',
            // Other permissions
            'UPLOAD_QUEUE_VIEW', 'UPLOAD_QUEUE_MANAGE', 'BULK_UPLOAD_EXECUTE', 'DASHBOARD_VIEW', 'REPORTS_GENERATE', 'WEBHOOK_ANALYTICS_VIEW', 'LOGS_VIEW', 'LOGS_EXPORT', 'APP_PERFORMANCE_VIEW', 'TASK_BOARD_VIEW', 'TASK_BOARD_MANAGE_OWN', 'TASK_BOARD_MANAGE_ALL', 'JOB_MATCH_VIEW', 'JOB_MATCH_MANAGE', 'WARNING_CONFIGURATIONS_VIEW', 'WARNING_CONFIGURATIONS_MANAGE', 'USER_PREFERENCES_MANAGE_OWN', 'USER_PREFERENCES_MANAGE_ALL'
          ],
          isDefault: false,
          isSystemRole: true,
        }
      });
    } else {
      console.log('   Creating new Administrators group...');
      adminGroup = await prisma.userGroup.create({
        data: {
          name: 'Admin',
          description: 'Full system access and management',
          permissions: [
            // applicant permissions
                        'applicantS_VIEW', 'applicantS_VIEW_DETAILED', 'applicantS_CREATE', 'applicantS_EDIT_BASIC', 'applicantS_EDIT_SENSITIVE', 'applicantS_EDIT_BASIC_OWN', 'applicantS_EDIT_SENSITIVE_OWN', 'applicantS_EDIT_BASIC_ALL', 'applicantS_EDIT_SENSITIVE_ALL', 'applicantS_DELETE', 'applicantS_SOURCE_ASSIGN', 'applicantS_SOURCE_ASSIGN_BULK', 'applicantS_RECRUITER_ASSIGN', 'applicantS_RECRUITER_ASSIGN_BULK', 'applicantS_RECRUITER_ASSIGN_OWN', 'applicantS_RECRUITER_ASSIGN_ALL', 'applicantS_PIPELINE_STAGE_UPDATE', 'applicantS_PIPELINE_STAGE_BULK_UPDATE', 'applicantS_PIPELINE_STAGE_UPDATE_OWN', 'applicantS_PIPELINE_STAGE_UPDATE_ALL', 'applicantS_RESUMES_UPLOAD', 'applicantS_RESUMES_UPLOAD_OWN', 'applicantS_RESUMES_UPLOAD_ALL', 'applicantS_RESUMES_DELETE', 'applicantS_COMMENTS_VIEW', 'applicantS_COMMENTS_ADD', 'applicantS_COMMENTS_ADD_OWN', 'applicantS_COMMENTS_ADD_ALL', 'applicantS_COMMENTS_EDIT', 'applicantS_IMPORT', 'applicantS_EXPORT', 'applicantS_ACTIVITIES_VIEW',
            // Position permissions
            'POSITIONS_VIEW', 'POSITIONS_CREATE', 'POSITIONS_EDIT_BASIC', 'POSITIONS_EDIT_DETAILED', 'POSITIONS_RECRUITER_ASSIGN', 'POSITIONS_DELETE', 'POSITIONS_IMPORT', 'POSITIONS_EXPORT',
            // User management permissions
            'USERS_VIEW', 'USERS_CREATE', 'USERS_EDIT', 'USERS_DELETE', 'USERS_PERMISSIONS_MANAGE', 'USER_GROUPS_VIEW', 'USER_GROUPS_CREATE', 'USER_GROUPS_EDIT', 'USER_GROUPS_DELETE',
            // System permissions
            'SYSTEM_SETTINGS_VIEW', 'SYSTEM_SETTINGS_EDIT', 'RECRUITMENT_STAGES_VIEW', 'RECRUITMENT_STAGES_EDIT', 'CUSTOM_FIELDS_VIEW', 'CUSTOM_FIELDS_EDIT', 'WEBHOOKS_VIEW', 'WEBHOOKS_EDIT', 'AI_INTEGRATION_VIEW', 'AI_INTEGRATION_EDIT',
            // Other permissions
            'UPLOAD_QUEUE_VIEW', 'UPLOAD_QUEUE_MANAGE', 'BULK_UPLOAD_EXECUTE', 'DASHBOARD_VIEW', 'REPORTS_GENERATE', 'WEBHOOK_ANALYTICS_VIEW', 'LOGS_VIEW', 'LOGS_EXPORT', 'APP_PERFORMANCE_VIEW', 'TASK_BOARD_VIEW', 'TASK_BOARD_MANAGE_OWN', 'TASK_BOARD_MANAGE_ALL', 'JOB_MATCH_VIEW', 'JOB_MATCH_MANAGE', 'WARNING_CONFIGURATIONS_VIEW', 'WARNING_CONFIGURATIONS_MANAGE', 'USER_PREFERENCES_MANAGE_OWN', 'USER_PREFERENCES_MANAGE_ALL'
          ],
          isDefault: false,
          isSystemRole: true,
        }
      });
    }

    // Create or update recruiter group
    let recruiterGroup;
    if (existingRecruiterGroup) {
      console.log('   Updating existing Recruiter group...');
      recruiterGroup = await prisma.userGroup.update({
        where: { id: existingRecruiterGroup.id },
        data: {
          description: 'Standard recruiter access',
          permissions: [
            // applicant management
                        'applicantS_VIEW', 'applicantS_VIEW_DETAILED', 'applicantS_CREATE', 'applicantS_EDIT_BASIC', 'applicantS_EDIT_BASIC_OWN', 'applicantS_SOURCE_ASSIGN', 'applicantS_RECRUITER_ASSIGN', 'applicantS_RECRUITER_ASSIGN_OWN', 'applicantS_RECRUITER_ASSIGN_ALL', 'applicantS_PIPELINE_STAGE_UPDATE', 'applicantS_PIPELINE_STAGE_UPDATE_OWN', 'applicantS_PIPELINE_STAGE_UPDATE_ALL', 'applicantS_RESUMES_UPLOAD', 'applicantS_RESUMES_UPLOAD_OWN', 'applicantS_RESUMES_UPLOAD_ALL', 'applicantS_COMMENTS_VIEW', 'applicantS_COMMENTS_ADD', 'applicantS_COMMENTS_ADD_OWN', 'applicantS_COMMENTS_ADD_ALL', 'applicantS_IMPORT', 'applicantS_EXPORT', 'applicantS_ACTIVITIES_VIEW',
            // Position management
            'POSITIONS_VIEW', 'POSITIONS_CREATE', 'POSITIONS_EDIT_BASIC', 'POSITIONS_RECRUITER_ASSIGN', 'POSITIONS_IMPORT', 'POSITIONS_EXPORT',
            // Other permissions
            'TASK_BOARD_VIEW', 'TASK_BOARD_MANAGE_OWN', 'RECRUITMENT_STAGES_VIEW', 'USER_PREFERENCES_MANAGE_OWN', 'BULK_UPLOAD_EXECUTE', 'DASHBOARD_VIEW', 'REPORTS_GENERATE'
          ],
          isDefault: true,
          isSystemRole: false,
        }
      });
    } else {
      console.log('   Creating new Recruiter group...');
      recruiterGroup = await prisma.userGroup.create({
        data: {
          name: 'Recruiter',
          description: 'Standard recruiter access',
          permissions: [
            // applicant management
                        'applicantS_VIEW', 'applicantS_VIEW_DETAILED', 'applicantS_CREATE', 'applicantS_EDIT_BASIC', 'applicantS_EDIT_BASIC_OWN', 'applicantS_SOURCE_ASSIGN', 'applicantS_RECRUITER_ASSIGN', 'applicantS_RECRUITER_ASSIGN_OWN', 'applicantS_RECRUITER_ASSIGN_ALL', 'applicantS_PIPELINE_STAGE_UPDATE', 'applicantS_PIPELINE_STAGE_UPDATE_OWN', 'applicantS_PIPELINE_STAGE_UPDATE_ALL', 'applicantS_RESUMES_UPLOAD', 'applicantS_RESUMES_UPLOAD_OWN', 'applicantS_RESUMES_UPLOAD_ALL', 'applicantS_COMMENTS_VIEW', 'applicantS_COMMENTS_ADD', 'applicantS_COMMENTS_ADD_OWN', 'applicantS_COMMENTS_ADD_ALL', 'applicantS_IMPORT', 'applicantS_EXPORT', 'applicantS_ACTIVITIES_VIEW',
            // Position management
            'POSITIONS_VIEW', 'POSITIONS_CREATE', 'POSITIONS_EDIT_BASIC', 'POSITIONS_RECRUITER_ASSIGN', 'POSITIONS_IMPORT', 'POSITIONS_EXPORT',
            // Other permissions
            'TASK_BOARD_VIEW', 'TASK_BOARD_MANAGE_OWN', 'RECRUITMENT_STAGES_VIEW', 'USER_PREFERENCES_MANAGE_OWN', 'BULK_UPLOAD_EXECUTE', 'DASHBOARD_VIEW', 'REPORTS_GENERATE'
          ],
          isDefault: true,
          isSystemRole: false,
        }
      });
    }

    // Create or update Recruiter Manager group
    const existingRecruiterManagerGroup = await prisma.userGroup.findUnique({
      where: { name: 'Recruiter Manager' }
    });

    let recruiterManagerGroup;
    if (existingRecruiterManagerGroup) {
      console.log('   Updating existing Recruiter Manager group...');
      recruiterManagerGroup = await prisma.userGroup.update({
        where: { id: existingRecruiterManagerGroup.id },
        data: {
          description: 'Lead recruiter with advanced access',
          permissions: [
            // applicant management (Full access except Delete)
                        'applicantS_VIEW', 'applicantS_VIEW_ALL', 'applicantS_VIEW_DETAILED', 'applicantS_CREATE', 'applicantS_EDIT_BASIC', 'applicantS_EDIT_SENSITIVE', 'applicantS_EDIT_BASIC_ALL', 'applicantS_EDIT_SENSITIVE_ALL', 'applicantS_SOURCE_ASSIGN', 'applicantS_SOURCE_ASSIGN_BULK', 'applicantS_RECRUITER_ASSIGN', 'applicantS_RECRUITER_ASSIGN_BULK', 'applicantS_RECRUITER_ASSIGN_ALL', 'applicantS_PIPELINE_STAGE_UPDATE', 'applicantS_PIPELINE_STAGE_BULK_UPDATE', 'applicantS_PIPELINE_STAGE_UPDATE_ALL', 'applicantS_RESUMES_UPLOAD', 'applicantS_RESUMES_UPLOAD_ALL', 'applicantS_RESUMES_DELETE', 'applicantS_COMMENTS_VIEW', 'applicantS_COMMENTS_ADD', 'applicantS_COMMENTS_ADD_ALL', 'applicantS_COMMENTS_EDIT', 'applicantS_IMPORT', 'applicantS_EXPORT', 'applicantS_ACTIVITIES_VIEW',
            // Position management
            'POSITIONS_VIEW', 'POSITIONS_VIEW_ALL', 'POSITIONS_CREATE', 'POSITIONS_EDIT_BASIC', 'POSITIONS_EDIT_DETAILED', 'POSITIONS_RECRUITER_ASSIGN', 'POSITIONS_IMPORT', 'POSITIONS_EXPORT',
            // Other permissions
            'TASK_BOARD_VIEW', 'TASK_BOARD_MANAGE_ALL', 'RECRUITMENT_STAGES_VIEW', 'USER_PREFERENCES_MANAGE_OWN', 'USER_PREFERENCES_MANAGE_ALL', 'BULK_UPLOAD_EXECUTE', 'DASHBOARD_VIEW', 'REPORTS_GENERATE', 'WEBHOOK_ANALYTICS_VIEW'
          ],
          isDefault: false,
          isSystemRole: false,
        }
      });
    } else {
      console.log('   Creating new Recruiter Manager group...');
      recruiterManagerGroup = await prisma.userGroup.create({
        data: {
          name: 'Recruiter Manager',
          description: 'Lead recruiter with advanced access',
          permissions: [
            // applicant management
                        'applicantS_VIEW', 'applicantS_VIEW_ALL', 'applicantS_VIEW_DETAILED', 'applicantS_CREATE', 'applicantS_EDIT_BASIC', 'applicantS_EDIT_SENSITIVE', 'applicantS_EDIT_BASIC_ALL', 'applicantS_EDIT_SENSITIVE_ALL', 'applicantS_SOURCE_ASSIGN', 'applicantS_SOURCE_ASSIGN_BULK', 'applicantS_RECRUITER_ASSIGN', 'applicantS_RECRUITER_ASSIGN_BULK', 'applicantS_RECRUITER_ASSIGN_ALL', 'applicantS_PIPELINE_STAGE_UPDATE', 'applicantS_PIPELINE_STAGE_BULK_UPDATE', 'applicantS_PIPELINE_STAGE_UPDATE_ALL', 'applicantS_RESUMES_UPLOAD', 'applicantS_RESUMES_UPLOAD_ALL', 'applicantS_RESUMES_DELETE', 'applicantS_COMMENTS_VIEW', 'applicantS_COMMENTS_ADD', 'applicantS_COMMENTS_ADD_ALL', 'applicantS_COMMENTS_EDIT', 'applicantS_IMPORT', 'applicantS_EXPORT', 'applicantS_ACTIVITIES_VIEW',
            // Position management
            'POSITIONS_VIEW', 'POSITIONS_VIEW_ALL', 'POSITIONS_CREATE', 'POSITIONS_EDIT_BASIC', 'POSITIONS_EDIT_DETAILED', 'POSITIONS_RECRUITER_ASSIGN', 'POSITIONS_IMPORT', 'POSITIONS_EXPORT',
            // Other permissions
            'TASK_BOARD_VIEW', 'TASK_BOARD_MANAGE_ALL', 'RECRUITMENT_STAGES_VIEW', 'USER_PREFERENCES_MANAGE_OWN', 'USER_PREFERENCES_MANAGE_ALL', 'BULK_UPLOAD_EXECUTE', 'DASHBOARD_VIEW', 'REPORTS_GENERATE', 'WEBHOOK_ANALYTICS_VIEW'
          ],
          isDefault: false,
          isSystemRole: false,
        }
      });
    }

    // Create or update hiring manager group
    let hiringManagerGroup;
    if (existingHiringManagerGroup) {
      console.log('   Updating existing Hiring Managers group...');
      hiringManagerGroup = await prisma.userGroup.update({
        where: { id: existingHiringManagerGroup.id },
        data: {
          description: 'View-only access for hiring decisions',
          permissions: [
            'applicantS_VIEW', 'applicantS_VIEW_DETAILED', 'applicantS_COMMENTS_VIEW_REMARK_ONLY', 'POSITIONS_VIEW', 'TASK_BOARD_VIEW', 'DASHBOARD_VIEW', 'USER_PREFERENCES_MANAGE_OWN'
          ],
          isDefault: false,
          isSystemRole: false,
        }
      });
    } else {
      console.log('   Creating new Hiring Managers group...');
      hiringManagerGroup = await prisma.userGroup.create({
        data: {
          name: 'Hiring Manager',
          description: 'View-only access for hiring decisions',
          permissions: [
            'applicantS_VIEW', 'applicantS_VIEW_DETAILED', 'applicantS_COMMENTS_VIEW_REMARK_ONLY', 'POSITIONS_VIEW', 'TASK_BOARD_VIEW', 'DASHBOARD_VIEW', 'USER_PREFERENCES_MANAGE_OWN'
          ],
          isDefault: false,
          isSystemRole: false,
        }
      });
    }

    // Create or update pre-registered user group
    let preRegisteredGroup;
    if (existingPreRegisteredGroup) {
      console.log('   Updating existing Pre-Registered User group...');
      preRegisteredGroup = await prisma.userGroup.update({
        where: { id: existingPreRegisteredGroup.id },
        data: {
          description: 'Minimal permissions for pre-registered AD users - login and view own profile only',
          permissions: [
            'USER_PREFERENCES_MANAGE_OWN', 'ROLES_MANAGE'
          ],
          isDefault: false,
          isSystemRole: true,
        }
      });
    } else {
      console.log('   Creating new Pre-Registered User group...');
      preRegisteredGroup = await prisma.userGroup.create({
        data: {
          id: '00000000-0000-0000-0000-000000000004',
          name: 'Pre-Registered User',
          description: 'Minimal permissions for pre-registered AD users - login and view own profile only',
          permissions: [
            'USER_PREFERENCES_MANAGE_OWN', 'ROLES_MANAGE'
          ],
          isDefault: false,
          isSystemRole: true,
        }
      });
    }

    console.log('✓ Default user groups created/updated');

    // Assign admin user to Administrators group
    console.log('Assigning admin user to Administrators group...');
    const adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (adminUser) {
      // Update user with direct foreign key
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { userGroupId: adminGroup.id }
      });
      console.log('✓ Admin user assigned to Administrators group');
    }

    // Create basic system settings
    console.log('Creating system settings...');

    // Create a smaller simple SVG logo for FitScan as a data URL (reduced size)
    const defaultLogoSvg = `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1D4ED8;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="12" fill="url(#logoGradient)"/>
      <text x="32" y="42" font-family="Arial, sans-serif" font-size="22" font-weight="bold" text-anchor="middle" fill="white">FS</text>
    </svg>`;

    const defaultLogoDataUrl = `data:image/svg+xml;base64,${Buffer.from(defaultLogoSvg).toString('base64')}`;

    const defaultEmailTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #3B82F6; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .footer { background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 5px 5px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; }
    .info-box { background-color: #dbeafe; border-left: 4px solid #3B82F6; padding: 15px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Interview Invitation</h1>
    </div>
    <div class="content">
      <p>Dear {{interviewerName}},</p>
      
      <p>You have been invited to interview a applicant for the position of <strong>{{positionTitle}}</strong>.</p>
      
      <div class="info-box">
        <h3 style="margin-top: 0;">Interview Details</h3>
        <p><strong>applicant:</strong> {{applicantName}}</p>
        <p><strong>Position:</strong> {{positionTitle}}</p>
        <p><strong>Date:</strong> {{interviewDate}}</p>
        <p><strong>Time:</strong> {{interviewTime}}</p>
        <p><strong>Location:</strong> {{interviewLocation}}</p>
      </div>
      
      <p>Please use the link below to evaluate the applicant:</p>
      <p style="text-align: center;">
        <a href="{{evaluationLink}}" class="button">Evaluate applicant</a>
      </p>
      
      <p>Please confirm your attendance and let us know if you need to reschedule.</p>
      
      <p>Best regards,<br>Recruitment Team</p>
    </div>
    <div class="footer">
      <p>This is an automated email. Please do not reply to this message.</p>
    </div>
  </div>
</body>
</html>`;

    const systemSettings = [
      { key: 'appName', value: 'FitScan' },
      { key: 'appThemePreference', value: 'system' },
      { key: 'primaryGradientStart', value: '179 67% 66%' },
      { key: 'primaryGradientEnd', value: '238 74% 61%' },
      { key: 'loginPageLayoutType', value: '2column' },
      { key: 'appLogoDataUrl', value: defaultLogoDataUrl },
      { key: 'loginPageLogoSize', value: '100' },
      {
        key: 'defaultMatchCriteria',
        value: '<h2>Required Skills & Experience</h2><ul><li>Relevant educational background (Bachelor\'s degree or equivalent)</li><li>Minimum 2-3 years of professional experience in the field</li><li>Strong technical skills and proficiency in relevant tools</li><li>Excellent communication and teamwork abilities</li></ul><h2>Preferred Qualifications</h2><ul><li>Advanced degree or certifications</li><li>Experience with modern technologies and methodologies</li><li>Leadership or project management experience</li><li>Industry-specific knowledge and expertise</li></ul><h2>Personal Qualities</h2><ul><li>Problem-solving mindset and analytical thinking</li><li>Adaptability and willingness to learn</li><li>Strong work ethic and attention to detail</li><li>Cultural fit with company values</li></ul>'
      },
      { key: 'hiringManagerRestrictToAssignedPositions', value: 'true' }
    ];

    // Preserve existing logo: only set default if missing
    // Add email template settings
    systemSettings.push(
      {
        key: 'emailTemplateInterviewInvitationSubject',
        value: 'Interview Invitation: {{applicantName}} - {{positionTitle}}'
      },
      {
        key: 'emailTemplateInterviewInvitation',
        value: defaultEmailTemplate
      },
      {
        key: 'interviewInvitationFeatureEnabled',
        value: 'true'
      }
    );

    const existingSettings = await prisma.systemSetting.findMany({
      where: { key: { in: systemSettings.map(s => s.key) } }
    });
    const existingByKey = new Map(existingSettings.map(s => [s.key, s]));

    for (const setting of systemSettings) {
      const existing = existingByKey.get(setting.key as any);

      if (setting.key === 'appLogoDataUrl') {
        // If a logo already exists and is non-empty, skip overwrite
        if (existing && existing.value && String(existing.value).trim() !== '') {
          console.log('  Existing application logo detected. Preserving current logo.');
          continue;
        }
      }

      if (setting.key === 'defaultMatchCriteria') {
        // If default match criteria already exists and is non-empty, skip overwrite
        if (existing && existing.value && String(existing.value).trim() !== '') {
          console.log('  Existing default match criteria detected. Preserving current criteria.');
          continue;
        }
      }

      await prisma.systemSetting.upsert({
        where: { key: setting.key },
        update: {}, // Don't reset value if exists
        create: setting
      });
    }
    console.log('✓ System settings created/updated');

    // Create default system prompt categories
    console.log('Creating system prompt categories...');
    const systemPromptCategories = [
      {
        id: '550e8400-e29b-41d4-a716-446655440011',
        name: 'Job Description',
        description: 'Prompts for generating and improving job descriptions',
        color: '#3B82F6',
        isActive: true
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440012',
        name: 'applicant Assessment',
        description: 'Prompts for evaluating applicant qualifications and fit',
        color: '#10B981',
        isActive: true
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440013',
        name: 'Communication',
        description: 'Prompts for drafting emails, messages, and communications',
        color: '#F59E0B',
        isActive: true
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440014',
        name: 'Interview',
        description: 'Prompts for interview questions and evaluation',
        color: '#8B5CF6',
        isActive: true
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440015',
        name: 'General',
        description: 'General purpose prompts for various recruitment tasks',
        color: '#6B7280',
        isActive: true
      }
    ];

    const categoryMap = new Map<string, string>();
    for (const category of systemPromptCategories) {
      const { id, ...categoryDataWithoutId } = category;
      const upsertedCategory = await prisma.systemPromptCategory.upsert({
        where: { name: category.name },
        update: {
          description: category.description,
          color: category.color,
          isActive: category.isActive
        },
        create: categoryDataWithoutId
      });
      categoryMap.set(category.name, upsertedCategory.id);
    }
    console.log('✓ System prompt categories created/updated');

    // Create default grades
    console.log('Creating default grades...');
    const grades = [
      {
        id: '550e8400-e29b-41d4-a716-446655440020',
        name: 'G1',
        label: 'G1',
        description: 'Grade 1 - Entry level positions',
        minLevel: 1,
        maxLevel: 1,
        slaDays: 15,
        color: '#3B82F6',
        isActive: true,
        sortOrder: 1
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440021',
        name: 'G2',
        label: 'G2',
        description: 'Grade 2 - Entry level positions',
        minLevel: 2,
        maxLevel: 2,
        slaDays: 15,
        color: '#3B82F6',
        isActive: true,
        sortOrder: 2
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440022',
        name: 'G3',
        label: 'G3',
        description: 'Grade 3 - Mid-level positions',
        minLevel: 3,
        maxLevel: 3,
        slaDays: 30,
        color: '#10B981',
        isActive: true,
        sortOrder: 3
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440023',
        name: 'G4',
        label: 'G4',
        description: 'Grade 4 - Mid-level positions',
        minLevel: 4,
        maxLevel: 4,
        slaDays: 30,
        color: '#10B981',
        isActive: true,
        sortOrder: 4
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440024',
        name: 'G5',
        label: 'G5',
        description: 'Grade 5 - Mid-level positions',
        minLevel: 5,
        maxLevel: 5,
        slaDays: 30,
        color: '#10B981',
        isActive: true,
        sortOrder: 5
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440025',
        name: 'G6',
        label: 'G6',
        description: 'Grade 6 - Senior positions',
        minLevel: 6,
        maxLevel: 6,
        slaDays: 45,
        color: '#F59E0B',
        isActive: true,
        sortOrder: 6
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440026',
        name: 'G7',
        label: 'G7',
        description: 'Grade 7 - Senior positions',
        minLevel: 7,
        maxLevel: 7,
        slaDays: 45,
        color: '#F59E0B',
        isActive: true,
        sortOrder: 7
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440027',
        name: 'G8',
        label: 'G8',
        description: 'Grade 8 - Executive positions',
        minLevel: 8,
        maxLevel: 8,
        slaDays: 60,
        color: '#EF4444',
        isActive: true,
        sortOrder: 8
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440028',
        name: 'G9',
        label: 'G9',
        description: 'Grade 9 - Executive positions',
        minLevel: 9,
        maxLevel: 9,
        slaDays: 60,
        color: '#EF4444',
        isActive: true,
        sortOrder: 9
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440029',
        name: 'G10',
        label: 'G10',
        description: 'Grade 10 - Executive positions',
        minLevel: 10,
        maxLevel: 10,
        slaDays: 60,
        color: '#EF4444',
        isActive: true,
        sortOrder: 10
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440030',
        name: 'G11',
        label: 'G11',
        description: 'Grade 11 - Executive positions',
        minLevel: 11,
        maxLevel: 11,
        slaDays: 60,
        color: '#EF4444',
        isActive: true,
        sortOrder: 11
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440031',
        name: 'G12',
        label: 'G12',
        description: 'Grade 12 - Executive positions',
        minLevel: 12,
        maxLevel: 12,
        slaDays: 60,
        color: '#EF4444',
        isActive: true,
        sortOrder: 12
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440032',
        name: 'G13',
        label: 'G13',
        description: 'Grade 13 - Executive positions',
        minLevel: 13,
        maxLevel: 13,
        slaDays: 60,
        color: '#EF4444',
        isActive: true,
        sortOrder: 13
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440033',
        name: 'G14',
        label: 'G14',
        description: 'Grade 14 - Executive positions',
        minLevel: 14,
        maxLevel: 14,
        slaDays: 60,
        color: '#EF4444',
        isActive: true,
        sortOrder: 14
      }
    ];

    for (const grade of grades) {
      await prisma.grade.upsert({
        where: { id: grade.id },
        update: {},
        create: grade
      });
    }
    console.log('✓ Default grades created/updated');

    // Initialize AI Power Search system prompt
    console.log('Initializing AI Power Search system prompt...');
    const DEFAULT_AI_POWER_SEARCH_PROMPT = `You are a precise HR search assistant. Your task is to find applicants who EXACTLY match the specific information requested in the user's query.

User Search Query:
"{query}"

applicant Data (each applicant is between applicant_START and applicant_END):
{applicantData}

CRITICAL SEARCH RULES:
1. **EXACT MATCHING ONLY**: Only include applicants who explicitly have the specific information mentioned in the query
2. **NO SEMANTIC INFERENCE**: Do not include applicants based on similar or related information
3. **VERIFICATION REQUIRED**: Only include applicants where the requested information is clearly present in their data
4. **CASE INSENSITIVE**: Match information regardless of case (e.g., "TOEIC" matches "toeic", "Toeic")

SEARCH GUIDELINES BY QUERY TYPE:

**For Language/Certification Searches (e.g., "has TOEIC", "find applicants with TOEIC"):**
- Only include applicants who explicitly mention TOEIC in their data
- Check: Skills, Custom Attributes, Education, Experience descriptions, Personal info
- Do NOT include applicants who only mention "English" or "language skills" without TOEIC
- Do NOT include applicants based on general language abilities

**For Skill Searches (e.g., "has React", "knows Python"):**
- Only include applicants who explicitly list the specific skill
- Check: Skills section, Experience descriptions, Job matches
- Do NOT include applicants with similar technologies unless explicitly mentioned

**For Education Searches (e.g., "graduated from MIT", "has MBA"):**
- Only include applicants who explicitly mention the specific institution or degree
- Check: Education history, University names, Majors, Degrees
- Do NOT include applicants from similar institutions

**For Experience Searches (e.g., "worked at Google", "has 5 years experience"):**
- Only include applicants who explicitly mention the specific company or duration
- Check: Work experience, Company names, Duration fields
- Do NOT include applicants with similar companies or experience levels

**For Fit Score Searches:**
- Fit scores are displayed as percentages (0-100%)
- Decimal values (0-1) are automatically converted to percentages (e.g., 0.89 becomes 89%)
- When the query mentions "fit score less than X" or "fit score below X", only include applicants with fit scores < X%
- When the query mentions "fit score greater than X" or "fit score above X", only include applicants with fit scores > X%
- When the query mentions "fit score between X and Y", only include applicants with fit scores between X% and Y%

**For Position/Job Searches:**
- Only include applicants who explicitly applied for or are matched to the specific position
- Check: Applied Position, Job Matches, Position titles
- Do NOT include applicants with similar positions

**For Date Searches:**
- Only include applicants who match the specific date criteria
- Check: Application Date, Education dates, Experience dates
- Use exact date matching, not approximate

**For Location Searches:**
- Only include applicants who explicitly mention the specific location
- Check: Personal info location, Education location, Experience location
- Do NOT include applicants from nearby areas unless explicitly mentioned

**For Recruiter Searches:**
- Only include applicants assigned to the specific recruiter
- Check: Assigned Recruiter field
- Do NOT include applicants with similar recruiter names

**For Status Searches:**
- Only include applicants with the exact status mentioned
- Check: Status field, Transition history
- Do NOT include applicants with similar statuses

**For Custom Field Searches:**
- Only include applicants who have the specific custom field value
- Check: Custom Attributes section
- Match exact values, not similar ones

EXAMPLES OF CORRECT BEHAVIOR:

Query: "find the applicant has toeic"
- ✅ INCLUDE: applicant with "Skills: - Segment: Language: TOEIC 850, English"
- ✅ INCLUDE: applicant with "Custom Attributes: TOEIC_Score: 750"
- ❌ EXCLUDE: applicant with "Skills: - Segment: Language: English, Spanish" (no TOEIC mentioned)
- ❌ EXCLUDE: applicant with "Skills: - Segment: Language: IELTS 7.0" (different certification)

Query: "has React experience"
- ✅ INCLUDE: applicant with "Skills: - Segment: Programming: React, JavaScript"
- ✅ INCLUDE: applicant with "Experience: React Developer at Company X"
- ❌ EXCLUDE: applicant with "Skills: - Segment: Programming: Angular, Vue" (different framework)
- ❌ EXCLUDE: applicant with "Skills: - Segment: Programming: JavaScript" (no React mentioned)

Query: "fit score less than 30"
- ✅ INCLUDE: applicant with "Fit Score: 25%"
- ✅ INCLUDE: applicant with "Fit Score: 0.15" (15%)
- ❌ EXCLUDE: applicant with "Fit Score: 85%" (85% > 30%)
- ❌ EXCLUDE: applicant with "Fit Score: 0.89" (89% > 30%)

IMPORTANT: 
- If no applicants have the EXACT information requested, return an empty matchedapplicantIds array
- Do not make assumptions or include applicants with similar information
- Be strict and precise in your matching
- Always verify the information exists in the applicant data before including them

Return ONLY a valid JSON object in this exact format:
{
  "matchedapplicantIds": ["uuid1", "uuid2", ...],
  "aiReasoning": "Brief explanation of why these applicants were included or why none were found"
}

Do not include any markdown formatting, code blocks, or additional text. Only return the JSON object.`;

    // Create AI Power Search system prompt in the applicant Assessment category
    const existingPrompt = await prisma.systemPrompt.findFirst({
      where: {
        name: 'AI Power Search - applicant Matching'
      }
    });

    if (existingPrompt) {
      console.log('  AI Power Search prompt exists. Preserving customization.');
      // Do nothing - preserve existing prompt
    } else {
      await prisma.systemPrompt.create({
        data: {
          name: 'AI Power Search - applicant Matching',
          description: 'System prompt for AI Power Search to find applicants with exact matching criteria',
          content: DEFAULT_AI_POWER_SEARCH_PROMPT,
          categoryId: categoryMap.get('applicant Assessment')!, // applicant Assessment category
          isActive: true
        }
      });
    }
    console.log('✓ AI Power Search system prompt initialized');


    // Create applicant sources
    console.log('Creating applicant sources...');
    const applicantSources = [
      {
        id: '550e8400-e29b-41d4-a716-446655440040',
        name: 'JobsDB',
        description: 'JobsDB job portal',
        isActive: true,
        sortOrder: 1
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440041',
        name: 'JobTopGun',
        description: 'JobTopGun job portal',
        isActive: true,
        sortOrder: 2
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440042',
        name: 'JobThai',
        description: 'JobThai job portal',
        isActive: true,
        sortOrder: 3
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440043',
        name: 'JobBKK',
        description: 'JobBKK job portal',
        isActive: true,
        sortOrder: 4
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440044',
        name: 'JobsNCC',
        description: 'JobsNCC internal job portal',
        isActive: true,
        sortOrder: 5
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440045',
        name: 'Hoteljob',
        description: 'Hoteljob specialized portal',
        isActive: true,
        sortOrder: 6
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440046',
        name: 'Linkedin',
        description: 'LinkedIn professional network',
        isActive: true,
        sortOrder: 7
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440047',
        name: 'Facebook',
        description: 'Facebook social media',
        isActive: true,
        sortOrder: 8
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440048',
        name: 'Line',
        description: 'Line messaging platform',
        isActive: true,
        sortOrder: 9
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440049',
        name: 'Referral',
        description: 'Employee referral',
        isActive: true,
        sortOrder: 10
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440050',
        name: 'Transfer',
        description: 'Internal transfer',
        isActive: true,
        sortOrder: 11
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440051',
        name: 'Promoted',
        description: 'Internal promotion',
        isActive: true,
        sortOrder: 12
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440052',
        name: 'University',
        description: 'University partnership',
        isActive: true,
        sortOrder: 13
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440053',
        name: 'NCC Career',
        description: 'NCC Career portal',
        isActive: true,
        sortOrder: 14
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440054',
        name: 'Internship',
        description: 'Internship program',
        isActive: true,
        sortOrder: 15
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440055',
        name: 'Instagram',
        description: 'Instagram social media',
        isActive: true,
        sortOrder: 16
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440056',
        name: 'JobExpo',
        description: 'Job fair/Expo',
        isActive: true,
        sortOrder: 17
      }
    ];

    for (const source of applicantSources) {
      // Use upsert with name as the unique identifier
      // Don't include id in create to avoid conflicts with existing records
      const { id, ...sourceDataWithoutId } = source;
      await prisma.applicantSource.upsert({
        where: { name: source.name },
        update: {
          description: source.description,
          isActive: source.isActive,
          sortOrder: source.sortOrder
        },
        create: sourceDataWithoutId
      });
    }
    console.log('✓ applicant sources created/updated');

    // Create default position levels
    console.log('Creating default position levels...');
    const positionLevels = [
      {
        id: '550e8400-e29b-41d4-a716-446655440070',
        name: 'Entry Level',
        description: 'Entry level positions for recent graduates or junior professionals',
        color: '#3B82F6',
        isActive: true,
        sortOrder: 1
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440071',
        name: 'Junior',
        description: 'Junior positions with 1-3 years of experience',
        color: '#10B981',
        isActive: true,
        sortOrder: 2
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440072',
        name: 'Mid Level',
        description: 'Mid-level positions with 3-7 years of experience',
        color: '#F59E0B',
        isActive: true,
        sortOrder: 3
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440073',
        name: 'Senior',
        description: 'Senior positions with 7-12 years of experience',
        color: '#EF4444',
        isActive: true,
        sortOrder: 4
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440074',
        name: 'Lead',
        description: 'Lead positions with team leadership responsibilities',
        color: '#8B5CF6',
        isActive: true,
        sortOrder: 5
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440075',
        name: 'Manager',
        description: 'Managerial positions with department oversight',
        color: '#EC4899',
        isActive: true,
        sortOrder: 6
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440076',
        name: 'Director',
        description: 'Director level positions with strategic responsibilities',
        color: '#DC2626',
        isActive: true,
        sortOrder: 7
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440077',
        name: 'Executive',
        description: 'Executive level positions (C-level, VP, etc.)',
        color: '#7C2D12',
        isActive: true,
        sortOrder: 8
      }
    ];

    for (const level of positionLevels) {
      await prisma.positionLevel.upsert({
        where: { id: level.id },
        update: {},
        create: level
      });
    }
    console.log('✓ Default position levels created/updated');

    console.log('\nDatabase Seeding: COMPLETED');
    console.log('Status: All systems operational');
  } catch (error) {
    console.error('ERROR: Database seeding failed:', error);
    throw error;
  }
}

main()
  .catch(e => {
    console.error('ERROR: Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 
