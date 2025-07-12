# Webhook Management System

The webhook management system allows you to configure real-time notifications for various application events. This system provides a robust, scalable way to integrate with external systems and services.

## Features

- **Event-driven notifications**: Receive webhooks for candidate, position, user, resume, and comment events
- **Flexible authentication**: Support for Basic Auth, Bearer tokens, and custom headers
- **Retry logic**: Automatic retry with exponential backoff for failed deliveries
- **Comprehensive logging**: Full delivery history with request/response details
- **Real-time testing**: Test webhook configurations before going live
- **User-friendly interface**: Easy-to-use web interface for management

## Supported Events

### Candidate Events
- `candidate.created` - When a new candidate is created
- `candidate.updated` - When candidate information is updated
- `candidate.deleted` - When a candidate is deleted
- `candidate.stage_changed` - When a candidate moves between recruitment stages

### Position Events
- `position.created` - When a new position is created
- `position.updated` - When position details are updated
- `position.deleted` - When a position is deleted

### User Events
- `user.created` - When a new user is created
- `user.updated` - When user information is updated
- `user.deleted` - When a user is deleted

### Resume Events
- `resume.uploaded` - When a resume is uploaded
- `resume.processed` - When a resume is processed (AI analysis, etc.)

### Comment Events
- `comment.created` - When a comment is added to a candidate
- `comment.updated` - When a comment is modified
- `comment.deleted` - When a comment is deleted

### System Events
- `webhook.test` - Test event for validating webhook configurations

## Webhook Payload Format

All webhooks follow a consistent JSON payload format:

```json
{
  "event": "candidate.created",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "candidate": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "current_stage": "new",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  },
  "webhook_id": "webhook-uuid"
}
```

### Event-Specific Data

Each event type includes relevant data in the `data` field:

