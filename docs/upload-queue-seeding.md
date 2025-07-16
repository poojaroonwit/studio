# Upload Queue Seeding Documentation

This document describes the upload queue seeding functionality that provides sample data for testing and development purposes.

## Overview

The upload queue seeding system creates realistic sample data for:
- **Upload Queue Items** - Various file upload scenarios with different statuses
- **Webhooks** - Sample webhook configurations for different integrations
- **Webhook Logs** - Historical webhook delivery logs for testing

## Database Schema

### UploadQueue Model
```sql
model UploadQueue {
  id             String   @id @default(uuid()) @db.Uuid
  fileName       String   @map("file_name")
  fileSize       BigInt   @map("file_size")
  status         String   // pending, processing, completed, failed
  error          String?
  errorDetails   String?  @map("error_details")
  source         String?  // manual_upload, bulk_import, api_upload, webhook_trigger
  uploadDate     DateTime @default(now()) @map("upload_date")
  completedDate  DateTime? @map("completed_date")
  uploadId       String?  @map("upload_id")
  createdBy      String?  @db.Uuid @map("created_by")
  updatedAt      DateTime @default(now()) @map("updatedAt")
  filePath       String   @map("file_path")
  webhookPayload Json?    @map("webhook_payload")
  positionId     String?  @db.Uuid @map("position_id")
}
```

### Webhook Model
```sql
model Webhook {
  id                String   @id @default(uuid()) @db.Uuid
  name              String
  url               String
  events            String[] // Array of event types
  method            String   // GET, POST, PUT, PATCH
  is_active         Boolean  @default(true) @map("is_active")
  auth_type         String   @default("none") @map("auth_type")
  auth_username     String?  @map("auth_username")
  auth_password     String?  @map("auth_password")
  auth_token        String?  @map("auth_token")
  auth_header_name  String?  @map("auth_header_name")
  auth_header_value String?  @map("auth_header_value")
  headers           Json?    // Custom headers
  retry_count       Int      @default(3) @map("retry_count")
  timeout           Int      @default(30)
  createdAt        DateTime @default(now()) @map("createdAt")
  updatedAt        DateTime @updatedAt @map("updatedAt")
}
```

### WebhookLog Model
```sql
model WebhookLog {
  id             String   @id @default(uuid()) @db.Uuid
  webhook_id     String   @db.Uuid @map("webhook_id")
  event_type     String   @map("event_type")
  payload        Json     // The webhook payload sent
  response_status Int?    @map("response_status")
  response_body  String?  @map("response_body")
  success        Boolean
  error_message  String?  @map("error_message")
  duration_ms    Int      @default(0) @map("duration_ms")
  createdAt     DateTime @default(now()) @map("createdAt")
}
```

## Sample Data

### Upload Queue Items (10 items)

The seeding creates 10 sample upload queue items with various characteristics:

#### Status Distribution:
- **Pending**: 3 items (30%)
- **Processing**: 3 items (30%)
- **Completed**: 2 items (20%)
- **Failed**: 2 items (20%)

#### Source Distribution:
- **Manual Upload**: 3 items
- **Bulk Import**: 3 items
- **API Upload**: 2 items
- **Webhook Trigger**: 2 items

#### File Types:
- **PDF**: 6 items (60%)
- **DOCX**: 4 items (40%)

#### File Sizes:
- **Small** (100-200KB): 3 items
- **Medium** (200-400KB): 4 items
- **Large** (400-600KB): 2 items
- **Oversized** (600KB+): 1 item (failed)

### Sample Webhooks (4 items)

1. **Slack Notifications**
   - Events: candidate.created, candidate.updated, position.created
   - Auth: None
   - Status: Active

2. **CRM Integration**
   - Events: candidate.created, candidate.stage_changed
   - Auth: Bearer token
   - Status: Active

3. **Email Service**
   - Events: candidate.created, position.filled
   - Auth: Basic authentication
   - Status: Inactive

4. **Analytics Dashboard**
   - Events: All candidate and position events
   - Auth: Custom header
   - Status: Active

### Sample Webhook Logs (4 items)

- **Successful deliveries**: 3 logs
- **Failed deliveries**: 1 log
- **Event types**: candidate.created, candidate.stage_changed, position.created
- **Response times**: 156ms - 312ms

## Usage

### Running the Seed

#### Option 1: Full Database Seed
```bash
npm run db:seed
# or
npx prisma db seed
```

#### Option 2: Upload Queue Only
```bash
npm run seed:upload-queue
```

### Prerequisites

