# SLA Monitoring System

## Overview

The SLA (Service Level Agreement) Monitoring system provides comprehensive tracking and monitoring of hiring timeline compliance across all positions in the recruitment system. It helps recruiters and managers identify positions that are at risk of or have already violated their SLA timelines.

## Features

### 1. Real-time SLA Monitoring
- **Automatic Calculation**: SLA compliance is calculated in real-time based on position hiring dates and grade-specific SLA periods
- **Status Classification**: Positions are classified into four status levels:
  - **On Track** (Green): Within SLA timeline
  - **Warning** (Yellow): 7 days or less remaining
  - **Critical** (Orange): 1-30 days overdue
  - **Urgent** (Red): 30+ days overdue

### 2. Comprehensive Dashboard
- **Overview Tab**: Shows compliance rate, statistics, and breakdown by severity
- **All Positions Tab**: Lists all positions with their current SLA status
- **Violations Tab**: Focuses on positions that have violated their SLA
- **Trends Tab**: Provides insights and trend analysis

### 3. Multi-level Monitoring
- **Organization-wide**: Monitor all positions across the organization
- **Recruiter-specific**: Filter to show only positions assigned to specific recruiters
- **Grade-based**: Track compliance by position grade levels

### 4. SLA Guidelines by Grade

| Grade | SLA Period | Description |
|-------|------------|-------------|
| Junior | 30 days | Entry-level positions with 0-2 years experience |
| Mid-Level | 45 days | Mid-level positions with 3-5 years experience |
| Senior | 60 days | Senior positions with 6-8 years experience |
| Lead | 90 days | Lead positions with 9+ years experience |

## API Endpoints

### GET `/api/sla-violations`

Retrieves SLA violation data with optional filtering and statistics.

**Query Parameters:**
- `recruiterId` (optional): Filter by specific recruiter
- `includeAll` (optional): Include all positions, not just violations
- `includeStats` (optional): Include comprehensive statistics

**Response Format:**
```json
{
  "violations": [
    {
      "positionId": "uuid",
      "positionTitle": "Senior Software Engineer",
      "recruiterId": "uuid",
      "recruiterName": "John Doe",
      "gradeName": "Senior",
      "daysOverdue": 15,
      "slaDays": 60,
      "hiringDate": "2024-01-15T00:00:00.000Z",
      "createdAt": "2024-02-01T00:00:00.000Z"
    }
  ],
  "count": 1,
  "allPositions": [...],
  "statistics": {
    "total": 10,
    "onTrack": 7,
    "warning": 1,
    "critical": 1,
    "urgent": 1,
    "complianceRate": 70,
    "averageDaysOverdue": 12,
    "totalDaysOverdue": 36,
    "byGrade": {
      "Senior": {
        "total": 5,
        "violations": 2,
        "complianceRate": 60
      }
    },
    "byRecruiter": {
      "John Doe": {
        "total": 3,
        "violations": 1,
        "complianceRate": 67
      }
    }
  }
}
```

## Components

### SLAViolationsWidget

A comprehensive React component that provides SLA monitoring functionality.

**Props:**
- `recruiterId` (optional): Filter to specific recruiter's positions

**Features:**
- Real-time data fetching
- Multiple view tabs (Overview, All Positions, Violations, Trends)
- Filtering by severity level
- Interactive position cards with navigation
- Responsive design

### SLA Monitoring Page

A dedicated page at `/sla-monitoring` that provides:
- Side-by-side comparison of all positions vs. user's positions
- SLA guidelines and status definitions
- Quick action buttons for navigation

## Database Schema

### Position Table
```sql
ALTER TABLE "Position" ADD COLUMN "hiringDate" TIMESTAMP(3);
ALTER TABLE "Position" ADD COLUMN "gradeId" UUID REFERENCES "Grade"(id);
```

