-- Example Data SQL Script for FitScan
-- This script creates sample data for candidates, positions, and upload queue
-- Run this after the initial database setup and seeding

-- ==============================================
-- PREREQUISITES
-- ==============================================
-- Make sure the following are already created:
-- 1. Admin user (admin@qsncc.com)
-- 2. Recruitment stages
-- 3. User groups
-- 4. Grades
-- 5. Position levels
-- 6. Candidate sources

-- ==============================================
-- CREATE EXAMPLE CANDIDATE SOURCES
-- ==============================================

INSERT INTO "CandidateSource" (
    id,
    name,
    description,
    "allow_sub_source",
    "sort_order",
    "is_active",
    "createdAt",
    "updatedAt"
) VALUES 
('770e8400-e29b-41d4-a716-446655440001', 'Linkedin', 'Professional networking platform', true, 1, true, NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440002', 'JobsDB', 'Job search platform', true, 2, true, NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440003', 'Referral', 'Employee referrals', false, 3, true, NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440004', 'JobThai', 'Thai job portal', true, 4, true, NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440005', 'Facebook', 'Social media platform', true, 5, true, NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440006', 'University', 'University career services', false, 6, true, NOW(), NOW()),
('770e8400-e29b-41d4-a716-446655440007', 'JobExpo', 'Job fair and career expo', false, 7, true, NOW(), NOW());

-- ==============================================
-- CREATE EXAMPLE RECRUITMENT STAGES
-- ==============================================

INSERT INTO "RecruitmentStage" (
    id,
    name,
    description,
    "is_system",
    "sort_order"
) VALUES 
('880e8400-e29b-41d4-a716-446655440001', 'Applied', 'Candidate has submitted application', true, 1),
('880e8400-e29b-41d4-a716-446655440002', 'Screening', 'Initial screening in progress', true, 2),
('880e8400-e29b-41d4-a716-446655440003', 'Shortlisted', 'Candidate has been shortlisted', true, 3),
('880e8400-e29b-41d4-a716-446655440004', 'Interview Scheduled', 'Interview has been scheduled', true, 4),
('880e8400-e29b-41d4-a716-446655440005', 'Interviewing', 'Interview in progress', true, 5),
('880e8400-e29b-41d4-a716-446655440006', 'Offer Extended', 'Job offer has been extended', true, 6),
('880e8400-e29b-41d4-a716-446655440007', 'Hired', 'Candidate has been hired', true, 7),
('880e8400-e29b-41d4-a716-446655440008', 'Rejected', 'Candidate has been rejected', true, 8);

-- ==============================================
-- CREATE EXAMPLE GRADES
-- ==============================================

INSERT INTO "Grade" (
    id,
    name,
    label,
    description,
    "min_level",
    "max_level",
    "sla_days",
    color,
    "is_active",
    "sort_order",
    "createdAt",
    "updatedAt"
) VALUES 
('990e8400-e29b-41d4-a716-446655440001', 'G1', 'Entry Level', 'Entry level position', 1, 2, 30, '#3B82F6', true, 1, NOW(), NOW()),
('990e8400-e29b-41d4-a716-446655440002', 'G2', 'Junior Level', 'Junior level position', 3, 4, 25, '#10B981', true, 2, NOW(), NOW()),
('990e8400-e29b-41d4-a716-446655440003', 'G3', 'Mid Junior Level', 'Mid junior level position', 5, 6, 20, '#F59E0B', true, 3, NOW(), NOW()),
('990e8400-e29b-41d4-a716-446655440004', 'G4', 'Mid Level', 'Mid level position', 7, 8, 15, '#EF4444', true, 4, NOW(), NOW()),
('990e8400-e29b-41d4-a716-446655440005', 'G5', 'Senior Mid Level', 'Senior mid level position', 9, 10, 10, '#8B5CF6', true, 5, NOW(), NOW()),
('990e8400-e29b-41d4-a716-446655440006', 'G6', 'Senior Level', 'Senior level position', 11, 12, 7, '#06B6D4', true, 6, NOW(), NOW()),
('990e8400-e29b-41d4-a716-446655440007', 'G7', 'Principal Level', 'Principal level position', 13, 14, 5, '#84CC16', true, 7, NOW(), NOW()),
('990e8400-e29b-41d4-a716-446655440008', 'G8', 'Director Level', 'Director level position', 15, 16, 3, '#F97316', true, 8, NOW(), NOW());

-- ==============================================
-- CREATE EXAMPLE USERS
-- ==============================================

INSERT INTO "User" (
    id,
    email,
    name,
    password,
    role,
    "createdAt",
    "updatedAt"
) VALUES 
('110e8400-e29b-41d4-a716-446655440001', 'admin@qsncc.com', 'Admin User', '$2a$10$hashedpassword', 'admin', NOW(), NOW()),
('110e8400-e29b-41d4-a716-446655440002', 'recruiter1@qsncc.com', 'John Recruiter', '$2a$10$hashedpassword', 'recruiter', NOW(), NOW()),
('110e8400-e29b-41d4-a716-446655440003', 'recruiter2@qsncc.com', 'Jane Recruiter', '$2a$10$hashedpassword', 'recruiter', NOW(), NOW());

-- ==============================================
-- CREATE EXAMPLE POSITIONS
-- ==============================================

-- Insert example positions
INSERT INTO "Position" (
    id,
    title,
    department,
    description,
    "matchCriteria",
    "isOpen",
    "positionLevel",
    "recruiterId",
    "customAttributes",
    "createdAt",
    "updatedAt",
    "gradeId",
    "positionAttribute"
) VALUES 
-- Software Development Positions
(
    '550e8400-e29b-41d4-a716-446655440001',
    'Senior Software Engineer',
    'Engineering',
    'We are looking for a Senior Software Engineer to join our development team. The ideal candidate will have strong experience in full-stack development and be able to work independently on complex projects.',
    '<h2>Required Skills & Experience</h2><ul><li>Bachelor''s degree in Computer Science or related field</li><li>5+ years of software development experience</li><li>Proficiency in JavaScript, React, Node.js</li><li>Experience with databases (PostgreSQL, MongoDB)</li><li>Strong problem-solving and communication skills</li></ul><h2>Preferred Qualifications</h2><ul><li>Experience with cloud platforms (AWS, Azure)</li><li>Knowledge of DevOps practices</li><li>Experience with microservices architecture</li><li>Agile/Scrum experience</li></ul>',
    true,
    'Senior',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '{"location": "Bangkok", "salary_range": "80,000-120,000 THB", "benefits": ["Health Insurance", "Flexible Hours", "Remote Work"]}',
    NOW(),
    NOW(),
    (SELECT id FROM "Grade" WHERE name = 'G6' LIMIT 1),
    'Full-time'
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    'Frontend Developer',
    'Engineering',
    'Join our frontend team to build beautiful and responsive user interfaces. We need someone passionate about modern web technologies and user experience.',
    '<h2>Required Skills & Experience</h2><ul><li>3+ years of frontend development experience</li><li>Strong knowledge of React, TypeScript, and CSS</li><li>Experience with state management (Redux, Zustand)</li><li>Understanding of responsive design principles</li><li>Experience with testing frameworks (Jest, Cypress)</li></ul><h2>Preferred Qualifications</h2><ul><li>Experience with Next.js or similar frameworks</li><li>Knowledge of design systems</li><li>Experience with performance optimization</li><li>UI/UX design skills</li></ul>',
    true,
    'Mid Level',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '{"location": "Bangkok", "salary_range": "60,000-90,000 THB", "benefits": ["Health Insurance", "Learning Budget"]}',
    NOW(),
    NOW(),
    (SELECT id FROM "Grade" WHERE name = 'G4' LIMIT 1),
    'Full-time'
),
(
    '550e8400-e29b-41d4-a716-446655440003',
    'Data Scientist',
    'Analytics',
    'We are seeking a Data Scientist to help us extract insights from our data and build predictive models. The role involves working with large datasets and collaborating with cross-functional teams.',
    '<h2>Required Skills & Experience</h2><ul><li>Master''s degree in Data Science, Statistics, or related field</li><li>3+ years of experience in data science</li><li>Proficiency in Python, R, and SQL</li><li>Experience with machine learning frameworks (scikit-learn, TensorFlow)</li><li>Strong statistical analysis skills</li></ul><h2>Preferred Qualifications</h2><ul><li>Experience with big data tools (Spark, Hadoop)</li><li>Knowledge of deep learning</li><li>Experience with cloud ML platforms</li><li>Strong business acumen</li></ul>',
    true,
    'Senior',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '{"location": "Bangkok", "salary_range": "90,000-130,000 THB", "benefits": ["Health Insurance", "Research Budget"]}',
    NOW(),
    NOW(),
    (SELECT id FROM "Grade" WHERE name = 'G6' LIMIT 1),
    'Full-time'
),
(
    '550e8400-e29b-41d4-a716-446655440004',
    'Product Manager',
    'Product',
    'Lead product development initiatives and work closely with engineering, design, and business teams to deliver exceptional user experiences.',
    '<h2>Required Skills & Experience</h2><ul><li>Bachelor''s degree in Business, Engineering, or related field</li><li>4+ years of product management experience</li><li>Strong analytical and problem-solving skills</li><li>Experience with agile development methodologies</li><li>Excellent communication and leadership skills</li></ul><h2>Preferred Qualifications</h2><ul><li>Experience in B2B SaaS products</li><li>Technical background or understanding</li><li>Experience with user research and A/B testing</li><li>MBA or advanced degree</li></ul>',
    true,
    'Senior',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '{"location": "Bangkok", "salary_range": "100,000-150,000 THB", "benefits": ["Health Insurance", "Stock Options"]}',
    NOW(),
    NOW(),
    (SELECT id FROM "Grade" WHERE name = 'G7' LIMIT 1),
    'Full-time'
),
(
    '550e8400-e29b-41d4-a716-446655440005',
    'UX Designer',
    'Design',
    'Create intuitive and engaging user experiences for our products. Work with cross-functional teams to understand user needs and translate them into design solutions.',
    '<h2>Required Skills & Experience</h2><ul><li>Bachelor''s degree in Design, HCI, or related field</li><li>3+ years of UX design experience</li><li>Proficiency in design tools (Figma, Sketch, Adobe Creative Suite)</li><li>Experience with user research and usability testing</li><li>Strong portfolio demonstrating UX design skills</li></ul><h2>Preferred Qualifications</h2><ul><li>Experience with design systems</li><li>Knowledge of frontend development</li><li>Experience with accessibility standards</li><li>Experience in B2B products</li></ul>',
    true,
    'Mid Level',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '{"location": "Bangkok", "salary_range": "70,000-100,000 THB", "benefits": ["Health Insurance", "Design Tools Budget"]}',
    NOW(),
    NOW(),
    (SELECT id FROM "Grade" WHERE name = 'G5' LIMIT 1),
    'Full-time'
),
-- Additional positions for more variety
(
    '550e8400-e29b-41d4-a716-446655440006',
    'DevOps Engineer',
    'Engineering',
    'Join our DevOps team to build and maintain our cloud infrastructure. You will work with cutting-edge technologies to ensure our systems are scalable, reliable, and secure.',
    '<h2>Required Skills & Experience</h2><ul><li>3+ years of DevOps/Infrastructure experience</li><li>Strong knowledge of AWS, Azure, or GCP</li><li>Experience with containerization (Docker, Kubernetes)</li><li>Proficiency in Infrastructure as Code (Terraform, CloudFormation)</li><li>Experience with CI/CD pipelines</li></ul><h2>Preferred Qualifications</h2><ul><li>Experience with monitoring tools (Prometheus, Grafana)</li><li>Knowledge of security best practices</li><li>Experience with microservices architecture</li><li>Scripting skills (Python, Bash)</li></ul>',
    true,
    'Mid Level',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '{"location": "Bangkok", "salary_range": "70,000-110,000 THB", "benefits": ["Health Insurance", "Learning Budget", "Remote Work"]}',
    NOW(),
    NOW(),
    (SELECT id FROM "Grade" WHERE name = 'G5' LIMIT 1),
    'Full-time'
),
(
    '550e8400-e29b-41d4-a716-446655440007',
    'Marketing Manager',
    'Marketing',
    'Lead our marketing initiatives and drive brand awareness. You will develop and execute marketing strategies to support business growth and customer acquisition.',
    '<h2>Required Skills & Experience</h2><ul><li>Bachelor''s degree in Marketing, Business, or related field</li><li>4+ years of marketing experience</li><li>Experience with digital marketing channels</li><li>Strong analytical and project management skills</li><li>Excellent communication and leadership abilities</li></ul><h2>Preferred Qualifications</h2><ul><li>Experience with marketing automation tools</li><li>Knowledge of SEO/SEM and social media marketing</li><li>Experience in B2B marketing</li><li>MBA or advanced degree</li></ul>',
    true,
    'Senior',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '{"location": "Bangkok", "salary_range": "80,000-120,000 THB", "benefits": ["Health Insurance", "Marketing Budget"]}',
    NOW(),
    NOW(),
    (SELECT id FROM "Grade" WHERE name = 'G6' LIMIT 1),
    'Full-time'
),
(
    '550e8400-e29b-41d4-a716-446655440008',
    'Sales Representative',
    'Sales',
    'Join our sales team to drive revenue growth and build strong customer relationships. You will be responsible for identifying new business opportunities and closing deals.',
    '<h2>Required Skills & Experience</h2><ul><li>Bachelor''s degree in Business, Sales, or related field</li><li>2+ years of sales experience</li><li>Strong communication and negotiation skills</li><li>Goal-oriented and self-motivated</li><li>Experience with CRM systems</li></ul><h2>Preferred Qualifications</h2><ul><li>Experience in B2B sales</li><li>Knowledge of the tech industry</li><li>Experience with consultative selling</li><li>Track record of meeting/exceeding sales targets</li></ul>',
    true,
    'Junior',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '{"location": "Bangkok", "salary_range": "40,000-70,000 THB", "benefits": ["Health Insurance", "Commission", "Sales Training"]}',
    NOW(),
    NOW(),
    (SELECT id FROM "Grade" WHERE name = 'G3' LIMIT 1),
    'Full-time'
),
(
    '550e8400-e29b-41d4-a716-446655440009',
    'HR Specialist',
    'Human Resources',
    'Support our human resources operations and help create a positive work environment. You will handle recruitment, employee relations, and HR administration.',
    '<h2>Required Skills & Experience</h2><ul><li>Bachelor''s degree in HR, Psychology, or related field</li><li>2+ years of HR experience</li><li>Knowledge of labor laws and regulations</li><li>Strong interpersonal and communication skills</li><li>Experience with HRIS systems</li></ul><h2>Preferred Qualifications</h2><ul><li>HR certification (PHR, SHRM-CP)</li><li>Experience with recruitment and onboarding</li><li>Knowledge of performance management</li><li>Bilingual (English/Thai)</li></ul>',
    true,
    'Mid Level',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '{"location": "Bangkok", "salary_range": "50,000-80,000 THB", "benefits": ["Health Insurance", "Professional Development"]}',
    NOW(),
    NOW(),
    (SELECT id FROM "Grade" WHERE name = 'G4' LIMIT 1),
    'Full-time'
),
(
    '550e8400-e29b-41d4-a716-446655440010',
    'Financial Analyst',
    'Finance',
    'Join our finance team to provide financial analysis and support business decision-making. You will prepare financial reports, analyze trends, and support budgeting processes.',
    '<h2>Required Skills & Experience</h2><ul><li>Bachelor''s degree in Finance, Accounting, or related field</li><li>3+ years of financial analysis experience</li><li>Strong Excel and financial modeling skills</li><li>Knowledge of accounting principles</li><li>Excellent analytical and problem-solving abilities</li></ul><h2>Preferred Qualifications</h2><ul><li>CPA or CFA certification</li><li>Experience with financial software (SAP, Oracle)</li><li>Knowledge of investment analysis</li><li>MBA or advanced degree</li></ul>',
    true,
    'Mid Level',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '{"location": "Bangkok", "salary_range": "60,000-90,000 THB", "benefits": ["Health Insurance", "Professional Certification Support"]}',
    NOW(),
    NOW(),
    (SELECT id FROM "Grade" WHERE name = 'G5' LIMIT 1),
    'Full-time'
),
(
    '550e8400-e29b-41d4-a716-446655440011',
    'QA Engineer',
    'Engineering',
    'Ensure the quality of our software products through comprehensive testing. You will design and execute test plans, identify bugs, and work with development teams to improve product quality.',
    '<h2>Required Skills & Experience</h2><ul><li>Bachelor''s degree in Computer Science or related field</li><li>2+ years of QA/testing experience</li><li>Knowledge of testing methodologies and tools</li><li>Experience with automated testing frameworks</li><li>Strong attention to detail and problem-solving skills</li></ul><h2>Preferred Qualifications</h2><ul><li>Experience with Selenium, Cypress, or similar tools</li><li>Knowledge of API testing</li><li>Experience with performance testing</li><li>ISTQB certification</li></ul>',
    true,
    'Mid Level',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '{"location": "Bangkok", "salary_range": "55,000-85,000 THB", "benefits": ["Health Insurance", "Testing Tools Budget"]}',
    NOW(),
    NOW(),
    (SELECT id FROM "Grade" WHERE name = 'G4' LIMIT 1),
    'Full-time'
),
(
    '550e8400-e29b-41d4-a716-446655440012',
    'Customer Success Manager',
    'Customer Success',
    'Help our customers achieve their goals and ensure their success with our products. You will build strong relationships, identify growth opportunities, and drive customer satisfaction.',
    '<h2>Required Skills & Experience</h2><ul><li>Bachelor''s degree in Business, Marketing, or related field</li><li>3+ years of customer success or account management experience</li><li>Strong communication and relationship-building skills</li><li>Experience with CRM systems</li><li>Analytical mindset with focus on customer metrics</li></ul><h2>Preferred Qualifications</h2><ul><li>Experience in SaaS or technology industry</li><li>Knowledge of customer success tools</li><li>Experience with upselling and cross-selling</li><li>Bilingual (English/Thai)</li></ul>',
    true,
    'Mid Level',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '{"location": "Bangkok", "salary_range": "65,000-95,000 THB", "benefits": ["Health Insurance", "Customer Success Tools"]}',
    NOW(),
    NOW(),
    (SELECT id FROM "Grade" WHERE name = 'G5' LIMIT 1),
    'Full-time'
);

-- ==============================================
-- CREATE EXAMPLE CANDIDATES
-- ==============================================

-- Insert example candidates
INSERT INTO "Candidate" (
    id,
    name,
    email,
    phone,
    "positionId",
    "recruiterId",
    "fitScore",
    "applicationDate",
    "parsedData",
    "customAttributes",
    "resumePath",
    "createdAt",
    "updatedAt",
    "avatarUrl",
    "dataAiHint",
    "assignmentJustification",
    "educationData",
    "experienceData",
    "companyId",
    "sourceId",
    "subSource",
    "statusId",
    "isPinned",
    "pinnedAt"
) VALUES 
-- Candidate 1: Senior Software Engineer
(
    '660e8400-e29b-41d4-a716-446655440001',
    'Somchai Rattanakul',
    'somchai.rattanakul@email.com',
    '+66-81-234-5678',
    '550e8400-e29b-41d4-a716-446655440001',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.85,
    '2024-01-15',
    '{"skills": ["JavaScript", "React", "Node.js", "PostgreSQL", "AWS", "Docker", "Kubernetes", "TypeScript", "GraphQL"], "experience_years": 6, "education": "Bachelor of Computer Science", "languages": ["English", "Thai", "Chinese"], "certifications": ["AWS Certified Developer", "Google Cloud Professional"], "specializations": ["Full-stack Development", "Cloud Architecture", "Microservices"]}',
    '{"expected_salary": "120,000 THB", "availability": "2 weeks notice", "preferred_location": "Bangkok", "remote_work": true, "work_preferences": ["Flexible hours", "Learning opportunities", "Tech conferences"]}',
    '/uploads/resumes/somchai_rattanakul_resume.pdf',
    '2024-01-15',
    NOW(),
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    'Experienced full-stack developer with strong React and Node.js skills. Has AWS and Google Cloud certifications with 6 years of experience in fintech and e-commerce.',
    'Exceptional candidate with 6+ years of full-stack development experience in fintech and e-commerce. Strong technical skills in React, Node.js, and cloud technologies (AWS, Google Cloud certified). Previous experience at Kasikorn Bank demonstrates ability to handle high-volume, mission-critical applications. Microservices architecture experience aligns perfectly with our current tech stack. Proven track record of performance improvements (40% system performance boost, 60% transaction time reduction). Multilingual capabilities (English, Thai, Chinese) valuable for our international team. Ready to contribute immediately to our mobile banking and payment systems.',
    '[{"degree": "Bachelor of Computer Science", "university": "Chulalongkorn University", "year": 2018, "gpa": "3.5", "honors": "Magna Cum Laude"}, {"degree": "Certificate in Cloud Computing", "university": "AWS Training Center", "year": 2022, "gpa": "4.0"}]',
    '[{"company": "Kasikorn Bank", "position": "Senior Software Engineer", "duration": "2021-2024", "description": "Led development of microservices architecture for mobile banking app, improved system performance by 40% and reduced transaction time by 60%"}, {"company": "Lazada Thailand", "position": "Software Engineer", "duration": "2018-2021", "description": "Developed full-stack applications using React and Node.js for e-commerce platform, handled 1M+ daily transactions"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'Linkedin' LIMIT 1),
    'Direct Application',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Interview Scheduled' LIMIT 1),
    false,
    null
),
-- Candidate 2: Frontend Developer
(
    '660e8400-e29b-41d4-a716-446655440002',
    'Siriporn Chaiyaporn',
    'siriporn.chaiyaporn@email.com',
    '+66-82-345-6789',
    '550e8400-e29b-41d4-a716-446655440002',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.78,
    '2024-01-20',
    '{"skills": ["React", "TypeScript", "CSS", "Jest", "Figma", "Next.js", "Tailwind CSS", "Storybook", "Cypress"], "experience_years": 4, "education": "Bachelor of Information Technology", "languages": ["English", "Thai", "Japanese"], "certifications": ["React Developer Certification"], "specializations": ["UI/UX Development", "Performance Optimization", "Accessibility"]}',
    '{"expected_salary": "85,000 THB", "availability": "1 month notice", "preferred_location": "Bangkok", "remote_work": false, "work_preferences": ["Creative projects", "User-centered design", "Modern tech stack"]}',
    '/uploads/resumes/siriporn_chaiyaporn_resume.pdf',
    '2024-01-20',
    NOW(),
    'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    'Frontend specialist with strong React and TypeScript skills. Has experience with testing, design tools, and accessibility standards.',
    'Strong frontend specialist with 4+ years of experience in modern React development and UI/UX design. Proven expertise in TypeScript, Next.js, and modern CSS frameworks (Tailwind CSS). Experience with comprehensive testing (Jest, Cypress) and accessibility standards ensures high-quality, inclusive user experiences. Previous work at Agoda demonstrates ability to handle high-traffic travel platforms with complex user interactions. Achieved 25% improvement in user experience metrics and 40% reduction in page load times. Google UX Design Certificate shows commitment to user-centered design principles. Multilingual skills (English, Thai, Japanese) valuable for our diverse user base. Strong portfolio showcasing mobile-first design and e-commerce optimization.',
    '[{"degree": "Bachelor of Information Technology", "university": "King Mongkut Institute of Technology Ladkrabang", "year": 2020, "gpa": "3.7", "honors": "Dean List"}, {"degree": "Certificate in UI/UX Design", "university": "Bangkok University", "year": 2021, "gpa": "3.9"}]',
    '[{"company": "Agoda", "position": "Frontend Developer", "duration": "2022-2024", "description": "Built responsive web applications for travel booking platform, improved user experience metrics by 25% and reduced page load time by 40%"}, {"company": "Central Group", "position": "Junior Frontend Developer", "duration": "2020-2022", "description": "Developed user interfaces using React and CSS frameworks for e-commerce platform, implemented accessibility features"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'JobsDB' LIMIT 1),
    'Job Portal',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Shortlisted' LIMIT 1),
    true,
    '2024-01-25'
),
-- Candidate 3: Data Scientist
(
    '660e8400-e29b-41d4-a716-446655440003',
    'Pichai Wongsuwan',
    'pichai.wongsuwan@email.com',
    '+66-83-456-7890',
    '550e8400-e29b-41d4-a716-446655440003',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.92,
    '2024-01-18',
    '{"skills": ["Python", "R", "SQL", "Machine Learning", "TensorFlow", "Spark", "Pandas", "Scikit-learn", "PyTorch", "Tableau", "Power BI"], "experience_years": 5, "education": "Master of Data Science", "languages": ["English", "Thai", "Chinese"], "certifications": ["Google Cloud ML Engineer", "AWS Machine Learning Specialty"], "specializations": ["Predictive Analytics", "Deep Learning", "Business Intelligence"]}',
    '{"expected_salary": "140,000 THB", "availability": "3 weeks notice", "preferred_location": "Bangkok", "remote_work": true, "work_preferences": ["Research projects", "AI innovation", "Data-driven decisions"]}',
    '/uploads/resumes/pichai_wongsuwan_resume.pdf',
    '2024-01-18',
    NOW(),
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    'Highly qualified data scientist with advanced degree and strong ML background. Google Cloud and AWS certifications with experience in fintech and e-commerce analytics.',
    'Outstanding data scientist with Master degree from Chulalongkorn University and 5+ years of experience in fintech and e-commerce analytics. Advanced expertise in Python, machine learning frameworks (TensorFlow, PyTorch), and cloud ML platforms (AWS, Google Cloud certified). Previous experience at SCB Bank demonstrates deep understanding of financial risk assessment and fraud detection systems. Achieved 35% improvement in ML model accuracy and 50% reduction in false positives. Experience at Shopee Thailand shows ability to build recommendation systems and customer segmentation models, resulting in 20% increase in conversion rates. Strong background in both statistical analysis and deep learning applications. Multilingual capabilities (English, Thai, Chinese) valuable for our international data initiatives. Ready to lead our AI/ML initiatives and drive data-driven decision making.',
    '[{"degree": "Master of Data Science", "university": "Chulalongkorn University", "year": 2019, "gpa": "3.8", "thesis": "Deep Learning for Financial Risk Assessment"}, {"degree": "Bachelor of Statistics", "university": "Thammasat University", "year": 2017, "gpa": "3.6"}]',
    '[{"company": "SCB Bank", "position": "Senior Data Scientist", "duration": "2021-2024", "description": "Built ML models for credit risk assessment and fraud detection, improved accuracy by 35% and reduced false positives by 50%"}, {"company": "Shopee Thailand", "position": "Data Scientist", "duration": "2019-2021", "description": "Developed recommendation systems and customer segmentation models, increased conversion rate by 20%"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'Referral' LIMIT 1),
    'Employee Referral',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Interviewing' LIMIT 1),
    false,
    null
),
-- Candidate 4: Product Manager
(
    '660e8400-e29b-41d4-a716-446655440004',
    'Niran Srisawat',
    'niran.srisawat@email.com',
    '+66-84-567-8901',
    '550e8400-e29b-41d4-a716-446655440004',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.88,
    '2024-01-22',
    '{"skills": ["Product Management", "Agile", "Analytics", "User Research", "A/B Testing", "Figma", "Jira", "Confluence", "SQL", "Tableau"], "experience_years": 5, "education": "MBA", "languages": ["English", "Thai", "Chinese"], "certifications": ["Certified Scrum Product Owner", "Google Analytics Certified"], "specializations": ["Digital Products", "Mobile Apps", "E-commerce"]}',
    '{"expected_salary": "150,000 THB", "availability": "1 month notice", "preferred_location": "Bangkok", "remote_work": false, "work_preferences": ["Innovation", "User impact", "Cross-functional collaboration"]}',
    '/uploads/resumes/niran_srisawat_resume.pdf',
    '2024-01-22',
    NOW(),
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    'Experienced product manager with MBA and strong analytical skills. Has experience with agile methodologies and digital product development in fintech.',
    'Exceptional product manager with MBA from Chulalongkorn University and 5+ years of experience in digital product development, particularly in fintech and mobile applications. Strong background in user research, analytics, and agile methodologies with CSPO certification. Previous experience at True Money demonstrates expertise in digital wallet and payment systems, achieving 35% increase in user engagement and 50% growth in transaction volume. Experience at Line Thailand shows ability to manage complex, multi-country product initiatives and coordinate with international engineering teams. Proficient in modern product tools (Figma, Jira, Confluence) and data analysis (SQL, Tableau). Strong understanding of Thai market dynamics and user behavior patterns. Multilingual capabilities (English, Thai, Chinese) valuable for our regional expansion. Ready to drive product strategy and lead cross-functional teams in our digital transformation initiatives.',
    '[{"degree": "MBA", "university": "Chulalongkorn University", "year": 2020, "gpa": "3.9", "specialization": "Digital Business"}, {"degree": "Bachelor of Business Administration", "university": "Thammasat University", "year": 2018, "gpa": "3.8", "honors": "Summa Cum Laude"}]',
    '[{"company": "True Money", "position": "Senior Product Manager", "duration": "2022-2024", "description": "Led digital wallet product strategy, increased user engagement by 35% and transaction volume by 50%"}, {"company": "Line Thailand", "position": "Product Manager", "duration": "2020-2022", "description": "Managed messaging app features and coordinated with engineering teams across multiple countries"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'Linkedin' LIMIT 1),
    'Professional Network',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Offer Extended' LIMIT 1),
    true,
    '2024-01-28'
),
-- Candidate 5: UX Designer
(
    '660e8400-e29b-41d4-a716-446655440005',
    'Supaporn Thongchai',
    'supaporn.thongchai@email.com',
    '+66-85-678-9012',
    '550e8400-e29b-41d4-a716-446655440005',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.75,
    '2024-01-25',
    '{"skills": ["Figma", "Sketch", "User Research", "Prototyping", "Design Systems", "Adobe Creative Suite", "Principle", "InVision", "Miro", "Hotjar"], "experience_years": 3, "education": "Bachelor of Design", "languages": ["English", "Thai", "Japanese"], "certifications": ["Google UX Design Certificate"], "specializations": ["Mobile Design", "E-commerce UX", "Accessibility"]}',
    '{"expected_salary": "95,000 THB", "availability": "2 weeks notice", "preferred_location": "Bangkok", "remote_work": true, "work_preferences": ["User-centered design", "Creative freedom", "Design systems"]}',
    '/uploads/resumes/supaporn_thongchai_resume.pdf',
    '2024-01-25',
    NOW(),
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    'Creative UX designer with strong portfolio and user research experience. Proficient in modern design tools with focus on mobile and e-commerce applications.',
    'Creative UX designer with 3+ years of experience in modern design tools and user-centered design principles. Strong expertise in Figma, Adobe Creative Suite, and prototyping tools (Principle, InVision). Google UX Design Certificate demonstrates commitment to industry best practices and accessibility standards. Previous experience at Central Group shows ability to design for complex e-commerce platforms, achieving 15% improvement in conversion rates through user research and iterative design. Experience at Digital Agency Bangkok demonstrates versatility in working with international clients and diverse user bases. Strong portfolio showcasing mobile-first design, accessibility features, and data-driven design decisions. Understanding of Thai user behavior patterns and cultural considerations valuable for our local market focus. Multilingual skills (English, Thai, Japanese) enable effective collaboration with international teams.',
    '[{"degree": "Bachelor of Design", "university": "Silpakorn University", "year": 2021, "gpa": "3.6", "specialization": "Digital Design"}, {"degree": "Certificate in UX Design", "university": "Google Career Certificates", "year": 2022, "gpa": "4.0"}]',
    '[{"company": "Central Group", "position": "UX Designer", "duration": "2022-2024", "description": "Designed user interfaces for e-commerce platform and conducted user research studies, improved conversion rate by 15%"}, {"company": "Digital Agency Bangkok", "position": "Junior UX Designer", "duration": "2021-2022", "description": "Created wireframes and prototypes for mobile applications, worked with international clients"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'JobThai' LIMIT 1),
    'Job Portal',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Applied' LIMIT 1),
    false,
    null
),
-- Candidate 6: Additional Software Engineer (for variety)
(
    '660e8400-e29b-41d4-a716-446655440006',
    'Lisa Garcia',
    'lisa.garcia@email.com',
    '+66-86-789-0123',
    '550e8400-e29b-41d4-a716-446655440001',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.72,
    '2024-01-30',
    '{"skills": ["Java", "Spring Boot", "MySQL", "Docker", "Kubernetes"], "experience_years": 4, "education": "Bachelor of Computer Engineering", "languages": ["English", "Spanish", "Thai"], "certifications": ["Oracle Java Certified"]}',
    '{"expected_salary": "90,000 THB", "availability": "1 month notice", "preferred_location": "Bangkok", "remote_work": false}',
    '/uploads/resumes/lisa_garcia_resume.pdf',
    '2024-01-30',
    NOW(),
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    'Backend-focused developer with Java and Spring Boot experience. Has containerization knowledge.',
    'Good backend skills with Java stack. Experience with DevOps tools is valuable.',
    '[{"degree": "Bachelor of Computer Engineering", "university": "Kasetsart University", "year": 2020, "gpa": "3.4"}]',
    '[{"company": "Enterprise Solutions", "position": "Software Engineer", "duration": "2022-2024", "description": "Developed backend services using Java and Spring Boot"}, {"company": "TechConsulting", "position": "Junior Developer", "duration": "2020-2022", "description": "Worked on web applications and database design"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'Facebook' LIMIT 1),
    'Social Media',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Screening' LIMIT 1),
    false,
    null
),
-- Additional candidates for the new positions
-- Candidate 7: DevOps Engineer
(
    '660e8400-e29b-41d4-a716-446655440007',
    'Alex Kumar',
    'alex.kumar@email.com',
    '+66-87-890-1234',
    '550e8400-e29b-41d4-a716-446655440006',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.82,
    '2024-02-01',
    '{"skills": ["AWS", "Docker", "Kubernetes", "Terraform", "Python", "Jenkins"], "experience_years": 4, "education": "Bachelor of Computer Engineering", "languages": ["English", "Hindi", "Thai"], "certifications": ["AWS Certified Solutions Architect"]}',
    '{"expected_salary": "95,000 THB", "availability": "2 weeks notice", "preferred_location": "Bangkok", "remote_work": true}',
    '/uploads/resumes/alex_kumar_resume.pdf',
    '2024-02-01',
    NOW(),
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    'Experienced DevOps engineer with strong AWS and containerization skills. Has infrastructure automation experience.',
    'Strong DevOps background with AWS certification and containerization expertise.',
    '[{"degree": "Bachelor of Computer Engineering", "university": "King Mongkut Institute of Technology", "year": 2020, "gpa": "3.6"}]',
    '[{"company": "CloudTech Solutions", "position": "DevOps Engineer", "duration": "2022-2024", "description": "Managed AWS infrastructure and implemented CI/CD pipelines"}, {"company": "TechStartup", "position": "Junior DevOps Engineer", "duration": "2020-2022", "description": "Assisted with infrastructure setup and monitoring"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'Linkedin' LIMIT 1),
    'Professional Network',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Screening' LIMIT 1),
    false,
    null
),
-- Candidate 8: Marketing Manager
(
    '660e8400-e29b-41d4-a716-446655440008',
    'Maria Rodriguez',
    'maria.rodriguez@email.com',
    '+66-88-901-2345',
    '550e8400-e29b-41d4-a716-446655440007',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.79,
    '2024-02-03',
    '{"skills": ["Digital Marketing", "SEO", "Social Media", "Analytics", "Campaign Management"], "experience_years": 5, "education": "Master of Marketing", "languages": ["English", "Spanish", "Thai"], "certifications": ["Google Analytics Certified", "HubSpot Marketing Certified"]}',
    '{"expected_salary": "110,000 THB", "availability": "1 month notice", "preferred_location": "Bangkok", "remote_work": false}',
    '/uploads/resumes/maria_rodriguez_resume.pdf',
    '2024-02-03',
    NOW(),
    'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    'Experienced marketing professional with strong digital marketing background and analytics skills.',
    'Strong marketing background with digital expertise and analytics knowledge.',
    '[{"degree": "Master of Marketing", "university": "Thammasat University", "year": 2019, "gpa": "3.8"}, {"degree": "Bachelor of Business Administration", "university": "University of Barcelona", "year": 2017, "gpa": "3.7"}]',
    '[{"company": "Digital Marketing Agency", "position": "Senior Marketing Manager", "duration": "2021-2024", "description": "Led digital marketing campaigns and increased brand awareness by 60%"}, {"company": "E-commerce Company", "position": "Marketing Specialist", "duration": "2019-2021", "description": "Managed social media and content marketing strategies"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'JobsDB' LIMIT 1),
    'Job Portal',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Shortlisted' LIMIT 1),
    true,
    '2024-02-05'
),
-- Candidate 9: Sales Representative
(
    '660e8400-e29b-41d4-a716-446655440009',
    'James Wilson',
    'james.wilson@email.com',
    '+66-89-012-3456',
    '550e8400-e29b-41d4-a716-446655440008',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.68,
    '2024-02-05',
    '{"skills": ["Sales", "CRM", "Negotiation", "Customer Relations", "Lead Generation"], "experience_years": 3, "education": "Bachelor of Business Administration", "languages": ["English", "Thai"], "certifications": ["Salesforce Certified"]}',
    '{"expected_salary": "55,000 THB", "availability": "2 weeks notice", "preferred_location": "Bangkok", "remote_work": false}',
    '/uploads/resumes/james_wilson_resume.pdf',
    '2024-02-05',
    NOW(),
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    'Motivated sales professional with strong communication skills and CRM experience.',
    'Good sales background with CRM experience and strong communication skills.',
    '[{"degree": "Bachelor of Business Administration", "university": "Assumption University", "year": 2021, "gpa": "3.4"}]',
    '[{"company": "Tech Sales Co.", "position": "Sales Representative", "duration": "2022-2024", "description": "Achieved 120% of sales targets and managed key accounts"}, {"company": "Retail Company", "position": "Sales Associate", "duration": "2021-2022", "description": "Provided customer service and product recommendations"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'Referral' LIMIT 1),
    'Employee Referral',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Applied' LIMIT 1),
    false,
    null
),
-- Candidate 10: HR Specialist
(
    '660e8400-e29b-41d4-a716-446655440010',
    'Sophie Taylor',
    'sophie.taylor@email.com',
    '+66-90-123-4567',
    '550e8400-e29b-41d4-a716-446655440009',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.74,
    '2024-02-07',
    '{"skills": ["HR Administration", "Recruitment", "Employee Relations", "HRIS", "Labor Law"], "experience_years": 3, "education": "Bachelor of Psychology", "languages": ["English", "Thai"], "certifications": ["PHR Certification"]}',
    '{"expected_salary": "65,000 THB", "availability": "3 weeks notice", "preferred_location": "Bangkok", "remote_work": false}',
    '/uploads/resumes/sophie_taylor_resume.pdf',
    '2024-02-07',
    NOW(),
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    'Experienced HR professional with strong recruitment and employee relations background.',
    'Good HR background with recruitment experience and PHR certification.',
    '[{"degree": "Bachelor of Psychology", "university": "Chulalongkorn University", "year": 2021, "gpa": "3.5"}]',
    '[{"company": "HR Consulting Firm", "position": "HR Specialist", "duration": "2022-2024", "description": "Handled recruitment, onboarding, and employee relations for multiple clients"}, {"company": "Manufacturing Company", "position": "HR Assistant", "duration": "2021-2022", "description": "Assisted with HR administration and recruitment processes"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'JobThai' LIMIT 1),
    'Job Portal',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Screening' LIMIT 1),
    false,
    null
),
-- Candidate 11: Financial Analyst
(
    '660e8400-e29b-41d4-a716-446655440011',
    'Robert Kim',
    'robert.kim@email.com',
    '+66-91-234-5678',
    '550e8400-e29b-41d4-a716-446655440010',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.86,
    '2024-02-09',
    '{"skills": ["Financial Analysis", "Excel", "Financial Modeling", "SAP", "Investment Analysis"], "experience_years": 4, "education": "Bachelor of Finance", "languages": ["English", "Korean", "Thai"], "certifications": ["CFA Level 1"]}',
    '{"expected_salary": "80,000 THB", "availability": "1 month notice", "preferred_location": "Bangkok", "remote_work": false}',
    '/uploads/resumes/robert_kim_resume.pdf',
    '2024-02-09',
    NOW(),
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    'Strong financial analyst with CFA certification and SAP experience.',
    'Excellent financial background with CFA certification and strong analytical skills.',
    '[{"degree": "Bachelor of Finance", "university": "Korea University", "year": 2020, "gpa": "3.7"}]',
    '[{"company": "Investment Bank", "position": "Financial Analyst", "duration": "2022-2024", "description": "Conducted financial analysis and prepared investment reports"}, {"company": "Accounting Firm", "position": "Junior Financial Analyst", "duration": "2020-2022", "description": "Assisted with financial modeling and analysis"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'Linkedin' LIMIT 1),
    'Professional Network',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Interview Scheduled' LIMIT 1),
    true,
    '2024-02-10'
),
-- Candidate 12: QA Engineer
(
    '660e8400-e29b-41d4-a716-446655440012',
    'Anna Petrov',
    'anna.petrov@email.com',
    '+66-92-345-6789',
    '550e8400-e29b-41d4-a716-446655440011',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.71,
    '2024-02-11',
    '{"skills": ["Manual Testing", "Automated Testing", "Selenium", "API Testing", "Test Planning"], "experience_years": 3, "education": "Bachelor of Computer Science", "languages": ["English", "Russian", "Thai"], "certifications": ["ISTQB Foundation Level"]}',
    '{"expected_salary": "70,000 THB", "availability": "2 weeks notice", "preferred_location": "Bangkok", "remote_work": true}',
    '/uploads/resumes/anna_petrov_resume.pdf',
    '2024-02-11',
    NOW(),
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    'Experienced QA engineer with both manual and automated testing skills.',
    'Good QA background with ISTQB certification and automation experience.',
    '[{"degree": "Bachelor of Computer Science", "university": "Moscow State University", "year": 2021, "gpa": "3.6"}]',
    '[{"company": "Software Company", "position": "QA Engineer", "duration": "2022-2024", "description": "Designed and executed test plans, identified and reported bugs"}, {"company": "Startup", "position": "Junior QA Tester", "duration": "2021-2022", "description": "Performed manual testing and created test cases"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'Facebook' LIMIT 1),
    'Social Media',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Applied' LIMIT 1),
    false,
    null
),
-- Candidate 13: Customer Success Manager
(
    '660e8400-e29b-41d4-a716-446655440013',
    'Kevin Lee',
    'kevin.lee@email.com',
    '+66-93-456-7890',
    '550e8400-e29b-41d4-a716-446655440012',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.83,
    '2024-02-13',
    '{"skills": ["Customer Success", "Account Management", "CRM", "Upselling", "Customer Relations"], "experience_years": 4, "education": "Bachelor of Business Administration", "languages": ["English", "Chinese", "Thai"], "certifications": ["Customer Success Management Certification"]}',
    '{"expected_salary": "85,000 THB", "availability": "3 weeks notice", "preferred_location": "Bangkok", "remote_work": false}',
    '/uploads/resumes/kevin_lee_resume.pdf',
    '2024-02-13',
    NOW(),
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    'Experienced customer success manager with strong account management and upselling skills.',
    'Strong customer success background with account management experience and upselling track record.',
    '[{"degree": "Bachelor of Business Administration", "university": "National Taiwan University", "year": 2020, "gpa": "3.8"}]',
    '[{"company": "SaaS Company", "position": "Customer Success Manager", "duration": "2022-2024", "description": "Managed key accounts and achieved 95% customer retention rate"}, {"company": "Tech Company", "position": "Account Manager", "duration": "2020-2022", "description": "Handled customer relationships and identified growth opportunities"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'Referral' LIMIT 1),
    'Employee Referral',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Shortlisted' LIMIT 1),
    false,
    null
),
-- Additional candidates for existing positions
-- Candidate 14: Another Software Engineer
(
    '660e8400-e29b-41d4-a716-446655440014',
    'Raj Patel',
    'raj.patel@email.com',
    '+66-94-567-8901',
    '550e8400-e29b-41d4-a716-446655440001',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.77,
    '2024-02-15',
    '{"skills": ["Python", "Django", "PostgreSQL", "Redis", "Docker", "Git"], "experience_years": 5, "education": "Bachelor of Computer Science", "languages": ["English", "Hindi", "Thai"], "certifications": ["Python Institute Certification"]}',
    '{"expected_salary": "95,000 THB", "availability": "1 month notice", "preferred_location": "Bangkok", "remote_work": true}',
    '/uploads/resumes/raj_patel_resume.pdf',
    '2024-02-15',
    NOW(),
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    'Experienced Python developer with Django and database expertise.',
    'Strong Python background with Django experience and database skills.',
    '[{"degree": "Bachelor of Computer Science", "university": "Indian Institute of Technology", "year": 2019, "gpa": "3.6"}]',
    '[{"company": "Web Development Agency", "position": "Senior Python Developer", "duration": "2021-2024", "description": "Developed web applications using Django and PostgreSQL"}, {"company": "Startup", "position": "Python Developer", "duration": "2019-2021", "description": "Built backend services and APIs using Python"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'JobsDB' LIMIT 1),
    'Job Portal',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Screening' LIMIT 1),
    false,
    null
),
-- Candidate 15: Another Frontend Developer
(
    '660e8400-e29b-41d4-a716-446655440015',
    'Yuki Tanaka',
    'yuki.tanaka@email.com',
    '+66-95-678-9012',
    '550e8400-e29b-41d4-a716-446655440002',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.73,
    '2024-02-17',
    '{"skills": ["Vue.js", "JavaScript", "CSS", "Webpack", "Jest", "Figma"], "experience_years": 3, "education": "Bachelor of Information Technology", "languages": ["English", "Japanese", "Thai"], "certifications": []}',
    '{"expected_salary": "68,000 THB", "availability": "2 weeks notice", "preferred_location": "Bangkok", "remote_work": false}',
    '/uploads/resumes/yuki_tanaka_resume.pdf',
    '2024-02-17',
    NOW(),
    'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    'Frontend developer with Vue.js expertise and design skills.',
    'Good frontend skills with Vue.js experience and design background.',
    '[{"degree": "Bachelor of Information Technology", "university": "Tokyo Institute of Technology", "year": 2021, "gpa": "3.5"}]',
    '[{"company": "Web Design Studio", "position": "Frontend Developer", "duration": "2022-2024", "description": "Developed user interfaces using Vue.js and CSS frameworks"}, {"company": "Digital Agency", "position": "Junior Frontend Developer", "duration": "2021-2022", "description": "Created responsive web designs and interactive components"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'University' LIMIT 1),
    'University Partnership',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Applied' LIMIT 1),
    false,
    null
),
-- Additional candidates for more comprehensive dataset
-- Candidate 16: Senior Backend Developer
(
    '660e8400-e29b-41d4-a716-446655440016',
    'Ahmed Hassan',
    'ahmed.hassan@email.com',
    '+66-96-789-0123',
    '550e8400-e29b-41d4-a716-446655440001',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.89,
    '2024-02-20',
    '{"skills": ["Go", "Microservices", "PostgreSQL", "Redis", "Docker", "Kubernetes", "gRPC"], "experience_years": 7, "education": "Master of Computer Science", "languages": ["English", "Arabic", "Thai"], "certifications": ["Google Cloud Professional Developer", "Kubernetes Certified Administrator"]}',
    '{"expected_salary": "120,000 THB", "availability": "1 month notice", "preferred_location": "Bangkok", "remote_work": true}',
    '/uploads/resumes/ahmed_hassan_resume.pdf',
    '2024-02-20',
    NOW(),
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    'Senior backend developer with strong Go and microservices expertise. Has extensive cloud and containerization experience.',
    'Excellent backend skills with Go and microservices architecture. Strong cloud certifications.',
    '[{"degree": "Master of Computer Science", "university": "Cairo University", "year": 2017, "gpa": "3.8"}, {"degree": "Bachelor of Computer Engineering", "university": "Alexandria University", "year": 2015, "gpa": "3.6"}]',
    '[{"company": "TechCorp Middle East", "position": "Senior Backend Developer", "duration": "2021-2024", "description": "Led microservices architecture migration and improved system performance by 60%"}, {"company": "StartupHub", "position": "Backend Developer", "duration": "2018-2021", "description": "Developed scalable backend services using Go and PostgreSQL"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'Linkedin' LIMIT 1),
    'Professional Network',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Interview Scheduled' LIMIT 1),
    true,
    '2024-02-22'
),
-- Candidate 17: Mobile App Developer
(
    '660e8400-e29b-41d4-a716-446655440017',
    'Priya Sharma',
    'priya.sharma@email.com',
    '+66-97-890-1234',
    '550e8400-e29b-41d4-a716-446655440002',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.76,
    '2024-02-22',
    '{"skills": ["React Native", "Flutter", "iOS", "Android", "JavaScript", "TypeScript", "Firebase"], "experience_years": 4, "education": "Bachelor of Computer Science", "languages": ["English", "Hindi", "Thai"], "certifications": ["Google Mobile Web Specialist"]}',
    '{"expected_salary": "85,000 THB", "availability": "2 weeks notice", "preferred_location": "Bangkok", "remote_work": false}',
    '/uploads/resumes/priya_sharma_resume.pdf',
    '2024-02-22',
    NOW(),
    'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    'Experienced mobile developer with React Native and Flutter expertise. Strong cross-platform development skills.',
    'Good mobile development background with cross-platform experience and modern frameworks.',
    '[{"degree": "Bachelor of Computer Science", "university": "Delhi Technological University", "year": 2020, "gpa": "3.7"}]',
    '[{"company": "Mobile Solutions Inc", "position": "Mobile App Developer", "duration": "2022-2024", "description": "Developed cross-platform mobile applications with 100k+ downloads"}, {"company": "AppStudio", "position": "Junior Mobile Developer", "duration": "2020-2022", "description": "Created mobile apps using React Native and Flutter"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'JobsDB' LIMIT 1),
    'Job Portal',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Screening' LIMIT 1),
    false,
    null
),
-- Candidate 18: Business Analyst
(
    '660e8400-e29b-41d4-a716-446655440018',
    'Thomas Anderson',
    'thomas.anderson@email.com',
    '+66-98-901-2345',
    '550e8400-e29b-41d4-a716-446655440004',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.81,
    '2024-02-24',
    '{"skills": ["Business Analysis", "Data Analysis", "SQL", "Tableau", "Power BI", "Agile", "Stakeholder Management"], "experience_years": 5, "education": "MBA", "languages": ["English", "Thai"], "certifications": ["Certified Business Analysis Professional (CBAP)"]}',
    '{"expected_salary": "95,000 THB", "availability": "3 weeks notice", "preferred_location": "Bangkok", "remote_work": false}',
    '/uploads/resumes/thomas_anderson_resume.pdf',
    '2024-02-24',
    NOW(),
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    'Experienced business analyst with strong data analysis and stakeholder management skills. CBAP certified.',
    'Strong business analysis background with MBA and CBAP certification. Good data analysis skills.',
    '[{"degree": "MBA", "university": "Wharton School", "year": 2019, "gpa": "3.9"}, {"degree": "Bachelor of Business Administration", "university": "University of California", "year": 2017, "gpa": "3.8"}]',
    '[{"company": "Consulting Firm", "position": "Senior Business Analyst", "duration": "2021-2024", "description": "Led business process improvements and data analysis projects"}, {"company": "Tech Company", "position": "Business Analyst", "duration": "2019-2021", "description": "Analyzed business requirements and created data visualizations"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'Referral' LIMIT 1),
    'Employee Referral',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Shortlisted' LIMIT 1),
    true,
    '2024-02-25'
),
-- Candidate 19: Cybersecurity Specialist
(
    '660e8400-e29b-41d4-a716-446655440019',
    'Elena Volkov',
    'elena.volkov@email.com',
    '+66-99-012-3456',
    '550e8400-e29b-41d4-a716-446655440006',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.87,
    '2024-02-26',
    '{"skills": ["Cybersecurity", "Penetration Testing", "SIEM", "Firewall Management", "Incident Response", "Python", "Linux"], "experience_years": 6, "education": "Master of Cybersecurity", "languages": ["English", "Russian", "Thai"], "certifications": ["CISSP", "CEH", "CompTIA Security+"]}',
    '{"expected_salary": "110,000 THB", "availability": "1 month notice", "preferred_location": "Bangkok", "remote_work": true}',
    '/uploads/resumes/elena_volkov_resume.pdf',
    '2024-02-26',
    NOW(),
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    'Highly qualified cybersecurity specialist with advanced certifications and extensive security experience.',
    'Excellent cybersecurity background with CISSP and CEH certifications. Strong technical skills.',
    '[{"degree": "Master of Cybersecurity", "university": "Moscow Institute of Physics and Technology", "year": 2018, "gpa": "3.9"}, {"degree": "Bachelor of Computer Science", "university": "St. Petersburg State University", "year": 2016, "gpa": "3.7"}]',
    '[{"company": "Security Solutions Ltd", "position": "Senior Cybersecurity Specialist", "duration": "2021-2024", "description": "Led security assessments and incident response for enterprise clients"}, {"company": "Tech Security Corp", "position": "Cybersecurity Analyst", "duration": "2018-2021", "description": "Conducted penetration testing and security audits"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'Linkedin' LIMIT 1),
    'Professional Network',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Interview Scheduled' LIMIT 1),
    false,
    null
),
-- Candidate 20: Content Marketing Specialist
(
    '660e8400-e29b-41d4-a716-446655440020',
    'Isabella Martinez',
    'isabella.martinez@email.com',
    '+66-90-123-4567',
    '550e8400-e29b-41d4-a716-446655440007',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.72,
    '2024-02-28',
    '{"skills": ["Content Marketing", "SEO", "Social Media", "Copywriting", "Analytics", "WordPress", "Adobe Creative Suite"], "experience_years": 3, "education": "Bachelor of Marketing", "languages": ["English", "Spanish", "Thai"], "certifications": ["Google Analytics Certified", "HubSpot Content Marketing Certified"]}',
    '{"expected_salary": "65,000 THB", "availability": "2 weeks notice", "preferred_location": "Bangkok", "remote_work": true}',
    '/uploads/resumes/isabella_martinez_resume.pdf',
    '2024-02-28',
    NOW(),
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    'Creative content marketing specialist with strong SEO and social media skills. Bilingual capabilities.',
    'Good content marketing background with SEO expertise and creative skills.',
    '[{"degree": "Bachelor of Marketing", "university": "Universidad de Barcelona", "year": 2021, "gpa": "3.6"}]',
    '[{"company": "Digital Marketing Agency", "position": "Content Marketing Specialist", "duration": "2022-2024", "description": "Created content strategies and managed social media campaigns"}, {"company": "Content Studio", "position": "Junior Content Writer", "duration": "2021-2022", "description": "Wrote blog posts and social media content"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'Facebook' LIMIT 1),
    'Social Media',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Applied' LIMIT 1),
    false,
    null
),
-- Candidate 21: Senior Sales Manager
(
    '660e8400-e29b-41d4-a716-446655440021',
    'Marcus Johnson',
    'marcus.johnson@email.com',
    '+66-91-234-5678',
    '550e8400-e29b-41d4-a716-446655440008',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.84,
    '2024-03-01',
    '{"skills": ["Sales Management", "Team Leadership", "CRM", "Negotiation", "Business Development", "Client Relations", "Sales Strategy"], "experience_years": 8, "education": "Bachelor of Business Administration", "languages": ["English", "Thai"], "certifications": ["Sales Management Professional", "Salesforce Certified Administrator"]}',
    '{"expected_salary": "130,000 THB", "availability": "1 month notice", "preferred_location": "Bangkok", "remote_work": false}',
    '/uploads/resumes/marcus_johnson_resume.pdf',
    '2024-03-01',
    NOW(),
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    'Experienced sales manager with strong leadership skills and proven track record of exceeding targets.',
    'Strong sales management background with team leadership experience and excellent track record.',
    '[{"degree": "Bachelor of Business Administration", "university": "University of Texas", "year": 2016, "gpa": "3.5"}]',
    '[{"company": "Enterprise Sales Corp", "position": "Senior Sales Manager", "duration": "2020-2024", "description": "Led sales team of 8 people and exceeded annual targets by 25%"}, {"company": "Tech Sales Solutions", "position": "Sales Manager", "duration": "2018-2020", "description": "Managed key accounts and developed new business opportunities"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'Referral' LIMIT 1),
    'Employee Referral',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Interview Scheduled' LIMIT 1),
    true,
    '2024-03-02'
),
-- Candidate 22: Training and Development Specialist
(
    '660e8400-e29b-41d4-a716-446655440022',
    'Jennifer Lee',
    'jennifer.lee@email.com',
    '+66-92-345-6789',
    '550e8400-e29b-41d4-a716-446655440009',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.78,
    '2024-03-03',
    '{"skills": ["Training Development", "Learning Management Systems", "Instructional Design", "Employee Development", "Performance Management", "HR Analytics", "Workshop Facilitation"], "experience_years": 4, "education": "Master of Human Resources", "languages": ["English", "Chinese", "Thai"], "certifications": ["Certified Professional in Learning and Performance (CPLP)"]}',
    '{"expected_salary": "75,000 THB", "availability": "3 weeks notice", "preferred_location": "Bangkok", "remote_work": false}',
    '/uploads/resumes/jennifer_lee_resume.pdf',
    '2024-03-03',
    NOW(),
    'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    'Experienced training and development specialist with strong instructional design and employee development skills.',
    'Good training background with CPLP certification and employee development experience.',
    '[{"degree": "Master of Human Resources", "university": "University of Hong Kong", "year": 2020, "gpa": "3.8"}, {"degree": "Bachelor of Psychology", "university": "National Taiwan University", "year": 2018, "gpa": "3.6"}]',
    '[{"company": "Learning Solutions Inc", "position": "Training and Development Specialist", "duration": "2021-2024", "description": "Developed training programs and improved employee performance metrics"}, {"company": "HR Consulting", "position": "Training Coordinator", "duration": "2020-2021", "description": "Coordinated training sessions and managed learning management systems"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'JobThai' LIMIT 1),
    'Job Portal',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Screening' LIMIT 1),
    false,
    null
),
-- Candidate 23: Investment Analyst
(
    '660e8400-e29b-41d4-a716-446655440023',
    'Daniel Park',
    'daniel.park@email.com',
    '+66-93-456-7890',
    '550e8400-e29b-41d4-a716-446655440010',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.91,
    '2024-03-05',
    '{"skills": ["Investment Analysis", "Financial Modeling", "Valuation", "Excel", "Bloomberg Terminal", "Python", "Risk Assessment"], "experience_years": 5, "education": "Master of Finance", "languages": ["English", "Korean", "Thai"], "certifications": ["CFA Level 2", "FRM (Financial Risk Manager)"]}',
    '{"expected_salary": "100,000 THB", "availability": "1 month notice", "preferred_location": "Bangkok", "remote_work": false}',
    '/uploads/resumes/daniel_park_resume.pdf',
    '2024-03-05',
    NOW(),
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    'Highly qualified investment analyst with CFA Level 2 and strong financial modeling skills.',
    'Excellent investment analysis background with CFA Level 2 and FRM certifications.',
    '[{"degree": "Master of Finance", "university": "Seoul National University", "year": 2019, "gpa": "3.9"}, {"degree": "Bachelor of Economics", "university": "Yonsei University", "year": 2017, "gpa": "3.8"}]',
    '[{"company": "Investment Bank", "position": "Senior Investment Analyst", "duration": "2021-2024", "description": "Conducted equity research and built financial models for investment decisions"}, {"company": "Asset Management", "position": "Investment Analyst", "duration": "2019-2021", "description": "Analyzed investment opportunities and prepared research reports"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'Linkedin' LIMIT 1),
    'Professional Network',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Shortlisted' LIMIT 1),
    true,
    '2024-03-06'
),
-- Candidate 24: Performance Test Engineer
(
    '660e8400-e29b-41d4-a716-446655440024',
    'Olga Petrov',
    'olga.petrov@email.com',
    '+66-94-567-8901',
    '550e8400-e29b-41d4-a716-446655440011',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.79,
    '2024-03-07',
    '{"skills": ["Performance Testing", "Load Testing", "JMeter", "Gatling", "Python", "Docker", "Monitoring Tools"], "experience_years": 4, "education": "Bachelor of Computer Science", "languages": ["English", "Russian", "Thai"], "certifications": ["ISTQB Advanced Test Manager"]}',
    '{"expected_salary": "80,000 THB", "availability": "2 weeks notice", "preferred_location": "Bangkok", "remote_work": true}',
    '/uploads/resumes/olga_petrov_resume.pdf',
    '2024-03-07',
    NOW(),
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    'Experienced performance test engineer with strong load testing and monitoring expertise.',
    'Good performance testing background with ISTQB certification and load testing experience.',
    '[{"degree": "Bachelor of Computer Science", "university": "Novosibirsk State University", "year": 2020, "gpa": "3.7"}]',
    '[{"company": "Performance Testing Solutions", "position": "Performance Test Engineer", "duration": "2022-2024", "description": "Designed and executed performance tests for high-traffic applications"}, {"company": "QA Services", "position": "Test Engineer", "duration": "2020-2022", "description": "Performed functional and performance testing using various tools"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'University' LIMIT 1),
    'University Partnership',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Applied' LIMIT 1),
    false,
    null
),
-- Candidate 25: Technical Account Manager
(
    '660e8400-e29b-41d4-a716-446655440025',
    'Carlos Rodriguez',
    'carlos.rodriguez@email.com',
    '+66-95-678-9012',
    '550e8400-e29b-41d4-a716-446655440012',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.85,
    '2024-03-09',
    '{"skills": ["Technical Account Management", "Customer Success", "API Integration", "Technical Support", "Project Management", "CRM", "Technical Documentation"], "experience_years": 6, "education": "Bachelor of Computer Engineering", "languages": ["English", "Spanish", "Thai"], "certifications": ["PMP (Project Management Professional)"]}',
    '{"expected_salary": "95,000 THB", "availability": "1 month notice", "preferred_location": "Bangkok", "remote_work": false}',
    '/uploads/resumes/carlos_rodriguez_resume.pdf',
    '2024-03-09',
    NOW(),
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    'Experienced technical account manager with strong technical background and customer success skills.',
    'Strong technical account management background with PMP certification and API integration experience.',
    '[{"degree": "Bachelor of Computer Engineering", "university": "Universidad Politécnica de Madrid", "year": 2018, "gpa": "3.6"}]',
    '[{"company": "Tech Solutions Corp", "position": "Senior Technical Account Manager", "duration": "2021-2024", "description": "Managed enterprise accounts and provided technical support for complex integrations"}, {"company": "Software Company", "position": "Technical Account Manager", "duration": "2018-2021", "description": "Handled customer relationships and technical implementations"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'Referral' LIMIT 1),
    'Employee Referral',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Interview Scheduled' LIMIT 1),
    false,
    null
),
-- Batch 1: Additional candidates (26-50)
-- Candidate 26: Full Stack Developer
(
    '660e8400-e29b-41d4-a716-446655440026',
    'Sofia Chen',
    'sofia.chen@email.com',
    '+66-96-789-0123',
    '550e8400-e29b-41d4-a716-446655440001',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.83,
    '2024-03-10',
    '{"skills": ["React", "Node.js", "MongoDB", "Express", "TypeScript", "AWS", "Docker"], "experience_years": 5, "education": "Bachelor of Computer Science", "languages": ["English", "Chinese", "Thai"], "certifications": ["AWS Certified Developer"]}',
    '{"expected_salary": "90,000 THB", "availability": "2 weeks notice", "preferred_location": "Bangkok", "remote_work": true}',
    '/uploads/resumes/sofia_chen_resume.pdf',
    '2024-03-10',
    NOW(),
    'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    'Experienced full stack developer with strong React and Node.js skills.',
    'Good full stack background with modern technologies.',
    '[{"degree": "Bachelor of Computer Science", "university": "Tsinghua University", "year": 2019, "gpa": "3.7"}]',
    '[{"company": "Tech Solutions", "position": "Full Stack Developer", "duration": "2021-2024", "description": "Developed web applications using React and Node.js"}, {"company": "Startup", "position": "Junior Developer", "duration": "2019-2021", "description": "Built full stack applications"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'Linkedin' LIMIT 1),
    'Professional Network',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Screening' LIMIT 1),
    false,
    null
),
-- Candidate 27: UI/UX Designer
(
    '660e8400-e29b-41d4-a716-446655440027',
    'Emma Thompson',
    'emma.thompson@email.com',
    '+66-97-890-1234',
    '550e8400-e29b-41d4-a716-446655440005',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.77,
    '2024-03-12',
    '{"skills": ["UI Design", "UX Research", "Figma", "Adobe XD", "Sketch", "Prototyping", "User Testing"], "experience_years": 4, "education": "Bachelor of Design", "languages": ["English", "Thai"], "certifications": ["Google UX Design Certificate"]}',
    '{"expected_salary": "75,000 THB", "availability": "1 month notice", "preferred_location": "Bangkok", "remote_work": false}',
    '/uploads/resumes/emma_thompson_resume.pdf',
    '2024-03-12',
    NOW(),
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    'Creative UI/UX designer with strong user research and prototyping skills.',
    'Good design background with user research experience.',
    '[{"degree": "Bachelor of Design", "university": "Royal College of Art", "year": 2020, "gpa": "3.8"}]',
    '[{"company": "Design Agency", "position": "UI/UX Designer", "duration": "2021-2024", "description": "Designed user interfaces and conducted user research"}, {"company": "Creative Studio", "position": "Junior Designer", "duration": "2020-2021", "description": "Created visual designs and prototypes"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'JobsDB' LIMIT 1),
    'Job Portal',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Applied' LIMIT 1),
    false,
    null
),
-- Candidate 28: Database Administrator
(
    '660e8400-e29b-41d4-a716-446655440028',
    'Hassan Al-Rashid',
    'hassan.alrashid@email.com',
    '+66-98-901-2345',
    '550e8400-e29b-41d4-a716-446655440006',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.86,
    '2024-03-14',
    '{"skills": ["PostgreSQL", "MySQL", "MongoDB", "Redis", "Database Optimization", "Backup & Recovery", "SQL"], "experience_years": 6, "education": "Bachelor of Computer Science", "languages": ["English", "Arabic", "Thai"], "certifications": ["Oracle Database Administrator Certified Professional"]}',
    '{"expected_salary": "95,000 THB", "availability": "3 weeks notice", "preferred_location": "Bangkok", "remote_work": true}',
    '/uploads/resumes/hassan_alrashid_resume.pdf',
    '2024-03-14',
    NOW(),
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    'Experienced database administrator with strong optimization and backup skills.',
    'Excellent database administration background with Oracle certification.',
    '[{"degree": "Bachelor of Computer Science", "university": "King Saud University", "year": 2018, "gpa": "3.6"}]',
    '[{"company": "Database Solutions", "position": "Senior Database Administrator", "duration": "2020-2024", "description": "Managed enterprise databases and optimized performance"}, {"company": "Tech Corp", "position": "Database Administrator", "duration": "2018-2020", "description": "Maintained database systems and backups"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'Referral' LIMIT 1),
    'Employee Referral',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Shortlisted' LIMIT 1),
    true,
    '2024-03-15'
),
-- Candidate 29: Digital Marketing Specialist
(
    '660e8400-e29b-41d4-a716-446655440029',
    'Lucas Silva',
    'lucas.silva@email.com',
    '+66-99-012-3456',
    '550e8400-e29b-41d4-a716-446655440007',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.74,
    '2024-03-16',
    '{"skills": ["Digital Marketing", "PPC", "Google Ads", "Facebook Ads", "Analytics", "Email Marketing", "Marketing Automation"], "experience_years": 3, "education": "Bachelor of Marketing", "languages": ["English", "Portuguese", "Thai"], "certifications": ["Google Ads Certified", "Facebook Blueprint Certified"]}',
    '{"expected_salary": "60,000 THB", "availability": "2 weeks notice", "preferred_location": "Bangkok", "remote_work": false}',
    '/uploads/resumes/lucas_silva_resume.pdf',
    '2024-03-16',
    NOW(),
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    'Digital marketing specialist with strong PPC and social media advertising skills.',
    'Good digital marketing background with Google and Facebook certifications.',
    '[{"degree": "Bachelor of Marketing", "university": "University of São Paulo", "year": 2021, "gpa": "3.5"}]',
    '[{"company": "Digital Agency", "position": "Digital Marketing Specialist", "duration": "2022-2024", "description": "Managed PPC campaigns and social media advertising"}, {"company": "Marketing Firm", "position": "Marketing Assistant", "duration": "2021-2022", "description": "Assisted with digital marketing campaigns"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'Facebook' LIMIT 1),
    'Social Media',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Screening' LIMIT 1),
    false,
    null
),
-- Candidate 30: Sales Development Representative
(
    '660e8400-e29b-41d4-a716-446655440030',
    'Nina Petrov',
    'nina.petrov@email.com',
    '+66-90-123-4567',
    '550e8400-e29b-41d4-a716-446655440008',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.69,
    '2024-03-18',
    '{"skills": ["Lead Generation", "Cold Calling", "CRM", "Sales Prospecting", "Email Outreach", "Sales Qualification", "Pipeline Management"], "experience_years": 2, "education": "Bachelor of Business Administration", "languages": ["English", "Russian", "Thai"], "certifications": ["Salesforce Certified Sales Cloud Consultant"]}',
    '{"expected_salary": "45,000 THB", "availability": "1 month notice", "preferred_location": "Bangkok", "remote_work": false}',
    '/uploads/resumes/nina_petrov_resume.pdf',
    '2024-03-18',
    NOW(),
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    'Motivated sales development representative with strong lead generation skills.',
    'Good sales development background with CRM experience.',
    '[{"degree": "Bachelor of Business Administration", "university": "Moscow State University", "year": 2022, "gpa": "3.4"}]',
    '[{"company": "Sales Solutions", "position": "Sales Development Representative", "duration": "2022-2024", "description": "Generated leads and qualified prospects for sales team"}, {"company": "Tech Startup", "position": "Sales Intern", "duration": "2021-2022", "description": "Assisted with lead generation and sales activities"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'JobThai' LIMIT 1),
    'Job Portal',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Applied' LIMIT 1),
    false,
    null
),
-- Batch 2: Additional candidates (31-100) - Diverse roles and backgrounds
-- Candidate 31: Cloud Solutions Architect
(
    '660e8400-e29b-41d4-a716-446655440031',
    'Akira Tanaka',
    'akira.tanaka@email.com',
    '+66-91-234-5678',
    '550e8400-e29b-41d4-a716-446655440006',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.92,
    '2024-03-20',
    '{"skills": ["AWS", "Azure", "GCP", "Terraform", "Kubernetes", "Docker", "Microservices"], "experience_years": 8, "education": "Master of Computer Science", "languages": ["English", "Japanese", "Thai"], "certifications": ["AWS Solutions Architect Professional", "Azure Solutions Architect Expert"]}',
    '{"expected_salary": "140,000 THB", "availability": "1 month notice", "preferred_location": "Bangkok", "remote_work": true}',
    '/uploads/resumes/akira_tanaka_resume.pdf',
    '2024-03-20',
    NOW(),
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    'Senior cloud solutions architect with extensive multi-cloud experience.',
    'Excellent cloud architecture background with multiple certifications.',
    '[{"degree": "Master of Computer Science", "university": "University of Tokyo", "year": 2016, "gpa": "3.9"}]',
    '[{"company": "Cloud Solutions Inc", "position": "Senior Cloud Architect", "duration": "2020-2024", "description": "Designed and implemented cloud solutions for enterprise clients"}, {"company": "Tech Corp", "position": "Cloud Architect", "duration": "2016-2020", "description": "Led cloud migration projects and architecture design"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'Linkedin' LIMIT 1),
    'Professional Network',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Interview Scheduled' LIMIT 1),
    true,
    '2024-03-21'
),
-- Candidate 32: Machine Learning Engineer
(
    '660e8400-e29b-41d4-a716-446655440032',
    'Deepika Patel',
    'deepika.patel@email.com',
    '+66-92-345-6789',
    '550e8400-e29b-41d4-a716-446655440003',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.88,
    '2024-03-22',
    '{"skills": ["Python", "TensorFlow", "PyTorch", "Scikit-learn", "MLOps", "AWS SageMaker", "Data Pipeline"], "experience_years": 5, "education": "Master of Data Science", "languages": ["English", "Hindi", "Thai"], "certifications": ["AWS Machine Learning Specialty"]}',
    '{"expected_salary": "115,000 THB", "availability": "2 weeks notice", "preferred_location": "Bangkok", "remote_work": true}',
    '/uploads/resumes/deepika_patel_resume.pdf',
    '2024-03-22',
    NOW(),
    'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    'Experienced machine learning engineer with strong MLOps and cloud experience.',
    'Strong ML background with AWS certification and production experience.',
    '[{"degree": "Master of Data Science", "university": "Indian Institute of Science", "year": 2019, "gpa": "3.8"}]',
    '[{"company": "AI Solutions", "position": "Senior ML Engineer", "duration": "2021-2024", "description": "Built and deployed ML models in production environments"}, {"company": "Data Science Corp", "position": "ML Engineer", "duration": "2019-2021", "description": "Developed machine learning models and data pipelines"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'Referral' LIMIT 1),
    'Employee Referral',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Shortlisted' LIMIT 1),
    false,
    null
),
-- Candidate 33: Technical Writer
(
    '660e8400-e29b-41d4-a716-446655440033',
    'Sarah Mitchell',
    'sarah.mitchell@email.com',
    '+66-93-456-7890',
    '550e8400-e29b-41d4-a716-446655440001',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.73,
    '2024-03-24',
    '{"skills": ["Technical Writing", "API Documentation", "User Guides", "Markdown", "Git", "Confluence", "Jira"], "experience_years": 4, "education": "Bachelor of English Literature", "languages": ["English", "Thai"], "certifications": ["Certified Professional Technical Communicator"]}',
    '{"expected_salary": "55,000 THB", "availability": "3 weeks notice", "preferred_location": "Bangkok", "remote_work": true}',
    '/uploads/resumes/sarah_mitchell_resume.pdf',
    '2024-03-24',
    NOW(),
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    'Experienced technical writer with strong API documentation skills.',
    'Good technical writing background with API documentation experience.',
    '[{"degree": "Bachelor of English Literature", "university": "University of Cambridge", "year": 2020, "gpa": "3.7"}]',
    '[{"company": "Tech Documentation", "position": "Technical Writer", "duration": "2021-2024", "description": "Created API documentation and user guides"}, {"company": "Software Company", "position": "Junior Technical Writer", "duration": "2020-2021", "description": "Wrote technical documentation and help articles"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'JobsDB' LIMIT 1),
    'Job Portal',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Screening' LIMIT 1),
    false,
    null
),
-- Candidate 34: Business Intelligence Analyst
(
    '660e8400-e29b-41d4-a716-446655440034',
    'Mohammed Al-Zahra',
    'mohammed.alzahra@email.com',
    '+66-94-567-8901',
    '550e8400-e29b-41d4-a716-446655440010',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.82,
    '2024-03-26',
    '{"skills": ["SQL", "Power BI", "Tableau", "Python", "Data Visualization", "ETL", "Business Intelligence"], "experience_years": 5, "education": "Bachelor of Statistics", "languages": ["English", "Arabic", "Thai"], "certifications": ["Tableau Desktop Specialist", "Microsoft Power BI Data Analyst"]}',
    '{"expected_salary": "85,000 THB", "availability": "1 month notice", "preferred_location": "Bangkok", "remote_work": false}',
    '/uploads/resumes/mohammed_alzahra_resume.pdf',
    '2024-03-26',
    NOW(),
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    'Experienced BI analyst with strong data visualization and SQL skills.',
    'Strong BI background with Tableau and Power BI certifications.',
    '[{"degree": "Bachelor of Statistics", "university": "American University of Beirut", "year": 2019, "gpa": "3.6"}]',
    '[{"company": "BI Solutions", "position": "Senior BI Analyst", "duration": "2021-2024", "description": "Created dashboards and reports for business stakeholders"}, {"company": "Analytics Corp", "position": "BI Analyst", "duration": "2019-2021", "description": "Developed data models and visualizations"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'Linkedin' LIMIT 1),
    'Professional Network',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Interview Scheduled' LIMIT 1),
    false,
    null
),
-- Candidate 35: Scrum Master
(
    '660e8400-e29b-41d4-a716-446655440035',
    'Kamonwan Srisuwan',
    'kamonwan.srisuwan@email.com',
    '+66-95-678-9012',
    '550e8400-e29b-41d4-a716-446655440004',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.79,
    '2024-03-28',
    '{"skills": ["Scrum", "Agile", "Project Management", "Team Facilitation", "Jira", "Confluence", "Retrospectives", "SAFe", "Kanban", "Lean"], "experience_years": 6, "education": "Bachelor of Business Administration", "languages": ["English", "Thai", "Chinese"], "certifications": ["Certified ScrumMaster (CSM)", "Professional Scrum Master (PSM)", "SAFe Agilist"], "specializations": ["Agile Transformation", "Team Coaching", "Process Improvement"]}',
    '{"expected_salary": "90,000 THB", "availability": "2 weeks notice", "preferred_location": "Bangkok", "remote_work": false, "work_preferences": ["Agile transformation", "Team development", "Process improvement"]}',
    '/uploads/resumes/kamonwan_srisuwan_resume.pdf',
    '2024-03-28',
    NOW(),
    'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    'Experienced Scrum Master with strong agile facilitation skills and experience in digital transformation projects.',
    'Experienced Scrum Master with 6+ years of agile facilitation and team coaching experience. Certified ScrumMaster (CSM) and Professional Scrum Master (PSM) with additional SAFe Agilist certification. Previous experience at True Corporation demonstrates expertise in large-scale digital transformation projects, achieving 40% improvement in delivery velocity and 30% reduction in time-to-market. Experience at AIS shows ability to coordinate agile teams across multiple countries and complex mobile app development projects. Strong background in agile methodologies (Scrum, Kanban, SAFe) and process improvement techniques. Proven track record of coaching development teams, facilitating retrospectives, and implementing agile best practices. Multilingual capabilities (English, Thai, Chinese) valuable for our international team coordination. Ready to lead our agile transformation initiatives and improve team productivity.',
    '[{"degree": "Bachelor of Business Administration", "university": "Thammasat University", "year": 2018, "gpa": "3.5", "specialization": "Management Information Systems"}, {"degree": "Certificate in Agile Project Management", "university": "Scrum Alliance", "year": 2020, "gpa": "4.0"}]',
    '[{"company": "True Corporation", "position": "Senior Scrum Master", "duration": "2020-2024", "description": "Facilitated agile teams for digital transformation projects, improved delivery velocity by 40% and reduced time-to-market by 30%"}, {"company": "AIS", "position": "Scrum Master", "duration": "2018-2020", "description": "Led scrum ceremonies and coached development teams for mobile app development"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'Referral' LIMIT 1),
    'Employee Referral',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Shortlisted' LIMIT 1),
    true,
    '2024-03-29'
);

-- ==============================================
-- GENERATE ADDITIONAL CANDIDATES (36-487)
-- ==============================================

-- Generate remaining candidates using a more efficient approach
-- This creates candidates with varied backgrounds, skills, and experience levels

-- Create a temporary table to store candidate data for bulk insertion
CREATE TEMP TABLE temp_candidates (
    id TEXT,
    name TEXT,
    email TEXT,
    phone TEXT,
    position_id TEXT,
    fit_score DECIMAL,
    application_date DATE,
    skills JSONB,
    custom_attributes JSONB,
    avatar_url TEXT,
    data_ai_hint TEXT,
    assignment_justification TEXT,
    education_data JSONB,
    experience_data JSONB,
    source_id TEXT,
    sub_source TEXT,
    status_id TEXT,
    is_pinned BOOLEAN,
    pinned_at TIMESTAMP
);

-- Insert bulk candidate data
INSERT INTO temp_candidates VALUES
-- Candidates 36-50: Software Engineers and Developers
('660e8400-e29b-41d4-a716-446655440036', 'James Wilson', 'james.wilson2@email.com', '+66-96-789-0123', '550e8400-e29b-41d4-a716-446655440001', 0.75, '2024-03-30', '{"skills": ["Java", "Spring", "MySQL", "Git"], "experience_years": 3, "education": "Bachelor of Computer Science", "languages": ["English", "Thai"], "certifications": []}', '{"expected_salary": "70,000 THB", "availability": "2 weeks notice", "preferred_location": "Bangkok", "remote_work": false}', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', 'Java developer with Spring framework experience.', 'Good Java background with Spring experience.', '[{"degree": "Bachelor of Computer Science", "university": "Chulalongkorn University", "year": 2021, "gpa": "3.4"}]', '[{"company": "Software Company", "position": "Java Developer", "duration": "2021-2024", "description": "Developed Java applications using Spring framework"}]', (SELECT id FROM "CandidateSource" WHERE name = 'JobsDB' LIMIT 1), 'Job Portal', (SELECT id FROM "RecruitmentStage" WHERE name = 'Applied' LIMIT 1), false, null),
('660e8400-e29b-41d4-a716-446655440037', 'Maria Garcia', 'maria.garcia2@email.com', '+66-97-890-1234', '550e8400-e29b-41d4-a716-446655440002', 0.78, '2024-04-01', '{"skills": ["React", "JavaScript", "CSS", "HTML"], "experience_years": 2, "education": "Bachelor of Information Technology", "languages": ["English", "Spanish", "Thai"], "certifications": []}', '{"expected_salary": "60,000 THB", "availability": "1 month notice", "preferred_location": "Bangkok", "remote_work": false}', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face', 'Frontend developer with React experience.', 'Good React skills with modern frontend development.', '[{"degree": "Bachelor of Information Technology", "university": "KMITL", "year": 2022, "gpa": "3.5"}]', '[{"company": "Web Agency", "position": "Frontend Developer", "duration": "2022-2024", "description": "Developed React applications and user interfaces"}]', (SELECT id FROM "CandidateSource" WHERE name = 'Linkedin' LIMIT 1), 'Professional Network', (SELECT id FROM "RecruitmentStage" WHERE name = 'Screening' LIMIT 1), false, null),
('660e8400-e29b-41d4-a716-446655440038', 'David Kim', 'david.kim2@email.com', '+66-98-901-2345', '550e8400-e29b-41d4-a716-446655440003', 0.85, '2024-04-02', '{"skills": ["Python", "Machine Learning", "Pandas", "NumPy"], "experience_years": 4, "education": "Master of Data Science", "languages": ["English", "Korean", "Thai"], "certifications": []}', '{"expected_salary": "90,000 THB", "availability": "3 weeks notice", "preferred_location": "Bangkok", "remote_work": true}', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', 'Data scientist with Python and ML experience.', 'Strong data science background with Python skills.', '[{"degree": "Master of Data Science", "university": "KAIST", "year": 2020, "gpa": "3.7"}]', '[{"company": "Data Analytics", "position": "Data Scientist", "duration": "2020-2024", "description": "Built machine learning models and data pipelines"}]', (SELECT id FROM "CandidateSource" WHERE name = 'Referral' LIMIT 1), 'Employee Referral', (SELECT id FROM "RecruitmentStage" WHERE name = 'Shortlisted' LIMIT 1), true, '2024-04-03'),
('660e8400-e29b-41d4-a716-446655440039', 'Lisa Chen', 'lisa.chen2@email.com', '+66-99-012-3456', '550e8400-e29b-41d4-a716-446655440004', 0.72, '2024-04-04', '{"skills": ["Product Management", "Analytics", "User Research", "Agile"], "experience_years": 3, "education": "Bachelor of Business Administration", "languages": ["English", "Chinese", "Thai"], "certifications": []}', '{"expected_salary": "80,000 THB", "availability": "2 weeks notice", "preferred_location": "Bangkok", "remote_work": false}', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', 'Product manager with analytics and user research skills.', 'Good product management background with analytics experience.', '[{"degree": "Bachelor of Business Administration", "university": "National Taiwan University", "year": 2021, "gpa": "3.6"}]', '[{"company": "Product Company", "position": "Product Manager", "duration": "2021-2024", "description": "Managed product roadmap and user research"}]', (SELECT id FROM "CandidateSource" WHERE name = 'JobThai' LIMIT 1), 'Job Portal', (SELECT id FROM "RecruitmentStage" WHERE name = 'Applied' LIMIT 1), false, null),
('660e8400-e29b-41d4-a716-446655440040', 'Alex Johnson', 'alex.johnson2@email.com', '+66-90-123-4567', '550e8400-e29b-41d4-a716-446655440005', 0.76, '2024-04-05', '{"skills": ["UI Design", "Figma", "Adobe Creative Suite", "Prototyping"], "experience_years": 3, "education": "Bachelor of Design", "languages": ["English", "Thai"], "certifications": []}', '{"expected_salary": "65,000 THB", "availability": "1 month notice", "preferred_location": "Bangkok", "remote_work": false}', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', 'UI designer with Figma and prototyping skills.', 'Good UI design background with modern tools.', '[{"degree": "Bachelor of Design", "university": "Silpakorn University", "year": 2021, "gpa": "3.5"}]', '[{"company": "Design Studio", "position": "UI Designer", "duration": "2021-2024", "description": "Designed user interfaces and created prototypes"}]', (SELECT id FROM "CandidateSource" WHERE name = 'Facebook' LIMIT 1), 'Social Media', (SELECT id FROM "RecruitmentStage" WHERE name = 'Screening' LIMIT 1), false, null);

-- Insert candidates from temp table into main Candidate table
INSERT INTO "Candidate" (
    id, name, email, phone, "positionId", "recruiterId", "fitScore", "applicationDate",
    "parsedData", "customAttributes", "resumePath", "createdAt", "updatedAt", "avatarUrl",
    "dataAiHint", "assignmentJustification", "educationData", "experienceData", "companyId",
    "sourceId", "subSource", "statusId", "isPinned", "pinnedAt"
)
SELECT 
    tc.id, tc.name, tc.email, tc.phone, tc.position_id, 
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    tc.fit_score, tc.application_date, tc.skills, tc.custom_attributes,
    '/uploads/resumes/' || LOWER(REPLACE(tc.name, ' ', '_')) || '_resume.pdf',
    tc.application_date, NOW(), tc.avatar_url, tc.data_ai_hint, tc.assignment_justification,
    tc.education_data, tc.experience_data, null, tc.source_id, tc.sub_source, tc.status_id,
    tc.is_pinned, tc.pinned_at
FROM temp_candidates tc;

-- Drop the temporary table
DROP TABLE temp_candidates;

-- Generate additional candidates using a loop approach
-- This creates candidates 41-487 with varied data
DO $$
DECLARE
    i INTEGER;
    candidate_id TEXT;
    candidate_name TEXT;
    candidate_email TEXT;
    phone_num TEXT;
    position_ids TEXT[] := ARRAY[
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002', 
        '550e8400-e29b-41d4-a716-446655440003',
        '550e8400-e29b-41d4-a716-446655440004',
        '550e8400-e29b-41d4-a716-446655440005',
        '550e8400-e29b-41d4-a716-446655440006',
        '550e8400-e29b-41d4-a716-446655440007',
        '550e8400-e29b-41d4-a716-446655440008',
        '550e8400-e29b-41d4-a716-446655440009',
        '550e8400-e29b-41d4-a716-446655440010',
        '550e8400-e29b-41d4-a716-446655440011',
        '550e8400-e29b-41d4-a716-446655440012'
    ];
    source_ids TEXT[] := ARRAY[
        (SELECT id FROM "CandidateSource" WHERE name = 'Linkedin' LIMIT 1),
        (SELECT id FROM "CandidateSource" WHERE name = 'JobsDB' LIMIT 1),
        (SELECT id FROM "CandidateSource" WHERE name = 'Referral' LIMIT 1),
        (SELECT id FROM "CandidateSource" WHERE name = 'JobThai' LIMIT 1),
        (SELECT id FROM "CandidateSource" WHERE name = 'Facebook' LIMIT 1),
        (SELECT id FROM "CandidateSource" WHERE name = 'University' LIMIT 1)
    ];
    status_ids TEXT[] := ARRAY[
        (SELECT id FROM "RecruitmentStage" WHERE name = 'Applied' LIMIT 1),
        (SELECT id FROM "RecruitmentStage" WHERE name = 'Screening' LIMIT 1),
        (SELECT id FROM "RecruitmentStage" WHERE name = 'Shortlisted' LIMIT 1),
        (SELECT id FROM "RecruitmentStage" WHERE name = 'Interview Scheduled' LIMIT 1)
    ];
    first_names TEXT[] := ARRAY['Somchai', 'Siriporn', 'Pichai', 'Niran', 'Supaporn', 'Anchalee', 'Prasert', 'Wanida', 'Somsak', 'Ratchanee', 'Chaiwat', 'Sirirat', 'Prapas', 'Kamonwan', 'Suthep', 'Pornthip', 'Wichai', 'Sirilak', 'Prasong', 'Kannika', 'Somkid', 'Siriphan', 'Prasit', 'Kamonrat', 'Suthat', 'Pornpimol', 'Wichit', 'Sirin', 'Prasert', 'Kannikar', 'Somchit', 'Siriporn', 'Prasong', 'Kamonwan', 'Suthat', 'Pornthip', 'Wichai', 'Sirilak', 'Prasert', 'Kannika', 'Somkid', 'Siriphan', 'Prasit', 'Kamonrat', 'Suthat', 'Pornpimol', 'Wichit', 'Sirin', 'Prasert', 'Kannikar'];
    last_names TEXT[] := ARRAY['Rattanakul', 'Chaiyaporn', 'Wongsuwan', 'Srisawat', 'Thongchai', 'Srisuwan', 'Prasertkul', 'Chaiyaporn', 'Rattanakul', 'Srisawat', 'Wongsuwan', 'Chaiyaporn', 'Rattanakul', 'Srisawat', 'Wongsuwan', 'Chaiyaporn', 'Rattanakul', 'Srisawat', 'Wongsuwan', 'Chaiyaporn', 'Rattanakul', 'Srisawat', 'Wongsuwan', 'Chaiyaporn', 'Rattanakul', 'Srisawat', 'Wongsuwan', 'Chaiyaporn', 'Rattanakul', 'Srisawat', 'Wongsuwan', 'Chaiyaporn', 'Rattanakul', 'Srisawat', 'Wongsuwan', 'Chaiyaporn', 'Rattanakul', 'Srisawat', 'Wongsuwan', 'Chaiyaporn', 'Rattanakul', 'Srisawat', 'Wongsuwan', 'Chaiyaporn', 'Rattanakul', 'Srisawat', 'Wongsuwan', 'Chaiyaporn', 'Rattanakul', 'Srisawat'];
BEGIN
    FOR i IN 41..487 LOOP
        candidate_id := '660e8400-e29b-41d4-a716-44665544' || LPAD(i::TEXT, 4, '0');
        candidate_name := first_names[1 + (i % array_length(first_names, 1))] || ' ' || last_names[1 + (i % array_length(last_names, 1))];
        candidate_email := LOWER(REPLACE(candidate_name, ' ', '.')) || i::TEXT || '@email.com';
        phone_num := '+66-' || LPAD((80 + (i % 20))::TEXT, 2, '0') || '-' || LPAD((100 + (i % 900))::TEXT, 3, '0') || '-' || LPAD((1000 + (i % 9000))::TEXT, 4, '0');
        
        INSERT INTO "Candidate" (
            id, name, email, phone, "positionId", "recruiterId", "fitScore", "applicationDate",
            "parsedData", "customAttributes", "resumePath", "createdAt", "updatedAt", "avatarUrl",
            "dataAiHint", "assignmentJustification", "educationData", "experienceData", "companyId",
            "sourceId", "subSource", "statusId", "isPinned", "pinnedAt"
        ) VALUES (
            candidate_id,
            candidate_name,
            candidate_email,
            phone_num,
            position_ids[1 + (i % array_length(position_ids, 1))],
            (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
            0.60 + (i % 35) * 0.01, -- Fit score between 0.60 and 0.94
            '2024-01-01'::DATE + (i % 120) * INTERVAL '1 day', -- Application dates over 4 months
            '{"skills": ["JavaScript", "Python", "React", "Node.js", "SQL", "Git", "Docker", "AWS"], "experience_years": ' || (2 + (i % 8)) || ', "education": "Bachelor Degree", "languages": ["English", "Thai", "Chinese"], "certifications": ["AWS Certified", "Google Cloud"], "specializations": ["Full-stack Development", "Cloud Computing", "Mobile Development"]}',
            '{"expected_salary": "' || (60000 + (i % 120000)) || ' THB", "availability": "2 weeks notice", "preferred_location": "Bangkok", "remote_work": ' || (i % 2 = 0) || ', "work_preferences": ["Learning opportunities", "Tech innovation", "Team collaboration"]}',
            '/uploads/resumes/' || LOWER(REPLACE(candidate_name, ' ', '_')) || '_resume.pdf',
            '2024-01-01'::DATE + (i % 120) * INTERVAL '1 day',
            NOW(),
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
            'Experienced software engineer with strong technical skills and experience in Thai fintech and e-commerce companies.',
            'Strong candidate with relevant experience in Thai banking and travel technology sectors. Demonstrated technical proficiency in modern development stack including JavaScript, Python, React, Node.js, and cloud technologies. Previous experience at major Thai companies (Kasikorn Bank, Agoda) shows ability to handle high-volume, mission-critical applications. Local market understanding and Thai language skills provide valuable cultural context for product development. Proven track record of system performance improvements and scalable application development. Ready to contribute immediately to our development team with minimal onboarding time.',
            '[{"degree": "Bachelor of Computer Science", "university": "Chulalongkorn University", "year": ' || (2015 + (i % 10)) || ', "gpa": "3.' || (0 + (i % 10)) || '", "honors": "Dean List"}]',
            '[{"company": "Kasikorn Bank", "position": "Software Engineer", "duration": "2020-2024", "description": "Developed banking applications and improved system performance by 30%"}, {"company": "Agoda", "position": "Junior Developer", "duration": "2018-2020", "description": "Built web applications for travel booking platform"}]',
            null,
            source_ids[1 + (i % array_length(source_ids, 1))],
            'Generated Source',
            status_ids[1 + (i % array_length(status_ids, 1))],
            (i % 10 = 0), -- Pin every 10th candidate
            CASE WHEN (i % 10 = 0) THEN NOW() ELSE null END
        );
    END LOOP;
END $$;

-- ==============================================
-- CREATE EXAMPLE UPLOAD QUEUE ITEMS
-- ==============================================

-- Insert example upload queue items
INSERT INTO "upload_queue" (
    id,
    "file_name",
    "file_size",
    status,
    error,
    "error_details",
    source,
    "source_id",
    "sub_source",
    "upload_date",
    "completed_date",
    "upload_id",
    "created_by",
    "updated_at",
    "file_path",
    "webhook_payload",
    "position_id",
    "process_date"
) VALUES 
-- Successful uploads
(
    '770e8400-e29b-41d4-a716-446655440001',
    'john_doe_resume.pdf',
    2048576,
    'completed',
    null,
    null,
    'manual',
    (SELECT id FROM "CandidateSource" WHERE name = 'Linkedin' LIMIT 1),
    'Direct Upload',
    '2024-01-15 10:30:00',
    '2024-01-15 10:32:15',
    'upload_12345',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-15 10:32:15',
    '/uploads/queue/john_doe_resume.pdf',
    '{"candidate_name": "John Doe", "email": "john.doe@email.com", "position": "Software Engineer"}',
    '550e8400-e29b-41d4-a716-446655440001',
    '2024-01-15 10:32:00'
),
(
    '770e8400-e29b-41d4-a716-446655440002',
    'jane_smith_cv.pdf',
    1536000,
    'completed',
    null,
    null,
    'webhook',
    (SELECT id FROM "CandidateSource" WHERE name = 'JobsDB' LIMIT 1),
    'Job Portal API',
    '2024-01-16 14:20:00',
    '2024-01-16 14:22:30',
    'upload_12346',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-16 14:22:30',
    '/uploads/queue/jane_smith_cv.pdf',
    '{"candidate_name": "Jane Smith", "email": "jane.smith@email.com", "position": "Frontend Developer", "source": "JobsDB"}',
    '550e8400-e29b-41d4-a716-446655440002',
    '2024-01-16 14:22:00'
),
-- Processing uploads
(
    '770e8400-e29b-41d4-a716-446655440003',
    'mike_johnson_resume.pdf',
    1873408,
    'processing',
    null,
    null,
    'manual',
    (SELECT id FROM "CandidateSource" WHERE name = 'Referral' LIMIT 1),
    'Employee Referral',
    '2024-01-17 09:15:00',
    null,
    'upload_12347',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-17 09:15:00',
    '/uploads/queue/mike_johnson_resume.pdf',
    '{"candidate_name": "Mike Johnson", "email": "mike.johnson@email.com", "position": "Data Scientist"}',
    '550e8400-e29b-41d4-a716-446655440003',
    '2024-01-17 09:15:00'
),
-- Pending uploads
(
    '770e8400-e29b-41d4-a716-446655440004',
    'sarah_williams_cv.pdf',
    1234567,
    'pending',
    null,
    null,
    'webhook',
    (SELECT id FROM "CandidateSource" WHERE name = 'JobThai' LIMIT 1),
    'Job Portal',
    '2024-01-18 16:45:00',
    null,
    'upload_12348',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-18 16:45:00',
    '/uploads/queue/sarah_williams_cv.pdf',
    '{"candidate_name": "Sarah Williams", "email": "sarah.williams@email.com", "position": "Product Manager"}',
    '550e8400-e29b-41d4-a716-446655440004',
    null
),
-- Failed uploads
(
    '770e8400-e29b-41d4-a716-446655440005',
    'corrupted_file.pdf',
    512000,
    'failed',
    'File parsing error',
    'Unable to extract text from PDF. File appears to be corrupted or password protected.',
    'manual',
    (SELECT id FROM "CandidateSource" WHERE name = 'Linkedin' LIMIT 1),
    'Direct Upload',
    '2024-01-19 11:20:00',
    null,
    'upload_12349',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-19 11:25:00',
    '/uploads/queue/corrupted_file.pdf',
    '{"candidate_name": "Unknown", "email": "unknown@email.com", "position": "UX Designer"}',
    '550e8400-e29b-41d4-a716-446655440005',
    '2024-01-19 11:25:00'
),
(
    '770e8400-e29b-41d4-a716-446655440006',
    'invalid_format.docx',
    1024000,
    'failed',
    'Unsupported file format',
    'File format .docx is not supported. Please upload PDF files only.',
    'webhook',
    (SELECT id FROM "CandidateSource" WHERE name = 'Facebook' LIMIT 1),
    'Social Media',
    '2024-01-20 13:30:00',
    null,
    'upload_12350',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-20 13:35:00',
    '/uploads/queue/invalid_format.docx',
    '{"candidate_name": "Alex Brown", "email": "alex.brown@email.com", "position": "Software Engineer"}',
    '550e8400-e29b-41d4-a716-446655440001',
    '2024-01-20 13:35:00'
),
-- Large file upload
(
    '770e8400-e29b-41d4-a716-446655440007',
    'comprehensive_portfolio.pdf',
    10485760,
    'completed',
    null,
    null,
    'manual',
    (SELECT id FROM "CandidateSource" WHERE name = 'University' LIMIT 1),
    'University Partnership',
    '2024-01-21 08:00:00',
    '2024-01-21 08:05:45',
    'upload_12351',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-21 08:05:45',
    '/uploads/queue/comprehensive_portfolio.pdf',
    '{"candidate_name": "Emma Davis", "email": "emma.davis@email.com", "position": "UX Designer", "university": "Chulalongkorn University"}',
    '550e8400-e29b-41d4-a716-446655440005',
    '2024-01-21 08:05:00'
),
-- Bulk upload
(
    '770e8400-e29b-41d4-a716-446655440008',
    'bulk_candidates_2024_01.zip',
    5242880,
    'processing',
    null,
    null,
    'bulk',
    (SELECT id FROM "CandidateSource" WHERE name = 'JobExpo' LIMIT 1),
    'Job Fair',
    '2024-01-22 15:00:00',
    null,
    'upload_12352',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-22 15:00:00',
    '/uploads/queue/bulk_candidates_2024_01.zip',
    '{"event": "Tech Job Fair 2024", "location": "Bangkok", "date": "2024-01-20", "total_files": 25}',
    null,
    '2024-01-22 15:00:00'
),
-- Additional upload queue items for more variety
-- Recent successful uploads
(
    '770e8400-e29b-41d4-a716-446655440009',
    'alex_kumar_devops_resume.pdf',
    1892345,
    'completed',
    null,
    null,
    'manual',
    (SELECT id FROM "CandidateSource" WHERE name = 'Linkedin' LIMIT 1),
    'Direct Upload',
    '2024-02-01 14:30:00',
    '2024-02-01 14:32:45',
    'upload_12353',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-01 14:32:45',
    '/uploads/queue/alex_kumar_devops_resume.pdf',
    '{"candidate_name": "Alex Kumar", "email": "alex.kumar@email.com", "position": "DevOps Engineer"}',
    '550e8400-e29b-41d4-a716-446655440006',
    '2024-02-01 14:32:00'
),
(
    '770e8400-e29b-41d4-a716-446655440010',
    'maria_rodriguez_marketing_cv.pdf',
    1654321,
    'completed',
    null,
    null,
    'webhook',
    (SELECT id FROM "CandidateSource" WHERE name = 'JobsDB' LIMIT 1),
    'Job Portal API',
    '2024-02-03 10:15:00',
    '2024-02-03 10:17:30',
    'upload_12354',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-03 10:17:30',
    '/uploads/queue/maria_rodriguez_marketing_cv.pdf',
    '{"candidate_name": "Maria Rodriguez", "email": "maria.rodriguez@email.com", "position": "Marketing Manager", "source": "JobsDB"}',
    '550e8400-e29b-41d4-a716-446655440007',
    '2024-02-03 10:17:00'
),
-- Processing uploads
(
    '770e8400-e29b-41d4-a716-446655440011',
    'james_wilson_sales_resume.pdf',
    1456789,
    'processing',
    null,
    null,
    'manual',
    (SELECT id FROM "CandidateSource" WHERE name = 'Referral' LIMIT 1),
    'Employee Referral',
    '2024-02-05 16:20:00',
    null,
    'upload_12355',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-05 16:20:00',
    '/uploads/queue/james_wilson_sales_resume.pdf',
    '{"candidate_name": "James Wilson", "email": "james.wilson@email.com", "position": "Sales Representative"}',
    '550e8400-e29b-41d4-a716-446655440008',
    '2024-02-05 16:20:00'
),
(
    '770e8400-e29b-41d4-a716-446655440012',
    'sophie_taylor_hr_cv.pdf',
    1234567,
    'processing',
    null,
    null,
    'webhook',
    (SELECT id FROM "CandidateSource" WHERE name = 'JobThai' LIMIT 1),
    'Job Portal',
    '2024-02-07 11:45:00',
    null,
    'upload_12356',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-07 11:45:00',
    '/uploads/queue/sophie_taylor_hr_cv.pdf',
    '{"candidate_name": "Sophie Taylor", "email": "sophie.taylor@email.com", "position": "HR Specialist"}',
    '550e8400-e29b-41d4-a716-446655440009',
    '2024-02-07 11:45:00'
),
-- Pending uploads
(
    '770e8400-e29b-41d4-a716-446655440013',
    'robert_kim_finance_resume.pdf',
    1876543,
    'pending',
    null,
    null,
    'manual',
    (SELECT id FROM "CandidateSource" WHERE name = 'Linkedin' LIMIT 1),
    'Professional Network',
    '2024-02-09 09:30:00',
    null,
    'upload_12357',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-09 09:30:00',
    '/uploads/queue/robert_kim_finance_resume.pdf',
    '{"candidate_name": "Robert Kim", "email": "robert.kim@email.com", "position": "Financial Analyst"}',
    '550e8400-e29b-41d4-a716-446655440010',
    null
),
(
    '770e8400-e29b-41d4-a716-446655440014',
    'anna_petrov_qa_cv.pdf',
    1567890,
    'pending',
    null,
    null,
    'webhook',
    (SELECT id FROM "CandidateSource" WHERE name = 'Facebook' LIMIT 1),
    'Social Media',
    '2024-02-11 13:15:00',
    null,
    'upload_12358',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-11 13:15:00',
    '/uploads/queue/anna_petrov_qa_cv.pdf',
    '{"candidate_name": "Anna Petrov", "email": "anna.petrov@email.com", "position": "QA Engineer"}',
    '550e8400-e29b-41d4-a716-446655440011',
    null
),
-- Failed uploads with different error types
(
    '770e8400-e29b-41d4-a716-446655440015',
    'huge_portfolio.pdf',
    52428800,
    'failed',
    'File too large',
    'File size exceeds maximum allowed limit of 10MB. Please compress the file or split it into smaller parts.',
    'manual',
    (SELECT id FROM "CandidateSource" WHERE name = 'University' LIMIT 1),
    'University Partnership',
    '2024-02-13 15:45:00',
    null,
    'upload_12359',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-13 15:50:00',
    '/uploads/queue/huge_portfolio.pdf',
    '{"candidate_name": "Kevin Lee", "email": "kevin.lee@email.com", "position": "Customer Success Manager"}',
    '550e8400-e29b-41d4-a716-446655440012',
    '2024-02-13 15:50:00'
),
(
    '770e8400-e29b-41d4-a716-446655440016',
    'empty_file.pdf',
    0,
    'failed',
    'Empty file',
    'Uploaded file is empty or contains no readable content. Please check the file and try again.',
    'webhook',
    (SELECT id FROM "CandidateSource" WHERE name = 'JobsDB' LIMIT 1),
    'Job Portal API',
    '2024-02-15 12:00:00',
    null,
    'upload_12360',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-15 12:05:00',
    '/uploads/queue/empty_file.pdf',
    '{"candidate_name": "Unknown", "email": "unknown@email.com", "position": "Software Engineer"}',
    '550e8400-e29b-41d4-a716-446655440001',
    '2024-02-15 12:05:00'
),
-- Recent bulk uploads
(
    '770e8400-e29b-41d4-a716-446655440017',
    'february_candidates_2024.zip',
    8388608,
    'processing',
    null,
    null,
    'bulk',
    (SELECT id FROM "CandidateSource" WHERE name = 'JobExpo' LIMIT 1),
    'Career Fair',
    '2024-02-17 14:00:00',
    null,
    'upload_12361',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-17 14:00:00',
    '/uploads/queue/february_candidates_2024.zip',
    '{"event": "Tech Career Fair 2024", "location": "Bangkok", "date": "2024-02-15", "total_files": 30}',
    null,
    '2024-02-17 14:00:00'
),
-- Duplicate detection
(
    '770e8400-e29b-41d4-a716-446655440018',
    'john_smith_resume_duplicate.pdf',
    2048576,
    'failed',
    'Duplicate candidate detected',
    'A candidate with the same email address (john.smith@email.com) already exists in the system.',
    'manual',
    (SELECT id FROM "CandidateSource" WHERE name = 'Linkedin' LIMIT 1),
    'Direct Upload',
    '2024-02-19 10:30:00',
    null,
    'upload_12362',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-19 10:32:00',
    '/uploads/queue/john_smith_resume_duplicate.pdf',
    '{"candidate_name": "John Smith", "email": "john.smith@email.com", "position": "Software Engineer"}',
    '550e8400-e29b-41d4-a716-446655440001',
    '2024-02-19 10:32:00'
);

-- ==============================================
-- CREATE EXAMPLE TRANSITION RECORDS
-- ==============================================

-- Insert example transition records to show candidate progression
INSERT INTO "TransitionRecord" (
    id,
    "candidateId",
    "positionId",
    date,
    stage,
    notes,
    "actingUserId",
    "createdAt",
    "updatedAt"
) VALUES 
-- John Smith's progression
(
    '880e8400-e29b-41d4-a716-446655440001',
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    '2024-01-15',
    'Applied',
    'Initial application received',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-15',
    '2024-01-15'
),
(
    '880e8400-e29b-41d4-a716-446655440002',
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    '2024-01-16',
    'Screening',
    'Resume review completed - strong technical background',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-16',
    '2024-01-16'
),
(
    '880e8400-e29b-41d4-a716-446655440003',
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    '2024-01-18',
    'Shortlisted',
    'Technical skills match requirements well',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-18',
    '2024-01-18'
),
(
    '880e8400-e29b-41d4-a716-446655440004',
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    '2024-01-20',
    'Interview Scheduled',
    'Technical interview scheduled for Jan 25',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-20',
    '2024-01-20'
),
-- Sarah Johnson's progression
(
    '880e8400-e29b-41d4-a716-446655440005',
    '660e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440002',
    '2024-01-20',
    'Applied',
    'Application received via JobsDB',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-20',
    '2024-01-20'
),
(
    '880e8400-e29b-41d4-a716-446655440006',
    '660e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440002',
    '2024-01-22',
    'Screening',
    'Frontend skills look good, portfolio reviewed',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-22',
    '2024-01-22'
),
(
    '880e8400-e29b-41d4-a716-446655440007',
    '660e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440002',
    '2024-01-25',
    'Shortlisted',
    'Strong React and TypeScript experience, pinned for priority review',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-25',
    '2024-01-25'
),
-- Michael Chen's progression
(
    '880e8400-e29b-41d4-a716-446655440008',
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440003',
    '2024-01-18',
    'Applied',
    'Application via employee referral',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-18',
    '2024-01-18'
),
(
    '880e8400-e29b-41d4-a716-446655440009',
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440003',
    '2024-01-19',
    'Screening',
    'Excellent qualifications - Master degree and Google Cloud certification',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-19',
    '2024-01-19'
),
(
    '880e8400-e29b-41d4-a716-446655440010',
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440003',
    '2024-01-22',
    'Shortlisted',
    'Top candidate - advanced degree and relevant experience',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-22',
    '2024-01-22'
),
(
    '880e8400-e29b-41d4-a716-446655440011',
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440003',
    '2024-01-24',
    'Interview Scheduled',
    'Technical interview scheduled for Jan 26',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-24',
    '2024-01-24'
),
(
    '880e8400-e29b-41d4-a716-446655440012',
    '660e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440003',
    '2024-01-26',
    'Interviewing',
    'Technical interview completed - excellent performance',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-26',
    '2024-01-26'
),
-- Additional transition records for new candidates
-- Alex Kumar's progression (DevOps Engineer)
(
    '880e8400-e29b-41d4-a716-446655440013',
    '660e8400-e29b-41d4-a716-446655440007',
    '550e8400-e29b-41d4-a716-446655440006',
    '2024-02-01',
    'Applied',
    'Application received via LinkedIn',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-01',
    '2024-02-01'
),
(
    '880e8400-e29b-41d4-a716-446655440014',
    '660e8400-e29b-41d4-a716-446655440007',
    '550e8400-e29b-41d4-a716-446655440006',
    '2024-02-02',
    'Screening',
    'Strong DevOps background with AWS certification',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-02',
    '2024-02-02'
),
-- Maria Rodriguez's progression (Marketing Manager)
(
    '880e8400-e29b-41d4-a716-446655440015',
    '660e8400-e29b-41d4-a716-446655440008',
    '550e8400-e29b-41d4-a716-446655440007',
    '2024-02-03',
    'Applied',
    'Application via JobsDB portal',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-03',
    '2024-02-03'
),
(
    '880e8400-e29b-41d4-a716-446655440016',
    '660e8400-e29b-41d4-a716-446655440008',
    '550e8400-e29b-41d4-a716-446655440007',
    '2024-02-04',
    'Screening',
    'Excellent marketing background with digital expertise',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-04',
    '2024-02-04'
),
(
    '880e8400-e29b-41d4-a716-446655440017',
    '660e8400-e29b-41d4-a716-446655440008',
    '550e8400-e29b-41d4-a716-446655440007',
    '2024-02-05',
    'Shortlisted',
    'Strong portfolio and analytics skills - pinned for priority review',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-05',
    '2024-02-05'
),
-- James Wilson's progression (Sales Representative)
(
    '880e8400-e29b-41d4-a716-446655440018',
    '660e8400-e29b-41d4-a716-446655440009',
    '550e8400-e29b-41d4-a716-446655440008',
    '2024-02-05',
    'Applied',
    'Application via employee referral',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-05',
    '2024-02-05'
),
-- Sophie Taylor's progression (HR Specialist)
(
    '880e8400-e29b-41d4-a716-446655440019',
    '660e8400-e29b-41d4-a716-446655440010',
    '550e8400-e29b-41d4-a716-446655440009',
    '2024-02-07',
    'Applied',
    'Application via JobThai portal',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-07',
    '2024-02-07'
),
(
    '880e8400-e29b-41d4-a716-446655440020',
    '660e8400-e29b-41d4-a716-446655440010',
    '550e8400-e29b-41d4-a716-446655440009',
    '2024-02-08',
    'Screening',
    'Good HR background with PHR certification',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-08',
    '2024-02-08'
),
-- Robert Kim's progression (Financial Analyst)
(
    '880e8400-e29b-41d4-a716-446655440021',
    '660e8400-e29b-41d4-a716-446655440011',
    '550e8400-e29b-41d4-a716-446655440010',
    '2024-02-09',
    'Applied',
    'Application via LinkedIn professional network',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-09',
    '2024-02-09'
),
(
    '880e8400-e29b-41d4-a716-446655440022',
    '660e8400-e29b-41d4-a716-446655440011',
    '550e8400-e29b-41d4-a716-446655440010',
    '2024-02-10',
    'Screening',
    'Excellent financial background with CFA certification - pinned for priority review',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-10',
    '2024-02-10'
),
(
    '880e8400-e29b-41d4-a716-446655440023',
    '660e8400-e29b-41d4-a716-446655440011',
    '550e8400-e29b-41d4-a716-446655440010',
    '2024-02-12',
    'Shortlisted',
    'Strong analytical skills and SAP experience',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-12',
    '2024-02-12'
),
(
    '880e8400-e29b-41d4-a716-446655440024',
    '660e8400-e29b-41d4-a716-446655440011',
    '550e8400-e29b-41d4-a716-446655440010',
    '2024-02-14',
    'Interview Scheduled',
    'Technical interview scheduled for Feb 16',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-14',
    '2024-02-14'
),
-- Anna Petrov's progression (QA Engineer)
(
    '880e8400-e29b-41d4-a716-446655440025',
    '660e8400-e29b-41d4-a716-446655440012',
    '550e8400-e29b-41d4-a716-446655440011',
    '2024-02-11',
    'Applied',
    'Application via Facebook social media',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-11',
    '2024-02-11'
),
-- Kevin Lee's progression (Customer Success Manager)
(
    '880e8400-e29b-41d4-a716-446655440026',
    '660e8400-e29b-41d4-a716-446655440013',
    '550e8400-e29b-41d4-a716-446655440012',
    '2024-02-13',
    'Applied',
    'Application via employee referral',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-13',
    '2024-02-13'
),
(
    '880e8400-e29b-41d4-a716-446655440027',
    '660e8400-e29b-41d4-a716-446655440013',
    '550e8400-e29b-41d4-a716-446655440012',
    '2024-02-14',
    'Screening',
    'Strong customer success background with upselling experience',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-14',
    '2024-02-14'
),
(
    '880e8400-e29b-41d4-a716-446655440028',
    '660e8400-e29b-41d4-a716-446655440013',
    '550e8400-e29b-41d4-a716-446655440012',
    '2024-02-16',
    'Shortlisted',
    'Excellent account management track record',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-16',
    '2024-02-16'
),
-- Raj Patel's progression (Software Engineer)
(
    '880e8400-e29b-41d4-a716-446655440029',
    '660e8400-e29b-41d4-a716-446655440014',
    '550e8400-e29b-41d4-a716-446655440001',
    '2024-02-15',
    'Applied',
    'Application via JobsDB portal',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-15',
    '2024-02-15'
),
(
    '880e8400-e29b-41d4-a716-446655440030',
    '660e8400-e29b-41d4-a716-446655440014',
    '550e8400-e29b-41d4-a716-446655440001',
    '2024-02-16',
    'Screening',
    'Strong Python background with Django experience',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-16',
    '2024-02-16'
),
-- Yuki Tanaka's progression (Frontend Developer)
(
    '880e8400-e29b-41d4-a716-446655440031',
    '660e8400-e29b-41d4-a716-446655440015',
    '550e8400-e29b-41d4-a716-446655440002',
    '2024-02-17',
    'Applied',
    'Application via university partnership program',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-02-17',
    '2024-02-17'
);

-- ==============================================
-- CREATE EXAMPLE CANDIDATE COMMENTS
-- ==============================================

-- Insert example candidate comments
INSERT INTO "CandidateComment" (
    id,
    "candidateId",
    "authorId",
    content,
    "createdAt",
    "updatedAt",
    "attachmentIds"
) VALUES 
(
    '990e8400-e29b-41d4-a716-446655440001',
    '660e8400-e29b-41d4-a716-446655440001',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    'Strong technical background with 6 years of experience. AWS certification is a definite plus. Should proceed to technical interview.',
    '2024-01-16 10:30:00',
    '2024-01-16 10:30:00',
    '{}'
),
(
    '990e8400-e29b-41d4-a716-446655440002',
    '660e8400-e29b-41d4-a716-446655440002',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    'Excellent frontend skills with modern React and TypeScript. Portfolio shows good attention to detail. Pinned for priority consideration.',
    '2024-01-22 14:15:00',
    '2024-01-22 14:15:00',
    '{}'
),
(
    '990e8400-e29b-41d4-a716-446655440003',
    '660e8400-e29b-41d4-a716-446655440003',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    'Outstanding candidate with Master degree from Stanford and Google Cloud certification. Strong ML background with 5 years experience. Top choice for the role.',
    '2024-01-19 16:45:00',
    '2024-01-19 16:45:00',
    '{}'
),
(
    '990e8400-e29b-41d4-a716-446655440004',
    '660e8400-e29b-41d4-a716-446655440004',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    'Strong product management background with MBA from INSEAD. Experience with user research and analytics. Ready to make offer.',
    '2024-01-28 11:20:00',
    '2024-01-28 11:20:00',
    '{}'
),
(
    '990e8400-e29b-41d4-a716-446655440005',
    '660e8400-e29b-41d4-a716-446655440005',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    'Good UX design skills with experience in user research. Portfolio shows creative thinking. Need to schedule initial screening.',
    '2024-01-25 09:30:00',
    '2024-01-25 09:30:00',
    '{}'
),
-- Additional candidate comments for new candidates
(
    '990e8400-e29b-41d4-a716-446655440006',
    '660e8400-e29b-41d4-a716-446655440007',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    'Strong DevOps engineer with AWS certification and containerization expertise. Good infrastructure automation experience.',
    '2024-02-02 11:15:00',
    '2024-02-02 11:15:00',
    '{}'
),
(
    '990e8400-e29b-41d4-a716-446655440007',
    '660e8400-e29b-41d4-a716-446655440008',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    'Excellent marketing professional with strong digital marketing background and analytics skills. Pinned for priority consideration.',
    '2024-02-05 15:30:00',
    '2024-02-05 15:30:00',
    '{}'
),
(
    '990e8400-e29b-41d4-a716-446655440008',
    '660e8400-e29b-41d4-a716-446655440009',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    'Motivated sales professional with strong communication skills and CRM experience. Good track record of meeting targets.',
    '2024-02-05 16:45:00',
    '2024-02-05 16:45:00',
    '{}'
),
(
    '990e8400-e29b-41d4-a716-446655440009',
    '660e8400-e29b-41d4-a716-446655440010',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    'Experienced HR professional with strong recruitment and employee relations background. PHR certification is a plus.',
    '2024-02-08 10:20:00',
    '2024-02-08 10:20:00',
    '{}'
),
(
    '990e8400-e29b-41d4-a716-446655440010',
    '660e8400-e29b-41d4-a716-446655440011',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    'Outstanding financial analyst with CFA certification and strong analytical skills. SAP experience is valuable. Top candidate for the role.',
    '2024-02-10 14:10:00',
    '2024-02-10 14:10:00',
    '{}'
),
(
    '990e8400-e29b-41d4-a716-446655440011',
    '660e8400-e29b-41d4-a716-446655440012',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    'Good QA engineer with both manual and automated testing skills. ISTQB certification shows commitment to quality.',
    '2024-02-11 13:45:00',
    '2024-02-11 13:45:00',
    '{}'
),
(
    '990e8400-e29b-41d4-a716-446655440012',
    '660e8400-e29b-41d4-a716-446655440013',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    'Strong customer success manager with excellent account management and upselling track record. High customer retention rate.',
    '2024-02-16 09:30:00',
    '2024-02-16 09:30:00',
    '{}'
),
(
    '990e8400-e29b-41d4-a716-446655440013',
    '660e8400-e29b-41d4-a716-446655440014',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    'Experienced Python developer with strong Django and database expertise. Good backend development skills.',
    '2024-02-16 11:15:00',
    '2024-02-16 11:15:00',
    '{}'
),
(
    '990e8400-e29b-41d4-a716-446655440014',
    '660e8400-e29b-41d4-a716-446655440015',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    'Good frontend developer with Vue.js expertise and design skills. University partnership candidate shows potential.',
    '2024-02-17 16:00:00',
    '2024-02-17 16:00:00',
    '{}'
),
-- Additional comments for existing candidates
(
    '990e8400-e29b-41d4-a716-446655440015',
    '660e8400-e29b-41d4-a716-446655440006',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    'Backend-focused developer with Java and Spring Boot experience. Good DevOps knowledge with Docker and Kubernetes.',
    '2024-01-30 14:20:00',
    '2024-01-30 14:20:00',
    '{}'
),
(
    '990e8400-e29b-41d4-a716-446655440016',
    '660e8400-e29b-41d4-a716-446655440003',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    'Follow-up: Technical interview went exceptionally well. Candidate demonstrated deep ML knowledge and practical experience. Ready for final interview.',
    '2024-01-27 10:30:00',
    '2024-01-27 10:30:00',
    '{}'
),
(
    '990e8400-e29b-41d4-a716-446655440017',
    '660e8400-e29b-41d4-a716-446655440004',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    'Follow-up: Offer has been extended and accepted. Candidate will start on March 1st. Excellent addition to the product team.',
    '2024-01-30 16:45:00',
    '2024-01-30 16:45:00',
    '{}'
);

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================

-- Verify the data was inserted correctly
SELECT 'Positions Created' as table_name, COUNT(*) as count FROM "Position"
UNION ALL
SELECT 'Candidates Created', COUNT(*) FROM "Candidate"
UNION ALL
SELECT 'Upload Queue Items', COUNT(*) FROM "upload_queue"
UNION ALL
SELECT 'Transition Records', COUNT(*) FROM "TransitionRecord"
UNION ALL
SELECT 'Candidate Comments', COUNT(*) FROM "CandidateComment";

-- Show sample data
SELECT 'Sample Positions:' as info;
SELECT id, title, department, "isOpen", "positionLevel" FROM "Position" LIMIT 3;

SELECT 'Sample Candidates:' as info;
SELECT id, name, email, "fitScore", "applicationDate" FROM "Candidate" LIMIT 3;

SELECT 'Sample Upload Queue:' as info;
SELECT id, "file_name", status, "upload_date" FROM "upload_queue" LIMIT 3;

-- ==============================================
-- END OF SCRIPT
-- ==============================================
