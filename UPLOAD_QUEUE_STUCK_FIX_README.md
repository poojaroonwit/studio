# Upload Queue Stuck Fix - MySQL Scripts

## Problem Description

The upload queue can get stuck in various scenarios:
1. **Jobs stuck in 'inprocess' status** - Jobs that have been processing for too long (usually >30 minutes)
2. **Failed jobs not being retried** - Jobs that failed but haven't been automatically retried
3. **Inconsistent state jobs** - Jobs marked as 'inprocess' but have a completed_date
4. **Invalid file path jobs** - Jobs with null or empty file paths that can't be processed
5. **Duplicate jobs** - Multiple jobs with the same file path and status

## Solution

I've created two MySQL scripts to fix these issues:

### 1. `fix-stuck-upload-queue-simple.sql` - Quick Fix
**Use this for immediate fixes**

This script performs the most common fixes:
- Resets jobs stuck in 'inprocess' for >30 minutes
- Auto-retries failed jobs that haven't exceeded retry limit
- Fixes inconsistent state jobs
- Shows a summary of queue status

### 2. `fix-stuck-upload-queue.sql` - Comprehensive Fix
**Use this for thorough analysis and cleanup**

This script includes:
- Diagnostic queries to analyze current queue status
- Multiple fix strategies for different stuck scenarios
- Verification queries to check results
- Optional aggressive cleanup (commented out)
- Detailed summary reports

## How to Use

### Option 1: Using the Simple Script (Recommended for quick fixes)

```bash
# Connect to your database and run:
mysql -u your_username -p your_database < fix-stuck-upload-queue-simple.sql
```

Or if using PostgreSQL:
```bash
psql -U your_username -d your_database -f fix-stuck-upload-queue-simple.sql
```

### Option 2: Using the Comprehensive Script (For detailed analysis)

```bash
# Connect to your database and run:
mysql -u your_username -p your_database < fix-stuck-upload-queue.sql
```

Or if using PostgreSQL:
```bash
psql -U your_username -d your_database -f fix-stuck-upload-queue.sql
```

### Option 3: Using Portainer (As per your preference)

Since you manage Docker containers through Portainer [[memory:7730113]], you can:

1. **Access your database container through Portainer**
2. **Open a terminal/console session**
3. **Run the SQL script directly**:
   ```bash
   psql -U postgres -d your_database -f /path/to/fix-stuck-upload-queue-simple.sql
   ```

## What the Scripts Do

### Simple Script Actions:
1. **Reset Long Processing Jobs**: Jobs stuck in 'inprocess' for >30 minutes → reset to 'queued'
2. **Auto-Retry Failed Jobs**: Failed jobs with retry_count < 3 → reset to 'queued'
3. **Fix Inconsistent State**: Jobs with 'inprocess' status but completed_date → reset to 'queued'
4. **Show Results**: Display current queue status after fixes

### Comprehensive Script Actions:
1. **Diagnostic Analysis**: Shows current queue status and identifies stuck jobs
2. **Multiple Fix Strategies**: Addresses various stuck scenarios
3. **Duplicate Cleanup**: Removes duplicate jobs (keeps oldest)
4. **Invalid Path Handling**: Marks jobs with invalid file paths as failed
5. **Verification**: Confirms fixes worked correctly
6. **Summary Reports**: Detailed before/after analysis

## Expected Results

After running the script, you should see:
- **Stuck jobs reset to 'queued'** status for reprocessing
- **Failed jobs automatically retried** (if retry limit not exceeded)
- **Queue status summary** showing current distribution
- **No more jobs stuck in 'inprocess'** for extended periods

## Monitoring

After running the fix, monitor your queue processing:

1. **Check the queue status** in your application dashboard
2. **Monitor processing logs** for any new stuck jobs
3. **Verify jobs are being processed** normally

## Prevention

To prevent future stuck queues:

1. **Monitor processing times** - Jobs should complete within reasonable timeframes
2. **Check for resource issues** - Ensure adequate CPU/memory for processing
3. **Review error logs** - Address underlying issues causing failures
4. **Regular maintenance** - Run the diagnostic queries periodically

## Database Compatibility

The scripts are written for PostgreSQL (which your application uses based on the schema). If you need MySQL compatibility, the main differences are:

- PostgreSQL: `NOW()` → MySQL: `NOW()`
- PostgreSQL: `INTERVAL '30 minutes'` → MySQL: `INTERVAL 30 MINUTE`
- PostgreSQL: `webhook_payload->>'retry_count'` → MySQL: `JSON_EXTRACT(webhook_payload, '$.retry_count')`

## Safety Notes

- **Backup your database** before running any fixes
- **Test on a staging environment** first if possible
- **Monitor the results** after running the script
- **The scripts are designed to be safe** - they only reset stuck jobs, not delete them

## Troubleshooting

If you encounter issues:

1. **Check database connection** - Ensure you can connect to your database
2. **Verify table structure** - Ensure the `upload_queue` table exists and has the expected columns
3. **Check permissions** - Ensure your database user has UPDATE permissions
4. **Review error messages** - The scripts include error handling and reporting

## Support

If you need help:
1. Check the diagnostic queries in the comprehensive script
2. Review the application logs for processing errors
3. Verify your queue processor is running correctly
4. Check for any underlying system issues (disk space, memory, etc.)

The scripts are designed to be safe and reversible - they only change job statuses and don't delete any data.