### Grade Table
```sql
CREATE TABLE "Grade" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL UNIQUE,
  label VARCHAR,
  description TEXT,
  min_level INTEGER NOT NULL,
  max_level INTEGER NOT NULL,
  sla_days INTEGER NOT NULL,
  color VARCHAR DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP(3) DEFAULT NOW(),
  updated_at TIMESTAMP(3) DEFAULT NOW()
);
```

## Usage Examples

### 1. Basic SLA Monitoring Widget
```tsx
import { SLAViolationsWidget } from '@/components/dashboard/SLAViolationsWidget';

function Dashboard() {
  return (
    <div>
      <SLAViolationsWidget />
    </div>
  );
}
```

### 2. Recruiter-Specific Monitoring
```tsx
function RecruiterDashboard() {
  return (
    <div>
      <SLAViolationsWidget recruiterId="current" />
    </div>
  );
}
```

### 3. API Integration
```typescript
// Fetch SLA violations
const response = await fetch('/api/sla-violations?includeAll=true&includeStats=true');
const data = await response.json();

// Access violations
const violations = data.violations;

// Access statistics
const stats = data.statistics;
```

## Configuration

### SLA Periods
SLA periods are configured in the Grade table and can be modified through the admin interface:

1. Navigate to Settings > Data Configuration > Grades
2. Edit the `sla_days` field for each grade
3. Changes take effect immediately for new positions

### Notifications
The system can be configured to send notifications for SLA violations:

1. Email notifications to recruiters
2. In-app notifications
3. Slack/Teams integrations
4. Dashboard alerts

## Best Practices

### 1. Regular Monitoring
- Check SLA compliance daily
- Set up automated alerts for violations
- Review trends weekly

### 2. Proactive Management
- Address warning status positions before they become violations
- Assign additional resources to critical positions
- Escalate urgent violations to management

### 3. Data Quality
- Ensure all positions have accurate hiring dates
- Verify grade assignments are correct
- Keep recruiter assignments up to date

## Troubleshooting

### Common Issues

1. **No SLA Data Showing**
   - Verify positions have hiring dates set
   - Check that positions are assigned to grades
   - Ensure positions are marked as open

2. **Incorrect SLA Calculations**
   - Verify grade SLA periods are correct
   - Check hiring date format and timezone
   - Review position status (open/closed)

3. **Missing Recruiter Data**
   - Ensure positions are assigned to recruiters
   - Check user permissions and roles
   - Verify recruiter accounts are active

### Debug Queries

```sql
-- Check positions with SLA data
SELECT 
  p.title,
  p."hiringDate",
  g.name as grade_name,
  g."sla_days",
  u.name as recruiter_name
FROM "Position" p
LEFT JOIN "Grade" g ON p."gradeId" = g.id
LEFT JOIN "User" u ON p."recruiterId" = u.id
WHERE p."isOpen" = true
  AND p."hiringDate" IS NOT NULL
  AND p."gradeId" IS NOT NULL;

-- Check SLA violations
SELECT 
  p.title,
  p."hiringDate",
  g."sla_days",
  EXTRACT(DAY FROM NOW() - p."hiringDate") as days_since_hiring,
  CASE 
    WHEN EXTRACT(DAY FROM NOW() - p."hiringDate") > g."sla_days" 
    THEN EXTRACT(DAY FROM NOW() - p."hiringDate") - g."sla_days"
    ELSE 0 
  END as days_overdue
FROM "Position" p
JOIN "Grade" g ON p."gradeId" = g.id
WHERE p."isOpen" = true
  AND p."hiringDate" IS NOT NULL;
```

## Future Enhancements

1. **Advanced Analytics**
   - Historical trend analysis
   - Predictive SLA violation alerts
   - Performance benchmarking

2. **Automation**
   - Automatic position status updates
   - Escalation workflows
   - Integration with calendar systems

3. **Reporting**
   - Custom SLA reports
   - Export functionality
   - Scheduled report delivery

4. **Mobile Support**
   - Mobile-optimized dashboard
   - Push notifications
   - Offline capability
