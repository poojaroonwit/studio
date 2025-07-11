# ParsedData Structure - Complete Guide

The `parsedData` field in the Candidate model contains all the structured information extracted from a candidate's resume and additional metadata. This field is stored as JSON and can contain various types of data depending on how the candidate was created.

## Data Types

The `parsedData` field can contain one of these types:
- `CandidateDetails` (new format)
- `OldParsedResumeData` (legacy format)
- `null` (if no parsed data exists)

## CandidateDetails Structure (New Format)

This is the current standard format used for parsed resume data:

```typescript
interface CandidateDetails {
  cv_language?: string;
  personal_info: PersonalInfo;
  contact_info: ContactInfo;
  education?: EducationEntry[];
  experience?: ExperienceEntry[];
  skills?: SkillEntry[];
  job_suitable?: JobSuitableEntry[];
  associatedMatchDetails?: {
    jobTitle: string;
    fitScore: number;
    reasons: string[];
    automationJobId?: string;
  };
  job_matches?: AutomationJobMatch[];
  job_applied?: {
    job_id?: string | null;
    job_title?: string | null;
    fit_score?: number | null;
    justification?: string[];
  } | null;
}
```

### PersonalInfo Structure
```typescript
interface PersonalInfo {
  title_honorific?: string;        // e.g., "Mr.", "Ms.", "Dr."
  firstname: string;               // First name
  lastname: string;                // Last name
  nickname?: string;               // Nickname or preferred name
  location?: string;               // e.g., "New York, NY"
  introduction_aboutme?: string;   // Personal summary/bio
  avatar_url?: string;             // Profile picture URL
}
```

### ContactInfo Structure
```typescript
interface ContactInfo {
  email: string;                   // Email address
  phone?: string;                  // Phone number
}
```

### EducationEntry Structure
```typescript
interface EducationEntry {
  major?: string;                  // e.g., "Computer Science"
  field?: string;                  // e.g., "Engineering"
  period?: string;                 // e.g., "2015-2019"
  duration?: string;               // e.g., "4 years"
  GPA?: string;                    // e.g., "3.8"
  university?: string;             // e.g., "MIT"
  campus?: string;                 // e.g., "Cambridge"
}
```

### ExperienceEntry Structure
```typescript
interface ExperienceEntry {
  company?: string;                // Company name
  position?: string;               // Job title
  description?: string;            // Job description
  period?: string;                 // e.g., "2020-2024"
  duration?: string;               // e.g., "4 years"
  is_current_position?: boolean | string;  // Whether this is current job
  postition_level?: string | null; // e.g., "Senior", "Lead"
}
```

### SkillEntry Structure
```typescript
interface SkillEntry {
  segment_skill?: string;          // Skill category
  skill?: string[];                // Array of skills
  skill_string?: string;           // Comma-separated skills string
}
```

### JobSuitableEntry Structure
```typescript
interface JobSuitableEntry {
  suitable_career?: string;        // Recommended career path
  suitable_job_position?: string;  // Recommended job title
  suitable_job_level?: string;     // Recommended job level
  suitable_salary_bath_month?: string; // Expected salary
}
```

### AutomationJobMatch Structure
```typescript
interface AutomationJobMatch {
  job_id?: string;                 // Position ID
  job_title?: string | null;       // Position title
  fit_score: number;               // Match score (0-100)
  match_reasons?: string[];        // Reasons for the match
}
```

## OldParsedResumeData Structure (Legacy Format)

This is the older format used for backward compatibility:

```typescript
interface OldParsedResumeData {
  name?: string;                   // Full name
  email?: string;                  // Email address
  phone?: string;                  // Phone number
  education?: string[];            // Array of education strings
  skills?: string[];               // Array of skill strings
  experienceYears?: number;        // Years of experience
  summary?: string;                // Resume summary
}
```

## Complete Example

Here's a complete example of what `parsedData` might contain:

