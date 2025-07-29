# V1 API Documentation

This document provides comprehensive documentation for the V1 API endpoints.

## Authentication

All V1 API endpoints require Bearer token authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-token>
```

## Base URL

All endpoints are prefixed with `/api/v1/`

## Automatic Fields

The following fields are automatically handled by the database and should not be included in request bodies:

- **`createdAt`**: Automatically set to the current timestamp when creating new records
- **`updatedAt`**: Automatically set to the current timestamp when updating records

These fields are returned in API responses but are managed by the database schema and Prisma ORM.

## Endpoints

### Authentication

#### POST `/api/v1/auth/login`
Authenticate a user and receive a JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "Admin",
    "modulePermissions": ["CANDIDATES_VIEW", "CANDIDATES_MANAGE"]
  }
}
```

### Health Check

#### GET `/api/v1/health`
Check the health status of the API and database.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": {
    "status": "connected",
    "currentTime": "2024-01-01 00:00:00"
  },
  "statistics": {
    "candidates": 150,
    "positions": 25,
    "users": 10
  },
  "version": "1.0.0",
  "api": "v1"
}
```

### Candidates

#### GET `/api/v1/candidates`
Get a list of candidates with pagination and filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search in name and email
- `status` (optional): Filter by status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "candidate-id",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "status": "new",
      "positionId": "position-id",
      "recruiterId": "recruiter-id",
      "fitScore": 85,
      "customAttributes": {},
      "applicationDate": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "position": {
        "title": "Software Engineer",
        "department": "Engineering"
      },
      "recruiter": {
        "name": "Jane Smith"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15
  }
}
```

#### POST `/api/v1/candidates`
Create a new candidate with candidate information, job matches, and applied job data.

**Request Body:**
```json
{
  "candidate_info": {
    "personal_info": {
      "title_honorific": "Mr.",                     // Optional
      "firstname": "John",                          // Required
      "lastname": "Doe",                            // Required
      "nickname": "Johnny",                         // Optional
      "location": "Bangkok, Thailand",              // Optional
      "introduction_aboutme": "Experienced software engineer"  // Optional
    },
    "contact_info": {
      "email": "john@example.com",                  // Required
      "phone": "+1234567890"                        // Optional
    },
    "cv_language": "English",                       // Optional
    "education": [                                  // Optional
      {
        "major": "Computer Science",                // Optional
        "university": "University of Technology",   // Optional
        "period": "2018-2022"                       // Optional
      }
    ],
    "experience": [                                 // Optional
      {
        "company": "Tech Corp",                     // Optional
        "position": "Software Engineer",            // Optional
        "period": "2022-Present"                    // Optional
      }
    ],
    "skills": [                                     // Optional
      {
        "segment_skill": "Programming Languages",   // Optional
        "skill": ["JavaScript", "Python", "React"]  // Optional
      }
    ],
    "job_suitable": [                               // Optional
      {
        "suitable_career": "Software Engineer",     // Optional
        "suitable_job_level": "Mid-level"           // Optional
      }
    ],
    "status": "new"                                 // Optional (default: "new")
  }
  // Note: job_matches and job_applied fields have been removed from the v1 API schema
}
```

**Field Requirements:**

**Required Fields:**
- `candidate_info.personal_info.firstname` - Candidate's first name
- `candidate_info.personal_info.lastname` - Candidate's last name
- `candidate_info.contact_info.email` - Candidate's email address

**Note:** The following fields have been removed from the v1 API and are no longer supported:
- `job_matches` - Job matching functionality has been moved to separate endpoints
- `job_applied` - Job application functionality has been moved to separate endpoints

**Optional Fields:**
- All other fields in the request body are optional

**Note:** The following fields are automatically handled and should not be included in the request:
- `createdAt`: Automatically set to current timestamp
- `updatedAt`: Automatically set to current timestamp
- `applicationDate`: Automatically set to current timestamp
- `id`: Automatically generated UUID

