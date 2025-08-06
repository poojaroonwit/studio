# File Download Feature

## Overview

The file download feature has been enhanced to provide reliable file downloads for all file types, including cross-origin files and files that may not be directly downloadable through browser mechanisms.

## How It Works

### Download API Endpoint

A new API endpoint `/api/download` has been created that:

1. **Validates the request**: Ensures the user is authenticated and the URL is valid
2. **Fetches the file**: Downloads the file from the provided URL with proper error handling
3. **Processes the response**: Extracts filename from headers or URL path
4. **Returns the file**: Sends the file with proper download headers

### Key Features

- **Cross-origin support**: Can download files from any accessible URL
- **Proper filename handling**: Extracts filename from Content-Disposition header or URL path
- **Security**: Validates URLs and sanitizes filenames
- **Timeout protection**: 30-second timeout to prevent hanging downloads
- **Error handling**: Comprehensive error messages for different failure scenarios
- **Authentication**: Requires valid session to prevent unauthorized access

### Components Updated

1. **FileViewerModal**: Enhanced with loading states and improved download functionality
2. **CandidateImportUploadQueue**: Updated to use the new download API
3. **Download API**: New endpoint for handling file downloads

## Usage

### In FileViewerModal

The download button now:
- Shows a loading spinner during download
- Uses the new download API with fallback to original method
- Provides better user feedback

### API Usage

```javascript
// Example usage
const downloadUrl = `/api/download?url=${encodeURIComponent(fileUrl)}&fileName=${encodeURIComponent(fileName)}`;
const link = document.createElement('a');
link.href = downloadUrl;
link.download = fileName;
link.click();
```

## Benefits

1. **Reliability**: Works with files that can't be downloaded directly due to CORS or other restrictions
2. **User Experience**: Loading states and proper error handling
3. **Security**: Server-side validation and sanitization
4. **Compatibility**: Works across different browsers and file types
5. **Performance**: Timeout protection prevents hanging downloads

## Error Handling

The download API handles various error scenarios:

- **Invalid URL**: Returns 400 with clear error message
- **File not found**: Returns appropriate HTTP status code
- **Empty files**: Returns 400 for zero-byte files
- **Timeout**: Returns 408 for downloads that take too long
- **Server errors**: Returns 500 with generic error message

## Security Considerations

- All downloads require authentication
- URLs are validated before processing
- Filenames are sanitized to prevent path traversal attacks
- Timeout prevents resource exhaustion attacks 