```json
{
  "cv_language": "en",
  "personal_info": {
    "title_honorific": "Mr.",
    "firstname": "John",
    "lastname": "Smith",
    "nickname": "Johnny",
    "location": "New York, NY",
    "introduction_aboutme": "Experienced software engineer with 5+ years in web development, specializing in React and Node.js.",
    "avatar_url": "https://example.com/avatar.jpg"
  },
  "contact_info": {
    "email": "john.smith@example.com",
    "phone": "+1-555-123-4567"
  },
  "education": [
    {
      "major": "Computer Science",
      "field": "Engineering",
      "period": "2015-2019",
      "duration": "4 years",
      "GPA": "3.8",
      "university": "MIT",
      "campus": "Cambridge"
    },
    {
      "major": "Mathematics",
      "field": "Science",
      "period": "2019-2021",
      "duration": "2 years",
      "GPA": "3.9",
      "university": "Stanford University",
      "campus": "Stanford"
    }
  ],
  "experience": [
    {
      "company": "Tech Corp",
      "position": "Senior Software Engineer",
      "description": "Led development of multiple web applications using React and Node.js. Managed a team of 5 developers.",
      "period": "2020-2024",
      "duration": "4 years",
      "is_current_position": true,
      "postition_level": "Senior"
    },
    {
      "company": "Startup Inc",
      "position": "Software Engineer",
      "description": "Developed full-stack applications using JavaScript, React, and Node.js.",
      "period": "2019-2020",
      "duration": "1 year",
      "is_current_position": false,
      "postition_level": "Mid"
    }
  ],
  "skills": [
    {
      "segment_skill": "Programming Languages",
      "skill": ["JavaScript", "TypeScript", "Python", "Java"],
      "skill_string": "JavaScript, TypeScript, Python, Java"
    },
    {
      "segment_skill": "Frameworks",
      "skill": ["React", "Node.js", "Express", "Django"],
      "skill_string": "React, Node.js, Express, Django"
    },
    {
      "segment_skill": "Databases",
      "skill": ["MongoDB", "PostgreSQL", "MySQL"],
      "skill_string": "MongoDB, PostgreSQL, MySQL"
    }
  ],
  "job_suitable": [
    {
      "suitable_career": "Software Development",
      "suitable_job_position": "Senior Software Engineer",
      "suitable_job_level": "Senior",
      "suitable_salary_bath_month": "120000"
    }
  ],
  "associatedMatchDetails": {
    "jobTitle": "Senior Software Engineer",
    "fitScore": 85,
    "reasons": [
      "Strong React experience",
      "5+ years of experience",
      "Relevant education background"
    ],
    "automationJobId": "job-uuid-123"
  },
  "job_matches": [
    {
      "job_id": "11111111-1111-1111-1111-111111111111",
      "job_title": "Senior Software Engineer",
      "fit_score": 85,
      "match_reasons": [
        "The candidate has 4 years 9 months of experience as a Software Engineer at AddVentures by SCG, aligning with the job's requirement.",
        "The candidate's skill set includes C#.Net, SQL, Javascript, Typescript, HTML, CSS, ASP.Net, ReactJS, NodeJS, Microsoft SQL Server, MySQL, MongoDB, Microsoft Visual Studio, Microsoft SQL Management Studio, VSCode, and Git, many of which are relevant to software development.",
        "The candidate's education in Computer Engineering from Chiang Mai University demonstrates a strong foundation in the field."
      ]
    },
    {
      "job_id": "22222222-2222-2222-2222-222222222222",
      "job_title": "Frontend Developer",
      "fit_score": 20,
      "match_reasons": []
    }
  ],
  "job_applied": {
    "fit_score": 0,
    "job_id": "f2f306cf-09e2-4bef-8a99-4311acbc71a2",
    "justification": [
      "The job position was not found, therefore, a score of 0 is given."
    ]
  }
}
```

## API Usage

### Creating a Candidate with ParsedData

When creating a candidate via the V1 API, you can include parsedData:

```json
{
  "name": "John Smith",
  "email": "john.smith@example.com",
  "status": "Applied",
  "parsedData": {
    "cv_language": "en",
    "personal_info": {
      "firstname": "John",
      "lastname": "Smith",
      "location": "New York, NY"
    },
    "contact_info": {
      "email": "john.smith@example.com",
      "phone": "+1-555-123-4567"
    },
    "education": [...],
    "experience": [...],
    "skills": [...],
    "job_matches": [...],
    "job_applied": {...}
  }
}
```

### Updating ParsedData

You can update specific parts of parsedData:

```json
PUT /api/v1/candidates/{id}
{
  "parsedData": {
    "personal_info": {
      "firstname": "John",
      "lastname": "Smith Updated",
      "location": "San Francisco, CA"
    },
    "skills": [
      {
        "segment_skill": "New Skills",
        "skill": ["Docker", "Kubernetes", "AWS"],
        "skill_string": "Docker, Kubernetes, AWS"
      }
    ]
  }
}
```

## Key Features

1. **Flexible Structure**: Can contain any combination of the defined fields
2. **Backward Compatibility**: Supports both new and legacy formats
3. **Extensible**: Can be extended with additional fields as needed
4. **Searchable**: Fields can be used for filtering and searching candidates
5. **AI Integration**: Designed to work with AI-powered resume parsing

## Common Use Cases

1. **Resume Upload**: When a resume is uploaded, parsedData is populated with extracted information
2. **Manual Entry**: HR can manually populate parsedData when creating candidates
3. **AI Processing**: AI systems can update parsedData with enhanced information
4. **Job Matching**: parsedData contains job matches and fit scores
5. **Reporting**: parsedData fields can be used for analytics and reporting

## Field Access Patterns

In the API, you can access nested parsedData fields using dot notation:
- `parsedData.personal_info.firstname`
- `parsedData.contact_info.email`
- `parsedData.skills[0].skill`
- `parsedData.job_matches[0].fit_score`

## Validation

The parsedData structure is validated using Zod schemas in the API:
- All fields are optional except `personal_info` and `contact_info` in the new format
- Arrays can be empty or undefined
- String fields can be null or undefined
- Numbers should be within valid ranges (e.g., fit_score 0-100) 