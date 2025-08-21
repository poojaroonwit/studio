import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/v1/candidates/clear-duplicates/route';
import prisma from '@/lib/prisma';

// Mock dependencies
jest.mock('@/lib/auth', () => ({
  verifyApiToken: jest.fn()
}));

jest.mock('@/lib/cors', () => ({
  handleCors: jest.fn(() => null)
}));

jest.mock('@/lib/auditLog', () => ({
  logAudit: jest.fn()
}));

const { verifyApiToken } = require('@/lib/auth');
const { logAudit } = require('@/lib/auditLog');

describe('POST /api/v1/candidates/clear-duplicates', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    module_permissions: ['candidates']
  };

  beforeEach(() => {
    verifyApiToken.mockResolvedValue({ success: true, user: mockUser });
    logAudit.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 for invalid API token', async () => {
    verifyApiToken.mockResolvedValue({ success: false });

    const request = new NextRequest('http://localhost:3000/api/v1/candidates/clear-duplicates', {
      method: 'POST',
      body: JSON.stringify({})
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid API token');
  });

  it('should return 403 for insufficient permissions', async () => {
    verifyApiToken.mockResolvedValue({ 
      success: true, 
      user: { ...mockUser, module_permissions: [] }
    });

    const request = new NextRequest('http://localhost:3000/api/v1/candidates/clear-duplicates', {
      method: 'POST',
      body: JSON.stringify({})
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Insufficient permissions to manage candidates');
  });

  it('should handle dry run mode correctly', async () => {
    // Mock Prisma to return some duplicate candidates
    const mockCandidates = [
      {
        id: 'candidate-1',
        email: 'test@example.com',
        positionId: 'position-1',
        fitScore: 85,
        createdAt: new Date('2024-01-01')
      },
      {
        id: 'candidate-2',
        email: 'test@example.com',
        positionId: 'position-1',
        fitScore: 0,
        createdAt: new Date('2024-01-02')
      }
    ];

    prisma.candidate.findMany = jest.fn().mockResolvedValue(mockCandidates);
    prisma.candidate.deleteMany = jest.fn();

    const request = new NextRequest('http://localhost:3000/api/v1/candidates/clear-duplicates', {
      method: 'POST',
      body: JSON.stringify({ dryRun: true })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.dryRun).toBe(true);
    expect(data.data.duplicatesFound).toBe(1);
    expect(data.data.candidatesToDelete).toBe(1);
    expect(prisma.candidate.deleteMany).not.toHaveBeenCalled();
  });

  it('should return success when no duplicates found', async () => {
    prisma.candidate.findMany = jest.fn().mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/v1/candidates/clear-duplicates', {
      method: 'POST',
      body: JSON.stringify({})
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.message).toBe('No duplicate candidates found');
    expect(data.data.duplicatesFound).toBe(0);
    expect(data.data.candidatesToDelete).toBe(0);
  });

  it('should handle position-specific filtering', async () => {
    const mockCandidates = [
      {
        id: 'candidate-1',
        email: 'test@example.com',
        positionId: 'position-1',
        fitScore: 85,
        createdAt: new Date('2024-01-01')
      }
    ];

    prisma.candidate.findMany = jest.fn().mockResolvedValue(mockCandidates);

    const request = new NextRequest('http://localhost:3000/api/v1/candidates/clear-duplicates', {
      method: 'POST',
      body: JSON.stringify({ positionId: 'position-1' })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.candidate.findMany).toHaveBeenCalledWith({
      where: { positionId: 'position-1' },
      select: {
        id: true,
        email: true,
        positionId: true,
        fitScore: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
  });

  it('should prioritize candidates by creation date (earliest first)', async () => {
    const mockCandidates = [
      {
        id: 'candidate-1',
        email: 'test@example.com',
        positionId: 'position-1',
        fitScore: 0,
        createdAt: new Date('2024-01-01')
      },
      {
        id: 'candidate-2',
        email: 'test@example.com',
        positionId: 'position-1',
        fitScore: 85,
        createdAt: new Date('2024-01-02')
      }
    ];

    prisma.candidate.findMany = jest.fn().mockResolvedValue(mockCandidates);
    prisma.candidate.deleteMany = jest.fn().mockResolvedValue({ count: 1 });

    const request = new NextRequest('http://localhost:3000/api/v1/candidates/clear-duplicates', {
      method: 'POST',
      body: JSON.stringify({})
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.candidatesDeleted).toBe(1);
    expect(data.data.keptCandidates[0].fitScore).toBe(0); // Should keep the first created (earliest date)
    expect(data.data.keptCandidates[0].id).toBe('candidate-1'); // Should keep candidate-1 (earliest createdAt)
  });

  it('should handle candidates without position correctly', async () => {
    const mockCandidates = [
      {
        id: 'candidate-1',
        email: 'test@example.com',
        positionId: null,
        fitScore: 85,
        createdAt: new Date('2024-01-01')
      },
      {
        id: 'candidate-2',
        email: 'test@example.com',
        positionId: null,
        fitScore: 0,
        createdAt: new Date('2024-01-02')
      }
    ];

    prisma.candidate.findMany = jest.fn().mockResolvedValue(mockCandidates);
    prisma.candidate.deleteMany = jest.fn().mockResolvedValue({ count: 1 });

    const request = new NextRequest('http://localhost:3000/api/v1/candidates/clear-duplicates', {
      method: 'POST',
      body: JSON.stringify({})
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.candidatesDeleted).toBe(1);
  });
});
