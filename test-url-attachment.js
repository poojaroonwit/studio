// Test script for URL-based attachment upload
// Usage: node test-url-attachment.js <candidate-id> <file-url>

const API_BASE_URL = 'http://localhost:3000'; // Adjust as needed
const API_TOKEN = 'your-api-token-here'; // Replace with actual token

async function uploadAttachmentFromUrl(candidateId, fileUrl, label = 'resume') {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/candidates/${candidateId}/attachments`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`
      },
      body: JSON.stringify({
        fileUrl: fileUrl,
        label: label
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error:', response.status, errorData);
      return;
    }

    const result = await response.json();
    console.log('Success! Attachment uploaded:', result);
    return result;
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Example usage
if (require.main === module) {
  const candidateId = process.argv[2];
  const fileUrl = process.argv[3];
  const label = process.argv[4] || 'resume';

  if (!candidateId || !fileUrl) {
    console.log('Usage: node test-url-attachment.js <candidate-id> <file-url> [label]');
    console.log('Example: node test-url-attachment.js 123e4567-e89b-12d3-a456-426614174000 https://example.com/resume.pdf');
    process.exit(1);
  }

  console.log(`Uploading attachment from URL: ${fileUrl}`);
  console.log(`Candidate ID: ${candidateId}`);
  console.log(`Label: ${label}`);
  
  uploadAttachmentFromUrl(candidateId, fileUrl, label);
}

module.exports = { uploadAttachmentFromUrl }; 