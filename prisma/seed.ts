import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');
  
  try {
    // Create admin user (same as init-db.sql)
    console.log('Creating admin user...');
    const adminEmail = 'admin@qsncc.com';
    const adminPassword = 'nccadmin';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        password: hashedPassword,
        forcePasswordChange: false
      },
      create: {
        name: 'Admin User',
        email: adminEmail,
        password: hashedPassword,
        role: 'Admin',
        authenticationMethod: 'basic',
        forcePasswordChange: false
      }
    });
    console.log('✅ Admin user created/updated');
    console.log(`Email: ${adminEmail}`);
console.log(`Password: ${adminPassword}`);

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

    // Create default user groups with detailed permissions
    const adminGroup = await prisma.userGroup.upsert({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Admin',
        description: 'Full system access',
        permissions: [
          // Candidate permissions
          'CANDIDATES_VIEW','CANDIDATES_VIEW_DETAILED','CANDIDATES_CREATE','CANDIDATES_EDIT_BASIC','CANDIDATES_EDIT_SENSITIVE','CANDIDATES_DELETE','CANDIDATES_SOURCE_ASSIGN','CANDIDATES_SOURCE_ASSIGN_BULK','CANDIDATES_RECRUITER_ASSIGN','CANDIDATES_RECRUITER_ASSIGN_BULK','CANDIDATES_PIPELINE_STAGE_UPDATE','CANDIDATES_PIPELINE_STAGE_BULK_UPDATE','CANDIDATES_RESUMES_UPLOAD','CANDIDATES_RESUMES_DELETE','CANDIDATES_COMMENTS_VIEW','CANDIDATES_COMMENTS_ADD','CANDIDATES_COMMENTS_EDIT','CANDIDATES_IMPORT','CANDIDATES_EXPORT',
          // Position permissions
          'POSITIONS_VIEW','POSITIONS_CREATE','POSITIONS_EDIT_BASIC','POSITIONS_EDIT_DETAILED','POSITIONS_RECRUITER_ASSIGN','POSITIONS_DELETE','POSITIONS_IMPORT','POSITIONS_EXPORT',
          // User management permissions
          'USERS_VIEW','USERS_CREATE','USERS_EDIT','USERS_DELETE','USERS_PERMISSIONS_MANAGE','USER_GROUPS_VIEW','USER_GROUPS_CREATE','USER_GROUPS_EDIT','USER_GROUPS_DELETE',
          // System permissions
          'SYSTEM_SETTINGS_VIEW','SYSTEM_SETTINGS_EDIT','RECRUITMENT_STAGES_VIEW','RECRUITMENT_STAGES_EDIT','CUSTOM_FIELDS_VIEW','CUSTOM_FIELDS_EDIT','WEBHOOKS_VIEW','WEBHOOKS_EDIT','AI_INTEGRATION_VIEW','AI_INTEGRATION_EDIT',
          // Other permissions
          'UPLOAD_QUEUE_VIEW','UPLOAD_QUEUE_MANAGE','BULK_UPLOAD_EXECUTE','DASHBOARD_VIEW','REPORTS_GENERATE','WEBHOOK_ANALYTICS_VIEW','LOGS_VIEW','LOGS_EXPORT','APP_PERFORMANCE_VIEW','TASK_BOARD_VIEW','TASK_BOARD_MANAGE_OWN','TASK_BOARD_MANAGE_ALL','JOB_MATCH_VIEW','JOB_MATCH_MANAGE','WARNING_CONFIGURATIONS_VIEW','WARNING_CONFIGURATIONS_MANAGE','USER_PREFERENCES_MANAGE_OWN','USER_PREFERENCES_MANAGE_ALL'
        ],
        isDefault: true,
        isSystemRole: true,
      },
    });

    const recruiterGroup = await prisma.userGroup.upsert({
      where: { id: '00000000-0000-0000-0000-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000002',
        name: 'Recruiter',
        description: 'Can manage candidates and positions',
        permissions: [
          // Candidate management
          'CANDIDATES_VIEW','CANDIDATES_VIEW_DETAILED','CANDIDATES_CREATE','CANDIDATES_EDIT_BASIC','CANDIDATES_SOURCE_ASSIGN','CANDIDATES_RECRUITER_ASSIGN','CANDIDATES_PIPELINE_STAGE_UPDATE','CANDIDATES_RESUMES_UPLOAD','CANDIDATES_COMMENTS_VIEW','CANDIDATES_COMMENTS_ADD','CANDIDATES_IMPORT','CANDIDATES_EXPORT',
          // Position management
          'POSITIONS_VIEW','POSITIONS_CREATE','POSITIONS_EDIT_BASIC','POSITIONS_RECRUITER_ASSIGN','POSITIONS_IMPORT','POSITIONS_EXPORT',
          // Other permissions
          'TASK_BOARD_VIEW','TASK_BOARD_MANAGE_OWN','RECRUITMENT_STAGES_VIEW','USER_PREFERENCES_MANAGE_OWN','BULK_UPLOAD_EXECUTE','DASHBOARD_VIEW','REPORTS_GENERATE'
        ],
        isDefault: true,
        isSystemRole: false,
      },
    });

    const hiringManagerGroup = await prisma.userGroup.upsert({
      where: { id: '00000000-0000-0000-0000-000000000003' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000003',
        name: 'Hiring Manager',
        description: 'Can view candidates and positions',
        permissions: [
          'CANDIDATES_VIEW','CANDIDATES_VIEW_DETAILED','CANDIDATES_COMMENTS_VIEW','POSITIONS_VIEW','TASK_BOARD_VIEW','DASHBOARD_VIEW','USER_PREFERENCES_MANAGE_OWN'
        ],
        isDefault: true,
        isSystemRole: false,
      },
    });

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
        where: { name: category.name },
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

    // Create candidate sources
    console.log('Creating candidate sources...');
    const candidateSources = [
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

    for (const source of candidateSources) {
      await prisma.candidateSource.upsert({
        where: { id: source.id },
        update: {},
        create: source
      });
    }
    console.log('✅ Candidate sources created/updated');

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
    console.log('✅ Default position levels created/updated');

    // Get admin user for creating warning configurations
    const adminUserForWarnings = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!adminUserForWarnings) {
      throw new Error('Admin user not found for creating warning configurations');
    }

    // Create default warning configurations
    console.log('Creating warning configurations...');
    const warningConfigurations = [
      {
        id: '550e8400-e29b-41d4-a716-446655440060',
        name: 'Position No Grade',
        description: 'Warns when a position has no grade assigned',
        entityType: 'position',
        field: 'gradeId',
        condition: 'empty',
        operator: 'eq',
        value: '',
        threshold: null,
        severity: 'warning',
        isActive: true,
        isPublic: true,
        logicalOperator: null,
        conditions: null,
        crossEntityConditions: null,
        createdBy: adminUserForWarnings.id
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440061',
        name: 'Position No Hiring Date',
        description: 'Warns when a position has no hiring date set',
        entityType: 'position',
        field: 'hiringDate',
        condition: 'empty',
        operator: 'eq',
        value: '',
        threshold: null,
        severity: 'warning',
        isActive: true,
        isPublic: true,
        logicalOperator: null,
        conditions: null,
        crossEntityConditions: null,
        createdBy: adminUserForWarnings.id
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440062',
        name: 'Position No Grade Assigned',
        description: 'Warns when a position has no grade assigned',
        entityType: 'position',
        field: 'gradeId',
        condition: 'empty',
        operator: 'eq',
        value: '',
        threshold: null,
        severity: 'warning',
        isActive: true,
        isPublic: true,
        logicalOperator: null,
        conditions: null,
        crossEntityConditions: null,
        createdBy: adminUserForWarnings.id
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440063',
        name: 'Position Open But No Recruiter',
        description: 'Warns when a position is open but has no recruiter assigned',
        entityType: 'position',
        field: 'isOpen',
        condition: 'custom',
        operator: 'eq',
        value: 'true',
        threshold: null,
        severity: 'warning',
        isActive: true,
        isPublic: true,
        logicalOperator: 'AND',
        conditions: [
          {
            field: 'isOpen',
            condition: 'custom',
            operator: 'eq',
            value: 'true',
            threshold: null
          },
          {
            field: 'recruiterId',
            condition: 'empty',
            operator: 'eq',
            value: '',
            threshold: null
          }
        ],
        crossEntityConditions: null,
        createdBy: adminUserForWarnings.id
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440064',
        name: 'Position No Recruiter Assigned',
        description: 'Warns when a position has no recruiter assigned',
        entityType: 'position',
        field: 'recruiterId',
        condition: 'empty',
        operator: 'eq',
        value: '',
        threshold: null,
        severity: 'warning',
        isActive: true,
        isPublic: true,
        logicalOperator: null,
        conditions: null,
        crossEntityConditions: null,
        createdBy: adminUserForWarnings.id
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440065',
        name: 'Candidate No Email',
        description: 'Warns when a candidate has no email address',
        entityType: 'candidate',
        field: 'email',
        condition: 'empty',
        operator: 'eq',
        value: '',
        threshold: null,
        severity: 'warning',
        isActive: true,
        isPublic: true,
        logicalOperator: null,
        conditions: null,
        crossEntityConditions: null,
        createdBy: adminUserForWarnings.id
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440066',
        name: 'Candidate No Recruiter Assigned',
        description: 'Warns when a candidate has no recruiter assigned',
        entityType: 'candidate',
        field: 'recruiterId',
        condition: 'empty',
        operator: 'eq',
        value: '',
        threshold: null,
        severity: 'warning',
        isActive: true,
        isPublic: true,
        logicalOperator: null,
        conditions: null,
        crossEntityConditions: null,
        createdBy: adminUserForWarnings.id
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440067',
        name: 'Candidate No Source',
        description: 'Warns when a candidate has no source assigned',
        entityType: 'candidate',
        field: 'sourceId',
        condition: 'empty',
        operator: 'eq',
        value: '',
        threshold: null,
        severity: 'warning',
        isActive: true,
        isPublic: true,
        logicalOperator: null,
        conditions: null,
        crossEntityConditions: null,
        createdBy: adminUserForWarnings.id
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440068',
        name: 'Candidate Over Grade SLA',
        description: 'Warns when a candidate has exceeded the SLA timeframe based on their position grade (Junior: 30 days, Mid: 45 days, Senior: 60 days, Lead: 90 days). Only applies to candidates with assigned positions.',
        entityType: 'candidate',
        field: '',
        condition: '',
        operator: '',
        value: '',
        threshold: null,
        severity: 'warning',
        isActive: true,
        isPublic: true,
        logicalOperator: 'AND',
        conditions: null,
        crossEntityConditions: [
          {
            entityType: 'candidate',
            field: 'applicationDate',
            condition: 'overdue',
            operator: 'gt',
            value: '',
            threshold: null
          },
          {
            entityType: 'position',
            field: 'gradeId',
            condition: 'empty',
            operator: 'ne',
            value: '',
            threshold: null
          }
        ],
        createdBy: adminUserForWarnings.id
      }
    ];

    for (const config of warningConfigurations) {
      await prisma.warningConfiguration.upsert({
        where: { id: config.id },
        update: {
          name: config.name,
          description: config.description,
          severity: config.severity,
          isActive: config.isActive,
          isPublic: config.isPublic
        },
        create: config
      });
    }
    console.log('✅ Warning configurations created/updated');

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