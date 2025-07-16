# Webhook Management System

## Overview

The webhook management system allows you to receive real-time notifications when events occur in your recruitment system. Instead of polling the API for updates, webhooks push data to your endpoint in real-time.

## Features

### ✅ Core Functionality
- **Webhook Creation & Management** - Create, edit, and delete webhooks
- **Event Selection** - Choose which events to receive notifications for
- **Authentication Support** - Basic, Bearer token, and custom header authentication
- **Custom Headers** - Add custom headers to webhook requests
- **Retry Logic** - Automatic retry with exponential backoff for failed deliveries
- **Timeout Handling** - Configurable timeout settings
- **Delivery Logs** - Track webhook delivery success/failure
- **Testing** - Test webhooks before going live
- **Bulk Operations** - Enable/disable/delete multiple webhooks
- **Export** - Export webhook configurations

### ✅ Available Events

#### Candidate Events
- `candidate.created` - When a candidate is created
- `candidate.updated` - When a candidate is updated
- `candidate.deleted` - When a candidate is deleted
- `candidate.stage_changed` - When a candidate changes stage

#### Position Events
- `position.created` - When a position is created
- `position.updated` - When a position is updated
- `position.deleted` - When a position is deleted

#### User Events
- `user.created` - When a user is created
- `user.updated` - When a user is updated
- `user.deleted` - When a user is deleted

#### Resume Events
- `resume.uploaded` - When a resume is uploaded
- `resume.processed` - When a resume is processed

#### Comment Events
- `comment.created` - When a comment is created
- `comment.updated` - When a comment is updated
- `comment.deleted` - When a comment is deleted

#### Upload Queue Events
- `upload_queue.created` - When an upload queue item is created
- `upload_queue.processing` - When an upload queue item is processing
- `upload_queue.completed` - When an upload queue item is completed
- `upload_queue.failed` - When an upload queue item fails
- `upload_queue.retry` - When an upload queue item is retried

## Quick Start

### 1. Access Webhook Management
Navigate to **Settings → Webhook Management** in your application.

### 2. Create a Webhook
1. Click **"Add Webhook"**
2. Fill in the webhook details:
   - **Name**: A descriptive name for your webhook
   - **URL**: Your endpoint URL (must be HTTPS)
   - **Method**: HTTP method (GET, POST, PUT, PATCH)
   - **Events**: Select which events you want to receive
   - **Authentication**: Configure if needed
   - **Headers**: Add custom headers if needed
   - **Timeout**: Set timeout in seconds (5-300)
   - **Retry Count**: Number of retry attempts (0-10)

### 3. Test Your Webhook
1. Click the **"Test"** button in the webhook actions menu
2. Check the test results
3. Verify your endpoint received the test payload

### 4. Monitor Logs
1. Click **"View Logs"** to see delivery history
2. Filter by success/failure status
3. Search through logs for specific events

## API Reference

### Webhook Endpoints

#### List Webhooks
```http
GET /api/settings/webhooks
```

#### Create Webhook
```http
POST /api/settings/webhooks
Content-Type: application/json

{
  "name": "My Webhook",
  "url": "https://your-endpoint.com/webhook",
  "events": ["candidate.created", "position.created"],
  "method": "POST",
  "is_active": true,
  "auth_type": "none",
  "headers": {},
  "retry_count": 3,
  "timeout": 30
}
```

#### Update Webhook
```http
PUT /api/settings/webhooks/{id}
Content-Type: application/json

{
  "name": "Updated Webhook Name",
  "events": ["candidate.created"]
}
```

#### Delete Webhook
```http
DELETE /api/settings/webhooks/{id}
```

#### Test Webhook
```http
POST /api/settings/webhooks/{id}/test
```

#### Get Webhook Logs
```http
GET /api/settings/webhooks/{id}/logs?page=1&limit=20&filter=all&search=test
```

#### Export Webhooks
```http
GET /api/settings/webhooks/export
```

#### Bulk Actions
```http
POST /api/settings/webhooks/bulk-action
Content-Type: application/json

{
  "webhook_ids": ["id1", "id2"],
  "action": "enable" // or "disable", "delete"
}
```

### Webhook Payload Format

All webhook payloads follow this structure:

