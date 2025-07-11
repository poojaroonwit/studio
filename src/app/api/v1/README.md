# V1 API Documentation

This document provides comprehensive documentation for the V1 API endpoints.

## Authentication

All V1 API endpoints require Bearer token authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-token>
```

## Base URL

All endpoints are prefixed with `/api/v1/`

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
- `status` (optional): Filter by status
- `positionId` (optional): Filter by position ID
- `recruiterId` (optional): Filter by recruiter ID
- `searchTerm` (optional): Search in name and email

**Response:**
```json
{
  "candidates": [
    {
      "id": "candidate-id",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "status": "new",
      "positionId": "position-id",
      "recruiterId": "recruiter-id",
      "fitScore": 85,
      "custom_attributes": {},
      "applicationDate": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 10
}
```

#### POST `/api/v1/candidates`
Create a new candidate.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "status": "new",
  "positionId": "position-id",
  "recruiterId": "recruiter-id",
  "fitScore": 85,
  "custom_attributes": {},
  "parsedData": {
    "personal_info": {
      "firstname": "John",
      "lastname": "Doe"
    },
    "contact_info": {
      "email": "john@example.com"
    }
  }
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
  "custom_attributes": {},
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
Update a candidate.

**Request Body:**
```json
{
  "name": "John Doe Updated",
  "status": "interview",
  "fitScore": 90
}
```

#### DELETE `/api/v1/candidates/{id}`
Delete a candidate.

### Candidate Bulk Operations

#### POST `/api/v1/candidates/bulk-action`
Perform bulk operations on candidates.

**Request Body:**
```json
{
  "action": "update_status",
  "candidateIds": ["id1", "id2", "id3"],
  "data": {
    "status": "interview"
  }
}
```

**Available Actions:**
- `delete`: Delete candidates
- `update_status`: Update status of candidates
- `assign_recruiter`: Assign recruiter to candidates
- `assign_position`: Assign position to candidates

### Candidate Import/Export

#### GET `/api/v1/candidates/export`
Export candidates as CSV.

#### GET `/api/v1/candidates/import`
Get import template.

#### POST `/api/v1/candidates/import`
Import candidates from JSON.

**Request Body:**
```json
{
  "candidates": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "status": "new",
      "positionId": null,
      "recruiterId": null,
      "fitScore": 85,
      "custom_attributes": {}
    }
  ]
}
```

### Positions

#### GET `/api/v1/positions`
Get a list of positions with pagination and filtering.

**Query Parameters:**
- `title` (optional): Filter by title
- `department` (optional): Filter by department
- `isOpen` (optional): Filter by open status
- `position_level` (optional): Filter by position level
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
      "isOpen": true,
      "position_level": "Mid-level",
      "custom_attributes": {},
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
  "title": "Software Engineer",
  "department": "Engineering",
  "description": "Full-stack development role",
  "isOpen": true,
  "position_level": "Mid-level",
  "custom_attributes": {}
}
```

#### GET `/api/v1/positions/{id}`
Get a specific position by ID.

#### PUT `/api/v1/positions/{id}`
Update a position.

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
      "title": "Software Engineer",
      "department": "Engineering",
      "description": "Full-stack development role",
      "isOpen": true,
      "position_level": "Mid-level",
      "custom_attributes": {}
    }
  ]
}
```

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
  "name": "Jane Smith",
  "email": "jane@example.com",
  "role": "Recruiter",
  "modulePermissions": ["CANDIDATES_VIEW", "CANDIDATES_MANAGE"],
  "password": "password123"
}
```

#### GET `/api/v1/users/{id}`
Get a specific user by ID.

#### PUT `/api/v1/users/{id}`
Update a user.

#### DELETE `/api/v1/users/{id}`
Delete a user (only if no candidates assigned).

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