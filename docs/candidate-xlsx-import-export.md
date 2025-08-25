# Candidate XLSX Import/Export Guide

## Overview

The candidate management system now supports comprehensive XLSX import and export functionality with ID-based updates. This allows you to:

- **Export** candidates to XLSX format with all their data
- **Import** candidates from XLSX files
- **Update** existing candidates by including their ID
- **Create** new candidates by leaving the ID field blank

## Features

### Export Functionality
- **Format**: Excel (.xlsx) files
- **Data Included**: All candidate fields including ID, name, email, phone, position, recruiter, fit scores, status, and structured data
- **Filtering**: Export filtered results based on current view
- **Individual Export**: Export single candidate from detail page
- **Compatibility**: Exported files can be used for import with updates

### Import Functionality
- **Format**: Excel (.xlsx, .xls) and CSV files
- **Template**: Downloadable template with instructions
- **Validation**: Comprehensive validation with detailed error messages
- **ID-based Updates**: 
  - Leave ID blank to create new candidates
  - Provide existing ID to update candidates
- **Transaction Safety**: All imports are wrapped in database transactions

## How to Use

### Exporting Candidates

1. **From Candidates Page**:
   - Navigate to the candidates page
   - Apply any filters you want to include in the export
   - Click the "More" button (⋮) in the top right
   - Select "Export to Excel"
   - The file will download automatically

2. **From Individual Candidate Page**:
   - Open a candidate's detail page
   - Click the export button
   - The candidate's data will be exported to XLSX

### Importing Candidates

1. **Download Template**:
   - Navigate to the candidates page
   - Click the "More" button (⋮) in the top right
   - Select "Import Data"
   - Click "Download Template" in the modal
   - Fill in the template with your data

2. **Prepare Your Data**:
   - **For New Candidates**: Leave the ID field blank
   - **For Updates**: Include the existing candidate ID
   - **Required Fields**: Name*, Email*, Status*
   - **Optional Fields**: All other fields are optional

3. **Upload and Import**:
   - In the import modal, click "Upload File"
   - Select your prepared XLSX file
   - Click "Import Candidates"
   - Review the results

## Data Fields

### Required Fields
- **Name***: Full name of the candidate
- **Email***: Valid email address (must be unique)
- **Status***: Candidate status (Applied, Interviewing, Hired, etc.)

### Optional Fields
- **ID**: Leave blank for new candidates, provide UUID for updates
- **Phone**: Phone number
- **Position ID**: UUID of the position
- **Position Name**: Display name of position (for reference)
- **Recruiter ID**: UUID of the recruiter
- **Recruiter Name**: Display name of recruiter (for reference)
- **Fit Score (0-100)**: Fit score as percentage
- **Application Date**: Date in YYYY-MM-DD format
- **Applied Job**: Title of the applied job
- **Applied Job Justification**: Justification for job application
- **Job Matches**: Additional job matches with scores and reasons
- **Location**: Candidate location
- **Introduction/About Me**: Candidate introduction
- **Education (JSON)**: Education history as JSON array
- **Experience (JSON)**: Work experience as JSON array
- **Skills (JSON)**: Skills as JSON array
- **Job Suitable (JSON)**: Suitable jobs as JSON array
- **Custom Attributes (JSON)**: Custom attributes as JSON object

## JSON Field Examples

### Education
```json
[
  {
    "degree": "BS Computer Science",
    "school": "MIT",
    "year": 2020
  }
]
```

### Experience
```json
[
  {
    "title": "Software Engineer",
    "company": "Tech Corp",
    "duration": "2020-2024"
  }
]
```

### Skills
```json
["JavaScript", "React", "Node.js", "Python"]
```

### Job Suitable
```json
[
  {
    "jobTitle": "Senior Developer",
    "fitScore": 0.9
  }
]
```

### Custom Attributes
```json
{
  "source": "LinkedIn",
  "priority": "High",
  "notes": "Strong technical background"
}
```

## Import/Export Workflow

### Complete Data Migration
1. **Export** existing candidates to XLSX
2. **Modify** the exported data as needed
3. **Import** the modified data back
   - Existing candidates will be updated (ID preserved)
   - New rows will be created (ID left blank)

### Bulk Updates
1. **Export** candidates you want to update
2. **Modify** specific fields in the XLSX file
3. **Import** the file to apply updates

### Data Backup
1. **Export** all candidates to XLSX
2. **Store** the file as a backup
3. **Import** when needed for restoration

## Error Handling

### Validation Errors
- Invalid email formats
- Missing required fields
- Invalid JSON in structured fields
- Duplicate emails (for new candidates)

### Import Results
The import process provides detailed results:
- **Created**: Number of new candidates created
- **Updated**: Number of existing candidates updated
- **Errors**: List of any errors encountered

### Common Issues
1. **Invalid JSON**: Ensure JSON fields are properly formatted
2. **Missing Required Fields**: Check that Name*, Email*, and Status* are filled
3. **Invalid IDs**: Ensure existing IDs are valid UUIDs
4. **File Format**: Use .xlsx, .xls, or .csv files only

## API Endpoints

### Export
- `GET /api/candidates/export` - Export all candidates
- `GET /api/candidates/export?format=excel` - Export as Excel (default)
- `GET /api/candidates/export?format=csv` - Export as CSV
- `GET /api/candidates/[id]/export` - Export individual candidate

### Import
- `GET /api/candidates/import` - Download import template
- `POST /api/candidates/import` - Import candidates from file

### Query Parameters for Export
- `name`: Filter by name
- `email`: Filter by email
- `status`: Filter by status
- `positionIds`: Filter by position IDs
- `recruiterIds`: Filter by recruiter IDs
- `applicationDateStart`: Filter by application date start
- `applicationDateEnd`: Filter by application date end
- And many more...

## Permissions

- **Export**: Requires `CANDIDATES_EXPORT` permission or Admin role
- **Import**: Requires `CANDIDATES_MANAGE` permission or Admin role

## Best Practices

1. **Always download the template** before creating import files
2. **Test imports** with a small dataset first
3. **Backup data** before large imports
4. **Validate JSON** in structured fields before importing
5. **Use meaningful filenames** for exported files
6. **Review import results** carefully for any errors

## Troubleshooting

### Import Fails
- Check file format (.xlsx, .xls, .csv only)
- Verify required fields are filled
- Ensure JSON fields are valid
- Check file size (max 10MB)

### Export Issues
- Verify you have export permissions
- Check that filters are valid
- Ensure sufficient memory for large exports

### Data Not Updating
- Verify the ID field contains valid UUIDs
- Check that the candidate exists in the database
- Ensure you have update permissions

## Support

For issues with import/export functionality:
1. Check the browser console for errors
2. Review the import results for validation errors
3. Verify file format and data structure
4. Contact system administrator if issues persist
