# Fit Score Explanation

## Overview

The fit score system in the candidate management system has multiple components that work together to provide comprehensive candidate evaluation.

## Different Types of Fit Scores

### 1. **Candidate Fit Score** (Main Database Field)
- **Location**: `Candidate.fitScore` field in the database
- **Display**: Shown on task board cards and candidate list
- **Purpose**: Overall assessment of the candidate's fit for their applied position
- **Default**: 0 (when not calculated)

### 2. **Applied Job Score** (Candidate Detail Page)
- **Location**: `candidate.fitScore` (same as main fit score)
- **Display**: Shown in the "Job Applied" section of candidate detail page
- **Purpose**: Specific score for the position the candidate actually applied for
- **Fallback**: Uses main fit score if no specific applied job data exists

### 3. **Job Match Scores** (Job Matches Section)
- **Location**: `JobMatch` table with individual scores per position
- **Display**: Shown in the "Job Matches" section of candidate detail page
- **Purpose**: AI-calculated scores for different positions the candidate might be suitable for
- **Multiple**: Can have different scores for different positions

## How Fit Scores Are Calculated

### Automated Calculation
Fit scores are calculated through the automation system:

1. **Resume Upload**: When a resume is uploaded, it triggers a webhook
2. **AI Processing**: The webhook sends the resume to an AI service for analysis
3. **Score Calculation**: The AI analyzes the candidate's skills, experience, and qualifications
4. **Database Update**: The calculated fit score is stored in the database

### Manual Calculation
Fit scores can also be set manually:
- Through the candidate detail page edit form
- Via API calls
- Through the automation system

## Current Issue Resolution

### Problem
The fit score was showing as 0 because:
1. The automation system wasn't set up to calculate scores
2. No manual fit score was assigned
3. The database had NULL values that were being converted to 0

### Solution Applied
1. **Database Fix**: Updated API endpoints to convert NULL fit scores to 0
2. **UI Improvement**: Enhanced the display logic to handle 0 scores properly
3. **Test Data**: Created sample data to demonstrate the system

## Setting Up the Automation System

To enable automatic fit score calculation:

### 1. Configure Webhook Settings
1. Go to **Settings > System Settings**
2. Set up the **Resume Processing Webhook URL**
3. Configure the webhook token if required
4. Test the webhook connectivity

### 2. Upload Resumes
1. Use the **Automation Upload** feature
2. Upload candidate resumes in PDF format
3. The system will automatically process them and calculate fit scores

### 3. Monitor Processing
1. Check the **Upload Queue** for processing status
2. View logs for any processing errors
3. Verify fit scores are calculated correctly

## API Endpoints for Fit Scores

### Get Candidate with Fit Score
```http
GET /api/candidates/{id}
```

### Update Fit Score
```http
PUT /api/candidates/{id}
{
  "fitScore": 85
}
```

### Create Candidate with Matches
```http
POST /api/automation/create-candidate-with-matches
{
  "candidate": {
    "name": "John Doe",
    "email": "john@example.com",
    "fitScore": 85
  },
  "job_matches": [
    {
      "jobId": "uuid",
      "jobTitle": "Software Engineer",
      "fitScore": 92,
      "matchReasons": ["Strong technical background"]
    }
  ]
}
```

## Best Practices

### 1. Regular Score Updates
- Update fit scores when candidate information changes
- Recalculate scores when new positions are added
- Review and adjust scores based on interview feedback

### 2. Score Validation
- Ensure scores are between 0-100
- Validate that job match scores make sense
- Cross-reference with candidate qualifications

### 3. Automation Monitoring
- Monitor webhook processing success rates
- Check for failed score calculations
- Maintain backup manual scoring processes

## Troubleshooting

### Fit Score Always Shows 0
1. Check if automation webhook is configured
2. Verify resume processing is working
3. Check database for NULL values
4. Ensure API endpoints are returning correct data

### Job Matches Not Appearing
1. Verify JobMatch table has data
2. Check candidate detail page API response
3. Ensure job matches are linked to correct candidate

### Automation Not Working
1. Test webhook connectivity
2. Check webhook URL and authentication
3. Review upload queue processing logs
4. Verify AI service is responding correctly

## Test Data

For demonstration purposes, test data has been created:
- **Candidate Fit Score**: 85
- **Job Match Score**: 92
- **Applied Job Score**: 85 (same as candidate fit score)

This demonstrates the different scoring contexts in the system. 