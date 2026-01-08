# Clear Duplicate Candidates API

This endpoint allows you to clear duplicate candidates based on email and position applied, keeping only the first candidate with a non-zero match score.

## Endpoint

```
POST /api/v1/candidates/clear-duplicates
```

## Authentication

Requires a valid API token in the Authorization header:
```
Authorization: Bearer <your-api-token>
```

## Permissions

The user must have the `candidates` module permission.

## Request Body

```json
{
  "dryRun": false,
  "positionId": "optional-position-uuid"
}
```

### Parameters

- `dryRun` (boolean, optional): If `true`, the API will only show what would be deleted without actually deleting anything. Default: `false`
- `positionId` (string, optional): If provided, only check for duplicates within this specific position. If `null` or not provided, check all positions.

## Response

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "message": "Successfully cleared 5 duplicate candidates",
    "duplicatesFound": 3,
    "candidatesDeleted": 5,
    "keptCandidates": [
      {
        "id": "uuid",
        "email": "candidate@example.com",
        "positionId": "position-uuid",
        "fitScore": 85.5,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "dryRun": false
  }
}
```

### Dry Run Response (200)

```json
{
  "success": true,
  "data": {
    "message": "Dry run completed - no changes made",
    "duplicatesFound": 3,
    "candidatesToDelete": 5,
    "keptCandidates": [...],
    "candidatesToDeleteDetails": [
      {
        "id": "uuid",
        "name": "John Doe",
        "email": "candidate@example.com",
        "positionId": "position-uuid",
        "fitScore": 0,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "dryRun": true
  }
}
```

### No Duplicates Found (200)

```json
{
  "success": true,
  "data": {
    "message": "No duplicate candidates found",
    "duplicatesFound": 0,
    "candidatesToDelete": 0,
    "dryRun": false
  }
}
```

## Logic

The API follows this logic to determine which candidate to keep:

1. **Groups candidates** by email and positionId combination
2. **Identifies duplicates** (groups with more than one candidate)
3. **Sorts candidates** in each duplicate group by creation date (earliest first)
4. **Keeps the first created candidate** (earliest createdAt date)
5. **Deletes all other candidates** in the duplicate group

## Example Usage

### Clear all duplicates (dry run first)
```bash
curl -X POST "https://your-domain.com/api/v1/candidates/clear-duplicates" \
  -H "Authorization: Bearer your-api-token" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

### Clear duplicates for a specific position
```bash
curl -X POST "https://your-domain.com/api/v1/candidates/clear-duplicates" \
  -H "Authorization: Bearer your-api-token" \
  -H "Content-Type: application/json" \
  -d '{"positionId": "123e4567-e89b-12d3-a456-426614174000"}'
```

### Clear all duplicates (actual deletion)
```bash
curl -X POST "https://your-domain.com/api/v1/candidates/clear-duplicates" \
  -H "Authorization: Bearer your-api-token" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Error Responses

### Unauthorized (401)
```json
{
  "success": false,
  "error": "Invalid API token"
}
```

### Forbidden (403)
```json
{
  "success": false,
  "error": "Insufficient permissions to manage candidates"
}
```

### Internal Server Error (500)
```json
{
  "success": false,
  "error": "Failed to clear duplicate candidates"
}
```

## Notes

- The operation is **irreversible** - deleted candidates cannot be recovered
- Always use `dryRun: true` first to see what would be deleted
- The API logs all deletion operations for audit purposes
- Email addresses are compared case-insensitively
- Candidates without a position (positionId = null) are treated as a separate group
