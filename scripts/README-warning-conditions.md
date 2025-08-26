# Warning Conditions Initialization Script

This script ensures that all users have the required warning conditions configured and up to date.

## Overview

The `initialize-warning-conditions.cjs` script checks for the existence of predefined warning conditions for all users and either creates them if they don't exist or updates them if they're outdated.

## Required Warning Conditions

The script ensures the following warning conditions are available for all users:

1. **Position hiring Over Grade SLA** - Warns when a position has been open longer than the grade SLA days
2. **Candidate No Source** - Warns when a candidate has no source assigned
3. **Candidate No Recruiter Assigned** - Warns when a candidate has no recruiter assigned
4. **Candidate No Email** - Warns when a candidate has no email address
5. **Position No Recruiter Assigned** - Warns when a position has no recruiter assigned
6. **Position Open But No Vacant Headcount** - Warns when a position is open (simplified condition)
7. **Position No Grade Assigned** - Warns when a position has no grade assigned
8. **Position No Hiring Date** - Warns when a position has no hiring date set

## Usage

### Run the script

```bash
npm run init-warning-conditions
```

Or run directly:

```bash
node scripts/initialize-warning-conditions.cjs
```

### What the script does

1. **Fetches all users** from the database
2. **For each user**, checks if they have the required warning conditions
3. **Creates missing conditions** with the correct configuration
4. **Updates outdated conditions** to match the current specification
5. **Skips conditions** that are already up to date
6. **Provides detailed logging** of all operations
7. **Verifies results** by counting conditions per user

### Output Example

```
🚀 Starting warning conditions initialization...
📊 Found 5 users to process

👤 Processing user: John Doe (user-123)
  ➕ Created: Position hiring Over Grade SLA
  ✅ Updated: Candidate No Source
  ⏭️  Skipped (up to date): Candidate No Recruiter Assigned
  ➕ Created: Candidate No Email
  ...

📈 Initialization Summary:
  • Total users processed: 5
  • Conditions created: 12
  • Conditions updated: 8
  • Conditions skipped (up to date): 25
  • Total conditions processed: 45

🔍 Verification:
  John Doe: 9 conditions (9 active)
  Jane Smith: 9 conditions (9 active)
  ...

✅ Warning conditions initialization completed successfully!
```

## Configuration

The warning conditions are defined in the `REQUIRED_WARNING_CONDITIONS` array at the top of the script. Each condition includes:

- **name**: Unique identifier for the warning
- **description**: Human-readable description
- **severity**: Warning level (info, warning, error, critical)
- **isActive**: Whether the warning is enabled
- **isPublic**: Whether the warning is public
- **conditionGroups**: Array of condition groups with logical operators
- **groupsLogicalOperator**: How to combine multiple groups (AND/OR)

## Safety Features

- **Idempotent**: Can be run multiple times safely
- **Non-destructive**: Only updates conditions that need changes
- **Detailed logging**: Shows exactly what was created, updated, or skipped
- **Verification**: Confirms the final state after execution
- **Error handling**: Graceful error handling with proper cleanup

## Integration

This script can be integrated into:

- **Deployment pipelines** to ensure warning conditions are set up
- **Database migrations** to initialize warning conditions
- **User onboarding** to provide default warning configurations
- **System maintenance** to keep warning conditions up to date

## Troubleshooting

### Common Issues

1. **Database connection errors**: Ensure the database is accessible and Prisma is configured correctly
2. **Permission errors**: Ensure the database user has read/write permissions
3. **Schema mismatches**: Ensure the database schema matches the Prisma schema

### Debug Mode

To run with additional debugging:

```bash
DEBUG=prisma:* npm run init-warning-conditions
```

## Maintenance

When adding new warning conditions:

1. Add the condition to the `REQUIRED_WARNING_CONDITIONS` array
2. Test the script on a development environment
3. Run the script in production to deploy the new conditions

When modifying existing conditions:

1. Update the condition definition in the array
2. Run the script to update all users' configurations
3. The script will automatically detect and apply changes