**Response:**
```json
{
  "message": "Candidate created successfully",
  "candidate": {
    "id": "candidate-uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "status": "new",
    "parsedData": { /* candidate_info only */ },
    "applicationDate": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST `/api/v1/candidates/import`
Import candidates from CSV or Excel files. Supports both file upload and JSON format.

**File Upload (multipart/form-data):**
```bash
curl -X POST /api/v1/candidates/import \
  -H "Authorization: Bearer <token>" \
  -F "file=@candidates.csv"
```

**JSON Format:**
```json
{
  "candidates": [
    {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "status": "Applied",
      "positionId": "position-uuid",
      "recruiterId": "recruiter-uuid",
      "fitScore": 85,
      "custom_attributes": {},
      "parsedData": null,
      "resumePath": null
    }
  ]
}
```

**CSV Format Example:**
```csv
name,email,phone,status,positionId,recruiterId,fitScore
John Doe,john.doe@example.com,+1234567890,Applied,,,85
Jane Smith,jane.smith@example.com,+1234567891,Screening,,,90
```

**Response:**
```json
{
  "message": "Import completed",
  "results": {
    "imported": 2,
    "skipped": 1,
    "errors": ["Candidate with email existing@example.com already exists"]
  }
}
```

#### GET `/api/v1/candidates/import`
Get import template for reference.

**Response:**
```json
{
  "candidates": [
    {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "status": "Applied",
      "positionId": null,
      "recruiterId": null,
      "fitScore": 85,
      "custom_attributes": {},
      "parsedData": null,
      "resumePath": null
    }
  ]
}
```

#### GET `/api/v1/candidates/{id}`
Get a specific candidate by ID.

**Response:**
```json
{
  "id": "candidate-id",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "status": "new",
  "positionId": "position-id",
  "recruiterId": "recruiter-id",
  "fitScore": 85,
  "customAttributes": {},
  "position": {
    "title": "Software Engineer",
    "department": "Engineering"
  },
  "recruiter": {
    "name": "Jane Smith"
  },
  "jobMatches": [],
  "resumeHistory": []
}
```

#### PUT `/api/v1/candidates/{id}`
Update a candidate. Only the fields you want to update need to be included in the request. Job matches and applied job data can also be updated through this endpoint.

**Example - Update only the status:**
```json
{
  "status": "Shortlisted"
}
```

**Example - Update basic information:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1-555-0123"
}
```

**Example - Update candidate info structure:**
```json
{
  "candidate_info": {
    "personal_info": {
      "firstname": "John",
      "lastname": "Doe Updated"
    },
    "contact_info": {
      "email": "john.updated@example.com"
    }
  }
}
```

**Example - Update job matches:**
```json
{
  "job_matches": [
    {
      "fitScore": 0.85,
      "jobId": "position-uuid",
      "matchReasons": ["Strong technical skills", "Relevant experience"]
    }
  ]
}
```

**Example - Update multiple fields:**
```json
{
  "name": "John Doe Updated",
  "status": "Interviewing",
  "positionId": "new-position-uuid",
  "fitScore": 0.92
}
```

**Response:**
```json
{
  "message": "Candidate updated successfully",
  "candidate": {
    "id": "candidate-uuid",
    "name": "John Doe Updated",
    "email": "john.updated@example.com",
    "status": "new",
    "parsedData": { /* updated data */ },
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "updated_fields": ["candidate_info"]
}
```

#### DELETE `/api/v1/candidates/{id}`
Delete a candidate.

### Job Applied Information

#### GET `/api/v1/candidates/{id}/job-applied`
Get applied job information for a candidate.

**Response:**
```json
{
  "job_applied": {
    "fitScore": 90,
    "jobId": "position-uuid",
    "justification": ["Strong technical background", "Relevant experience"]
  }
}
```

#### POST `/api/v1/candidates/{id}/job-applied`
Create or update applied job information for a candidate.

**Request Body:**
```json
{
  "fitScore": 90,
  "jobId": "position-uuid",
  "justification": ["Strong technical background", "Relevant experience"]
}
```

