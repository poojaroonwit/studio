import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';

// Mock the database connection
jest.mock('@/lib/db', () => ({
  getPool: jest.fn(() => ({
    connect: jest.fn(() => ({
      query: jest.fn(),
      release: jest.fn(),
    })),
  })),
}));

// Mock the auth module
jest.mock('@/lib/auth', () => ({
  verifyApiToken: jest.fn(() => ({
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    role: 'Admin',
    modulePermissions: ['CANDIDATES_MANAGE'],
  })),
}));

// Mock MinIO
jest.mock('@/lib/minio', () => ({
  minioClient: {
    putObject: jest.fn(),
  },
  ensureBucketExists: jest.fn(),
}));

// Mock MinIO constants
jest.mock('@/lib/minio-constants', () => ({
  MINIO_BUCKET: 'test-bucket',
  MINIO_PUBLIC_BASE_URL: 'https://test-minio.example.com',
}));

// Mock file utilities
jest.mock('@/lib/fileUtils', () => ({
  generateUniqueFilename: jest.fn(() => 'test-file-123.pdf'),
}));

// Mock SSE broadcast
jest.mock('@/app/api/upload-queue/sse/broadcastUploadQueueUpdate', () => ({
  broadcastUploadQueueUpdate: jest.fn(),
}));

