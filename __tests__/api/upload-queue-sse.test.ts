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

describe('Upload Queue SSE', () => {
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

  describe('GET /api/upload-queue/sse', () => {
    it('should establish SSE connection and send initial data', async () => {
      // Mock successful database queries
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'test-job-1',
              file_name: 'test-resume.pdf',
              status: 'queued',
              upload_date: new Date().toISOString(),
            },
            {
              id: 'test-job-2',
              file_name: 'test-resume-2.pdf',
              status: 'inprocess',
              upload_date: new Date().toISOString(),
            }
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ count: '2' }],
        })
        .mockResolvedValueOnce({
          rows: [{
            total: '2',
            queued: '1',
            inprocess: '1',
            success: '0',
            error: '0',
          }],
        });

      // Import the handler dynamically
      const { GET } = await import('@/app/api/upload-queue/sse/route');
      
      // Create a mock request
      const request = new NextRequest('http://localhost:3000/api/upload-queue/sse');
      
      // Call the handler
      const response = await GET(request);
      
      // Verify response headers
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-transform');
      expect(response.headers.get('Connection')).toBe('keep-alive');
      expect(response.headers.get('X-Accel-Buffering')).toBe('no');
      
      // Verify response status
      expect(response.status).toBe(200);
      
      // Verify database queries were called
      expect(mockClient.query).toHaveBeenCalledTimes(3);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockClient.query.mockRejectedValueOnce(new Error('Database connection failed'));

      // Import the handler dynamically
      const { GET } = await import('@/app/api/upload-queue/sse/route');
      
      // Create a mock request
      const request = new NextRequest('http://localhost:3000/api/upload-queue/sse');
      
      // Call the handler
      const response = await GET(request);
      
      // Verify response status
      expect(response.status).toBe(200);
      
      // Verify error handling
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('broadcastUploadQueueUpdate', () => {
    it('should broadcast updates to connected clients', async () => {
      // Import the broadcast function
      const { broadcastUploadQueueUpdate } = await import('@/app/api/upload-queue/sse/broadcastUploadQueueUpdate');
      
      // Mock successful database queries
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'test-job-1',
              file_name: 'test-resume.pdf',
              status: 'queued',
              upload_date: new Date().toISOString(),
            }
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ count: '1' }],
        })
        .mockResolvedValueOnce({
          rows: [{
            total: '1',
            queued: '1',
            inprocess: '0',
            success: '0',
            error: '0',
          }],
        });

      // Create a mock controller
      const mockController = {
        enqueue: jest.fn(),
      };

      // Import the sendUploadQueueUpdate function
      const { sendUploadQueueUpdate } = await import('@/app/api/upload-queue/sse/broadcastUploadQueueUpdate');
      
      // Test sending update to a single controller
      await sendUploadQueueUpdate(mockController);
      
      // Verify the controller received the update
      expect(mockController.enqueue).toHaveBeenCalled();
      
      // Verify database queries were called
      expect(mockClient.query).toHaveBeenCalledTimes(3);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
