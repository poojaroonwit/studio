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
        forcePasswordChange: false
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
          'CANDIDATES_VIEW','CANDIDATES_MANAGE','CANDIDATES_IMPORT','CANDIDATES_EXPORT','CANDIDATES_COMMENTS','CANDIDATES_RESUMES','CANDIDATES_TRANSITIONS','CANDIDATES_RECRUITER_ASSIGN','TASK_BOARD_VIEW','TASK_BOARD_MANAGE_ALL',
          'POSITIONS_VIEW','POSITIONS_MANAGE','POSITIONS_IMPORT','POSITIONS_EXPORT',
          'USERS_MANAGE','USER_GROUPS_MANAGE',
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
          'CANDIDATES_VIEW','CANDIDATES_MANAGE','CANDIDATES_IMPORT','CANDIDATES_EXPORT','CANDIDATES_COMMENTS','CANDIDATES_RESUMES','CANDIDATES_TRANSITIONS','CANDIDATES_RECRUITER_ASSIGN','TASK_BOARD_VIEW',
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
          'CANDIDATES_VIEW','POSITIONS_VIEW','TASK_BOARD_VIEW','DASHBOARD_VIEW','USER_PREFERENCES_MANAGE'
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
      { key: 'loginPageLayoutType', value: '2column' },
      { 
        key: 'defaultMatchCriteria', 
        value: '<h2>Required Skills & Experience</h2><ul><li>Relevant educational background (Bachelor\'s degree or equivalent)</li><li>Minimum 2-3 years of professional experience in the field</li><li>Strong technical skills and proficiency in relevant tools</li><li>Excellent communication and teamwork abilities</li></ul><h2>Preferred Qualifications</h2><ul><li>Advanced degree or certifications</li><li>Experience with modern technologies and methodologies</li><li>Leadership or project management experience</li><li>Industry-specific knowledge and expertise</li></ul><h2>Personal Qualities</h2><ul><li>Problem-solving mindset and analytical thinking</li><li>Adaptability and willingness to learn</li><li>Strong work ethic and attention to detail</li><li>Cultural fit with company values</li></ul>'
      }
    ];
    
    for (const setting of systemSettings) {
      await prisma.systemSetting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: setting
      });
    }
    console.log('✅ System settings created/updated');

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
        name: 'Candidate Assessment',
        description: 'Prompts for evaluating candidate qualifications and fit',
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
    
    for (const category of systemPromptCategories) {
      await prisma.systemPromptCategory.upsert({
        where: { id: category.id },
        update: {},
        create: category
      });
    }
    console.log('✅ System prompt categories created/updated');

    // Create default grades
    console.log('Creating default grades...');
    const grades = [
      {
        id: '550e8400-e29b-41d4-a716-446655440020',
        name: 'Junior',
        label: 'J',
        description: 'Entry-level positions with 0-2 years experience',
        minLevel: 1,
        maxLevel: 2,
        slaDays: 30,
        color: '#10B981',
        isActive: true,
        sortOrder: 1
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440021',
        name: 'Mid-Level',
        label: 'M',
        description: 'Mid-level positions with 3-5 years experience',
        minLevel: 3,
        maxLevel: 5,
        slaDays: 45,
        color: '#F59E0B',
        isActive: true,
        sortOrder: 2
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440022',
        name: 'Senior',
        label: 'S',
        description: 'Senior positions with 6-8 years experience',
        minLevel: 6,
        maxLevel: 8,
        slaDays: 60,
        color: '#EF4444',
        isActive: true,
        sortOrder: 3
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440023',
        name: 'Lead',
        label: 'L',
        description: 'Lead positions with 9+ years experience',
        minLevel: 9,
        maxLevel: 15,
        slaDays: 90,
        color: '#8B5CF6',
        isActive: true,
        sortOrder: 4
      }
    ];
    
    for (const grade of grades) {
      await prisma.grade.upsert({
        where: { id: grade.id },
        update: {},
        create: grade
      });
    }
    console.log('✅ Default grades created/updated');

    // Initialize AI Power Search system prompt
    console.log('Initializing AI Power Search system prompt...');
    const DEFAULT_AI_POWER_SEARCH_PROMPT = `You are a precise HR search assistant. Your task is to find candidates who EXACTLY match the specific information requested in the user's query.

User Search Query:
"{query}"

Candidate Data (each candidate is between CANDIDATE_START and CANDIDATE_END):
{candidateData}

CRITICAL SEARCH RULES:
1. **EXACT MATCHING ONLY**: Only include candidates who explicitly have the specific information mentioned in the query
2. **NO SEMANTIC INFERENCE**: Do not include candidates based on similar or related information
3. **VERIFICATION REQUIRED**: Only include candidates where the requested information is clearly present in their data
4. **CASE INSENSITIVE**: Match information regardless of case (e.g., "TOEIC" matches "toeic", "Toeic")

SEARCH GUIDELINES BY QUERY TYPE:

**For Language/Certification Searches (e.g., "has TOEIC", "find candidates with TOEIC"):**
- Only include candidates who explicitly mention TOEIC in their data
- Check: Skills, Custom Attributes, Education, Experience descriptions, Personal info
- Do NOT include candidates who only mention "English" or "language skills" without TOEIC
- Do NOT include candidates based on general language abilities

**For Skill Searches (e.g., "has React", "knows Python"):**
- Only include candidates who explicitly list the specific skill
- Check: Skills section, Experience descriptions, Job matches
- Do NOT include candidates with similar technologies unless explicitly mentioned

**For Education Searches (e.g., "graduated from MIT", "has MBA"):**
- Only include candidates who explicitly mention the specific institution or degree
- Check: Education history, University names, Majors, Degrees
- Do NOT include candidates from similar institutions

**For Experience Searches (e.g., "worked at Google", "has 5 years experience"):**
- Only include candidates who explicitly mention the specific company or duration
- Check: Work experience, Company names, Duration fields
- Do NOT include candidates with similar companies or experience levels

**For Fit Score Searches:**
- Fit scores are displayed as percentages (0-100%)
- Decimal values (0-1) are automatically converted to percentages (e.g., 0.89 becomes 89%)
- When the query mentions "fit score less than X" or "fit score below X", only include candidates with fit scores < X%
- When the query mentions "fit score greater than X" or "fit score above X", only include candidates with fit scores > X%
- When the query mentions "fit score between X and Y", only include candidates with fit scores between X% and Y%

**For Position/Job Searches:**
- Only include candidates who explicitly applied for or are matched to the specific position
- Check: Applied Position, Job Matches, Position titles
- Do NOT include candidates with similar positions

**For Date Searches:**
- Only include candidates who match the specific date criteria
- Check: Application Date, Education dates, Experience dates
- Use exact date matching, not approximate

**For Location Searches:**
- Only include candidates who explicitly mention the specific location
- Check: Personal info location, Education location, Experience location
- Do NOT include candidates from nearby areas unless explicitly mentioned

**For Recruiter Searches:**
- Only include candidates assigned to the specific recruiter
- Check: Assigned Recruiter field
- Do NOT include candidates with similar recruiter names

**For Status Searches:**
- Only include candidates with the exact status mentioned
- Check: Status field, Transition history
- Do NOT include candidates with similar statuses

**For Custom Field Searches:**
- Only include candidates who have the specific custom field value
- Check: Custom Attributes section
- Match exact values, not similar ones

EXAMPLES OF CORRECT BEHAVIOR:

Query: "find the candidate has toeic"
- ✅ INCLUDE: Candidate with "Skills: - Segment: Language: TOEIC 850, English"
- ✅ INCLUDE: Candidate with "Custom Attributes: TOEIC_Score: 750"
- ❌ EXCLUDE: Candidate with "Skills: - Segment: Language: English, Spanish" (no TOEIC mentioned)
- ❌ EXCLUDE: Candidate with "Skills: - Segment: Language: IELTS 7.0" (different certification)

Query: "has React experience"
- ✅ INCLUDE: Candidate with "Skills: - Segment: Programming: React, JavaScript"
- ✅ INCLUDE: Candidate with "Experience: React Developer at Company X"
- ❌ EXCLUDE: Candidate with "Skills: - Segment: Programming: Angular, Vue" (different framework)
- ❌ EXCLUDE: Candidate with "Skills: - Segment: Programming: JavaScript" (no React mentioned)

Query: "fit score less than 30"
- ✅ INCLUDE: Candidate with "Fit Score: 25%"
- ✅ INCLUDE: Candidate with "Fit Score: 0.15" (15%)
- ❌ EXCLUDE: Candidate with "Fit Score: 85%" (85% > 30%)
- ❌ EXCLUDE: Candidate with "Fit Score: 0.89" (89% > 30%)

IMPORTANT: 
- If no candidates have the EXACT information requested, return an empty matchedCandidateIds array
- Do not make assumptions or include candidates with similar information
- Be strict and precise in your matching
- Always verify the information exists in the candidate data before including them

Return ONLY a valid JSON object in this exact format:
{
  "matchedCandidateIds": ["uuid1", "uuid2", ...],
  "aiReasoning": "Brief explanation of why these candidates were included or why none were found"
}

Do not include any markdown formatting, code blocks, or additional text. Only return the JSON object.`;

    // Create AI Power Search system prompt in the Candidate Assessment category
    const existingPrompt = await prisma.systemPrompt.findFirst({
      where: { 
        name: 'AI Power Search - Candidate Matching'
      }
    });

    if (existingPrompt) {
      await prisma.systemPrompt.update({
        where: { id: existingPrompt.id },
        data: {
          content: DEFAULT_AI_POWER_SEARCH_PROMPT,
          description: 'System prompt for AI Power Search to find candidates with exact matching criteria'
        }
      });
    } else {
      await prisma.systemPrompt.create({
        data: {
          name: 'AI Power Search - Candidate Matching',
          description: 'System prompt for AI Power Search to find candidates with exact matching criteria',
          content: DEFAULT_AI_POWER_SEARCH_PROMPT,
          categoryId: '550e8400-e29b-41d4-a716-446655440012', // Candidate Assessment category
          isActive: true
        }
      });
    }
    console.log('✅ AI Power Search system prompt initialized');

    // Create TOEIC custom field definition
    console.log('Creating TOEIC custom field definition...');
    await prisma.customFieldDefinition.upsert({
      where: { 
        modelName_fieldKey: {
          modelName: 'Candidate',
          fieldKey: 'toeic_score'
        }
      },
      update: {},
      create: {
        fieldKey: 'toeic_score',
        fieldCode: 'TOEIC_SCORE',
        label: 'TOEIC Score',
        fieldType: 'SELECT',
        modelName: 'Candidate',
        isRequired: false,
        sortOrder: 1,
        options: JSON.stringify({
          minValue: 0,
          maxValue: 990,
          options: [
            { value: '0-200', label: '0-200 (Beginner)' },
            { value: '201-400', label: '201-400 (Elementary)' },
            { value: '401-600', label: '401-600 (Intermediate)' },
            { value: '601-800', label: '601-800 (Upper Intermediate)' },
            { value: '801-990', label: '801-990 (Advanced)' }
          ]
        })
      }
    });

    // Create TOEIC custom field options
    const toeicFieldDefinition = await prisma.customFieldDefinition.findUnique({
      where: {
        modelName_fieldKey: {
          modelName: 'Candidate',
          fieldKey: 'toeic_score'
        }
      }
    });

    if (toeicFieldDefinition) {
      const toeicOptions = [
        { value: '0-200', label: '0-200 (Beginner)', sortOrder: 1 },
        { value: '201-400', label: '201-400 (Elementary)', sortOrder: 2 },
        { value: '401-600', label: '401-600 (Intermediate)', sortOrder: 3 },
        { value: '601-800', label: '601-800 (Upper Intermediate)', sortOrder: 4 },
        { value: '801-990', label: '801-990 (Advanced)', sortOrder: 5 }
      ];

      for (const option of toeicOptions) {
        await prisma.customFieldOption.upsert({
          where: {
            customFieldDefinitionId_value: {
              customFieldDefinitionId: toeicFieldDefinition.id,
              value: option.value
            }
          },
          update: { label: option.label, sortOrder: option.sortOrder },
          create: {
            customFieldDefinitionId: toeicFieldDefinition.id,
            value: option.value,
            label: option.label,
            sortOrder: option.sortOrder,
            isActive: true
          }
        });
      }
    }
    console.log('✅ TOEIC custom field and options created/updated');

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