describe('V1 Bulk Upload CV API', () => {
  let mockClient: any;
  let mockPool: any;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    
    mockPool = {
      connect: jest.fn(() => mockClient),
    };
    
    (getPool as jest.Mock).mockReturnValue(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/candidates/bulk-upload-cv', () => {
    it('should accept sourceId parameter and include it in webhook payload', async () => {
      // Mock successful database insertion
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'upload-queue-id',
          file_name: 'test-resume.pdf',
          file_size: 1024,
          status: 'queued',
          source: 'bulk',
          upload_id: 'upload-id',
          file_path: 'resumes/upload-queue/test-file-123.pdf',
          webhook_payload: {
            targetPositionId: 'position-id',
            sourceId: 'source-id'
          },
          created_by: 'test-user-id',
          upload_date: new Date().toISOString(),
        }],
      });

      // Import the handler dynamically
      const { POST } = await import('@/app/api/v1/candidates/bulk-upload-cv/route');
      
      // Create form data with sourceId
      const formData = new FormData();
      const file = new File(['test content'], 'test-resume.pdf', { type: 'application/pdf' });
      formData.append('file', file);
      formData.append('positionId', 'position-id');
      formData.append('sourceId', 'source-id');

      const req = new NextRequest('http://localhost:3000/api/v1/candidates/bulk-upload-cv', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer test-token',
          'content-type': 'multipart/form-data; boundary=----formdata-test',
        },
        body: formData,
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.uploadQueueJob).toBeDefined();
      expect(data.uploadQueueJob.webhook_payload).toEqual({
        targetPositionId: 'position-id',
        sourceId: 'source-id'
      });
    });

    it('should handle missing sourceId parameter gracefully', async () => {
      // Mock successful database insertion without sourceId
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'upload-queue-id',
          file_name: 'test-resume.pdf',
          file_size: 1024,
          status: 'queued',
          source: 'bulk',
          upload_id: 'upload-id',
          file_path: 'resumes/upload-queue/test-file-123.pdf',
          webhook_payload: {
            targetPositionId: 'position-id',
            sourceId: null
          },
          created_by: 'test-user-id',
          upload_date: new Date().toISOString(),
        }],
      });

      const { POST } = await import('@/app/api/v1/candidates/bulk-upload-cv/route');
      
      // Create form data without sourceId
      const formData = new FormData();
      const file = new File(['test content'], 'test-resume.pdf', { type: 'application/pdf' });
      formData.append('file', file);
      formData.append('positionId', 'position-id');
      // No sourceId appended

      const req = new NextRequest('http://localhost:3000/api/v1/candidates/bulk-upload-cv', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer test-token',
          'content-type': 'multipart/form-data; boundary=----formdata-test',
        },
        body: formData,
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.uploadQueueJob).toBeDefined();
      expect(data.uploadQueueJob.webhook_payload).toEqual({
        targetPositionId: 'position-id',
        sourceId: null
      });
    });

    it('should require positionId parameter', async () => {
      const { POST } = await import('@/app/api/v1/candidates/bulk-upload-cv/route');
      
      // Create form data without positionId
      const formData = new FormData();
      const file = new File(['test content'], 'test-resume.pdf', { type: 'application/pdf' });
      formData.append('file', file);
      // No positionId appended

      const req = new NextRequest('http://localhost:3000/api/v1/candidates/bulk-upload-cv', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer test-token',
          'content-type': 'multipart/form-data; boundary=----formdata-test',
        },
        body: formData,
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing positionId');
    });

    it('should require file parameter', async () => {
      const { POST } = await import('@/app/api/v1/candidates/bulk-upload-cv/route');
      
      // Create form data without file
      const formData = new FormData();
      formData.append('positionId', 'position-id');
      // No file appended

      const req = new NextRequest('http://localhost:3000/api/v1/candidates/bulk-upload-cv', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer test-token',
          'content-type': 'multipart/form-data; boundary=----formdata-test',
        },
        body: formData,
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No file uploaded');
    });

    it('should handle additional attachment file', async () => {
      // Mock successful database insertion with additional attachment
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'upload-queue-id',
          file_name: 'test-resume.pdf',
          file_size: 1024,
          status: 'queued',
          source: 'bulk',
          upload_id: 'upload-id',
          file_path: 'resumes/upload-queue/test-file-123.pdf',
          webhook_payload: {
            targetPositionId: 'position-id',
            sourceId: null,
            additionalAttachment: {
              path: 'attachments/upload-queue/test-attachment-123.docx',
              name: 'test-attachment.docx',
              size: 512,
              type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            }
          },
          created_by: 'test-user-id',
          upload_date: new Date().toISOString(),
        }],
      });

      const { POST } = await import('@/app/api/v1/candidates/bulk-upload-cv/route');
      
      // Create form data with additional attachment
      const formData = new FormData();
      const file = new File(['test content'], 'test-resume.pdf', { type: 'application/pdf' });
      const attachment = new File(['attachment content'], 'test-attachment.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      formData.append('file', file);
      formData.append('positionId', 'position-id');
      formData.append('additionalAttachment', attachment);

      const req = new NextRequest('http://localhost:3000/api/v1/candidates/bulk-upload-cv', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer test-token',
          'content-type': 'multipart/form-data; boundary=----formdata-test',
        },
        body: formData,
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.uploadQueueJob).toBeDefined();
                     expect(data.uploadQueueJob.webhook_payload.additionalAttachment).toEqual({
                 path: 'attachments/upload-queue/test-attachment-123.docx',
                 name: 'test-attachment.docx',
                 size: 512,
                 type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
               });
               
               // Verify that the webhook processing will include the additional attachment URL
               const expectedWebhookInputs = {
                 cv_url: expect.stringContaining('resumes/upload-queue/test-file-123.pdf'),
                 applied_position_id: 'position-id',
                 jobId: 'upload-queue-id',
                 additional_attachment_url: expect.stringContaining('attachments/upload-queue/test-attachment-123.docx'),
                 additional_attachment: {
                   url: expect.stringContaining('attachments/upload-queue/test-attachment-123.docx'),
                   name: 'test-attachment.docx',
                   size: 512,
                   type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                 }
               };
    });

    it('should handle request without additional attachment', async () => {
      // Mock successful database insertion without additional attachment
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'upload-queue-id',
          file_name: 'test-resume.pdf',
          file_size: 1024,
          status: 'queued',
          source: 'bulk',
          upload_id: 'upload-id',
          file_path: 'resumes/upload-queue/test-file-123.pdf',
          webhook_payload: {
            targetPositionId: 'position-id',
            sourceId: null,
            additionalAttachment: null
          },
          created_by: 'test-user-id',
          upload_date: new Date().toISOString(),
        }],
      });

      const { POST } = await import('@/app/api/v1/candidates/bulk-upload-cv/route');
      
      // Create form data without additional attachment
      const formData = new FormData();
      const file = new File(['test content'], 'test-resume.pdf', { type: 'application/pdf' });
      formData.append('file', file);
      formData.append('positionId', 'position-id');
      // No additionalAttachment appended

      const req = new NextRequest('http://localhost:3000/api/v1/candidates/bulk-upload-cv', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer test-token',
          'content-type': 'multipart/form-data; boundary=----formdata-test',
        },
        body: formData,
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.uploadQueueJob).toBeDefined();
      expect(data.uploadQueueJob.webhook_payload.additionalAttachment).toBeNull();
    });
  });
});
