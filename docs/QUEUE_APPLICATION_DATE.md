# Queue Upload Date as Application Date

## Overview

The system now uses the queue upload date as the candidate's application date, while keeping the candidate creation date separate.

## Changes Made

### 1. Upload Queue Processor (`src/lib/uploadQueueProcessor.ts`)
- Added `upload_date` field to the webhook inputs payload
- This field contains the date when the candidate was added to the upload queue
- External automations should use this date as the `applicationDate` when creating candidates

### 2. Candidate Creation Endpoint (`src/app/api/automation/create-candidate-with-matches/route.ts`)
- Added support for both `applicationDate` and `uploadDate` fields in the candidate schema
- Automatically uses `uploadDate` if `applicationDate` is not provided
- Falls back to current date if neither is provided

## Data Model

### Candidate Fields
- **`applicationDate`**: Date when the candidate applied (uses queue upload date)
- **`createdAt`**: Date when the candidate record was created in the database

### Upload Queue Fields
- **`upload_date`**: Date when the file was uploaded to the queue

## How It Works

1. **File Upload**: When a resume is uploaded, it's added to the queue with `upload_date` set to the current timestamp
2. **Queue Processing**: The processor sends the file to the webhook with `upload_date` in the inputs
3. **Automation**: The external automation (n8n/make.com) processes the resume and calls `/api/automation/create-candidate-with-matches`
4. **Candidate Creation**: The endpoint uses the provided date in this priority:
   - `applicationDate` (if provided by automation)
   - `uploadDate` (if provided by automation)
   - Current date (fallback)

## For Automation Developers

When creating a candidate from the webhook response, pass the `upload_date` from inputs as either:

```json
{
  "candidate": {
    "name": "John Doe",
    "email": "john@example.com",
    "applicationDate": "{{inputs.upload_date}}"  // Use queue upload date
  }
}
```

Or alternatively:

```json
{
  "candidate": {
    "name": "John Doe",
    "email": "john@example.com",
    "uploadDate": "{{inputs.upload_date}}"  // Alternative field name
  }
}
```

## Benefits

1. **Accurate Application Tracking**: The application date reflects when the candidate actually applied (uploaded their resume)
2. **Separate Creation Date**: The `createdAt` field still tracks when the database record was created
3. **Backward Compatible**: Existing automations continue to work (falls back to current date)
4. **Flexible**: Supports both `applicationDate` and `uploadDate` field names

## Example Timeline

```
Day 1, 10:00 AM: Candidate uploads resume
  → upload_date = 2024-01-15 10:00:00
  → Queue item created

Day 1, 10:05 AM: Queue processor sends to webhook
  → inputs.upload_date = 2024-01-15 10:00:00

Day 1, 10:10 AM: Automation creates candidate
  → applicationDate = 2024-01-15 10:00:00 (from upload_date)
  → createdAt = 2024-01-15 10:10:00 (current time)
```

## Migration

No database migration required. The change is backward compatible:
- Existing candidates keep their current `applicationDate`
- New candidates will use the queue `upload_date`
- Automations that don't pass the date will use current date (existing behavior)
