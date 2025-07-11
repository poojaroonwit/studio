# V1 Candidate Update API - Examples & Usage Guide

This document provides comprehensive examples for updating candidates using the V1 API endpoint.

## Endpoint

**PUT** `/api/v1/candidates/{candidateId}`

## Authentication

All requests require authentication:
```
Authorization: Bearer <your-api-token>
```

## Key Features

✅ **Partial Updates**: Only update the fields you want to change
✅ **Flexible**: Send only the attributes that need updating
✅ **Safe**: Existing data is preserved for fields not included in the request
✅ **Informative**: Response includes which fields were actually updated

## Update Examples

### 1. Update Only Candidate Name

**Request:**
```bash
PUT /api/v1/candidates/123e4567-e89b-12d3-a456-426614174000
Content-Type: application/json
Authorization: Bearer your-api-token

{
  "name": "John Smith Updated"
}
```

**Response:**
```json
{
  "message": "Candidate updated successfully",
  "candidate": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "John Smith Updated",
    "email": "john.smith@example.com",
    "phone": "+1234567890",
    "status": "Applied",
    "fitScore": 85,
    "positionId": "456e7890-e89b-12d3-a456-426614174000",
    "recruiterId": "789e0123-e89b-12d3-a456-426614174000",
    "custom_attributes": {},
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-02T10:30:00Z"
  },
  "updated_fields": ["name"]
}
```

### 2. Update Multiple Basic Fields

**Request:**
```bash
PUT /api/v1/candidates/123e4567-e89b-12d3-a456-426614174000
Content-Type: application/json
Authorization: Bearer your-api-token

{
  "name": "Jane Doe",
  "email": "jane.doe@example.com",
  "phone": "+1987654321",
  "status": "Interview"
}
```

**Response:**
```json
{
  "message": "Candidate updated successfully",
  "candidate": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "phone": "+1987654321",
    "status": "Interview",
    "fitScore": 85,
    "positionId": "456e7890-e89b-12d3-a456-426614174000",
    "recruiterId": "789e0123-e89b-12d3-a456-426614174000",
    "custom_attributes": {},
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-02T10:30:00Z"
  },
  "updated_fields": ["name", "email", "phone", "status"]
}
```

### 3. Update Position and Recruiter Assignment

**Request:**
```bash
PUT /api/v1/candidates/123e4567-e89b-12d3-a456-426614174000
Content-Type: application/json
Authorization: Bearer your-api-token

{
  "positionId": "new-position-uuid",
  "recruiterId": "new-recruiter-uuid",
  "fitScore": 92
}
```

**Response:**
```json
{
  "message": "Candidate updated successfully",
  "candidate": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "phone": "+1987654321",
    "status": "Interview",
    "fitScore": 92,
    "positionId": "new-position-uuid",
    "recruiterId": "new-recruiter-uuid",
    "custom_attributes": {},
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-02T10:30:00Z"
  },
  "updated_fields": ["positionId", "recruiterId", "fitScore"]
}
```

### 4. Update Custom Attributes

**Request:**
```bash
PUT /api/v1/candidates/123e4567-e89b-12d3-a456-426614174000
Content-Type: application/json
Authorization: Bearer your-api-token

{
  "custom_attributes": {
    "experience_years": 5,
    "preferred_location": "New York",
    "salary_expectation": 120000,
    "notice_period": "2 weeks",
    "skills": ["JavaScript", "React", "Node.js", "TypeScript"]
  }
}
```

**Response:**
```json
{
  "message": "Candidate updated successfully",
  "candidate": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "phone": "+1987654321",
    "status": "Interview",
    "fitScore": 92,
    "positionId": "new-position-uuid",
    "recruiterId": "new-recruiter-uuid",
    "custom_attributes": {
      "experience_years": 5,
      "preferred_location": "New York",
      "salary_expectation": 120000,
      "notice_period": "2 weeks",
      "skills": ["JavaScript", "React", "Node.js", "TypeScript"]
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-02T10:30:00Z"
  },
  "updated_fields": ["custom_attributes"]
}
```

