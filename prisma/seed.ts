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

    // Create default recruitment stages
    console.log('Creating recruitment stages...');
    const stages = [
      { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Applied', description: 'Candidate has submitted their application', isSystem: true, sortOrder: 1, color_complete: '#60a5fa', color_badge: '#60a5fa' },
      { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Screening', description: 'Initial screening of candidate qualifications', isSystem: true, sortOrder: 2, color_complete: '#60a5fa', color_badge: '#60a5fa' },
      { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Shortlisted', description: 'Candidate has been shortlisted for further consideration', isSystem: true, sortOrder: 3, color_complete: '#60a5fa', color_badge: '#60a5fa' },
      { id: '550e8400-e29b-41d4-a716-446655440004', name: 'Interview Scheduled', description: 'Interview has been scheduled with the candidate', isSystem: true, sortOrder: 4, color_complete: '#60a5fa', color_badge: '#60a5fa' },
      { id: '550e8400-e29b-41d4-a716-446655440005', name: 'Interviewing', description: 'Candidate is currently in the interview process', isSystem: true, sortOrder: 5, color_complete: '#60a5fa', color_badge: '#60a5fa' },
      { id: '550e8400-e29b-41d4-a716-446655440006', name: 'Offer Extended', description: 'Job offer has been extended to the candidate', isSystem: true, sortOrder: 6, color_complete: '#22c55e', color_badge: '#22c55e' },
      { id: '550e8400-e29b-41d4-a716-446655440007', name: 'Offer Accepted', description: 'Candidate has accepted the job offer', isSystem: true, sortOrder: 7, color_complete: '#22c55e', color_badge: '#22c55e' },
      { id: '550e8400-e29b-41d4-a716-446655440008', name: 'Hired', description: 'Candidate has been hired and started employment', isSystem: true, sortOrder: 8, color_complete: '#22c55e', color_badge: '#22c55e' },
      { id: '550e8400-e29b-41d4-a716-446655440009', name: 'Rejected', description: 'Candidate has been rejected from the process', isSystem: true, sortOrder: 9, color_complete: '#ef4444', color_badge: '#ef4444' },
      { id: '550e8400-e29b-41d4-a716-446655440010', name: 'On Hold', description: 'Candidate application is temporarily on hold', isSystem: true, sortOrder: 10, color_complete: '#6b7280', color_badge: '#6b7280' }
    ];
    
    for (const stage of stages) {
      await prisma.recruitmentStage.upsert({
        where: { name: stage.name },
        update: { color_complete: stage.color_complete, color_badge: stage.color_badge },
        create: stage
      });
    }
    console.log('✅ Recruitment stages created/updated');

    // Create default user groups
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

    // Assign admin user to Admin group
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

    // Create basic system settings
    console.log('Creating system settings...');
    const systemSettings = [
      { key: 'appName', value: 'FitScan' },
      { key: 'appThemePreference', value: 'system' },
      { key: 'primaryGradientStart', value: '179 67% 66%' },
      { key: 'primaryGradientEnd', value: '238 74% 61%' },
      { key: 'loginPageLayoutType', value: '2column' }
    ];
    
    for (const setting of systemSettings) {
      await prisma.systemSetting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: setting
      });
    }
    console.log('✅ System settings created/updated');



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