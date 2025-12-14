/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/auth', () => ({
    auth: vi.fn()
}));
vi.mock('@/lib/db', () => ({
    getPool: vi.fn()
}));
vi.mock('@/lib/permissions', () => ({
    hasPermission: vi.fn()
}));
vi.mock('@/lib/auditLog', () => ({
    logAudit: vi.fn()
}));
vi.mock('@/lib/simple-broadcaster', () => ({
    broadcastPositionCreated: vi.fn()
}));
vi.mock('@/lib/webhookDispatcher', () => ({
    dispatchWebhooks: { positionCreated: vi.fn() }
}));
vi.mock('@/lib/systemSettings', () => ({
    getSystemSetting: vi.fn(),
    getDefaultMatchCriteria: vi.fn().mockResolvedValue('default criteria')
}));
vi.mock('@/lib/warnings', () => ({
    SimpleWarningService: { createOrUpdateWarnings: vi.fn() }
}));
vi.mock('uuid', () => ({
    v4: () => 'mock-uuid-position'
}));

import { auth } from '@/auth';
import { getPool } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

describe('Positions API', () => {
    let mockClient: any;
    let mockPool: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock DB Pool and Client
        // getPool returns the pool directly in this route logic (mostly)
        // GET uses pool.query directly? Yes: await getPool().query(...)
        // POST uses pool.query directly? Yes: await getPool().query(...)

        mockPool = {
            query: vi.fn().mockResolvedValue({ rows: [] }),
            connect: vi.fn(), // If used
        };
        (getPool as any).mockReturnValue(mockPool);

        // Setup env var for GET check
        process.env.DATABASE_URL = 'mock-url';
    });

    describe('GET', () => {
        it('returns 401 if unauthorized', async () => {
            (auth as any).mockResolvedValue(null);

            const req = new NextRequest('http://localhost/api/positions');
            const res = await GET(req);

            expect(res.status).toBe(401);
        });

        it('returns 403 if no permission', async () => {
            (auth as any).mockResolvedValue({ user: { id: 'user-1' } });
            (hasPermission as any).mockReturnValue(false); // No POSITIONS_VIEW

            const req = new NextRequest('http://localhost/api/positions');
            const res = await GET(req);

            expect(res.status).toBe(403);
            await expect(res.clone().json()).resolves.toMatchObject({ message: expect.stringContaining('Forbidden') });
        });

        it('returns positions if authorized', async () => {
            (auth as any).mockResolvedValue({ user: { id: 'user-1', role: 'Recruiter' } });
            (hasPermission as any).mockReturnValue(true);

            mockPool.query
                // Custom field defs query is NOT called if no custom fields in params
                // Main query
                .mockResolvedValueOnce({ rows: [{ id: 'pos-1', title: 'Developer', customAttributes: {} }] })
                // Count query
                .mockResolvedValueOnce({ rows: [{ count: 1 }] });

            const req = new NextRequest('http://localhost/api/positions');
            const res = await GET(req);

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.data).toHaveLength(1);
            expect(data.data[0].title).toBe('Developer');
        });
    });

    describe('POST', () => {
        it('returns 403 if no permission', async () => {
            (auth as any).mockResolvedValue({ user: { id: 'user-1' } });
            (hasPermission as any).mockReturnValue(false); // No POSITIONS_CREATE

            const req = new NextRequest('http://localhost/api/positions', {
                method: 'POST',
                body: JSON.stringify({ title: 'New Job' })
            });
            const res = await POST(req);

            expect(res.status).toBe(403);
        });

        it('creates position on valid input', async () => {
            (auth as any).mockResolvedValue({ user: { id: 'user-1' } });
            (hasPermission as any).mockReturnValue(true);

            const validBody = {
                title: 'Senior Dev',
                department: 'Engineering',
                isOpen: true
            };

            const req = new NextRequest('http://localhost/api/positions', {
                method: 'POST',
                body: JSON.stringify(validBody)
            });

            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 'mock-uuid-position', title: 'Senior Dev', department: 'Engineering' }]
            });

            const res = await POST(req);

            expect(res.status).toBe(201);
            expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO "Position"'), expect.any(Array));
        });
    });
});
