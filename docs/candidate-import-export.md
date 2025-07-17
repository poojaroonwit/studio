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
- **Formats**: Excel (.xlsx) and CSV
- **Features**:
  - Matches import template format for consistency
  - Supports filtering by various criteria
  - Proper data formatting and structure
  - Includes related data (position titles, recruiter names)

### 4. User Interface Improvements
- **Import Modal**: 
  - Step-by-step guidance
  - Template download button
  - Clear instructions and validation
  - Progress indicators
- **Export Options**: 
  - Excel and CSV format options
  - Filtered exports based on current view
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
   - Download the formatted file

### For Developers

#### API Endpoints

```typescript
// Download template
GET /api/candidates/import/template

// Import candidates
POST /api/candidates/import
Content-Type: multipart/form-data
Body: { file: File }

// Export candidates
GET /api/candidates/export?format=excel&[filters]
GET /api/candidates/export?format=csv&[filters]
```

#### Data Transformation

The import process automatically transforms template data:

```typescript
// Template format -> Internal format
{
  'Name*': 'John Doe',
  'Email*': 'john@example.com',
  'Location': 'New York, NY',
  'Introduction/About Me': 'Experienced developer...',
  'Education (JSON)': '[{"university":"MIT","major":"CS"}]'
}

// Transforms to:
{
  name: 'John Doe',
  email: 'john@example.com',
  parsedData: {
    personal_info: {
      firstname: 'John',
      lastname: 'Doe',
      location: 'New York, NY',
      introduction_aboutme: 'Experienced developer...'
    },
    education: [{ university: 'MIT', major: 'CS' }]
  }
}
```

## Error Handling

### Import Errors
- **Duplicate emails**: Automatically detected and reported
- **Invalid JSON**: Detailed error messages with field names
- **Missing required fields**: Clear validation messages
- **Invalid data types**: Type-specific error messages

### Export Errors
- **Permission errors**: Proper authentication checks
- **Database errors**: Graceful error handling with logging
- **Format errors**: Fallback to CSV if Excel generation fails

## Security Features

- **Authentication**: All endpoints require valid session
- **Authorization**: Role-based access control
- **Audit Logging**: All import/export activities are logged
- **Input Validation**: Comprehensive validation of all inputs
- **File Type Validation**: Only Excel files accepted for import

## Performance Considerations

- **Batch Processing**: Imports are processed in transactions
- **Memory Management**: Large files are streamed, not loaded entirely
- **Error Recovery**: Failed imports don't affect successful ones
- **Progress Tracking**: Real-time feedback during import process

## Future Enhancements

1. **Template Customization**: Allow users to customize template fields
2. **Bulk Operations**: Support for bulk status changes during import
3. **Validation Rules**: Custom validation rules per organization
4. **Import Scheduling**: Background import processing for large files
5. **Data Mapping**: Visual field mapping interface
6. **Import History**: Track and review previous imports
7. **Template Versioning**: Support for multiple template versions

## Troubleshooting

### Common Issues

1. **Import Fails**: Check that all required fields are filled
2. **JSON Errors**: Verify JSON syntax in complex fields
3. **Duplicate Emails**: Ensure email addresses are unique
4. **Date Format**: Use YYYY-MM-DD format for dates
5. **File Size**: Large files may take longer to process

### Debug Information

- Check browser console for detailed error messages
- Review server logs for import/export activities
- Use the audit log to track user actions
- Verify file format and encoding

## Technical Implementation

### Key Files Modified/Created

1. `src/app/api/candidates/import/template/route.ts` - Template generation
2. `src/app/api/candidates/import/route.ts` - Enhanced import logic
3. `src/app/api/candidates/export/route.ts` - Enhanced export logic
4. `src/components/candidates/ImportCandidatesModal.tsx` - UI improvements
5. `src/components/candidates/CandidatesPageClient.tsx` - Integration

### Dependencies

- `xlsx`: Excel file processing
- `zod`: Data validation
- `uuid`: ID generation
- `date-fns`: Date formatting

### Database Schema

The implementation works with the existing Candidate table structure and maintains backward compatibility with existing data formats. 