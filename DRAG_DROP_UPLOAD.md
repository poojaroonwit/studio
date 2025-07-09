# Drag and Drop File Upload Feature

## Overview

The candidate detail page now supports drag and drop file uploads with the following features:

- **Multiple File Upload**: Upload multiple resume files at once
- **Drag and Drop**: Drag files directly onto the upload area
- **Progress Tracking**: Individual progress tracking for each file
- **File Validation**: Size and format validation
- **Visual Feedback**: Real-time progress indicators and status updates

## Features

### Drag and Drop Zone
- Visual feedback when dragging files over the area
- Smooth animations and transitions
- Clear instructions for users
- File type and size restrictions displayed

### Progress Tracking
- Individual progress bars for each file
- Real-time upload progress using XMLHttpRequest
- Status indicators (pending, uploading, completed, error)
- File size display
- Error handling with user-friendly messages

### File Management
- Support for PDF, DOC, DOCX, and RTF files
- Maximum file size: 10MB per file
- Maximum files: 10 files at once
- Automatic cleanup of completed uploads

## Usage

### In Edit Mode
1. Enable edit mode on the candidate detail page
2. Navigate to the "Resumes" tab
3. Drag and drop files onto the upload area or click to browse
4. Monitor individual file upload progress
5. Files are automatically processed and added to the candidate's resume list

### API Endpoint
The upload functionality uses the existing `/api/candidates/[id]/resumes` endpoint, which has been enhanced to support multiple file uploads.

## Technical Implementation

### Components
- `DragDropUpload`: Reusable drag and drop component
- `CandidateResumesSection`: Updated to use the new upload component

### Progress Tracking
- Uses XMLHttpRequest for detailed upload progress
- Individual file tracking with unique IDs
- Real-time progress updates to the UI

### Error Handling
- File validation before upload
- Network error handling
- User-friendly error messages
- Graceful degradation for failed uploads

## Benefits

1. **Better UX**: Intuitive drag and drop interface
2. **Efficiency**: Multiple file uploads save time
3. **Transparency**: Real-time progress feedback
4. **Reliability**: Robust error handling and validation
5. **Accessibility**: Maintains click-to-browse functionality as fallback

## Future Enhancements

- Batch operations (select multiple files for deletion)
- File preview before upload
- Resume parsing from uploaded files
- Integration with candidate data extraction 