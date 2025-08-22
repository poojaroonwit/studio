import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeWithApiKeyFallback, getApiKeys, saveApiKeys } from '@/lib/aiApiKeyManager';

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

describe('AI API Key Fallback System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executeWithApiKeyFallback', () => {
    it('should execute operation with first available API key', async () => {
      // Mock successful API key retrieval
      const mockQuery = vi.fn();
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            { key: 'geminiApiKey_1', value: 'test-key-1' },
            { key: 'geminiApiKey_2', value: 'test-key-2' },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }); // For error tracking

      const mockClient = {
        query: mockQuery,
        release: vi.fn(),
      };

      vi.mocked(require('@/lib/db').getPool).mockReturnValue({
        connect: vi.fn().mockResolvedValue(mockClient),
      });

      const mockOperation = vi.fn().mockResolvedValue('success');

      const result = await executeWithApiKeyFallback(mockOperation, 'Test Operation');

      expect(result.success).toBe(true);
      expect(result.apiKey).toBe('test-key-1');
      expect(result.attempts).toBe(1);
      expect(mockOperation).toHaveBeenCalledWith('test-key-1');
    });

    it('should fallback to next key when first key fails', async () => {
      // Mock API key retrieval
      const mockQuery = vi.fn();
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            { key: 'geminiApiKey_1', value: 'test-key-1' },
            { key: 'geminiApiKey_2', value: 'test-key-2' },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }); // For error tracking

      const mockClient = {
        query: mockQuery,
        release: vi.fn(),
      };

      vi.mocked(require('@/lib/db').getPool).mockReturnValue({
        connect: vi.fn().mockResolvedValue(mockClient),
      });

      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('First key failed'))
        .mockResolvedValueOnce('success');

      const result = await executeWithApiKeyFallback(mockOperation, 'Test Operation');

      expect(result.success).toBe(true);
      expect(result.apiKey).toBe('test-key-2');
      expect(result.attempts).toBe(2);
      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(mockOperation).toHaveBeenNthCalledWith(1, 'test-key-1');
      expect(mockOperation).toHaveBeenNthCalledWith(2, 'test-key-2');
    });

    it('should fallback to environment variable when all database keys fail', async () => {
      // Mock empty database keys
      const mockQuery = vi.fn().mockResolvedValue({ rows: [] });
      const mockClient = {
        query: mockQuery,
        release: vi.fn(),
      };

      vi.mocked(require('@/lib/db').getPool).mockReturnValue({
        connect: vi.fn().mockResolvedValue(mockClient),
      });

      // Mock environment variable
      const originalEnv = process.env.GOOGLE_API_KEY;
      process.env.GOOGLE_API_KEY = 'env-key';

      const mockOperation = vi.fn().mockResolvedValue('success');

      const result = await executeWithApiKeyFallback(mockOperation, 'Test Operation');

      expect(result.success).toBe(true);
      expect(result.apiKey).toBe('env-key');
      expect(result.attempts).toBe(1);
      expect(mockOperation).toHaveBeenCalledWith('env-key');

      // Restore environment
      process.env.GOOGLE_API_KEY = originalEnv;
    });

    it('should return failure when all keys fail', async () => {
      // Mock API key retrieval
      const mockQuery = vi.fn();
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            { key: 'geminiApiKey_1', value: 'test-key-1' },
            { key: 'geminiApiKey_2', value: 'test-key-2' },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }); // For error tracking

      const mockClient = {
        query: mockQuery,
        release: vi.fn(),
      };

      vi.mocked(require('@/lib/db').getPool).mockReturnValue({
        connect: vi.fn().mockResolvedValue(mockClient),
      });

      const mockOperation = vi.fn()
        .mockRejectedValue(new Error('All keys failed'));

      const result = await executeWithApiKeyFallback(mockOperation, 'Test Operation');

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(2);
      expect(result.error).toContain('All 2 API keys failed');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should return failure when no keys are configured', async () => {
      // Mock empty database keys
      const mockQuery = vi.fn().mockResolvedValue({ rows: [] });
      const mockClient = {
        query: mockQuery,
        release: vi.fn(),
      };

      vi.mocked(require('@/lib/db').getPool).mockReturnValue({
        connect: vi.fn().mockResolvedValue(mockClient),
      });

      // Mock no environment variable
      const originalEnv = process.env.GOOGLE_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      const mockOperation = vi.fn();

      const result = await executeWithApiKeyFallback(mockOperation, 'Test Operation');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No API keys configured');
      expect(result.attempts).toBe(0);
      expect(mockOperation).not.toHaveBeenCalled();

      // Restore environment
      process.env.GOOGLE_API_KEY = originalEnv;
    });
  });

  describe('getApiKeys', () => {
    it('should return API keys sorted by priority', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        rows: [
          { key: 'geminiApiKey_2', value: 'key-2' },
          { key: 'geminiApiKey_1', value: 'key-1' },
          { key: 'geminiApiKey_3', value: 'key-3' },
        ],
      });

      const mockClient = {
        query: mockQuery,
        release: vi.fn(),
      };

      vi.mocked(require('@/lib/db').getPool).mockReturnValue({
        connect: vi.fn().mockResolvedValue(mockClient),
      });

      const result = await getApiKeys();

      expect(result).toHaveLength(3);
      expect(result[0].priority).toBe(1);
      expect(result[0].key).toBe('key-1');
      expect(result[1].priority).toBe(2);
      expect(result[1].key).toBe('key-2');
      expect(result[2].priority).toBe(3);
      expect(result[2].key).toBe('key-3');
    });

    it('should handle legacy single key format', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        rows: [
          { key: 'geminiApiKey', value: 'legacy-key' },
        ],
      });

      const mockClient = {
        query: mockQuery,
        release: vi.fn(),
      };

      vi.mocked(require('@/lib/db').getPool).mockReturnValue({
        connect: vi.fn().mockResolvedValue(mockClient),
      });

      const result = await getApiKeys();

      expect(result).toHaveLength(1);
      expect(result[0].priority).toBe(1);
      expect(result[0].key).toBe('legacy-key');
      expect(result[0].isActive).toBe(true);
    });
  });

  describe('saveApiKeys', () => {
    it('should save API keys with correct format', async () => {
      const mockQuery = vi.fn();
      const mockClient = {
        query: mockQuery,
        release: vi.fn(),
      };

      vi.mocked(require('@/lib/db').getPool).mockReturnValue({
        connect: vi.fn().mockResolvedValue(mockClient),
      });

      const apiKeys = [
        { key: 'test-key-1', priority: 1 },
        { key: 'test-key-2', priority: 2 },
      ];

      await saveApiKeys(apiKeys);

      expect(mockQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockQuery).toHaveBeenCalledWith('COMMIT');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM "SystemSetting"'),
        expect.any(Array)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO "SystemSetting"'),
        ['geminiApiKey_1', 'test-key-1']
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO "SystemSetting"'),
        ['geminiApiKey_2', 'test-key-2']
      );
    });
  });
});
