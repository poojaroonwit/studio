# Error Analysis Table and Export Functionality

## Overview

The Error Analysis feature has been enhanced to display errors in a comprehensive table format with export capabilities. This provides better visibility into system errors and allows for detailed analysis and reporting.

## Features

### 1. Error Analysis Table

The error analysis is now displayed in a structured table format with the following columns:

- **#**: Sequential numbering
- **Error Reason**: The specific error message or reason
- **Count**: Number of occurrences for this error
- **Percentage**: Percentage of total jobs affected by this error
- **Severity**: Error severity level (high/medium/low)
- **Category**: Error category classification
- **Actions**: View details and export individual error data

### 2. Summary Statistics

The table includes summary cards showing:
- **Total Errors**: Total number of error occurrences
- **Error Types**: Number of different error types
- **Error Rate**: Percentage of jobs that encountered errors

### 3. Export Functionality

#### Bulk Export
- Export all error analysis data as CSV
- Includes summary statistics and detailed breakdown
- Respects current date range and status filters
- File naming: `error-analysis-YYYY-MM-DD.csv`

#### Individual Error Export
- Export data for a specific error type
- Includes detailed information about affected files
- File naming: `error-{error-name}-YYYY-MM-DD.csv`

### 4. Error Classification

Errors are automatically categorized into:
- **Timeout Error**: Connection or processing timeouts
- **Network Error**: Connection issues
- **Invalid Data Error**: Data validation failures
- **Parsing Error**: File parsing issues
- **File Processing Error**: File handling problems
- **API Error**: External API failures
- **Database Error**: Database-related issues
- **Unknown Error**: Unclassified errors

### 5. Severity Levels

Errors are classified by severity based on their impact:
- **High**: Error rate > 10% of total jobs
- **Medium**: Error rate 2-10% of total jobs
- **Low**: Error rate < 2% of total jobs

## API Endpoints

### Error Analysis Export API

**Endpoint**: `GET /api/upload-queue/error-analysis/export`

**Query Parameters**:
- `date_start`: Start date filter (ISO string)
- `date_end`: End date filter (ISO string)
- `status`: Status filter (e.g., 'fail', 'error')
- `error_reason`: Filter by specific error reason
- `format`: Export format ('csv' or 'excel')

**Response**:
- CSV format: Direct file download
- Excel format: JSON data for frontend processing

## Usage

### Accessing Error Analysis

1. Navigate to the Process Queue Analytics page
2. Click on the "Errors" tab
3. View the error analysis table with summary statistics
4. Use filters to narrow down the data range

### Exporting Data

1. **Bulk Export**: Click the "Export" button in the header
2. **Individual Export**: Click the download icon next to any error row
3. Files will be automatically downloaded in CSV format

### Filtering Data

- Use date range picker to filter by time period
- Use status dropdown to filter by job status
- Filters are applied to both the table view and exports

## Technical Implementation

### Frontend Components

- **ProcessQueueAnalytics.tsx**: Main component with table and export functionality
- Enhanced error analysis tab with table layout
- Export buttons with fallback mechanisms

### Backend API

- **/api/upload-queue/error-analysis/export**: Dedicated export endpoint
- Supports filtering and multiple export formats
- Includes audit logging for export activities

### Data Processing

- Error categorization based on error message content
- Severity calculation based on error frequency
- Summary statistics calculation
- CSV generation with proper escaping

## Benefits

1. **Better Visibility**: Structured table format makes it easier to identify patterns
2. **Detailed Analysis**: Export functionality enables deeper investigation
3. **Actionable Insights**: Severity levels help prioritize error resolution
4. **Audit Trail**: Export activities are logged for compliance
5. **Flexible Filtering**: Date and status filters for targeted analysis

## Future Enhancements

- Excel export with multiple worksheets
- Error trend analysis over time
- Automated error reporting
- Integration with monitoring systems
- Error resolution tracking
