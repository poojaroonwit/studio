# Email Fields for Candidates

## Overview

The system now supports tracking email-related metadata for candidates who apply via email. These fields are optional and can be used to store information about the original application email.

## New Fields

### Candidate Model

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `emailDate` | DateTime | Date/time when the application email was sent | No |
| `emailSubject` | String | Subject line of the application email | No |
| `emailId` | String | Unique email message ID (e.g., Message-ID header) | No |
| `emailMetadata` | JSON | Additional email metadata (headers, thread info, etc.) | No |

### Upload Queue Model

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `email_date` | DateTime | Date/time when the application email was sent | No |
| `email_subject` | String | Subject line of the application email | No |
| `email_id` | String | Unique email message ID | No |
| `email_metadata` | JSON | Additional email metadata | No |

## Use Cases

### 1. Email-Based Applications
When a candidate applies by sending an email with their resume:
- `emailDate`: When the email was sent
- `emailSubject`: "Application for Senior Developer Position"
- `emailId`: Unique message ID from email headers
- `emailMetadata`: Additional context (CC, BCC, thread ID, etc.)

### 2. Email Integration
For systems that process incoming emails and create candidates:
- Track the original email for reference
- Link candidates back to email threads
- Maintain audit trail of email communications

### 3. Application Tracking
- Distinguish between web applications and email applications
- Track response times from email receipt to candidate creation
- Analyze email subject patterns

## API Usage

### Automation API (`/api/automation/create-candidate-with-matches`)

```json
{
  "candidate": {
    "name": "John Doe",
    "email": "john@example.com",
    "applicationDate": "2024-01-15T10:00:00Z",
    "emailDate": "2024-01-15T09:55:00Z",
    "emailSubject": "Application for Senior Developer",
    "emailId": "<abc123@mail.example.com>",
    "emailMetadata": {
      "from": "john@example.com",
      "to": "jobs@company.com",
      "cc": ["hr@company.com"],
      "threadId": "thread-xyz",
      "inReplyTo": null
    }
  }
}
```

### V1 API (`/api/v1/candidates`)

```json
{
  "candidate_info": {
    "contact_info": {
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    "personal_info": {
      "firstname": "John",
      "lastname": "Doe"
    },
    "emailDate": "2024-01-15T09:55:00Z",
    "emailSubject": "Application for Senior Developer",
    "emailId": "<abc123@mail.example.com>",
    "emailMetadata": {
      "from": "john@example.com",
      "to": "jobs@company.com"
    }
  }
}
```

## Upload Queue Integration

When uploading a resume from an email, include email fields in the upload:

```json
{
  "file": "<resume.pdf>",
  "positionId": "uuid",
  "sourceId": "uuid",
  "emailDate": "2024-01-15T09:55:00Z",
  "emailSubject": "Application for Senior Developer",
  "emailId": "<abc123@mail.example.com>",
  "emailMetadata": {
    "from": "john@example.com",
    "to": "jobs@company.com"
  }
}
```

These fields will be:
1. Stored in the upload queue
2. Passed to the webhook in the `inputs` object
3. Used by the automation to create the candidate with email metadata

## Webhook Payload

The webhook receives email fields in the inputs:

```json
{
  "inputs": {
    "cv_url": "https://...",
    "upload_date": "2024-01-15T10:00:00Z",
    "email_date": "2024-01-15T09:55:00Z",
    "email_subject": "Application for Senior Developer",
    "email_id": "<abc123@mail.example.com>",
    "email_metadata": {
      "from": "john@example.com",
      "to": "jobs@company.com"
    }
  }
}
```

## Database Migration

Run the migration to add these fields:

```bash
npm run db:migrate
```

Or manually apply:

```sql
-- Add to Candidate table
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "emailDate" TIMESTAMP(3);
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "emailSubject" TEXT;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "emailId" TEXT;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "emailMetadata" JSONB;

-- Add to UploadQueue table
ALTER TABLE "upload_queue" ADD COLUMN IF NOT EXISTS "email_date" TIMESTAMP(3);
ALTER TABLE "upload_queue" ADD COLUMN IF NOT EXISTS "email_subject" TEXT;
ALTER TABLE "upload_queue" ADD COLUMN IF NOT EXISTS "email_id" TEXT;
ALTER TABLE "upload_queue" ADD COLUMN IF NOT EXISTS "email_metadata" JSONB;
```

## Example Email Metadata Structure

```json
{
  "from": "john.doe@example.com",
  "to": ["jobs@company.com"],
  "cc": ["hr@company.com"],
  "bcc": [],
  "replyTo": "john.doe@example.com",
  "messageId": "<abc123@mail.example.com>",
  "inReplyTo": null,
  "references": [],
  "threadId": "thread-xyz-789",
  "labels": ["inbox", "important"],
  "headers": {
    "X-Mailer": "Gmail",
    "X-Priority": "3"
  },
  "attachmentCount": 1,
  "hasInlineImages": false
}
```

## Benefits

✅ **Complete Audit Trail**: Track the original email for every email-based application  
✅ **Email Threading**: Link candidates to email conversations  
✅ **Source Attribution**: Distinguish email applications from web applications  
✅ **Response Tracking**: Measure time from email receipt to candidate processing  
✅ **Flexible Metadata**: Store any additional email context needed  
✅ **Backward Compatible**: All fields are optional, existing functionality unchanged  

## Notes

- All email fields are optional and nullable
- Fields are not required in the database schema
- Existing candidates without email data will have null values
- Email metadata can store any JSON structure
- Use `emailId` for deduplication of email-based applications
