# V1 Candidates API - Job Matches & Job Applied Endpoints

This document describes the V1 API endpoints for managing job matches and job applied data for candidates.

## Authentication

All endpoints require authentication using a Bearer token in the Authorization header:
```
Authorization: Bearer <your-api-token>
```

## Job Matches Endpoints

### 1. Get All Job Matches for a Candidate

**GET** `/api/v1/candidates/{candidateId}/job-matches`

Returns all job matches for a specific candidate.

**Response:**
```json
{
  "job_matches": [
    {
      "id": "uuid",
      "fit_score": 85,
      "job_id": "11111111-1111-1111-1111-111111111111",
      "match_reasons": [
        "The candidate has 4 years 9 months of experience as a Software Engineer",
        "The candidate's skill set includes C#.Net, SQL, Javascript, Typescript"
      ],
      "position_title": "Senior Software Engineer",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 2. Update All Job Matches for a Candidate

**POST/PUT** `/api/v1/candidates/{candidateId}/job-matches`

Replaces all existing job matches for a candidate with the provided list.

**Request Body:**
```json
{
  "job_matches": [
    {
      "fit_score": 20,
      "job_id": "22222222-2222-2222-2222-222222222222",
      "match_reasons": []
    },
    {
      "fit_score": 85,
      "job_id": "11111111-1111-1111-1111-111111111111",
      "match_reasons": [
        "The candidate has 4 years 9 months of experience as a Software Engineer at AddVentures by SCG, aligning with the job's requirement.",
        "The candidate's skill set includes C#.Net, SQL, Javascript, Typescript, HTML, CSS, ASP.Net, ReactJS, NodeJS, Microsoft SQL Server, MySQL, MongoDB, Microsoft Visual Studio, Microsoft SQL Management Studio, VSCode, and Git, many of which are relevant to software development.",
        "The candidate's education in Computer Engineering from Chiang Mai University demonstrates a strong foundation in the field."
      ]
    }
  ]
}
```

**Response:**
```json
{
  "message": "Job matches updated successfully",
  "job_matches": [
    {
      "id": "uuid",
      "fit_score": 20,
      "job_id": "22222222-2222-2222-2222-222222222222",
      "match_reasons": []
    },
    {
      "id": "uuid",
      "fit_score": 85,
      "job_id": "11111111-1111-1111-1111-111111111111",
      "match_reasons": [
        "The candidate has 4 years 9 months of experience as a Software Engineer at AddVentures by SCG, aligning with the job's requirement.",
        "The candidate's skill set includes C#.Net, SQL, Javascript, Typescript, HTML, CSS, ASP.Net, ReactJS, NodeJS, Microsoft SQL Server, MySQL, MongoDB, Microsoft Visual Studio, Microsoft SQL Management Studio, VSCode, and Git, many of which are relevant to software development.",
        "The candidate's education in Computer Engineering from Chiang Mai University demonstrates a strong foundation in the field."
      ]
    }
  ]
}
```

### 3. Delete All Job Matches for a Candidate

**DELETE** `/api/v1/candidates/{candidateId}/job-matches`

Deletes all job matches for a specific candidate.

**Response:**
```json
{
  "message": "All job matches deleted successfully",
  "deleted_count": 2
}
```

### 4. Add a Single Job Match

**POST** `/api/v1/candidates/{candidateId}/job-matches/add`

Adds a single job match to a candidate.

**Request Body:**
```json
{
  "fit_score": 85,
  "job_id": "11111111-1111-1111-1111-111111111111",
  "match_reasons": [
    "The candidate has 4 years 9 months of experience as a Software Engineer",
    "The candidate's skill set includes C#.Net, SQL, Javascript, Typescript"
  ]
}
```

**Response:**
```json
{
  "message": "Job match added successfully",
  "job_match": {
    "id": "uuid",
    "fit_score": 85,
    "job_id": "11111111-1111-1111-1111-111111111111",
    "match_reasons": [
      "The candidate has 4 years 9 months of experience as a Software Engineer",
      "The candidate's skill set includes C#.Net, SQL, Javascript, Typescript"
    ],
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### 5. Get a Specific Job Match

**GET** `/api/v1/candidates/{candidateId}/job-matches/{matchId}`

Returns a specific job match for a candidate.

**Response:**
```json
{
  "job_match": {
    "id": "uuid",
    "fit_score": 85,
    "job_id": "11111111-1111-1111-1111-111111111111",
    "match_reasons": [
      "The candidate has 4 years 9 months of experience as a Software Engineer"
    ],
    "position_title": "Senior Software Engineer",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### 6. Update a Specific Job Match

**PUT** `/api/v1/candidates/{candidateId}/job-matches/{matchId}`

Updates a specific job match for a candidate.

**Request Body:**
```json
{
  "fit_score": 90,
  "job_id": "11111111-1111-1111-1111-111111111111",
  "match_reasons": [
    "Updated match reason"
  ]
}
```

**Response:**
```json
{
  "message": "Job match updated successfully",
  "job_match": {
    "id": "uuid",
    "fit_score": 90,
    "job_id": "11111111-1111-1111-1111-111111111111",
    "match_reasons": [
      "Updated match reason"
    ],
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### 7. Delete a Specific Job Match

**DELETE** `/api/v1/candidates/{candidateId}/job-matches/{matchId}`

Deletes a specific job match for a candidate.

**Response:**
```json
{
  "message": "Job match deleted successfully"
}
```

## Job Applied Endpoints

### 1. Get Job Applied Data for a Candidate

**GET** `/api/v1/candidates/{candidateId}/job-applied`

Returns the job_applied data for a specific candidate.

**Response:**
```json
{
  "job_applied": {
    "fit_score": 0,
    "job_id": "f2f306cf-09e2-4bef-8a99-4311acbc71a2",
    "justification": [
      "The job position was not found, therefore, a score of 0 is given."
    ]
  }
}
```

### 2. Create/Update Job Applied Data for a Candidate

**POST/PUT** `/api/v1/candidates/{candidateId}/job-applied`

Creates or updates the job_applied data for a candidate.

**Request Body:**
```json
{
  "fit_score": 0,
  "job_id": "f2f306cf-09e2-4bef-8a99-4311acbc71a2",
  "justification": [
    "The job position was not found, therefore, a score of 0 is given."
  ]
}
```

**Response:**
```json
{
  "message": "Job applied data updated successfully",
  "job_applied": {
    "fit_score": 0,
    "job_id": "f2f306cf-09e2-4bef-8a99-4311acbc71a2",
    "justification": [
      "The job position was not found, therefore, a score of 0 is given."
    ]
  }
}
```

### 3. Delete Job Applied Data for a Candidate

**DELETE** `/api/v1/candidates/{candidateId}/job-applied`

Deletes the job_applied data for a candidate.

**Response:**
```json
{
  "message": "Job applied data deleted successfully"
}
```

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden: Insufficient permissions to manage job matches"
}
```
or
```json
{
  "error": "Forbidden: Insufficient permissions to manage job_applied data"
}
```

### 404 Not Found
```json
{
  "error": "Candidate not found"
}
```
or
```json
{
  "error": "Job match not found"
}
```
or
```json
{
  "error": "Position not found"
}
```

### 409 Conflict
```json
{
  "error": "Job match already exists for this candidate and position"
}
```

### 400 Bad Request
```json
{
  "error": "Invalid input",
  "details": {
    "fit_score": ["Expected number, received string"],
    "job_id": ["Invalid uuid"]
  }
}
```

### 500 Internal Server Error
```json
{
  "error": "Error updating job matches",
  "details": "Database connection error"
}
```

## Data Validation

### Job Matches
- `fit_score`: Must be a number between 0 and 100
- `job_id`: Must be a valid UUID
- `match_reasons`: Optional array of strings, defaults to empty array

### Job Applied
- `fit_score`: Must be a number between 0 and 100
- `job_id`: Must be a valid UUID
- `justification`: Optional array of strings, defaults to empty array

- All UUIDs must be valid PostgreSQL UUIDs

## Permissions

- **View**: Users with `CANDIDATES_VIEW` permission or Admin role
- **Manage**: Users with `CANDIDATES_MANAGE` permission or Admin role

## Comprehensive ParsedData Example

Here's a complete example of what `parsedData` can contain when creating or updating a candidate:

```json
{
  "parsedData": {
    "cv_language": "en",
    "personal_info": {
      "title_honorific": "Mr.",
      "firstname": "John",
      "lastname": "Smith",
      "nickname": "Johnny",
      "location": "San Francisco, CA",
      "introduction_aboutme": "Senior software engineer with 8+ years of experience in full-stack development, specializing in cloud architecture and scalable systems.",
      "avatar_url": "https://example.com/john-avatar.jpg"
    },
    "contact_info": {
      "email": "john.smith@example.com",
      "phone": "+1-555-987-6543"
    },
    "education": [
      {
        "major": "Computer Science",
        "field": "Engineering",
        "period": "2010-2014",
        "duration": "4 years",
        "GPA": "3.9",
        "university": "UC Berkeley",
        "campus": "Berkeley"
      }
    ],
    "experience": [
      {
        "company": "Google",
        "position": "Senior Software Engineer",
        "description": "Led development of large-scale distributed systems. Mentored junior engineers and contributed to architectural decisions.",
        "period": "2020-2024",
        "duration": "4 years",
        "is_current_position": true,
        "postition_level": "Senior"
      },
      {
        "company": "Facebook",
        "position": "Software Engineer",
        "description": "Developed and maintained web applications serving millions of users. Collaborated with cross-functional teams.",
        "period": "2016-2020",
        "duration": "4 years",
        "is_current_position": false,
        "postition_level": "Mid"
      }
    ],
    "skills": [
      {
        "segment_skill": "Programming Languages",
        "skill": ["Java", "Python", "JavaScript", "Go", "C++"],
        "skill_string": "Java, Python, JavaScript, Go, C++"
      },
      {
        "segment_skill": "Cloud & Infrastructure",
        "skill": ["AWS", "GCP", "Docker", "Kubernetes", "Terraform"],
        "skill_string": "AWS, GCP, Docker, Kubernetes, Terraform"
      },
      {
        "segment_skill": "Databases",
        "skill": ["PostgreSQL", "MongoDB", "Redis", "Cassandra"],
        "skill_string": "PostgreSQL, MongoDB, Redis, Cassandra"
      }
    ],
    "job_suitable": [
      {
        "suitable_career": "Software Engineering",
        "suitable_job_position": "Senior Software Engineer",
        "suitable_job_level": "Senior",
        "suitable_salary_bath_month": "180000"
      }
    ],
    "associatedMatchDetails": {
      "jobTitle": "Senior Software Engineer",
      "fitScore": 95,
      "reasons": [
        "Strong React experience",
        "8+ years of experience",
        "Relevant education background"
      ],
      "automationJobId": "job-uuid-123"
    },
    "job_matches": [
      {
        "job_id": "11111111-1111-1111-1111-111111111111",
        "job_title": "Senior Software Engineer",
        "fit_score": 95,
        "match_reasons": [
          "Exceptional experience with large-scale distributed systems",
          "Strong background in cloud architecture and infrastructure",
          "Proven track record at top-tier tech companies",
          "Extensive experience with modern programming languages and tools"
        ]
      }
    ],
    "job_applied": {
      "fit_score": 95,
      "job_id": "11111111-1111-1111-1111-111111111111",
      "justification": [
        "Candidate's experience perfectly aligns with the senior software engineer role",
        "Strong technical background and leadership experience",
        "Proven ability to work with large-scale systems"
      ]
    }
  }
}
```

## Notes

- Job matches are automatically ordered by fit score (descending) when retrieved
- When updating all job matches, existing matches are completely replaced
- Adding a job match checks for duplicates to prevent conflicts
- Job applied data is stored in the candidate's `parsedData` JSON field
- All timestamps are in ISO 8601 format
- The API supports CORS for cross-origin requests
- `parsedData` can contain comprehensive resume information including education, experience, skills, and job matching data 