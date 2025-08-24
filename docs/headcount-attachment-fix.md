# Headcount Attachment Upload Fix

## Problem
The headcount file upload functionality was failing because the `HeadcountAttachmentModal` component was using the wrong API endpoint (`/api/upload-image`) which has several limitations:

1. **File Type Restriction**: Only accepts image files (`file.type.startsWith('image/')`)
2. **File Size Limit**: Limited to 5MB
3. **No Headcount Support**: Doesn't handle headcount attachments properly
4. **Missing Database Integration**: Doesn't create attachment records in the database

## Solution

### 1. Created New API Endpoint
Created a dedicated API endpoint for headcount attachments: `/api/headcount/[id]/attachments`

**Features:**
- Accepts any file type (not just images)
- 50MB file size limit
- Proper MinIO storage with organized file structure
- Database integration with attachment records
- Full CRUD operations (GET, POST, DELETE)

**File Structure:**
```
src/app/api/headcount/[id]/attachments/route.ts
```

### 2. Updated Frontend Component
Modified `HeadcountAttachmentModal` to use the new API endpoint:

**Changes:**
- Updated upload endpoint from `/api/upload-image` to `/api/headcount/${headcount.id}/attachments`
- Updated delete endpoint to use the new API
- Improved error handling with better error messages
- Removed unnecessary `headcountId` parameter from form data

**File Structure:**
```
src/components/positions/HeadcountAttachmentModal.tsx
```

## API Endpoints

### POST `/api/headcount/[id]/attachments`
Upload a file attachment for a headcount.

**Request:**
- `Content-Type: multipart/form-data`
- `file`: The file to upload
- `label`: Optional label for the attachment (defaults to 'attachment')

**Response:**
```json
{
  "id": "uuid",
  "headcountId": "uuid",
  "uploadedById": "uuid",
  "filePath": "headcount-attachments/uuid/uuid.ext",
  "fileName": "original-filename.ext",
  "label": "attachment",
  "isPrimary": false,
  "uploadedAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "url": "https://minio-url/bucket/headcount-attachments/uuid/uuid.ext",
  "uploadedBy": {
    "id": "uuid",
    "name": "User Name",
    "email": "user@example.com"
  }
}
```

### GET `/api/headcount/[id]/attachments`
Fetch all attachments for a headcount.

**Response:**
```json
[
  {
    "id": "uuid",
    "headcountId": "uuid",
    "uploadedById": "uuid",
    "filePath": "headcount-attachments/uuid/uuid.ext",
    "fileName": "filename.ext",
    "label": "attachment",
    "isPrimary": false,
    "uploadedAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "uploadedBy": {
      "id": "uuid",
      "name": "User Name",
      "email": "user@example.com"
    }
  }
]
```

### DELETE `/api/headcount/[id]/attachments?attachmentId=uuid`
Delete a specific attachment.

**Response:**
```json
{
  "message": "Attachment deleted successfully"
}
```

## Database Schema
The solution uses the existing `Attachment` model with the `headcountId` field:

```sql
model Attachment {
  id           String     @id @default(uuid()) @db.Uuid
  candidateId  String?    @db.Uuid
  headcountId  String?    @db.Uuid  -- Used for headcount attachments
  uploadedById String     @db.Uuid
  filePath     String
  fileName     String
  label        String
  isPrimary    Boolean    @default(false)
  uploadedAt   DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  
  candidate    Candidate? @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  headcount    Headcount? @relation("HeadcountAttachments", fields: [headcountId], references: [id], onDelete: Cascade)
  uploadedBy   User       @relation("UserAttachments", fields: [uploadedById], references: [id], onDelete: Cascade)
}
```

## File Storage
Files are stored in MinIO with the following structure:
```
headcount-attachments/
├── {headcount-id}/
│   ├── {uuid}.pdf
│   ├── {uuid}.docx
│   └── {uuid}.jpg
```

## Testing
To test the fix:

1. Navigate to a position with headcounts
2. Open the headcount attachment modal
3. Try uploading different file types (PDF, DOC, images, etc.)
4. Verify files are uploaded and displayed correctly
5. Test file deletion functionality

## Error Handling
The new implementation includes comprehensive error handling:

- File size validation (50MB limit)
- File type validation (any file type allowed)
- MinIO upload error handling
- Database operation error handling
- User-friendly error messages in the UI

## Backward Compatibility
This fix maintains backward compatibility:
- Existing candidate attachments continue to work
- No changes to existing database schema
- No breaking changes to other components