#### Candidate Events
```json
{
  "candidate": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "current_stage": "interview",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

For `candidate.stage_changed`, additional fields are included:
```json
{
  "candidate": { ... },
  "old_stage": "new",
  "new_stage": "interview"
}
```

#### Position Events
```json
{
  "position": {
    "id": "uuid",
    "title": "Senior Developer",
    "department": "Engineering",
    "description": "We are looking for...",
    "status": "active",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Resume Events
```json
{
  "resume": {
    "id": "uuid",
    "filename": "john_doe_resume.pdf",
    "file_size": 1024000,
    "mime_type": "application/pdf",
    "uploaded_at": "2024-01-15T10:30:00.000Z"
  },
  "candidate": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

For `resume.processed`, additional processing results are included:
```json
{
  "resume": { ... },
  "candidate": { ... },
  "processing_result": {
    "skills_extracted": ["JavaScript", "React", "Node.js"],
    "experience_years": 5,
    "confidence_score": 0.85
  }
}
```

## HTTP Headers

All webhooks include standard headers:

```
Content-Type: application/json
User-Agent: Recruitment-System-Webhook/1.0
X-Webhook-ID: webhook-uuid
X-Event-Type: candidate.created
X-Timestamp: 2024-01-15T10:30:00.000Z
```

Custom headers configured in the webhook settings are also included.

## Authentication Methods

### Basic Authentication
```http
Authorization: Basic base64(username:password)
```

### Bearer Token
```http
Authorization: Bearer your-token-here
```

### Custom Header
```http
X-API-Key: your-api-key-here
```

## Configuration

### Creating a Webhook

1. Navigate to **Settings > Webhook Management**
2. Click **Add Webhook**
3. Configure the following settings:

#### Basic Settings
- **Name**: Descriptive name for the webhook
- **URL**: The endpoint that will receive webhooks
- **HTTP Method**: GET, POST, PUT, or PATCH
- **Events**: Select which events to listen for
- **Active**: Enable/disable the webhook

#### Advanced Settings
- **Retry Count**: Number of retry attempts (0-10, default: 3)
- **Timeout**: Request timeout in seconds (5-300, default: 30)

#### Authentication
- **Type**: None, Basic, Bearer, or Custom Header
- **Credentials**: Username/password, token, or header name/value

#### Custom Headers
Add any additional HTTP headers needed by your endpoint.

### Testing Webhooks

1. In the webhook management interface, click the test tube icon
2. A test payload will be sent to your webhook URL
3. Check the delivery logs to verify the response

## Delivery Logs

Each webhook delivery is logged with:

- **Event type**: The event that triggered the webhook
- **Payload**: The complete request payload
- **Response status**: HTTP status code from your endpoint
- **Response body**: Response content from your endpoint
- **Success/failure**: Whether the delivery was successful
- **Error message**: Details if the delivery failed
- **Duration**: Time taken for the request
- **Timestamp**: When the webhook was sent

### Viewing Logs

1. Click the history icon next to any webhook
2. Use filters to search by event type, status, or date range
3. View detailed request/response information

## Best Practices

### Webhook Endpoint Requirements

Your webhook endpoint should:

1. **Respond quickly**: Return a 2xx status code within 30 seconds
2. **Handle duplicates**: Be idempotent (safe to process multiple times)
3. **Validate signatures**: Verify webhook authenticity if needed
4. **Log requests**: Keep your own logs for debugging
5. **Handle errors gracefully**: Don't crash on malformed requests

### Security Considerations

1. **Use HTTPS**: Always use secure endpoints
2. **Validate payloads**: Check that requests come from expected sources
3. **Rate limiting**: Implement rate limiting on your endpoint
4. **Authentication**: Use webhook authentication when possible

### Error Handling

The system automatically retries failed webhooks with exponential backoff:

- **Client errors (4xx)**: Not retried (assumed to be permanent)
- **Server errors (5xx)**: Retried up to the configured retry count
- **Network errors**: Retried with exponential backoff

### Monitoring

Monitor webhook health by:

1. **Checking delivery logs**: Look for failed deliveries
2. **Setting up alerts**: Configure notifications for webhook failures
3. **Testing regularly**: Use the test feature to verify endpoints
4. **Reviewing response times**: Monitor delivery duration

## API Integration

### Programmatic Webhook Management

Use the REST API to manage webhooks programmatically:

```bash
# List webhooks
GET /api/settings/webhooks

# Create webhook
POST /api/settings/webhooks
{
  "name": "My Webhook",
  "url": "https://my-endpoint.com/webhook",
  "events": ["candidate.created", "candidate.updated"],
  "method": "POST",
  "auth_type": "bearer",
  "auth_token": "my-token"
}

# Update webhook
PUT /api/settings/webhooks/{id}

# Delete webhook
DELETE /api/settings/webhooks/{id}

# Test webhook
POST /api/settings/webhooks/{id}/test

# Get webhook logs
GET /api/settings/webhooks/{id}/logs
```

### Webhook Dispatcher Integration

To dispatch webhooks from your code:

```typescript
import { dispatchWebhooks } from '@/lib/webhookDispatcher';

// Dispatch candidate events
await dispatchWebhooks.candidateCreated(candidate);
await dispatchWebhooks.candidateUpdated(candidate);
await dispatchWebhooks.candidateStageChanged(candidate, oldStage, newStage);

// Dispatch position events
await dispatchWebhooks.positionCreated(position);
await dispatchWebhooks.positionUpdated(position);

// Dispatch user events
await dispatchWebhooks.userCreated(user);
await dispatchWebhooks.userUpdated(user);

// Dispatch resume events
await dispatchWebhooks.resumeUploaded(resume, candidate);
await dispatchWebhooks.resumeProcessed(resume, candidate, processingResult);

// Dispatch comment events
await dispatchWebhooks.commentCreated(comment);
await dispatchWebhooks.commentUpdated(comment);
```

## Troubleshooting

### Common Issues

1. **Webhook not receiving events**
   - Check if webhook is active
   - Verify event types are selected
   - Check delivery logs for errors

2. **Authentication failures**
   - Verify credentials are correct
   - Check authentication type matches endpoint requirements
   - Ensure custom headers are properly formatted

3. **Timeout errors**
   - Increase timeout setting
   - Optimize your endpoint response time
   - Check for long-running operations

4. **Retry loops**
   - Check endpoint is returning proper status codes
   - Verify endpoint can handle the payload format
   - Review error messages in delivery logs

### Debugging

1. **Enable detailed logging**: Check server logs for webhook dispatcher messages
2. **Test with simple endpoint**: Use a service like webhook.site for testing
3. **Check network connectivity**: Ensure your endpoint is accessible
4. **Validate payload format**: Verify your endpoint can parse the JSON payload

## Migration from Legacy Webhooks

If you have existing webhook configurations:

1. **Export current settings**: Save your existing webhook configurations
2. **Create new webhooks**: Use the new webhook management interface
3. **Test thoroughly**: Verify all events are working correctly
4. **Update integrations**: Update any external systems using the old webhooks
5. **Remove old configurations**: Clean up legacy webhook settings

## Support

For issues with the webhook system:

1. Check the delivery logs for specific error messages
2. Review the troubleshooting section above
3. Contact system administrators for persistent issues
4. Check server logs for additional debugging information 