### 5. Update Parsed Data (Resume Information)

**Request:**
```bash
PUT /api/v1/candidates/123e4567-e89b-12d3-a456-426614174000
Content-Type: application/json
Authorization: Bearer your-api-token

{
  "parsedData": {
    "cv_language": "en",
    "personal_info": {
      "title_honorific": "Ms.",
      "firstname": "Jane",
      "lastname": "Doe",
      "nickname": "Jane",
      "location": "New York, NY",
      "introduction_aboutme": "Experienced software engineer with 5+ years in web development, specializing in React and Node.js.",
      "avatar_url": "https://example.com/avatar.jpg"
    },
    "contact_info": {
      "email": "jane.doe@example.com",
      "phone": "+1987654321"
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
}
```

**Response:**
```json
{
  "message": "Candidate updated successfully",
  "candidate": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "phone": "+1987654321",
    "status": "Interview",
    "fitScore": 92,
    "positionId": "new-position-uuid",
    "recruiterId": "new-recruiter-uuid",
    "parsedData": {
      "cv_language": "en",
      "personal_info": {
        "title_honorific": "Ms.",
        "firstname": "Jane",
        "lastname": "Doe",
        "nickname": "Jane",
        "location": "New York, NY",
        "introduction_aboutme": "Experienced software engineer with 5+ years in web development, specializing in React and Node.js.",
        "avatar_url": "https://example.com/avatar.jpg"
      },
      "contact_info": {
        "email": "jane.doe@example.com",
        "phone": "+1987654321"
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
    },
    "custom_attributes": {
      "experience_years": 5,
      "preferred_location": "New York",
      "salary_expectation": 120000,
      "notice_period": "2 weeks",
      "skills": ["JavaScript", "React", "Node.js", "TypeScript"]
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-02T10:30:00Z"
  },
  "updated_fields": ["parsedData"]
}
```

### 6. Update Resume Path

**Request:**
```bash
PUT /api/v1/candidates/123e4567-e89b-12d3-a456-426614174000
Content-Type: application/json
Authorization: Bearer your-api-token

{
  "resumePath": "/uploads/resumes/jane_doe_updated_resume.pdf"
}
```

**Response:**
```json
{
  "message": "Candidate updated successfully",
  "candidate": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "phone": "+1987654321",
    "status": "Interview",
    "fitScore": 92,
    "positionId": "new-position-uuid",
    "recruiterId": "new-recruiter-uuid",
    "resumePath": "/uploads/resumes/jane_doe_updated_resume.pdf",
    "parsedData": { /* existing parsed data */ },
    "custom_attributes": { /* existing custom attributes */ },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-02T10:30:00Z"
  },
  "updated_fields": ["resumePath"]
}
```

### 7. Update Status (Triggers Transition Record)

**Request:**
```bash
PUT /api/v1/candidates/123e4567-e89b-12d3-a456-426614174000
Content-Type: application/json
Authorization: Bearer your-api-token

{
  "status": "Hired",
  "transitionNotes": "Candidate accepted the offer"
}
```

**Response:**
```json
{
  "message": "Candidate updated successfully",
  "candidate": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "phone": "+1987654321",
    "status": "Hired",
    "fitScore": 92,
    "positionId": "new-position-uuid",
    "recruiterId": "new-recruiter-uuid",
    "resumePath": "/uploads/resumes/jane_doe_updated_resume.pdf",
    "parsedData": { /* existing parsed data */ },
    "custom_attributes": { /* existing custom attributes */ },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-02T10:30:00Z"
  },
  "updated_fields": ["status"]
}
```

### 8. Minimal Update (No Fields Provided)

**Request:**
```bash
PUT /api/v1/candidates/123e4567-e89b-12d3-a456-426614174000
Content-Type: application/json
Authorization: Bearer your-api-token

{}
```

