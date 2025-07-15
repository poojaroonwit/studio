# V1 API Error Handling Standardization

## Overview

All v1 API endpoints have been updated to use a standardized error handling system that provides consistent, detailed error responses for easier debugging.

## New Error Response Format

All error responses now follow this standardized format:

```json
{
  "error": "Human-readable error message",
  "details": {
    "fieldErrors": {
      "email": ["Invalid email format"],
      "name": ["Name is required"]
    },
    "originalError": "Original error message from database or service"
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/v1/candidates",
  "method": "POST",
  "statusCode": 400,
  "requestId": "optional-request-id"
}
```

## Success Response Format

All success responses now follow this standardized format:

```json
{
  "success": true,
  "data": {
    "id": "candidate-id",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/v1/candidates",
  "method": "POST",
  "statusCode": 201,
  "requestId": "optional-request-id"
}
```

## Error Types

The system provides specific error types for different scenarios:

### 1. Validation Errors (400)
- Invalid JSON body
- Missing required fields
- Invalid field formats
- File validation errors

### 2. Authentication Errors (401)
- Missing or invalid authentication token
- Expired tokens

### 3. Authorization Errors (403)
- Insufficient permissions
- Role-based access control violations

### 4. Not Found Errors (404)
- Resource not found
- Candidate/Position/User not found

### 5. Conflict Errors (409)
- Duplicate email addresses
- Resource already exists

### 6. Internal Server Errors (500)
- Database errors
- Storage service errors
- Unexpected errors

## Updated Endpoints

The following v1 API endpoints have been updated with standardized error handling:

### Health
- `GET /api/v1/health`

### Authentication
- `POST /api/v1/auth/login`

### Candidates
- `GET /api/v1/candidates`
- `POST /api/v1/candidates`
- `GET /api/v1/candidates/[id]`
- `PUT /api/v1/candidates/[id]`
- `DELETE /api/v1/candidates/[id]`
- `POST /api/v1/candidates/[id]/avatar`
- `GET /api/v1/candidates/[id]/avatar`

### Positions
- `GET /api/v1/positions`
- `POST /api/v1/positions`
- `GET /api/v1/positions/[id]`
- `PUT /api/v1/positions/[id]`
- `DELETE /api/v1/positions/[id]`

### Users
- `GET /api/v1/users`
- `POST /api/v1/users`
- `GET /api/v1/users/[id]`
- `PUT /api/v1/users/[id]`
- `DELETE /api/v1/users/[id]`

## Benefits

1. **Consistent Error Format**: All endpoints return errors in the same structure
2. **Detailed Error Information**: Includes original error messages, validation details, and context
3. **Better Debugging**: Timestamps, request paths, and method information for easier troubleshooting
4. **Standardized Status Codes**: Proper HTTP status codes for different error types
5. **Request Tracking**: Optional request IDs for tracking requests across logs

## Implementation Details

The error handling system is implemented in `src/lib/apiErrorHandler.ts` and provides:

- `ApiError` class for creating typed errors
- `createErrorResponse()` function for standardized error responses
- `createSuccessResponse()` function for standardized success responses
- `handleApiError()` function for centralized error handling
- Helper functions for common error scenarios

## Usage Example

```typescript
import { 
  createSuccessResponse, 
  handleApiError, 
  createValidationError, 
  createNotFoundError 
} from '@/lib/apiErrorHandler';

export async function GET(req: NextRequest) {
  try {
    // Your API logic here
    const data = await fetchData();
    return createSuccessResponse(req, data, 200);
  } catch (error) {
    return handleApiError(req, error);
  }
}
```

## Migration Notes

- All existing error responses have been replaced with the new standardized format
- CORS headers are automatically included in all responses
- Content-Type headers are automatically set to `application/json`
- Original error messages are preserved in the `details.originalError` field for debugging 