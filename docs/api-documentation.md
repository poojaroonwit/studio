# FitScan ATS - API Documentation

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Base URL & Endpoints](#base-url--endpoints)
3. [Response Format](#response-format)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)
6. [Candidate Management API](#candidate-management-api)
7. [Position Management API](#position-management-api)
8. [AI Search API](#ai-search-api)
9. [SLA Monitoring API](#sla-monitoring-api)
10. [Notification API](#notification-api)
11. [File Upload API](#file-upload-api)
12. [Webhook Integration](#webhook-integration)

## 🔐 Authentication

### Bearer Token Authentication
All API endpoints require authentication using Bearer tokens.

```http
Authorization: Bearer <your-api-token>
```

### Session-Based Authentication
For web application access, use session-based authentication.

```http
Cookie: next-auth.session-token=<session-token>
```

### API Token Generation
1. Navigate to Settings → API Keys
2. Click "Generate New Token"
3. Configure token permissions
4. Copy and securely store the token

## 🌐 Base URL & Endpoints

### Base URL
```
Production: https://your-domain.com
Development: http://localhost:8021
```

### API Versioning
- **v1 API**: `/api/v1/` - Stable API with backward compatibility
- **Latest API**: `/api/` - Latest features and improvements

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "total": 100,
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/candidates",
  "method": "GET",
  "statusCode": 200
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/candidates",
  "method": "GET",
  "statusCode": 400
}
```

## ⚠️ Error Handling

### HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **422**: Validation Error
- **500**: Internal Server Error

### Error Types
- **ValidationError**: Invalid request data
- **AuthenticationError**: Invalid credentials
- **AuthorizationError**: Insufficient permissions
- **NotFoundError**: Resource not found
- **InternalServerError**: Server-side error

## 🚦 Rate Limiting

### Limits
- **Standard Users**: 1000 requests/hour
- **API Users**: 5000 requests/hour
- **Admin Users**: 10000 requests/hour

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## 👥 Candidate Management API

### Get Candidates
```http
GET /api/candidates
```

#### Query Parameters
- `limit`: Number of results (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)
- `search`: Search term for name/email
- `positionId`: Filter by position ID
- `statusId`: Filter by status ID
- `recruiterId`: Filter by recruiter ID
- `fitScoreMin`: Minimum fit score
- `fitScoreMax`: Maximum fit score

#### Example Request
```http
GET /api/candidates?limit=50&search=john&positionId=123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer <your-token>
```

#### Example Response
```json
{
  "success": true,
  "data": [
    {
      "id": "candidate-uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "positionId": "position-uuid",
      "positionTitle": "Software Engineer",
      "fitScore": 85,
      "status": "Applied",
      "applicationDate": "2025-01-01T00:00:00.000Z",
      "recruiterName": "Jane Smith",
      "sourceName": "LinkedIn"
    }
  ],
  "total": 1
}
```

### Create Candidate
```http
POST /api/candidates
```

#### Request Body
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "positionId": "position-uuid",
  "recruiterId": "recruiter-uuid",
  "customAttributes": {
    "experience": "5 years",
    "skills": ["React", "Node.js"]
  }
}
```

### Update Candidate
```http
PUT /api/candidates/{id}
```

#### Request Body
```json
{
  "name": "John Doe Updated",
  "statusId": "new-status-uuid",
  "fitScore": 90,
  "customAttributes": {
    "notes": "Strong technical background"
  }
}
```

### Delete Candidate
```http
DELETE /api/candidates/{id}
```

### Get Candidate Details
```http
GET /api/candidates/{id}
```

#### Response
```json
{
  "success": true,
  "data": {
    "id": "candidate-uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "position": {
      "id": "position-uuid",
      "title": "Software Engineer",
      "department": "Engineering"
    },
    "recruiter": {
      "id": "recruiter-uuid",
      "name": "Jane Smith",
      "email": "jane@company.com"
    },
    "fitScore": 85,
    "status": "Applied",
    "applicationDate": "2025-01-01T00:00:00.000Z",
    "parsedData": {
      "personal_info": { ... },
      "education": [ ... ],
      "experience": [ ... ],
      "skills": [ ... ]
    },
    "customAttributes": { ... },
    "attachments": [ ... ],
    "transitionHistory": [ ... ]
  }
}
```

## 💼 Position Management API

### Get Positions
```http
GET /api/positions
```

#### Query Parameters
- `limit`: Number of results (default: 20)
- `offset`: Pagination offset (default: 0)
- `search`: Search term for title/department
- `department`: Filter by department
- `isOpen`: Filter by open/closed status
- `recruiterId`: Filter by recruiter ID

### Create Position
```http
POST /api/positions
```

#### Request Body
```json
{
  "title": "Senior Software Engineer",
  "department": "Engineering",
  "description": "We are looking for a senior software engineer...",
  "matchCriteria": "5+ years experience with React and Node.js",
  "recruiterId": "recruiter-uuid",
  "gradeId": "grade-uuid",
  "customAttributes": {
    "location": "San Francisco",
    "salary": "$120,000 - $150,000"
  }
}
```

### Update Position
```http
PUT /api/positions/{id}
```

### Delete Position
```http
DELETE /api/positions/{id}
```

### Get Position Details
```http
GET /api/positions/{id}
```

## 🤖 AI Search API

### AI-Powered Candidate Search
```http
POST /api/v1/ai/search-candidates
```

#### Request Body
```json
{
  "query": "software engineer with React experience",
  "positionId": "optional-position-uuid",
  "limit": 20,
  "offset": 0
}
```

#### Response
```json
{
  "success": true,
  "data": [
    {
      "id": "candidate-uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "status": "Applied",
      "fitScore": 85,
      "matchReasons": [
        "Has React skill",
        "Software engineering background"
      ],
      "parsedData": { ... },
      "positionTitle": "Senior Software Engineer",
      "recruiterName": "Jane Smith"
    }
  ],
  "total": 1,
  "query": "software engineer with React experience",
  "aiReasoning": "Found candidates with React experience and software engineering background",
  "recordCount": 150
}
```

#### Search Query Examples
```json
// Skill-based search
{
  "query": "candidates with Python and machine learning experience"
}

// Education search
{
  "query": "graduates from Stanford with computer science degree"
}

// Experience search
{
  "query": "worked at Google or Microsoft for 5+ years"
}

// Fit score search
{
  "query": "candidates with fit score above 80"
}

// Complex search
{
  "query": "senior developers with React experience and MBA degree"
}
```

## ⏰ SLA Monitoring API

### Get SLA Positions
```http
GET /api/sla/positions
```

#### Query Parameters
- `recruiterId`: Filter by recruiter ID
- `status`: Filter by SLA status (on_track, warning, critical, urgent)
- `gradeId`: Filter by grade ID

#### Response
```json
{
  "success": true,
  "data": [
    {
      "positionId": "position-uuid",
      "positionTitle": "Software Engineer",
      "department": "Engineering",
      "recruiterName": "Jane Smith",
      "gradeName": "Senior",
      "slaDays": 30,
      "requestDate": "2025-01-01T00:00:00.000Z",
      "isViolated": false,
      "daysOverdue": 0,
      "daysRemaining": 15,
      "status": "on_track"
    }
  ]
}
```

### Get SLA Statistics
```http
GET /api/sla/statistics
```

#### Response
```json
{
  "success": true,
  "data": {
    "total": 100,
    "onTrack": 80,
    "warning": 15,
    "critical": 4,
    "urgent": 1,
    "complianceRate": 80,
    "averageDaysOverdue": 5,
    "totalDaysOverdue": 25,
    "byGrade": {
      "Senior": {
        "total": 50,
        "violations": 5,
        "complianceRate": 90
      }
    },
    "byRecruiter": {
      "Jane Smith": {
        "total": 30,
        "violations": 3,
        "complianceRate": 90
      }
    }
  }
}
```

### Get SLA Violations
```http
GET /api/sla/violations
```

#### Response
```json
{
  "success": true,
  "data": [
    {
      "positionId": "position-uuid",
      "positionTitle": "Software Engineer",
      "recruiterName": "Jane Smith",
      "gradeName": "Senior",
      "daysOverdue": 10,
      "slaDays": 30,
      "requestDate": "2025-01-01T00:00:00.000Z",
      "severity": "critical"
    }
  ]
}
```

## 🔔 Notification API

### Get Notifications
```http
GET /api/notifications
```

#### Query Parameters
- `limit`: Number of results (default: 20)
- `offset`: Pagination offset (default: 0)
- `type`: Filter by notification type
- `isRead`: Filter by read status

#### Response
```json
{
  "success": true,
  "data": [
    {
      "id": "notification-uuid",
      "type": "sla_violation",
      "title": "SLA Violation: Software Engineer",
      "message": "Position has exceeded its SLA by 5 days",
      "data": {
        "positionId": "position-uuid",
        "daysOverdue": 5,
        "severity": "warning"
      },
      "isRead": false,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "total": 1
}
```

### Mark Notification as Read
```http
PUT /api/notifications/{id}/read
```

### Mark All Notifications as Read
```http
PUT /api/notifications/read-all
```

## 📁 File Upload API

### Upload Resume
```http
POST /api/resumes/upload
```

#### Request Body (multipart/form-data)
- `file`: Resume file (PDF, DOC, DOCX)
- `candidateId`: Candidate ID
- `positionId`: Position ID (optional)
- `sourceId`: Source ID (optional)

#### Response
```json
{
  "success": true,
  "data": {
    "id": "attachment-uuid",
    "fileName": "resume.pdf",
    "filePath": "attachments/candidate-uuid/resume.pdf",
    "url": "https://your-domain.com/api/secure-file/stream/attachments/candidate-uuid/resume.pdf",
    "isPrimary": true,
    "uploadedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

### Upload Image
```http
POST /api/upload-image
```

#### Request Body (multipart/form-data)
- `file`: Image file (JPG, PNG, GIF)
- `type`: Image type (candidate_avatar, position_logo, etc.)
- `entityId`: Entity ID (candidate ID, position ID, etc.)

### Get File
```http
GET /api/secure-file/stream/{filePath}
```

#### Headers
```http
Authorization: Bearer <your-token>
```

## 🔗 Webhook Integration

### Webhook Configuration
```http
POST /api/webhooks
```

#### Request Body
```json
{
  "name": "Candidate Created Webhook",
  "url": "https://your-app.com/webhooks/candidate-created",
  "method": "POST",
  "events": ["candidate_created", "candidate_updated"],
  "headers": {
    "Authorization": "Bearer your-webhook-token"
  },
  "isActive": true
}
```

### Webhook Events
- `candidate_created`: New candidate added
- `candidate_updated`: Candidate information updated
- `candidate_status_changed`: Candidate status changed
- `position_created`: New position created
- `position_updated`: Position information updated
- `sla_violation`: SLA violation occurred
- `upload_queue_created`: File added to upload queue
- `upload_queue_processed`: File processing completed

### Webhook Payload Example
```json
{
  "event": "candidate_created",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "data": {
    "id": "candidate-uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "positionId": "position-uuid",
    "recruiterId": "recruiter-uuid",
    "fitScore": 85,
    "status": "Applied"
  },
  "metadata": {
    "source": "api",
    "user": "user-uuid",
    "version": "1.0"
  }
}
```

## 📊 Upload Queue API

### Get Upload Queue
```http
GET /api/upload-queue
```

#### Query Parameters
- `limit`: Number of results (default: 20)
- `offset`: Pagination offset (default: 0)
- `status`: Filter by status (queued, inprocess, success, failed)
- `source`: Filter by source (bulk, single, reprocess)
- `positionId`: Filter by position ID

#### Response
```json
{
  "success": true,
  "data": [
    {
      "id": "queue-uuid",
      "fileName": "resume.pdf",
      "fileSize": 1024000,
      "status": "queued",
      "source": "single",
      "uploadId": "upload-uuid",
      "createdBy": "user-uuid",
      "filePath": "attachments/candidate-uuid/resume.pdf",
      "url": "https://your-domain.com/api/secure-file/stream/attachments/candidate-uuid/resume.pdf",
      "positionTitle": "Software Engineer",
      "uploadDate": "2025-01-01T00:00:00.000Z"
    }
  ],
  "total": 1,
  "summary": {
    "total": 1,
    "queued": 1,
    "inprocess": 0,
    "success": 0,
    "error": 0
  }
}
```

### Add to Upload Queue
```http
POST /api/upload-queue
```

#### Request Body
```json
{
  "file_name": "resume.pdf",
  "file_size": 1024000,
  "status": "queued",
  "source": "reprocess",
  "upload_id": "upload-uuid",
  "file_path": "attachments/candidate-uuid/resume.pdf",
  "position_id": "position-uuid",
  "source_id": "source-uuid",
  "webhook_payload": {
    "candidate_id": "candidate-uuid",
    "request_type": "update",
    "source": "reprocess"
  }
}
```

## 🔧 System Status API

### Get System Status
```http
GET /api/system/status
```

#### Response
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "2.0.0",
    "uptime": 86400,
    "database": "connected",
    "minio": "connected",
    "ai": "available",
    "lastCheck": "2025-01-01T00:00:00.000Z"
  }
}
```

### Get Health Check
```http
GET /api/health
```

## 📈 Analytics API

### Get Dashboard Metrics
```http
GET /api/analytics/dashboard
```

#### Response
```json
{
  "success": true,
  "data": {
    "totalCandidates": 1000,
    "openPositions": 50,
    "slaCompliance": 85,
    "newApplicationsToday": 25,
    "candidateDistribution": {
      "Applied": 400,
      "Screening": 200,
      "Shortlisted": 150,
      "Interviewing": 100,
      "Offer": 50,
      "Hired": 100
    },
    "scoreDistribution": {
      "0-20": 100,
      "21-40": 200,
      "41-60": 300,
      "61-80": 250,
      "81-100": 150
    }
  }
}
```

## 🛠️ Development & Testing

### API Testing
Use tools like Postman, Insomnia, or curl to test API endpoints.

#### Example curl Request
```bash
curl -X GET "https://your-domain.com/api/candidates" \
  -H "Authorization: Bearer your-api-token" \
  -H "Content-Type: application/json"
```

### SDKs and Libraries
- **JavaScript/TypeScript**: Official SDK available
- **Python**: REST API client library
- **PHP**: Composer package available
- **Java**: Maven dependency available

### Rate Limiting
- Monitor rate limit headers in responses
- Implement exponential backoff for retries
- Use appropriate request intervals

---

## 📞 Support & Resources

### API Support
- **Documentation**: Complete API reference
- **Postman Collection**: Import ready-to-use requests
- **SDK Documentation**: Language-specific guides
- **Code Examples**: Sample implementations

### Community
- **Developer Forum**: Connect with other developers
- **GitHub Repository**: Open source components
- **Stack Overflow**: Community Q&A
- **Discord Channel**: Real-time developer chat

### Professional Services
- **API Consulting**: Expert integration guidance
- **Custom Development**: Tailored solutions
- **Training Programs**: Developer training
- **Priority Support**: Dedicated support channels

---

**Last Updated**: January 2025  
**API Version**: 2.0.0  
**Base URL**: https://your-domain.com/api  
**Authentication**: Bearer Token