**Response:**
```json
{
  "message": "No fields to update",
  "candidate": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "phone": "+1987654321",
    "status": "Hired",
    "fitScore": 92,
    "positionId": "new-position-uuid",
    "recruiterId": "new-recruiter-uuid",
    "resumePath": "/uploads/resumes/jane_doe_updated_resume.pdf",
    "parsedData": { /* existing parsed data */ },
    "custom_attributes": { /* existing custom attributes */ },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-02T10:30:00Z"
  }
}
```

## Available Fields for Update

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `name` | string | Candidate's full name | No |
| `email` | string | Email address | No |
| `phone` | string | Phone number | No |
| `positionId` | UUID | Position ID | No |
| `recruiterId` | UUID | Recruiter ID | No |
| `fitScore` | number (0-100) | Fit score | No |
| `status` | string | Candidate status | No |
| `parsedData` | object | Resume parsed data | No |
| `custom_attributes` | object | Custom attributes | No |
| `resumePath` | string | Resume file path | No |

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid input",
  "details": {
    "email": ["Invalid email format"],
    "fitScore": ["Expected number, received string"]
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden: Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Candidate not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Error updating candidate",
  "details": "Database connection error"
}
```

## Best Practices

1. **Send Only Required Fields**: Only include fields that need to be updated
2. **Use Partial Updates**: Don't send the entire candidate object if you only need to change one field
3. **Check Response**: Always check the `updated_fields` array to confirm which fields were updated
4. **Handle Status Changes**: Status changes automatically create transition records
5. **Validate Data**: Ensure all data types match the expected format

### 9. Create Candidate with Comprehensive ParsedData

**Request:**
```bash
POST /api/v1/candidates
Content-Type: application/json
Authorization: Bearer your-api-token

{
  "name": "John Smith",
  "email": "john.smith@example.com",
  "status": "Applied",
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
    "job_matches": [
      {
        "job_id": "33333333-3333-3333-3333-333333333333",
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
      "job_id": "33333333-3333-3333-3333-333333333333",
      "justification": [
        "Candidate's experience perfectly aligns with the senior software engineer role",
        "Strong technical background and leadership experience",
        "Proven ability to work with large-scale systems"
      ]
    }
  }
}
```

**Response:**
```json
{
  "message": "Candidate created successfully",
  "candidate": {
    "id": "44444444-4444-4444-4444-444444444444",
    "name": "John Smith",
    "email": "john.smith@example.com",
    "status": "Applied",
    "fitScore": 0,
    "positionId": null,
    "recruiterId": null,
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
      "job_matches": [
        {
          "job_id": "33333333-3333-3333-3333-333333333333",
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
        "job_id": "33333333-3333-3333-3333-333333333333",
        "justification": [
          "Candidate's experience perfectly aligns with the senior software engineer role",
          "Strong technical background and leadership experience",
          "Proven ability to work with large-scale systems"
        ]
      }
    },
    "custom_attributes": {},
    "createdAt": "2024-01-02T10:30:00Z",
    "updatedAt": "2024-01-02T10:30:00Z"
  }
}
```

## Code Examples

### JavaScript/Node.js
```javascript
const updateCandidate = async (candidateId, updateData) => {
  const response = await fetch(`/api/v1/candidates/${candidateId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiToken}`
    },
    body: JSON.stringify(updateData)
  });
  
  const result = await response.json();
  console.log('Updated fields:', result.updated_fields);
  return result;
};

// Example usage
await updateCandidate('candidate-id', {
  name: 'Updated Name',
  status: 'Interview'
});
```

### Python
```python
import requests

def update_candidate(candidate_id, update_data, api_token):
    response = requests.put(
        f'/api/v1/candidates/{candidate_id}',
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_token}'
        },
        json=update_data
    )
    
    result = response.json()
    print(f"Updated fields: {result.get('updated_fields', [])}")
    return result

# Example usage
update_candidate('candidate-id', {
    'name': 'Updated Name',
    'status': 'Interview'
}, api_token)
```

### cURL
```bash
curl -X PUT \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-token" \
  -d '{"name": "Updated Name", "status": "Interview"}' \
  https://your-api.com/api/v1/candidates/candidate-id
``` 