**Response:**
```json
{
  "message": "Job applied data updated successfully",
  "job_applied": {
    "fitScore": 90,
    "jobId": "position-uuid",
    "justification": ["Strong technical background", "Relevant experience"]
  }
}
```

#### PUT `/api/v1/candidates/{id}/job-applied`
Update applied job information for a candidate.

**Request Body:** Same as POST

**Response:** Same as POST

#### DELETE `/api/v1/candidates/{id}/job-applied`
Delete applied job information for a candidate.

### Job Matches

#### GET `/api/v1/candidates/{id}/job-matches`
Get all job matches for a candidate.

**Response:**
```json
{
  "job_matches": [
    {
      "id": "match-uuid",
      "fitScore": 85,
      "jobId": "position-uuid",
      "matchReasons": ["Strong technical skills", "Relevant experience"],
      "positionTitle": "Software Engineer",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST `/api/v1/candidates/{id}/job-matches`
Create or update job matches for a candidate.

**Request Body:**
```json
{
  "job_matches": [
    {
      "fitScore": 85,
      "jobId": "position-uuid",
      "matchReasons": ["Strong technical skills", "Relevant experience"]
    }
  ]
}
```

**Note:** The following fields are automatically handled and should not be included in the request:
- `positionTitle`: Automatically retrieved from the Position table based on `jobId`
- `createdAt`: Automatically set to current timestamp when creating new matches
- `updatedAt`: Automatically set to current timestamp when updating matches

**Response:**
```json
{
  "message": "Job matches updated successfully",
  "job_matches": [
    {
      "id": "match-uuid",
      "fitScore": 85,
      "jobId": "position-uuid",
      "matchReasons": ["Strong technical skills", "Relevant experience"]
    }
  ]
}
```

#### PUT `/api/v1/candidates/{id}/job-matches`
Update job matches for a candidate.

**Request Body:** Same as POST

**Response:** Same as POST

#### DELETE `/api/v1/candidates/{id}/job-matches`
Delete all job matches for a candidate.

### Individual Job Match

#### GET `/api/v1/candidates/{id}/job-matches/{matchId}`
Get a specific job match for a candidate.

**Response:**
```json
{
  "job_match": {
    "id": "match-uuid",
    "fitScore": 85,
    "jobId": "position-uuid",
    "matchReasons": ["Strong technical skills"],
    "positionTitle": "Software Engineer",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### PUT `/api/v1/candidates/{id}/job-matches/{matchId}`
Update a specific job match for a candidate.

**Request Body:**
```json
{
  "fitScore": 90,
  "jobId": "position-uuid",
  "matchReasons": ["Updated match reasons"]
}
```

**Note:** The following fields are automatically handled and should not be included in the request:
- `positionTitle`: Automatically retrieved from the Position table based on `jobId`
- `createdAt`: Automatically set to current timestamp when creating new matches
- `updatedAt`: Automatically set to current timestamp when updating matches

**Response:**
```json
{
  "message": "Job match updated successfully",
  "job_match": {
    "id": "match-uuid",
    "fitScore": 90,
    "jobId": "position-uuid",
    "matchReasons": ["Updated match reasons"],
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### DELETE `/api/v1/candidates/{id}/job-matches/{matchId}`
Delete a specific job match for a candidate.

### Positions

#### GET `/api/v1/positions`
Get a list of positions with pagination and filtering.

**Query Parameters:**
- `title` (optional): Filter by title
- `department` (optional): Filter by department (comma-separated)
- `isOpen` (optional): Filter by open status
- `positionLevel` (optional): Filter by position level
- `limit` (optional): Items per page (default: 20)
- `offset` (optional): Offset for pagination

**Response:**
```json
{
  "data": [
    {
      "id": "position-id",
      "title": "Software Engineer",
      "department": "Engineering",
      "description": "Full-stack development role",
      "matchCriteria": "<h2>Compare Candidate and Job</h2>...",
      "isOpen": true,
      "positionLevel": "Mid-level",
      "customAttributes": {},
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 25
}
```

#### POST `/api/v1/positions`
Create a new position.

**Request Body:**
```json
{
  "title": "Software Engineer",                     // Required
  "department": "Engineering",                      // Required
  "description": "Full-stack development role",     // Optional
  "matchCriteria": "",                              // Optional (default: system default)
  "isOpen": true,                                   // Optional (default: true)
  "positionLevel": "Mid-level",                    // Optional
  "customAttributes": {}                            // Optional (default: {})
}
```

**Field Requirements:**

**Required Fields:**
- `title` - Position title
- `department` - Department name

**Optional Fields:**
- `description` - Position description
- `matchCriteria` - Match criteria content (if empty, uses system default)
- `isOpen` - Whether position is open for applications (default: true)
- `positionLevel` - Position level (e.g., "Entry", "Mid-level", "Senior")
- `customAttributes` - Custom attributes object (default: {})

**Note:** The following fields are automatically handled and should not be included in the request:
- `createdAt`: Automatically set to current timestamp
- `updatedAt`: Automatically set to current timestamp
- `id`: Automatically generated UUID

#### GET `/api/v1/positions/{id}`
Get a specific position by ID.

#### PUT `/api/v1/positions/{id}`
Update a position. Only the fields you want to update need to be included in the request.

**Note:** The following fields are automatically handled and should not be included in the request:
- `createdAt`: Automatically set to current timestamp
- `updatedAt`: Automatically set to current timestamp
- `id`: Automatically generated UUID

**Example - Update only the title:**
```json
{
  "title": "Updated Software Engineer Position"
}
```

**Example - Update multiple fields:**
```json
{
  "title": "Senior Software Engineer",
  "department": "Engineering",
  "isOpen": false
}
```

#### DELETE `/api/v1/positions/{id}`
Delete a position.

### Position Bulk Operations

#### POST `/api/v1/positions/bulk-action`
Perform bulk operations on positions.

**Request Body:**
```json
{
  "action": "update_status",
  "positionIds": ["id1", "id2", "id3"],
  "data": {
    "isOpen": false
  }
}
```

**Available Actions:**
- `delete`: Delete positions (only if no candidates assigned)
- `update_status`: Update open/closed status
- `update_department`: Update department

### Position Import/Export

#### GET `/api/v1/positions/export`
Export positions as CSV.

#### GET `/api/v1/positions/import`
Get import template.

#### POST `/api/v1/positions/import`
Import positions from JSON.

**Request Body:**
```json
{
  "positions": [
    {
      "title": "Software Engineer",                     // Required
      "department": "Engineering",                      // Required
      "description": "Full-stack development role",     // Optional
      "matchCriteria": "",                              // Optional (default: system default)
      "isOpen": true,                                   // Optional (default: true)
      "positionLevel": "Mid-level",                    // Optional
      "customAttributes": {}                            // Optional (default: {})
    }
  ]
}
```

**Field Requirements:**

**Required Fields:**
- `positions[].title` - Position title
- `positions[].department` - Department name

**Optional Fields:**
- `positions[].description` - Position description
- `positions[].matchCriteria` - Match criteria content (if empty, uses system default)
- `positions[].isOpen` - Whether position is open for applications (default: true)
- `positions[].positionLevel` - Position level (e.g., "Entry", "Mid-level", "Senior")
- `positions[].customAttributes` - Custom attributes object (default: {})

**Note:** The following fields are automatically handled and should not be included in the request:
- `createdAt`: Automatically set to current timestamp
- `updatedAt`: Automatically set to current timestamp
- `id`: Automatically generated UUID

### Users

#### GET `/api/v1/users`
Get a list of users with pagination and filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `role` (optional): Filter by role
- `searchTerm` (optional): Search in name and email

**Response:**
```json
{
  "users": [
    {
      "id": "user-id",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "Recruiter",
      "modulePermissions": ["CANDIDATES_VIEW", "CANDIDATES_MANAGE"],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 10
}
```

#### POST `/api/v1/users`
Create a new user.

**Request Body:**
```json
{
  "name": "Jane Smith",                            // Required
  "email": "jane@example.com",                     // Required
  "role": "Recruiter",                             // Required
  "modulePermissions": ["CANDIDATES_VIEW", "CANDIDATES_MANAGE"],  // Optional (default: [])
  "password": "password123"                        // Optional (for basic auth)
}
```

**Field Requirements:**

**Required Fields:**
- `name` - User's full name
- `email` - User's email address (must be unique)
- `role` - User role ("Admin", "Recruiter", "User")

**Optional Fields:**
- `modulePermissions` - Array of module permissions (default: [])
- `password` - Password for basic authentication (optional if using external auth)

**Note:** The following fields are automatically handled and should not be included in the request:
- `createdAt`: Automatically set to current timestamp
- `updatedAt`: Automatically set to current timestamp
- `id`: Automatically generated UUID

#### GET `/api/v1/users/{id}`
Get a specific user by ID.

#### PUT `/api/v1/users/{id}`
Update a user.

#### DELETE `/api/v1/users/{id}`
Delete a user (only if no candidates assigned).

### Candidate Avatar

#### POST `/api/v1/candidates/{id}/avatar`
Upload an avatar image for a candidate.

**Request Body (multipart/form-data):**
```bash
curl -X POST /api/v1/candidates/{id}/avatar \
  -H "Authorization: Bearer <token>" \
  -F "avatar=@profile.jpg"
```

**Response:**
```json
{
  "message": "Avatar uploaded successfully",
  "avatar_url": "http://localhost:9000/uploads/avatars/candidate-id/uuid.jpg",
  "candidate": {
    "id": "candidate-uuid",
    "name": "John Doe",
    "avatarUrl": "http://localhost:9000/uploads/avatars/candidate-id/uuid.jpg"
  }
}
```

#### GET `/api/v1/candidates/{id}/avatar`
Get the avatar URL for a candidate.

**Response:**
```json
{
  "avatar_url": "http://localhost:9000/uploads/avatars/candidate-id/uuid.jpg"
}
```

### Candidate Resumes

#### GET `/api/v1/candidates/{id}/resumes`
Get resumes for a candidate.

#### POST `/api/v1/candidates/{id}/resumes`
Upload a resume for a candidate.

#### PUT `/api/v1/candidates/{id}/resumes`
Update resume information.

#### DELETE `/api/v1/candidates/{id}/resumes`
Delete a resume.

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `500`: Internal Server Error
- `503`: Service Unavailable

## CORS Support

All endpoints support CORS and include appropriate headers for cross-origin requests.

## Rate Limiting

API endpoints may be subject to rate limiting. Check response headers for rate limit information.

## Versioning

This is the V1 API. Future versions will be available at `/api/v2/`, `/api/v3/`, etc.

## Permissions

The API uses role-based access control with the following roles:
- `Admin`: Full access to all endpoints
- `Recruiter`: Access to candidates and positions
- `User`: Limited access based on module permissions

Module permissions include:
- `CANDIDATES_VIEW`: View candidates
- `CANDIDATES_MANAGE`: Create, update, delete candidates
- `CANDIDATES_EXPORT`: Export candidates
- `POSITIONS_VIEW`: View positions
- `POSITIONS_MANAGE`: Create, update, delete positions
- `POSITIONS_EXPORT`: Export positions
- `USERS_VIEW`: View users
- `USERS_MANAGE`: Create, update, delete users

## API Documentation

Interactive API documentation is available at `/api-docs` which provides a Swagger UI interface for testing all endpoints.

## Payload Alignment

All API payloads are designed to align with the frontend components and database schema. The candidate creation and update endpoints support the structured format with `candidate_info` field. Job matches and applied job data are managed through separate dedicated endpoints.