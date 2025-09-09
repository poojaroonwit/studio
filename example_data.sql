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
    "hiringDate",
    "positionAttribute"
) VALUES 
-- Software Development Positions
(
    'pos-001-software-engineer',
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
    '2024-03-15',
    'Full-time'
),
(
    'pos-002-frontend-developer',
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
    '2024-02-28',
    'Full-time'
),
(
    'pos-003-data-scientist',
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
    '2024-04-01',
    'Full-time'
),
(
    'pos-004-product-manager',
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
    '2024-03-30',
    'Full-time'
),
(
    'pos-005-ux-designer',
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
    '2024-03-20',
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
    'cand-001-john-smith',
    'John Smith',
    'john.smith@email.com',
    '+66-81-234-5678',
    'pos-001-software-engineer',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.85,
    '2024-01-15',
    '{"skills": ["JavaScript", "React", "Node.js", "PostgreSQL", "AWS"], "experience_years": 6, "education": "Bachelor of Computer Science", "languages": ["English", "Thai"], "certifications": ["AWS Certified Developer"]}',
    '{"expected_salary": "100,000 THB", "availability": "2 weeks notice", "preferred_location": "Bangkok", "remote_work": true}',
    '/uploads/resumes/john_smith_resume.pdf',
    '2024-01-15',
    NOW(),
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    'Experienced full-stack developer with strong React and Node.js skills. Has AWS certification and 6 years of experience.',
    'Strong technical background with relevant experience in our tech stack. AWS certification is a plus.',
    '[{"degree": "Bachelor of Computer Science", "university": "Chulalongkorn University", "year": 2018, "gpa": "3.5"}]',
    '[{"company": "TechCorp Thailand", "position": "Senior Software Engineer", "duration": "2021-2024", "description": "Led development of microservices architecture and improved system performance by 40%"}, {"company": "StartupXYZ", "position": "Software Engineer", "duration": "2018-2021", "description": "Developed full-stack applications using React and Node.js"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'Linkedin' LIMIT 1),
    'Direct Application',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Interview Scheduled' LIMIT 1),
    false,
    null
),
-- Candidate 2: Frontend Developer
(
    'cand-002-sarah-johnson',
    'Sarah Johnson',
    'sarah.johnson@email.com',
    '+66-82-345-6789',
    'pos-002-frontend-developer',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.78,
    '2024-01-20',
    '{"skills": ["React", "TypeScript", "CSS", "Jest", "Figma"], "experience_years": 4, "education": "Bachelor of Information Technology", "languages": ["English", "Thai"], "certifications": []}',
    '{"expected_salary": "75,000 THB", "availability": "1 month notice", "preferred_location": "Bangkok", "remote_work": false}',
    '/uploads/resumes/sarah_johnson_resume.pdf',
    '2024-01-20',
    NOW(),
    'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    'Frontend specialist with strong React and TypeScript skills. Has experience with testing and design tools.',
    'Good frontend skills with modern technologies. Experience with testing frameworks is valuable.',
    '[{"degree": "Bachelor of Information Technology", "university": "KMITL", "year": 2020, "gpa": "3.7"}]',
    '[{"company": "Digital Agency Co.", "position": "Frontend Developer", "duration": "2022-2024", "description": "Built responsive web applications and improved user experience metrics"}, {"company": "WebStudio", "position": "Junior Frontend Developer", "duration": "2020-2022", "description": "Developed user interfaces using React and CSS frameworks"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'JobsDB' LIMIT 1),
    'Job Portal',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Shortlisted' LIMIT 1),
    true,
    '2024-01-25'
),
-- Candidate 3: Data Scientist
(
    'cand-003-michael-chen',
    'Michael Chen',
    'michael.chen@email.com',
    '+66-83-456-7890',
    'pos-003-data-scientist',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.92,
    '2024-01-18',
    '{"skills": ["Python", "R", "SQL", "Machine Learning", "TensorFlow", "Spark"], "experience_years": 5, "education": "Master of Data Science", "languages": ["English", "Chinese", "Thai"], "certifications": ["Google Cloud ML Engineer"]}',
    '{"expected_salary": "120,000 THB", "availability": "3 weeks notice", "preferred_location": "Bangkok", "remote_work": true}',
    '/uploads/resumes/michael_chen_resume.pdf',
    '2024-01-18',
    NOW(),
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    'Highly qualified data scientist with advanced degree and strong ML background. Google Cloud certification.',
    'Excellent candidate with advanced degree and relevant experience. Strong technical skills and certifications.',
    '[{"degree": "Master of Data Science", "university": "Stanford University", "year": 2019, "gpa": "3.8"}, {"degree": "Bachelor of Statistics", "university": "Chulalongkorn University", "year": 2017, "gpa": "3.6"}]',
    '[{"company": "DataTech Solutions", "position": "Senior Data Scientist", "duration": "2021-2024", "description": "Led ML model development and improved prediction accuracy by 25%"}, {"company": "Analytics Pro", "position": "Data Scientist", "duration": "2019-2021", "description": "Built predictive models and performed statistical analysis"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'Referral' LIMIT 1),
    'Employee Referral',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Interviewing' LIMIT 1),
    false,
    null
),
-- Candidate 4: Product Manager
(
    'cand-004-emily-wilson',
    'Emily Wilson',
    'emily.wilson@email.com',
    '+66-84-567-8901',
    'pos-004-product-manager',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.88,
    '2024-01-22',
    '{"skills": ["Product Management", "Agile", "Analytics", "User Research", "A/B Testing"], "experience_years": 5, "education": "MBA", "languages": ["English", "Thai"], "certifications": ["Certified Scrum Product Owner"]}',
    '{"expected_salary": "130,000 THB", "availability": "1 month notice", "preferred_location": "Bangkok", "remote_work": false}',
    '/uploads/resumes/emily_wilson_resume.pdf',
    '2024-01-22',
    NOW(),
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    'Experienced product manager with MBA and strong analytical skills. Has experience with agile methodologies.',
    'Strong product management background with MBA. Experience with user research and analytics.',
    '[{"degree": "MBA", "university": "INSEAD", "year": 2020, "gpa": "3.9"}, {"degree": "Bachelor of Business Administration", "university": "Thammasat University", "year": 2018, "gpa": "3.8"}]',
    '[{"company": "ProductCorp", "position": "Senior Product Manager", "duration": "2022-2024", "description": "Led product strategy and increased user engagement by 35%"}, {"company": "TechStartup", "position": "Product Manager", "duration": "2020-2022", "description": "Managed product roadmap and coordinated with engineering teams"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'Linkedin' LIMIT 1),
    'Professional Network',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Offer Extended' LIMIT 1),
    true,
    '2024-01-28'
),
-- Candidate 5: UX Designer
(
    'cand-005-david-brown',
    'David Brown',
    'david.brown@email.com',
    '+66-85-678-9012',
    'pos-005-ux-designer',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    0.75,
    '2024-01-25',
    '{"skills": ["Figma", "Sketch", "User Research", "Prototyping", "Design Systems"], "experience_years": 3, "education": "Bachelor of Design", "languages": ["English", "Thai"], "certifications": []}',
    '{"expected_salary": "85,000 THB", "availability": "2 weeks notice", "preferred_location": "Bangkok", "remote_work": true}',
    '/uploads/resumes/david_brown_resume.pdf',
    '2024-01-25',
    NOW(),
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    'Creative UX designer with strong portfolio and user research experience. Proficient in modern design tools.',
    'Good UX skills with experience in user research. Portfolio shows strong design capabilities.',
    '[{"degree": "Bachelor of Design", "university": "Silpakorn University", "year": 2021, "gpa": "3.6"}]',
    '[{"company": "Design Studio", "position": "UX Designer", "duration": "2022-2024", "description": "Designed user interfaces and conducted user research studies"}, {"company": "Creative Agency", "position": "Junior UX Designer", "duration": "2021-2022", "description": "Created wireframes and prototypes for web applications"}]',
    null,
    (SELECT id FROM "CandidateSource" WHERE name = 'JobThai' LIMIT 1),
    'Job Portal',
    (SELECT id FROM "RecruitmentStage" WHERE name = 'Applied' LIMIT 1),
    false,
    null
),
-- Candidate 6: Additional Software Engineer (for variety)
(
    'cand-006-lisa-garcia',
    'Lisa Garcia',
    'lisa.garcia@email.com',
    '+66-86-789-0123',
    'pos-001-software-engineer',
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
);

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
    'upload-001-success',
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
    'pos-001-software-engineer',
    '2024-01-15 10:32:00'
),
(
    'upload-002-success',
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
    'pos-002-frontend-developer',
    '2024-01-16 14:22:00'
),
-- Processing uploads
(
    'upload-003-processing',
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
    'pos-003-data-scientist',
    '2024-01-17 09:15:00'
),
-- Pending uploads
(
    'upload-004-pending',
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
    'pos-004-product-manager',
    null
),
-- Failed uploads
(
    'upload-005-failed',
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
    'pos-005-ux-designer',
    '2024-01-19 11:25:00'
),
(
    'upload-006-failed',
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
    'pos-001-software-engineer',
    '2024-01-20 13:35:00'
),
-- Large file upload
(
    'upload-007-large',
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
    'pos-005-ux-designer',
    '2024-01-21 08:05:00'
),
-- Bulk upload
(
    'upload-008-bulk',
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
    'trans-001-john-1',
    'cand-001-john-smith',
    'pos-001-software-engineer',
    '2024-01-15',
    'Applied',
    'Initial application received',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-15',
    '2024-01-15'
),
(
    'trans-002-john-2',
    'cand-001-john-smith',
    'pos-001-software-engineer',
    '2024-01-16',
    'Screening',
    'Resume review completed - strong technical background',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-16',
    '2024-01-16'
),
(
    'trans-003-john-3',
    'cand-001-john-smith',
    'pos-001-software-engineer',
    '2024-01-18',
    'Shortlisted',
    'Technical skills match requirements well',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-18',
    '2024-01-18'
),
(
    'trans-004-john-4',
    'cand-001-john-smith',
    'pos-001-software-engineer',
    '2024-01-20',
    'Interview Scheduled',
    'Technical interview scheduled for Jan 25',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-20',
    '2024-01-20'
),
-- Sarah Johnson's progression
(
    'trans-005-sarah-1',
    'cand-002-sarah-johnson',
    'pos-002-frontend-developer',
    '2024-01-20',
    'Applied',
    'Application received via JobsDB',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-20',
    '2024-01-20'
),
(
    'trans-006-sarah-2',
    'cand-002-sarah-johnson',
    'pos-002-frontend-developer',
    '2024-01-22',
    'Screening',
    'Frontend skills look good, portfolio reviewed',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-22',
    '2024-01-22'
),
(
    'trans-007-sarah-3',
    'cand-002-sarah-johnson',
    'pos-002-frontend-developer',
    '2024-01-25',
    'Shortlisted',
    'Strong React and TypeScript experience, pinned for priority review',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-25',
    '2024-01-25'
),
-- Michael Chen's progression
(
    'trans-008-michael-1',
    'cand-003-michael-chen',
    'pos-003-data-scientist',
    '2024-01-18',
    'Applied',
    'Application via employee referral',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-18',
    '2024-01-18'
),
(
    'trans-009-michael-2',
    'cand-003-michael-chen',
    'pos-003-data-scientist',
    '2024-01-19',
    'Screening',
    'Excellent qualifications - Master degree and Google Cloud certification',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-19',
    '2024-01-19'
),
(
    'trans-010-michael-3',
    'cand-003-michael-chen',
    'pos-003-data-scientist',
    '2024-01-22',
    'Shortlisted',
    'Top candidate - advanced degree and relevant experience',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-22',
    '2024-01-22'
),
(
    'trans-011-michael-4',
    'cand-003-michael-chen',
    'pos-003-data-scientist',
    '2024-01-24',
    'Interview Scheduled',
    'Technical interview scheduled for Jan 26',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-24',
    '2024-01-24'
),
(
    'trans-012-michael-5',
    'cand-003-michael-chen',
    'pos-003-data-scientist',
    '2024-01-26',
    'Interviewing',
    'Technical interview completed - excellent performance',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    '2024-01-26',
    '2024-01-26'
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
    'comment-001-john',
    'cand-001-john-smith',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    'Strong technical background with 6 years of experience. AWS certification is a definite plus. Should proceed to technical interview.',
    '2024-01-16 10:30:00',
    '2024-01-16 10:30:00',
    '{}'
),
(
    'comment-002-sarah',
    'cand-002-sarah-johnson',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    'Excellent frontend skills with modern React and TypeScript. Portfolio shows good attention to detail. Pinned for priority consideration.',
    '2024-01-22 14:15:00',
    '2024-01-22 14:15:00',
    '{}'
),
(
    'comment-003-michael',
    'cand-003-michael-chen',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    'Outstanding candidate with Master degree from Stanford and Google Cloud certification. Strong ML background with 5 years experience. Top choice for the role.',
    '2024-01-19 16:45:00',
    '2024-01-19 16:45:00',
    '{}'
),
(
    'comment-004-emily',
    'cand-004-emily-wilson',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    'Strong product management background with MBA from INSEAD. Experience with user research and analytics. Ready to make offer.',
    '2024-01-28 11:20:00',
    '2024-01-28 11:20:00',
    '{}'
),
(
    'comment-005-david',
    'cand-005-david-brown',
    (SELECT id FROM "User" WHERE email = 'admin@qsncc.com' LIMIT 1),
    'Good UX design skills with experience in user research. Portfolio shows creative thinking. Need to schedule initial screening.',
    '2024-01-25 09:30:00',
    '2024-01-25 09:30:00',
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
