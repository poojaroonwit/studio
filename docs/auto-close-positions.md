# Auto-Close Positions Feature

## Overview

The Auto-Close Positions feature automatically closes positions when all associated headcounts are filled. This helps maintain accurate position status and prevents unnecessary applications to closed positions.

## How It Works

### Automatic Detection
- The system monitors headcount status changes in real-time
- When a candidate is hired and assigned to a headcount, the system checks if all headcounts for that position are now filled
- If all headcounts are filled, the position is automatically closed

### Smart Closure Logic
- Only positions with **ALL** headcounts filled are closed
- Positions with no headcounts defined are not affected
- Positions that already have vacant headcounts remain open
- The system provides detailed audit trails for all auto-closures

### Trigger Points
The auto-close check is triggered automatically when:
1. A candidate status is changed to "Hired" and assigned to a headcount
2. A headcount is created with "filled" status
3. A headcount status is updated to "filled"

## Manual Control

### Admin Settings Page
Administrators can access the Auto-Close Positions settings page at `/settings/auto-close` to:
- Run manual auto-close checks for all positions
- View detailed results of auto-close operations
- Monitor which positions were closed and why

### API Endpoint
Administrators can also trigger auto-close checks via API:

```http
POST /api/positions/auto-close
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Auto-close check completed. Processed 5 positions, closed 2 positions.",
  "results": [
    {
      "positionId": "pos-1",
      "positionTitle": "Software Engineer",
      "success": true,
      "message": "Position automatically closed successfully",
      "action": "closed",
      "headcountStatus": {
        "totalHeadcounts": 2,
        "filledHeadcounts": 2,
        "vacantHeadcounts": 0
      }
    }
  ],
  "summary": {
    "totalProcessed": 5,
    "closedCount": 2,
    "errorCount": 0,
    "noActionCount": 3
  }
}
```

## Configuration

### Permissions
- Only users with `Admin` role can access the auto-close settings page
- Only users with `Admin` role can trigger manual auto-close checks
- The auto-close functionality itself runs with system permissions

### Audit Logging
All auto-close operations are logged with:
- User who triggered the action (for manual operations)
- Position details and headcount status
- Timestamp and action type
- Previous and new position status

## Technical Implementation

### Core Functions

#### `checkPositionHeadcountStatus(positionId)`
Checks if all headcounts for a position are filled.

#### `autoClosePositionIfHeadcountFilled(positionId, actingUserId, actingUserName)`
Automatically closes a position if all headcounts are filled.

#### `checkAndAutoCloseAllPositions(actingUserId, actingUserName)`
Checks all open positions and closes those with all headcounts filled.

### Database Changes
No database schema changes are required. The feature uses existing:
- `Position.isOpen` field to track position status
- `Headcount.status` field to track headcount status
- Audit log system for tracking changes

### Real-time Updates
When positions are auto-closed:
- Webhooks are dispatched to notify external systems
- Real-time updates are broadcast to connected clients
- Position statistics are updated and broadcast

## Use Cases

### Scenario 1: Single Headcount Position
1. Position "Software Engineer" has 1 headcount
2. Candidate is hired and assigned to the headcount
3. All headcounts are now filled
4. Position is automatically closed

### Scenario 2: Multiple Headcount Position
1. Position "Product Manager" has 3 headcounts
2. First candidate is hired (1 filled, 2 vacant)
3. Position remains open
4. Second candidate is hired (2 filled, 1 vacant)
5. Position remains open
6. Third candidate is hired (3 filled, 0 vacant)
7. Position is automatically closed

### Scenario 3: Position with No Headcounts
1. Position "Intern" has no headcounts defined
2. Candidates can be assigned but no auto-close occurs
3. Position must be manually closed if needed

## Monitoring and Troubleshooting

### Checking Auto-Close Status
- Use the settings page to run manual checks
- Review audit logs for auto-close operations
- Monitor position status changes in real-time

### Common Issues
1. **Position not closing**: Check if all headcounts are actually filled
2. **Unexpected closures**: Review headcount assignments and status
3. **Permission errors**: Ensure user has Admin role for manual operations

### Logs
Auto-close operations are logged with the category `SYSTEM:AutoClosePosition` and include:
- Position ID and title
- Headcount status details
- User who triggered the action
- Success/failure status

## Best Practices

1. **Regular Monitoring**: Run manual checks periodically to ensure positions are being closed correctly
2. **Headcount Management**: Ensure headcounts are properly created and managed for positions
3. **Audit Review**: Regularly review audit logs for auto-close operations
4. **Testing**: Test the feature with sample data before deploying to production

## Future Enhancements

Potential improvements could include:
- Scheduled auto-close checks (cron jobs)
- Email notifications when positions are auto-closed
- Configurable auto-close rules per position or department
- Integration with external HR systems
- Advanced reporting and analytics
