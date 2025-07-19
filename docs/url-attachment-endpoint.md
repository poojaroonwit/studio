# URL-Based Attachment Upload Endpoint

This document describes the new PATCH endpoint for uploading candidate attachments from URLs.

## Endpoint

```
PATCH /api/v1/candidates/{id}/attachments
```

## Description

This endpoint allows you to upload an attachment for a candidate by providing a URL to the file. The system will download the file from the URL and store it in the attachment system.

## Authentication

Requires Bearer token authentication with `CANDIDATES_MANAGE` permission.

## Request Format

### Headers
```
Content-Type: application/json
Authorization: Bearer <your-api-token>
```

### Request Body
```json
{
  "fileUrl": "https://example.com/path/to/resume.pdf",
  "label": "resume"
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fileUrl` | string | Yes | The URL of the file to download and upload |
| `label` | string | No | Label for the attachment (default: "resume") |

## Response

### Success Response (201 Created)
```json
{
  "data": {
    "id": "attachment-uuid",
    "candidateId": "candidate-uuid",
    "uploadedById": "user-uuid",
    "filePath": "attachments/candidate-uuid/file-uuid.pdf",
    "fileName": "resume.pdf",
    "isPrimary": true,
    "label": "resume",
    "uploadedAt": "2024-01-01T00:00:00.000Z",
    "url": "https://minio.example.com/bucket/attachments/candidate-uuid/file-uuid.pdf",
    "uploadedBy": {
      "id": "user-uuid",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "error": "Validation Error",
  "message": "Invalid input",
  "details": {
    "fileUrl": ["Missing fileUrl"]
  }
}
```

#### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

#### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions to upload attachments"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "Error uploading attachment from URL",
  "details": {
    "originalError": "Failed to download file: 404 Not Found"
  }
}
```

## Usage Examples

### cURL
```bash
curl -X PATCH \
  https://your-api.com/api/v1/candidates/123e4567-e89b-12d3-a456-426614174000/attachments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-token" \
  -d '{
    "fileUrl": "https://example.com/resume.pdf",
    "label": "resume"
  }'
```

### JavaScript/Node.js
```javascript
const response = await fetch('/api/v1/candidates/123e4567-e89b-12d3-a456-426614174000/attachments', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-api-token'
  },
  body: JSON.stringify({
    fileUrl: 'https://example.com/resume.pdf',
    label: 'resume'
  })
});

const result = await response.json();
```

### Python
```python
import requests

response = requests.patch(
    'https://your-api.com/api/v1/candidates/123e4567-e89b-12d3-a456-426614174000/attachments',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer your-api-token'
    },
    json={
        'fileUrl': 'https://example.com/resume.pdf',
        'label': 'resume'
    }
)

result = response.json()
```

## Features

1. **Automatic File Download**: Downloads the file from the provided URL
2. **Filename Extraction**: Attempts to extract the filename from the URL or Content-Disposition header
3. **Content Type Detection**: Uses the Content-Type header from the downloaded file
4. **Primary Attachment Logic**: Sets the attachment as primary if it's the first one for the candidate
5. **Error Handling**: Comprehensive error handling for network issues, invalid URLs, etc.
6. **Logging**: Detailed logging for debugging and monitoring

## Limitations

1. **File Size**: Limited by the server's memory and timeout settings
2. **URL Accessibility**: The URL must be publicly accessible or accessible from the server
3. **File Types**: No specific file type restrictions, but follows the same validation as regular uploads
4. **Timeout**: Subject to server timeout settings for large files

## Security Considerations

1. **URL Validation**: Validates URL format before attempting download
2. **Permission Check**: Requires `CANDIDATES_MANAGE` permission
3. **File Size Limits**: Implements file size validation
4. **Content Type**: Preserves original content type from the downloaded file

## Testing

Use the provided test script:
```bash
node test-url-attachment.js <candidate-id> <file-url> [label]
```

Example:
```bash
node test-url-attachment.js 123e4567-e89b-12d3-a456-426614174000 https://example.com/resume.pdf resume
``` 