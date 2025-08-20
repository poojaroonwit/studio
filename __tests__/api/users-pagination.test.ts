import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

// Mock next-auth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(() => ({
    user: {
      id: 'test-user-id',
      name: 'Test Admin',
      email: 'admin@example.com',
      role: 'Admin',
      modulePermissions: ['USERS_MANAGE'],
    },
  })),
}));

// Mock the audit log
jest.mock('@/lib/auditLog', () => ({
  logAudit: jest.fn(),
}));

describe('Users API Pagination', () => {
  let mockPrisma: any;

  beforeEach(async () => {
    // Import and mock Prisma
    mockPrisma = (await import('@/lib/prisma')).default;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users with pagination', () => {
    it('should return paginated users with correct metadata', async () => {
      // Mock the count query
      mockPrisma.user.count.mockResolvedValue(25);

      // Mock the findMany query
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'user-1',
          name: 'User 1',
          email: 'user1@example.com',
          role: 'Recruiter',
          avatarUrl: 'https://example.com/avatar1.jpg',
          personalColor: '#3B82F6',
          authenticationMethod: 'basic',
          forcePasswordChange: false,
          module_permissions: ['CANDIDATES_VIEW'],
          createdAt: new Date(),
          updatedAt: new Date(),
          userTeams: [],
        },
        {
          id: 'user-2',
          name: 'User 2',
          email: 'user2@example.com',
          role: 'Hiring Manager',
          avatarUrl: 'https://example.com/avatar2.jpg',
          personalColor: '#10B981',
          authenticationMethod: 'azure',
          forcePasswordChange: true,
          module_permissions: ['POSITIONS_MANAGE'],
          createdAt: new Date(),
          updatedAt: new Date(),
          userTeams: [],
        },
      ]);

      // Import the handler
      const { GET } = await import('@/app/api/users/route');
      
      const req = new NextRequest('http://localhost:3000/api/users?page=2&pageSize=10');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('users');
      expect(data).toHaveProperty('pagination');
      expect(data.pagination).toEqual({
        currentPage: 2,
        totalPages: 3,
        totalCount: 25,
        pageSize: 10,
      });
      expect(data.users).toHaveLength(2);
      expect(data.users[0]).toHaveProperty('teams');
      expect(data.users[0]).toHaveProperty('modulePermissions');
    });

    it('should handle filters with pagination', async () => {
      mockPrisma.user.count.mockResolvedValue(5);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const { GET } = await import('@/app/api/users/route');
      
      const req = new NextRequest('http://localhost:3000/api/users?name=john&role=Recruiter&page=1&pageSize=5');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: {
          name: { contains: 'john', mode: 'insensitive' },
          role: 'Recruiter',
        },
      });
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          name: { contains: 'john', mode: 'insensitive' },
          role: 'Recruiter',
        },
        select: expect.any(Object),
        orderBy: { name: 'asc' },
        skip: 0,
        take: 5,
      });
    });

    it('should handle default pagination parameters', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const { GET } = await import('@/app/api/users/route');
      
      const req = new NextRequest('http://localhost:3000/api/users');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination).toEqual({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        pageSize: 10,
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.user.count.mockRejectedValue(new Error('Database connection failed'));

      const { GET } = await import('@/app/api/users/route');
      
      const req = new NextRequest('http://localhost:3000/api/users?page=1&pageSize=10');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty('message');
      expect(data.message).toContain('Error fetching users');
    });
  });
});

