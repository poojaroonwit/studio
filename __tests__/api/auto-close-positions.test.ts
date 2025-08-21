import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { POST } from '@/app/api/positions/auto-close/route';
import prisma from '@/lib/prisma';
import { mockSession } from '../utils/mockSession';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  default: {
    position: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/headcountUtils', () => ({
  checkAndAutoCloseAllPositions: vi.fn(),
}));

describe('/api/positions/auto-close', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return 401 for unauthenticated requests', async () => {
    const { req } = createMocks({
      method: 'POST',
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 403 for non-admin users', async () => {
    const { req } = createMocks({
      method: 'POST',
    });

    // Mock session with non-admin user
    mockSession({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        role: 'Recruiter',
      },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden - Admin permissions required');
  });

  it('should successfully run auto-close check for admin users', async () => {
    const { req } = createMocks({
      method: 'POST',
    });

    // Mock session with admin user
    mockSession({
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'Admin',
        name: 'Admin User',
      },
    });

    // Mock the auto-close function
    const mockResults = [
      {
        positionId: 'pos-1',
        positionTitle: 'Software Engineer',
        success: true,
        message: 'Position automatically closed successfully',
        action: 'closed' as const,
        headcountStatus: {
          totalHeadcounts: 2,
          filledHeadcounts: 2,
          vacantHeadcounts: 0,
        },
      },
      {
        positionId: 'pos-2',
        positionTitle: 'Product Manager',
        success: true,
        message: 'Position still has vacant headcounts',
        action: 'none' as const,
        headcountStatus: {
          totalHeadcounts: 3,
          filledHeadcounts: 1,
          vacantHeadcounts: 2,
        },
      },
    ];

    const { checkAndAutoCloseAllPositions } = await import('@/lib/headcountUtils');
    vi.mocked(checkAndAutoCloseAllPositions).mockResolvedValue(mockResults);

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain('Auto-close check completed');
    expect(data.results).toEqual(mockResults);
    expect(data.summary).toEqual({
      totalProcessed: 2,
      closedCount: 1,
      errorCount: 0,
      noActionCount: 1,
    });

    // Verify the function was called with correct parameters
    expect(checkAndAutoCloseAllPositions).toHaveBeenCalledWith(
      'admin-1',
      'Admin User'
    );
  });

  it('should handle errors gracefully', async () => {
    const { req } = createMocks({
      method: 'POST',
    });

    // Mock session with admin user
    mockSession({
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'Admin',
        name: 'Admin User',
      },
    });

    // Mock the auto-close function to throw an error
    const { checkAndAutoCloseAllPositions } = await import('@/lib/headcountUtils');
    vi.mocked(checkAndAutoCloseAllPositions).mockRejectedValue(
      new Error('Database connection failed')
    );

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
    expect(data.details).toBe('Database connection failed');
  });
});
