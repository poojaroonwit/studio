# Candidate Import/Export Functionality

## Overview

This document describes the enhanced candidate import and export functionality that provides a user-friendly template-based approach for bulk operations.

## Features Implemented

### 1. Import Template Download
- **Endpoint**: `GET /api/candidates/import/template`
- **Format**: Excel (.xlsx) file with multiple worksheets
- **Content**: 
  - Main worksheet with example data and proper column headers
  - Instructions worksheet with detailed guidance
  - Proper column formatting and widths

### 2. Enhanced Import Functionality
- **Endpoint**: `POST /api/candidates/import`
- **Supports**: Excel files (.xlsx, .xls)
- **Features**:
  - Template-based import with clear field mapping
  - Comprehensive validation with detailed error messages
  - Support for both new template format and legacy format
  - Automatic data transformation and parsing
  - Duplicate email detection
  - Transaction-based import with rollback on errors

### 3. Enhanced Export Functionality
- **Endpoint**: `GET /api/candidates/export`
- **Individual Export**: `GET /api/candidates/[id]/export`
- **Formats**: Excel (.xlsx) and CSV
- **Features**:
  - Matches import template format for consistency
  - Supports filtering by various criteria
  - Proper data formatting and structure
  - Includes related data (position titles, recruiter names)
  - **NEW**: Applied job information and justification
  - **NEW**: Job matches with match reasons and scores
  - **NEW**: Position names and recruiter names
  - **NEW**: Individual candidate export with detailed information

### 4. User Interface Improvements
- **Import Modal**: 
  - Step-by-step guidance
  - Template download button
  - Clear instructions and validation
  - Progress indicators
- **Export Options**: 
  - Excel and CSV format options
  - Filtered exports based on current view
  - Individual candidate export from detail page
- **Template Download**: 
  - One-click template download
  - Clear instructions and examples

## Template Structure

### Required Fields
- **Name***: Full name of the candidate
- **Email***: Valid email address (must be unique)
- **Status***: Current recruitment status

### Optional Fields
- **Phone**: Contact phone number
- **Position ID**: UUID of the position they are applying for
- **Recruiter ID**: UUID of the assigned recruiter
- **Fit Score (0-100)**: Numeric score between 0-100
- **Application Date**: Date in YYYY-MM-DD format
- **Location**: City, State, or Country
- **Introduction/About Me**: Professional summary

### JSON Fields (Optional)
- **Education (JSON)**: Array of education objects
- **Experience (JSON)**: Array of work experience objects
- **Skills (JSON)**: Array of skill objects
- **Job Suitable (JSON)**: Array of job preference objects
- **Custom Attributes (JSON)**: Any additional data as JSON object

## Enhanced Export Fields

### Basic Information
- **Name***: Full name of the candidate
- **Email***: Valid email address
- **Phone**: Contact phone number
- **Status***: Current recruitment status
- **Application Date**: Date when candidate applied

### Position and Recruiter Information
- **Position ID**: UUID of the applied position
- **Position Name**: Human-readable position title
- **Recruiter ID**: UUID of the assigned recruiter
- **Recruiter Name**: Human-readable recruiter name

### Applied Job Information
- **Applied Job**: The job title the candidate applied for
- **Applied Job Justification**: Justification for why the candidate is suitable for the applied job
- **Fit Score (0-100)**: Numeric score indicating candidate's fit for the applied position

### Job Matches Information
- **Job Matches**: Additional job matches with scores and reasons
  - Format: "Job: [Job Title] | Score: [Percentage]% | Reasons: [Reason1, Reason2, ...]; Job: [Job Title] | Score: [Percentage]% | Reasons: [Reason1, Reason2, ...]"
  - Sorted by fit score (highest first)
  - Includes match reasons for each job

### Additional Information
- **Location**: Candidate's location
- **Introduction/About Me**: Professional summary
- **Education (JSON)**: Structured education data
- **Experience (JSON)**: Structured work experience data
- **Skills (JSON)**: Structured skills data
- **Job Suitable (JSON)**: Job preference data
- **Custom Attributes (JSON)**: Any additional custom data

