import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/users/route';

// Mock dependencies
jest.mock('@/lib/auth', () => ({
  getServerSession: jest.fn(),
  authOptions: {}
}));

jest.mock('@/lib/permissions', () => ({
  hasAnyPermission: jest.fn()
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    userGroup: {
      findFirst: jest.fn(),
      findUnique: jest.fn()
    },
    user: {
      create: jest.fn()
    },
    $executeRaw: jest.fn()
  }
}));

jest.mock('@/lib/audit', () => ({
  logAudit: jest.fn()
}));

jest.mock('@/lib/webhooks', () => ({
  dispatchWebhooks: {
    userCreated: jest.fn()
  }
}));

jest.mock('@/lib/cache', () => ({
  clearUserValidationCache: jest.fn()
}));

jest.mock('@/lib/warnings', () => ({
  createDefaultWarningConfigurations: jest.fn()
}));

describe('User Creation with Default Role', () => {
  let mockPrisma: any;
  let mockHasAnyPermission: any;
  let mockGetServerSession: any;
  let mockLogAudit: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPrisma = require('@/lib/prisma').prisma;
    mockHasAnyPermission = require('@/lib/permissions').hasAnyPermission;
    mockGetServerSession = require('@/lib/auth').getServerSession;
    mockLogAudit = require('@/lib/audit').logAudit;

    // Mock successful session
    mockGetServerSession.mockResolvedValue({
      user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' }
    });

    // Mock permissions
    mockHasAnyPermission.mockReturnValue(true);
  });

  it('should create user with default role when no role is specified', async () => {
    // Mock default user group
    const defaultGroup = {
      id: 'default-group-id',
      name: 'Recruiters',
      permissions: ['CANDIDATES_VIEW', 'CANDIDATES_CREATE']
    };

    mockPrisma.userGroup.findFirst.mockResolvedValue(defaultGroup);
    mockPrisma.userGroup.findUnique.mockResolvedValue(defaultGroup);
    mockPrisma.user.create.mockResolvedValue({
      id: 'new-user-id',
      name: 'New User',
      email: 'newuser@example.com',
      role: 'Recruiters'
    });

    const request = new NextRequest('http://localhost:3000/api/users', {
      method: 'POST',
      body: JSON.stringify({
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        // No role specified - should use default
        authenticationMethod: 'basic'
      })
    });

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(201);
    expect(result.role).toBe('Recruiters');
    
    // Verify that findFirst was called to find default group
    expect(mockPrisma.userGroup.findFirst).toHaveBeenCalledWith({
      where: { isDefault: true },
      orderBy: { createdAt: 'asc' }
    });

    // Verify that user was created with the mapped role
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        role: 'Recruiters'
      })
    });
  });

  it('should return error when no default role is configured', async () => {
    // Mock no default user group found
    mockPrisma.userGroup.findFirst.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/users', {
      method: 'POST',
      body: JSON.stringify({
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        // No role specified and no default configured
        authenticationMethod: 'basic'
      })
    });

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.message).toContain('No default role configured');
    expect(result.error).toBe('No default role configured');
    
    // Verify that findFirst was called to find default group
    expect(mockPrisma.userGroup.findFirst).toHaveBeenCalledWith({
      where: { isDefault: true },
      orderBy: { createdAt: 'asc' }
    });

    // Verify that user creation was not attempted
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('should create user with specified role when role is provided', async () => {
    // Mock user group for specified role
    const specifiedGroup = {
      id: 'specified-group-id',
      name: 'Administrators',
      permissions: ['USERS_PERMISSIONS_MANAGE']
    };

    mockPrisma.userGroup.findUnique.mockResolvedValue(specifiedGroup);
    mockPrisma.user.create.mockResolvedValue({
      id: 'new-user-id',
      name: 'New User',
      email: 'newuser@example.com',
      role: 'Admin'
    });

    const request = new NextRequest('http://localhost:3000/api/users', {
      method: 'POST',
      body: JSON.stringify({
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        role: 'Admin', // Role is specified
        authenticationMethod: 'basic'
      })
    });

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(201);
    expect(result.role).toBe('Admin');
    
    // Verify that findFirst was NOT called (since role was specified)
    expect(mockPrisma.userGroup.findFirst).not.toHaveBeenCalled();

    // Verify that user was created with the specified role
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        role: 'Admin'
      })
    });
  });

  it('should map default group names to appropriate roles', async () => {
    const testCases = [
      { groupName: 'Administrators', expectedRole: 'Admin' },
      { groupName: 'Recruiters', expectedRole: 'Recruiters' },
      { groupName: 'Hiring Managers', expectedRole: 'Hiring Manager' },
      { groupName: 'Custom Group', expectedRole: 'Recruiters' } // Default fallback
    ];

    for (const testCase of testCases) {
      jest.clearAllMocks();
      
      const defaultGroup = {
        id: 'default-group-id',
        name: testCase.groupName,
        permissions: ['CANDIDATES_VIEW']
      };

      mockPrisma.userGroup.findFirst.mockResolvedValue(defaultGroup);
      mockPrisma.userGroup.findUnique.mockResolvedValue(defaultGroup);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        name: 'New User',
        email: 'newuser@example.com',
        role: testCase.expectedRole
      });

      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New User',
          email: 'newuser@example.com',
          password: 'password123',
          // No role specified
          authenticationMethod: 'basic'
        })
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(201);
      expect(result.role).toBe(testCase.expectedRole);
    }
  });
});
