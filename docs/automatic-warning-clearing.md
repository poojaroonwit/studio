# Automatic Warning Clearing System

## Overview

The warning system automatically clears warnings when conditions are resolved. This document explains how the system works and how to ensure warnings are cleared automatically.

## How It Works

### 1. Automatic Clearing on Entity Updates
When entities (positions, candidates, headcounts) are created or updated, the system automatically:
- Re-evaluates all warning conditions for that entity
- Creates new warnings for conditions that are now valid
- Updates existing warnings with current values
- **Automatically clears warnings for conditions that are no longer valid**

### 2. Manual Trigger
You can manually trigger warning clearing using:
- The UI component: `AutoWarningClear`
- The API endpoint: `POST /api/warnings/auto-clear`
- The command-line script: `node scripts/clear-resolved-warnings.cjs`

### 3. Scheduled Clearing (Recommended)
For production environments, set up a scheduled task to run the clearing script periodically.

## Setup Instructions

### Option 1: Manual UI Trigger
1. Navigate to the warning management page
2. Use the "Auto Warning Clear" component to manually trigger clearing
3. This is good for immediate clearing when needed

### Option 2: API Endpoint
```bash
curl -X POST http://your-domain/api/warnings/auto-clear \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Option 3: Command Line Script
```bash
# Run once
node scripts/clear-resolved-warnings.cjs

# Set up as cron job (every hour)
0 * * * * cd /path/to/your/app && node scripts/clear-resolved-warnings.cjs
```

### Option 4: Scheduled Task (Recommended for Production)

#### Using Windows Task Scheduler:
1. Open Task Scheduler
2. Create a new Basic Task
3. Set trigger to run every hour
4. Action: Start a program
5. Program: `node`
6. Arguments: `scripts/clear-resolved-warnings.cjs`
7. Start in: `C:\path\to\your\app`

#### Using Linux Cron:
```bash
# Edit crontab
crontab -e

# Add this line to run every hour
0 * * * * cd /path/to/your/app && node scripts/clear-resolved-warnings.cjs >> /var/log/warning-clear.log 2>&1
```

#### Using Docker/Container:
If running in a container, add to your Dockerfile:
```dockerfile
# Install cron
RUN apt-get update && apt-get install -y cron

# Add cron job
RUN echo "0 * * * * cd /app && node scripts/clear-resolved-warnings.cjs" > /etc/cron.d/warning-clear
RUN chmod 0644 /etc/cron.d/warning-clear
RUN crontab /etc/cron.d/warning-clear

# Start cron in your entrypoint
CMD ["cron", "-f"]
```

## Monitoring

### Logs
The system provides detailed logging:
- Console logs show which warnings are being checked and cleared
- Audit logs record when automatic clearing is performed
- Error logs capture any issues during the process

### Metrics
The API returns metrics after each run:
- `totalWarnings`: Total warnings checked
- `warningsResolved`: Number of warnings cleared
- `errorsEncountered`: Number of errors during processing

## Troubleshooting

### Warnings Not Clearing Automatically

1. **Check if `createOrUpdateWarnings` is being called**
   - Verify the method is called in API routes when entities are updated
   - Check console logs for warning evaluation messages

2. **Check warning evaluation logic**
   - Ensure conditions are being evaluated correctly
   - Verify field values are being retrieved properly

3. **Check database permissions**
   - Ensure the application has permission to delete warning records
   - Verify foreign key constraints are not preventing deletion

4. **Run manual clearing**
   - Use the manual trigger to see if warnings can be cleared
   - Check the logs for any errors

### Common Issues

1. **Warnings persist after data changes**
   - The `createOrUpdateWarnings` method might not be called
   - Check if the entity update API routes include warning checks

2. **Performance issues with large datasets**
   - Consider running the clearing script during off-peak hours
   - Implement batch processing for large numbers of warnings

3. **Cross-entity conditions not clearing**
   - Ensure all related entities are being loaded properly
   - Check if the relationship data is up to date

## Best Practices

1. **Set up scheduled clearing**
   - Run the clearing script every hour in production
   - Monitor logs for any issues

2. **Monitor warning counts**
   - Track the number of active warnings over time
   - Set up alerts if warning counts grow unexpectedly

3. **Test warning configurations**
   - Verify that warning conditions work as expected
   - Test both creation and clearing of warnings

4. **Backup before major changes**
   - Always backup warning data before making changes
   - Test clearing logic in a development environment first

## API Reference

### POST /api/warnings/auto-clear
Triggers automatic clearing of resolved warnings.

**Response:**
```json
{
  "success": true,
  "message": "Automatic warning resolution completed",
  "totalWarnings": 34,
  "warningsResolved": 7,
  "errorsEncountered": 0
}
```

### GET /api/warnings/clear?entityType=candidate&entityId=123
Gets warnings for a specific entity.

**Response:**
```json
{
  "warnings": [
    {
      "id": "warning-id",
      "message": "Warning message",
      "severity": "warning",
      "configuration": {
        "name": "Warning Name",
        "description": "Warning Description"
      }
    }
  ]
}
```

## Conclusion

The automatic warning clearing system ensures that warnings are automatically removed when conditions are resolved. By setting up scheduled clearing and monitoring the system, you can maintain a clean and accurate warning system without manual intervention.
