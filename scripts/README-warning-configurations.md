# Warning Configuration Scripts

This directory contains scripts for managing warning configurations in the system.

## Scripts Overview

### 1. `reset-warning-configurations.cjs`
**Purpose**: Completely removes all existing warning configurations and inserts new default ones.

**Usage**:
```bash
node scripts/reset-warning-configurations.cjs
```

**What it does**:
- Deletes ALL existing warning configurations from the database
- Creates new default configurations for each user in the system
- Provides detailed logging of the process

**⚠️ Warning**: This script will permanently delete all existing warning configurations!

### 2. `insert-default-warning-configurations.cjs`
**Purpose**: Inserts default warning configurations without deleting existing ones.

**Usage**:
```bash
node scripts/insert-default-warning-configurations.cjs
```

**What it does**:
- Checks for existing configurations and skips duplicates
- Only creates configurations that don't already exist
- Safe to run multiple times

## Default Warning Configurations

The scripts create the following 10 default warning configurations:

### Candidate Warnings
1. **Candidate Over Grade SLA** - Warns when a candidate has exceeded the SLA days for their assigned grade
2. **Candidate No Source** - Warns when a candidate has no source assigned
3. **Candidate No Recruiter Assigned** - Warns when a candidate has no recruiter assigned
4. **Candidate No Email** - Warns when a candidate has no email address

### Position Warnings
5. **Position No Recruiter Assigned** - Warns when a position has no recruiter assigned
6. **Position Open But No Recruiter** - Warns when a position is open but has no recruiter assigned
7. **Position No Grade Assigned** - Warns when a position has no grade assigned
8. **Position No Hiring Date** - Warns when a position has no hiring date set
9. **Position No Grade** - Alternative name for position grade warning
10. **No hiring date** - Alternative name for position hiring date warning

## Configuration Structure

Each warning configuration includes:
- **Name**: Human-readable name for the warning
- **Description**: Detailed explanation of what triggers the warning
- **Severity**: Level of importance (info, warning, error, critical)
- **Active Status**: Whether the warning is currently active
- **Public Status**: Whether the warning is shared publicly
- **Condition Groups**: Complex condition structure using the new conditionGroups format

## Condition Groups Format

The new system uses a structured format for complex conditions:

```javascript
conditionGroups: [
  {
    id: 'group-1',
    logicalOperator: 'AND', // or 'OR'
    conditions: [
      {
        id: 'condition-1',
        entityType: 'candidate', // or 'position'
        field: 'email',
        condition: 'empty', // or 'not_empty', 'equals', 'days_since', etc.
        operator: 'OR', // or 'AND'
        value: null // or specific value
      }
    ]
  }
]
```

## Running the Scripts

### Prerequisites
- Node.js installed
- Database connection configured
- Prisma client generated

### Steps
1. Navigate to the project root directory
2. Run the desired script:
   ```bash
   # To reset all configurations
   node scripts/reset-warning-configurations.cjs
   
   # To add default configurations safely
   node scripts/insert-default-warning-configurations.cjs
   ```

### Output
The scripts provide detailed console output showing:
- Number of existing configurations deleted
- Number of new configurations created
- User-by-user progress
- Success/failure status for each configuration
- Final summary statistics

## Troubleshooting

### Common Issues
1. **Database Connection Error**: Ensure your database is running and DATABASE_URL is configured
2. **Permission Errors**: Make sure you have write access to the database
3. **No Users Found**: Create users in the system before running the scripts

### Error Handling
- Scripts include comprehensive error handling
- Failed configurations are logged but don't stop the process
- Database connections are properly closed even if errors occur

## Notes

- Both scripts use the new `conditionGroups` format for complex conditions
- Legacy fields (`entityType`, `field`, `condition`, `operator`) are set to null for new configurations
- All configurations are created as active and public by default
- Each user gets their own copy of all configurations
