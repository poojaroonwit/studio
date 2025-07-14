# V1 Candidates API

This API provides endpoints for managing candidate information without job applications or job matches functionality.

## Base URL
```
/api/v1/candidates
```

## Authentication
All endpoints require authentication via NextAuth session.

## Automatic Fields

The following fields are automatically handled by the database and should not be included in request bodies:

- **`createdAt`**: Automatically set to the current timestamp when creating new records
- **`updatedAt`**: Automatically set to the current timestamp when updating records
- **`id`**: Automatically generated UUID
- **`applicationDate`**: Automatically set to the current timestamp when creating candidates

These fields are returned in API responses but are managed by the database schema and Prisma ORM.

## Endpoints

### POST /api/v1/candidates
Create a new candidate with basic information.

#### Request Body
```json
{
  "firstName": "string (required)",
  "lastName": "string (required)", 
  "email": "string (required)",
  "phone": "string (optional)",
  "location": "string (optional)",
  "experience": "string (optional)",
  "education": "string (optional)",
  "skills": "array (optional)",
  "summary": "string (optional)",
  "source": "string (optional, default: 'api')",
  "status": "string (optional, default: 'active')"
}
```

#### Example Request
```bash
curl -X POST /api/v1/candidates \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "location": "New York, NY",
    "experience": "5 years in software development",
    "education": "Bachelor's in Computer Science",
    "skills": ["JavaScript", "React", "Node.js"],
    "summary": "Experienced software developer with expertise in modern web technologies",
    "source": "api",
    "status": "active"
  }'
```

#### Response (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe", 
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "location": "New York, NY",
    "experience": "5 years in software development",
    "education": "Bachelor's in Computer Science",
    "skills": ["JavaScript", "React", "Node.js"],
    "summary": "Experienced software developer with expertise in modern web technologies",
    "source": "api",
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "createdBy": {
      "id": "uuid",
      "name": "Admin User",
      "email": "admin@example.com"
    },
    "updatedBy": {
      "id": "uuid", 
      "name": "Admin User",
      "email": "admin@example.com"
    }
  }
}
```

#### Error Responses

**400 Bad Request** - Missing required fields
```json
{
  "error": "First name, last name, and email are required"
}
```

**409 Conflict** - Email already exists
```json
{
  "error": "Candidate with this email already exists"
}
```

**401 Unauthorized** - Invalid or missing authentication
```json
{
  "error": "Unauthorized"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error"
}
```

### GET /api/v1/candidates
Retrieve a list of candidates with pagination and filtering.

#### Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Number of items per page (default: 10)
- `search` (optional): Search term for firstName, lastName, email, or location
- `status` (optional): Filter by candidate status

#### Example Request
```bash
curl -X GET "/api/v1/candidates?page=1&limit=10&search=john&status=active"
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "location": "New York, NY",
      "experience": "5 years in software development",
      "education": "Bachelor's in Computer Science",
      "skills": ["JavaScript", "React", "Node.js"],
      "summary": "Experienced software developer with expertise in modern web technologies",
      "source": "api",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "createdBy": {
        "id": "uuid",
        "name": "Admin User",
        "email": "admin@example.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

## Notes

- This API focuses only on candidate basic information
- Job applications and job matches are handled by separate APIs
- Email addresses are automatically converted to lowercase
- Duplicate email addresses are not allowed
- All string fields are trimmed of whitespace
- The API uses Prisma for database operations
- Authentication is handled via NextAuth sessions 