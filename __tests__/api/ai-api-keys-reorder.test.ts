import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/settings/ai-api-keys/reorder/route';
import { NextRequest } from 'next/server';

// Mock the database pool
vi.mock('@/lib/db', () => ({
  getPool: vi.fn(() => ({
    connect: vi.fn(() => ({
      query: vi.fn(),
      release: vi.fn(),
    })),
  })),
}));

// Mock the audit log
vi.mock('@/lib/auditLog', () => ({
  logAudit: vi.fn(),
}));

// Mock next-auth
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(() => ({
    user: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      role: 'Admin'
    }
  }))
}));

// Mock the aiApiKeyManager
vi.mock('@/lib/aiApiKeyManager', () => ({
  getApiKeys: vi.fn(),
  saveApiKeys: vi.fn(),
}));

describe('AI API Keys Reorder API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reorder API keys successfully', async () => {
    const mockGetApiKeys = vi.mocked(require('@/lib/aiApiKeyManager').getApiKeys);
    const mockSaveApiKeys = vi.mocked(require('@/lib/aiApiKeyManager').saveApiKeys);
    
    // Mock existing API keys
    mockGetApiKeys.mockResolvedValue([
      { key: 'key1', priority: 1, isActive: true, errorCount: 0 },
      { key: 'key2', priority: 2, isActive: true, errorCount: 0 },
      { key: 'key3', priority: 3, isActive: true, errorCount: 0 }
    ]);
    
    mockSaveApiKeys.mockResolvedValue();

    const requestBody = {
      apiKeys: [
        { key: 'key2', priority: 1 },
        { key: 'key1', priority: 2 },
        { key: 'key3', priority: 3 }
      ]
    };

    const request = new NextRequest('http://localhost:3000/api/settings/ai-api-keys/reorder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('API keys reordered successfully');
    expect(mockSaveApiKeys).toHaveBeenCalledWith(requestBody.apiKeys);
  });

  it('should return 400 for duplicate priorities', async () => {
    const requestBody = {
      apiKeys: [
        { key: 'key1', priority: 1 },
        { key: 'key2', priority: 1 } // Duplicate priority
      ]
    };

    const request = new NextRequest('http://localhost:3000/api/settings/ai-api-keys/reorder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Duplicate priorities found');
  });

  it('should return 400 for non-existent API key', async () => {
    const mockGetApiKeys = vi.mocked(require('@/lib/aiApiKeyManager').getApiKeys);
    
    // Mock existing API keys (only key1 exists)
    mockGetApiKeys.mockResolvedValue([
      { key: 'key1', priority: 1, isActive: true, errorCount: 0 }
    ]);

    const requestBody = {
      apiKeys: [
        { key: 'key1', priority: 1 },
        { key: 'nonexistent-key', priority: 2 } // Non-existent key
      ]
    };

    const request = new NextRequest('http://localhost:3000/api/settings/ai-api-keys/reorder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('API key not found');
  });

  it('should return 403 for insufficient permissions', async () => {
    // Mock non-admin user
    vi.mocked(require('next-auth/next').getServerSession).mockResolvedValue({
      user: {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        role: 'User' // Not Admin
      }
    });

    const requestBody = {
      apiKeys: [
        { key: 'key1', priority: 1 },
        { key: 'key2', priority: 2 }
      ]
    };

    const request = new NextRequest('http://localhost:3000/api/settings/ai-api-keys/reorder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.message).toContain('Forbidden');
  });
});
