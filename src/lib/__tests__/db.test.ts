/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withDbClient, withDbTransaction, getSafeDbClient } from '../db';

// Mock getSafeDbClient
// We need to mock the entire module OR just the function. 
// Since we are testing db.ts, checking if we can spy on it.
// Actually, withDbClient calls getSafeDbClient imported from the same file. 
// In module systems, internal calls might not be easily mocked unless we mock the whole module or extract dependencies.
// However, getSafeDbClient uses getPool.
// Let's mock 'pg' to return a mock pool.

const mockQuery = vi.fn();
const mockRelease = vi.fn();
const mockConnect = vi.fn().mockResolvedValue({
    query: mockQuery,
    release: mockRelease
});
const mockEnd = vi.fn();

vi.mock('pg', () => {
    return {
        Pool: vi.fn(() => ({
            connect: mockConnect,
            end: mockEnd,
            on: vi.fn()
        }))
    };
});

describe('db helpers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Set env var logic
        process.env.DATABASE_URL = 'postgres://mock:5432/mock';
        // Reset query implementation
        mockQuery.mockResolvedValue({ rows: [] });
    });

    afterEach(() => {
        delete process.env.DATABASE_URL;
    });

    describe('withDbClient', () => {
        it('executes operation and releases client', async () => {
            const operation = vi.fn().mockResolvedValue('success');

            const result = await withDbClient(operation);

            expect(result).toBe('success');
            expect(mockConnect).toHaveBeenCalled();
            expect(operation).toHaveBeenCalled();
            expect(mockRelease).toHaveBeenCalled();
        });

        it('releases client even if operation fails', async () => {
            const operation = vi.fn().mockRejectedValue(new Error('fail'));

            await expect(withDbClient(operation)).rejects.toThrow('fail');

            expect(mockRelease).toHaveBeenCalled();
        });
    });

    describe('withDbTransaction', () => {
        it('commits transaction on success', async () => {
            const operation = vi.fn().mockResolvedValue('success');

            const result = await withDbTransaction(operation);

            expect(result).toBe('success');
            expect(mockQuery).toHaveBeenCalledWith('BEGIN', undefined);
            expect(operation).toHaveBeenCalled();
            expect(mockQuery).toHaveBeenCalledWith('COMMIT', undefined);
            expect(mockRelease).toHaveBeenCalled();
        });

        it('rolls back transaction on failure', async () => {
            const operation = vi.fn().mockRejectedValue(new Error('fail'));

            await expect(withDbTransaction(operation)).rejects.toThrow('fail');

            expect(mockQuery).toHaveBeenCalledWith('BEGIN', undefined);
            expect(mockQuery).toHaveBeenCalledWith('ROLLBACK', undefined);
            expect(mockRelease).toHaveBeenCalled();
        });
    });
});