## Supported Status Values
- Applied, Screening, Shortlisted, Interview Scheduled
- Interviewing, Offer Extended, Offer Accepted, Hired
- Rejected, On Hold

## Usage Instructions

### For Users

1. **Download Template**:
   - Click "Download Import Template" in the candidates page dropdown
   - Or use the download button in the import modal

2. **Fill Template**:
   - Use the provided example data as reference
   - Ensure required fields are filled
   - Use proper JSON format for complex fields
   - Follow the instructions worksheet for guidance

3. **Import Candidates**:
   - Open the import modal
   - Select your filled Excel file
   - Review the validation results
   - Confirm import

4. **Export Candidates**:
   - Use the export dropdown to choose format (Excel/CSV)
   - Apply filters as needed before exporting
   - Download the formatted file with enhanced information
   - **NEW**: Export individual candidates from their detail page

### For Developers

#### API Endpoints

```typescript
// Download template
GET /api/candidates/import/template

// Import candidates
POST /api/candidates/import
Content-Type: multipart/form-data
Body: { file: File }

// Export all candidates
GET /api/candidates/export?format=excel&[filters]
GET /api/candidates/export?format=csv&[filters]

// Export individual candidate
GET /api/candidates/[id]/export
```

#### Data Transformation

The import process automatically transforms template data:

```typescript
// Template format -> Internal format
{
  name: string,
  email: string,
  phone?: string,
  positionId?: string,
  recruiterId?: string,
  fitScore?: number,
  status: string,
  applicationDate?: Date,
  parsedData: {
    personal_info: {
      location?: string,
      introduction_aboutme?: string
    },
    education?: any[],
    experience?: any[],
    skills?: any[],
    job_suitable?: any[]
  },
  customAttributes?: any
}
```

The export process includes enhanced information:

```typescript
// Internal format -> Export format
{
  'Name*': string,
  'Email*': string,
  'Phone': string,
  'Position ID': string,
  'Position Name': string,        // NEW: Human-readable position title
  'Recruiter ID': string,
  'Recruiter Name': string,       // NEW: Human-readable recruiter name
  'Fit Score (0-100)': string,
  'Status*': string,
  'Application Date': string,
  'Applied Job': string,          // NEW: Applied job title
  'Applied Job Justification': string, // NEW: Justification for applied job
  'Job Matches': string,          // NEW: Additional job matches with scores and reasons
  'Location': string,
  'Introduction/About Me': string,
  'Education (JSON)': string,
  'Experience (JSON)': string,
  'Skills (JSON)': string,
  'Job Suitable (JSON)': string,
  'Custom Attributes (JSON)': string
}
```

## File Structure

1. `src/app/api/candidates/import/template/route.ts` - Template generation
2. `src/app/api/candidates/import/route.ts` - Import processing
3. `src/app/api/candidates/export/route.ts` - Enhanced export logic
4. `src/app/api/candidates/[id]/export/route.ts` - Individual candidate export
5. `src/app/api/v1/candidates/export/route.ts` - V1 API export endpoint
6. `src/components/candidates/BulkUploadCVsModal.tsx` - Import UI
7. `src/components/candidates/CandidatesPageClient.tsx` - Export UI integration

## Recent Enhancements

### Enhanced Export Information (Latest Update)
- **Position Names**: Now exports human-readable position titles instead of just IDs
- **Recruiter Names**: Now exports human-readable recruiter names instead of just IDs
- **Applied Job Information**: Includes the job the candidate applied for and justification
- **Job Matches**: Includes additional job matches with:
  - Job titles
  - Fit scores (as percentages)
  - Match reasons
  - Sorted by relevance (highest score first)
- **Individual Export**: New endpoint for exporting detailed information for a single candidate

### Data Relationships
- **Applied Job**: The candidate's `positionId` represents the job they applied for
- **Assignment Justification**: Stored in `assignmentJustification` field, explains why the candidate is suitable
- **Job Matches**: Additional job recommendations stored in the `JobMatch` table
- **Position Information**: Retrieved from `Position` table via joins
- **Recruiter Information**: Retrieved from `User` table via joins

This enhanced export functionality provides comprehensive candidate information for better decision-making and reporting. 