```json
{
  "event": "candidate.created",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "candidate": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "status": "Applied",
      "position_id": "550e8400-e29b-41d4-a716-446655440001",
      "application_date": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### Headers

Webhook requests include these standard headers:

```
Content-Type: application/json
User-Agent: Recruitment-System-Webhook/1.0
X-Webhook-ID: {webhook_id}
X-Event-Type: {event_type}
X-Timestamp: {timestamp}
```

## Authentication

### Basic Authentication
```json
{
  "auth_type": "basic",
  "auth_username": "your-username",
  "auth_password": "your-password"
}
```

### Bearer Token
```json
{
  "auth_type": "bearer",
  "auth_token": "your-bearer-token"
}
```

### Custom Header
```json
{
  "auth_type": "header",
  "auth_header_name": "X-API-Key",
  "auth_header_value": "your-api-key"
}
```

## Security Best Practices

### 1. Use HTTPS
All webhook endpoints must use HTTPS to ensure data security in transit.

### 2. Implement Authentication
Use one of the supported authentication methods to verify webhook requests.

### 3. Validate Payloads
Always validate the webhook payload structure and content.

### 4. Handle Idempotency
Design your webhook handlers to be idempotent. The same webhook might be sent multiple times due to retries.

### 5. Process Quickly
Return a response within 30 seconds to avoid timeouts.

### 6. Log Everything
Log all webhook requests for debugging and audit purposes.

## Error Handling

### HTTP Status Codes
- `200-299`: Success - Webhook was processed successfully
- `4xx`: Client Error - Webhook will be retried
- `5xx`: Server Error - Webhook will be retried

### Retry Logic
- Failed webhooks are retried with exponential backoff
- Retry delays: 1s, 5s, 15s, 30s, 60s
- Maximum retry count is configurable per webhook

### Timeout Handling
- Webhook requests timeout after the configured timeout period
- Timeout errors are logged and retried

## Testing

### Using the Test Feature
1. Create a webhook in the management interface
2. Click the "Test" button
3. Check the test results
4. Verify your endpoint received the payload

### Using the Test Script
```bash
# Set your test webhook URL
export TEST_WEBHOOK_URL="https://webhook.site/your-unique-url"

# Run the test script
node scripts/test-webhooks.js
```

### Manual Testing
You can also test webhooks by:
1. Creating a test candidate/position
2. Checking the webhook logs
3. Verifying your endpoint received the notification

## Monitoring

### Webhook Logs
- View delivery history for each webhook
- Filter by success/failure status
- Search through logs
- Export logs for analysis

### Health Monitoring
- Check webhook status in the management interface
- Monitor delivery success rates
- Set up alerts for failed webhooks

## Troubleshooting

### Common Issues

#### Webhook Not Receiving Data
1. Check if the webhook is active
2. Verify the endpoint URL is correct and accessible
3. Check authentication settings
4. Review webhook logs for errors

#### Authentication Failures
1. Verify credentials are correct
2. Check if your endpoint expects the authentication method
3. Test with a simple endpoint first

#### Timeout Errors
1. Ensure your endpoint responds quickly
2. Increase the timeout setting if needed
3. Optimize your webhook handler

#### Retry Loops
1. Check if your endpoint is returning 4xx/5xx status codes
2. Verify the payload format is correct
3. Check webhook logs for specific error messages

### Debugging Tips
1. Use the test feature to verify webhook configuration
2. Check webhook logs for detailed error information
3. Test with a simple webhook endpoint (like webhook.site)
4. Monitor your endpoint's logs for incoming requests

## Integration Examples

### Node.js/Express
```javascript
app.post('/webhooks/recruitment', (req, res) => {
  const { event, timestamp, data } = req.body;
  
  // Validate webhook signature if needed
  // Process the webhook data
  console.log('Received webhook:', event, data);
  
  // Return success
  res.status(200).json({ received: true });
});
```

### Python/Flask
```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhooks/recruitment', methods=['POST'])
def webhook_handler():
    data = request.get_json()
    event = data.get('event')
    timestamp = data.get('timestamp')
    payload = data.get('data')
    
    # Process the webhook
    print(f"Received {event} at {timestamp}")
    
    return jsonify({'received': True}), 200
```

### PHP
```php
<?php
$input = file_get_contents('php://input');
$data = json_decode($input, true);

$event = $data['event'];
$timestamp = $data['timestamp'];
$payload = $data['data'];

// Process the webhook
error_log("Received webhook: $event");

http_response_code(200);
echo json_encode(['received' => true]);
?>
```

## Support

For issues with the webhook system:
1. Check the webhook logs for error details
2. Review this documentation
3. Test with the provided test script
4. Contact support with specific error messages and logs

## Changelog

### Version 1.0.0
- Initial webhook management system
- Support for all major events
- Authentication and retry logic
- Comprehensive logging and monitoring
- Bulk operations and export functionality 