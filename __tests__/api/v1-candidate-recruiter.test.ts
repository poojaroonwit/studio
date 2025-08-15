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

// Mock the audit log
jest.mock('@/lib/auditLog', () => ({
  logAudit: jest.fn(),
}));

describe('V1 Candidate Recruiter Assignment API', () => {
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

  describe('GET /api/v1/candidates/{id}/recruiter', () => {
    it('should return candidate recruiter information', async () => {
      // Mock the database response
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'candidate-id',
          recruiterId: 'recruiter-id',
          recruiterName: 'Jane Smith',
          recruiterEmail: 'jane@example.com',
        }],
      });

      // Import the handler dynamically
      const { GET } = await import('@/app/api/v1/candidates/[id]/recruiter/route');
      
      const req = new NextRequest('http://localhost:3000/api/v1/candidates/candidate-id/recruiter', {
        headers: {
          'authorization': 'Bearer test-token',
        },
      });

      const response = await GET(req, { params: { id: 'candidate-id' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        candidateId: 'candidate-id',
        recruiter: {
          id: 'recruiter-id',
          name: 'Jane Smith',
          email: 'jane@example.com',
        },
      });
    });

    it('should return null recruiter when no recruiter is assigned', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'candidate-id',
          recruiterId: null,
          recruiterName: null,
          recruiterEmail: null,
        }],
      });

      const { GET } = await import('@/app/api/v1/candidates/[id]/recruiter/route');
      
      const req = new NextRequest('http://localhost:3000/api/v1/candidates/candidate-id/recruiter', {
        headers: {
          'authorization': 'Bearer test-token',
        },
      });

      const response = await GET(req, { params: { id: 'candidate-id' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        candidateId: 'candidate-id',
        recruiter: null,
      });
    });
  });

  describe('PUT /api/v1/candidates/{id}/recruiter', () => {
    it('should assign a recruiter to a candidate', async () => {
      // Mock candidate exists
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'candidate-id',
          name: 'John Doe',
          recruiterId: null,
        }],
      });

      // Mock recruiter validation
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'recruiter-id',
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: 'Recruiter',
        }],
      });

      // Mock update
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'candidate-id',
          name: 'John Doe',
          recruiterId: 'recruiter-id',
        }],
      });

      // Mock position and status query
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          positionId: 'position-id',
          status: 'Applied',
        }],
      });

      // Mock recruiter name query for transition record
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          name: 'Jane Smith',
        }],
      });

      // Mock transition record insert
      mockClient.query.mockResolvedValueOnce({});

      // Mock fetch updated candidate
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'candidate-id',
          name: 'John Doe',
          recruiterId: 'recruiter-id',
          recruiterName: 'Jane Smith',
          recruiterEmail: 'jane@example.com',
        }],
      });

      const { PUT } = await import('@/app/api/v1/candidates/[id]/recruiter/route');
      
      const req = new NextRequest('http://localhost:3000/api/v1/candidates/candidate-id/recruiter', {
        method: 'PUT',
        headers: {
          'authorization': 'Bearer test-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          recruiterId: 'recruiter-id',
        }),
      });

      const response = await PUT(req, { params: { id: 'candidate-id' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Candidate recruiter updated successfully');
      expect(data.candidate.recruiter).toEqual({
        id: 'recruiter-id',
        name: 'Jane Smith',
        email: 'jane@example.com',
      });
    });

    it('should validate that the user is a recruiter', async () => {
      // Mock candidate exists
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'candidate-id',
          name: 'John Doe',
          recruiterId: null,
        }],
      });

      // Mock recruiter validation - user is not a recruiter
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'user-id',
          name: 'Regular User',
          email: 'user@example.com',
          role: 'User',
        }],
      });

      const { PUT } = await import('@/app/api/v1/candidates/[id]/recruiter/route');
      
      const req = new NextRequest('http://localhost:3000/api/v1/candidates/candidate-id/recruiter', {
        method: 'PUT',
        headers: {
          'authorization': 'Bearer test-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          recruiterId: 'user-id',
        }),
      });

      const response = await PUT(req, { params: { id: 'candidate-id' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('User is not a recruiter');
    });
  });

  describe('DELETE /api/v1/candidates/{id}/recruiter', () => {
    it('should unassign a recruiter from a candidate', async () => {
      // Mock candidate exists with recruiter
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'candidate-id',
          name: 'John Doe',
          recruiterId: 'recruiter-id',
        }],
      });

      // Mock update
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'candidate-id',
          name: 'John Doe',
          recruiterId: null,
        }],
      });

      // Mock position and status query
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          positionId: 'position-id',
          status: 'Applied',
        }],
      });

      // Mock transition record insert
      mockClient.query.mockResolvedValueOnce({});

      const { DELETE } = await import('@/app/api/v1/candidates/[id]/recruiter/route');
      
      const req = new NextRequest('http://localhost:3000/api/v1/candidates/candidate-id/recruiter', {
        method: 'DELETE',
        headers: {
          'authorization': 'Bearer test-token',
        },
      });

      const response = await DELETE(req, { params: { id: 'candidate-id' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Candidate recruiter unassigned successfully');
    });

    it('should return error when candidate has no recruiter assigned', async () => {
      // Mock candidate exists without recruiter
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'candidate-id',
          name: 'John Doe',
          recruiterId: null,
        }],
      });

      const { DELETE } = await import('@/app/api/v1/candidates/[id]/recruiter/route');
      
      const req = new NextRequest('http://localhost:3000/api/v1/candidates/candidate-id/recruiter', {
        method: 'DELETE',
        headers: {
          'authorization': 'Bearer test-token',
        },
      });

      const response = await DELETE(req, { params: { id: 'candidate-id' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Candidate has no recruiter assigned');
    });
  });
});