Before running the upload queue seed, ensure:
1. Database is set up and migrated
2. Admin user exists (`admin@ncc.com`)
3. Default positions exist (Software Engineer, Product Manager)

### Verification

After seeding, you can verify the data:

```sql
-- Check upload queue items
SELECT status, COUNT(*) FROM upload_queue GROUP BY status;

-- Check webhooks
SELECT name, is_active, auth_type FROM webhook;

-- Check webhook logs
SELECT event_type, success, COUNT(*) FROM webhook_log GROUP BY event_type, success;
```

## Sample Data Details

### Upload Queue Items

| ID | File Name | Status | Source | Size | Position |
|----|-----------|--------|--------|------|----------|
| 40000000-0000-0000-0000-000000000001 | john_doe_resume.pdf | pending | manual_upload | 240KB | Software Engineer |
| 40000000-0000-0000-0000-000000000002 | jane_smith_cv.docx | processing | bulk_import | 500KB | Product Manager |
| 40000000-0000-0000-0000-000000000003 | mike_johnson_resume.pdf | completed | api_upload | 100KB | Software Engineer |
| 40000000-0000-0000-0000-000000000004 | sarah_wilson_cv.pdf | failed | manual_upload | 750KB | Product Manager |
| 40000000-0000-0000-0000-000000000005 | david_brown_resume.docx | pending | webhook_trigger | 300KB | Software Engineer |
| 40000000-0000-0000-0000-000000000006 | emma_davis_cv.pdf | processing | bulk_import | 400KB | Product Manager |
| 40000000-0000-0000-0000-000000000007 | alex_taylor_resume.pdf | completed | manual_upload | 150KB | Software Engineer |
| 40000000-0000-0000-0000-000000000008 | lisa_anderson_cv.docx | failed | api_upload | 600KB | Product Manager |
| 40000000-0000-0000-0000-000000000009 | robert_lee_resume.pdf | pending | webhook_trigger | 200KB | Software Engineer |
| 40000000-0000-0000-0000-000000000010 | maria_garcia_cv.pdf | processing | bulk_import | 350KB | Product Manager |

### Webhook Configurations

| Name | URL | Events | Auth Type | Status |
|------|-----|--------|-----------|--------|
| Slack Notifications | hooks.slack.com | candidate.created, candidate.updated, position.created | None | Active |
| CRM Integration | api.crm.example.com | candidate.created, candidate.stage_changed | Bearer | Active |
| Email Service | api.emailservice.com | candidate.created, position.filled | Basic | Inactive |
| Analytics Dashboard | analytics.example.com | All events | Header | Active |

## Error Scenarios

The sample data includes realistic error scenarios:

1. **File Format Error**: Corrupted or unsupported file format
2. **File Size Limit**: File exceeds maximum allowed size
3. **Authentication Failure**: Invalid credentials in webhook delivery
4. **Network Timeout**: Slow response times

## Customization

To customize the seed data:

1. **Modify `prisma/seed.ts`** for full database seeding
2. **Modify `scripts/seed-upload-queue.js`** for upload queue only
3. **Add new scenarios** by extending the arrays
4. **Change file sizes** by modifying the BigInt values
5. **Update statuses** to test different workflow states

## Testing

The seeded data supports testing of:

- **Upload Queue Management**: View, filter, and manage uploads
- **Webhook Configuration**: Create, edit, and test webhooks
- **Webhook Delivery**: Monitor delivery logs and retry mechanisms
- **Error Handling**: Test various error scenarios
- **Performance**: Measure processing times and throughput

## Maintenance

### Updating Seed Data

1. **Add new scenarios**: Extend the arrays with new test cases
2. **Update existing data**: Modify values to reflect new requirements
3. **Version control**: Keep seed data in sync with schema changes
4. **Documentation**: Update this document when adding new scenarios

### Cleanup

To remove seeded data:

```sql
-- Remove upload queue items
DELETE FROM upload_queue WHERE id LIKE '40000000-%';

-- Remove webhooks
DELETE FROM webhook WHERE id LIKE '50000000-%';

-- Remove webhook logs
DELETE FROM webhook_log WHERE id LIKE '60000000-%';
```

## Troubleshooting

### Common Issues

1. **Admin user not found**: Run full seed first
2. **Position not found**: Ensure default positions exist
3. **Database connection**: Check DATABASE_URL environment variable
4. **Permission errors**: Ensure database user has write permissions

### Debug Commands

```bash
# Check database connection
npm run db:check

# Verify schema
npx prisma db pull

# Reset database (WARNING: Destructive)
npx prisma migrate reset

# View current data
npx prisma studio
``` 