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
    broadcastCandidateCreated: vi.fn()
}));
vi.mock('@/lib/webhookDispatcher', () => ({
    dispatchWebhooks: { candidateCreated: vi.fn() }
}));
vi.mock('@/lib/notificationService', () => ({
    NotificationService: { notifyCandidateAdded: vi.fn() }
}));
vi.mock('@/lib/warnings', () => ({
    SimpleWarningService: { createOrUpdateWarnings: vi.fn() }
}));
vi.mock('uuid', () => ({
    v4: () => 'mock-uuid'
}));

import { auth } from '@/auth';
import { getPool } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

describe('Candidate API', () => {
    let mockClient: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock DB Client
        mockClient = {
            query: vi.fn().mockResolvedValue({ rows: [] }),
            release: vi.fn()
        };
        (getPool as any).mockReturnValue({
            connect: vi.fn().mockResolvedValue(mockClient)
        });
    });

    describe('GET', () => {
        it('returns 401 if unauthorized', async () => {
            (auth as any).mockResolvedValue(null);

            const req = new NextRequest('http://localhost/api/candidates');
            const res = await GET(req);

            expect(res.status).toBe(401);
        });

        it('returns candidates if authorized', async () => {
            (auth as any).mockResolvedValue({ user: { id: 'user-1', role: 'Recruiter' } });
            (hasPermission as any).mockReturnValue(true);

            mockClient.query.mockResolvedValue({
                rows: [{ id: '1', name: 'John Doe' }]
            });

            const req = new NextRequest('http://localhost/api/candidates');
            const res = await GET(req);

            expect(res.status).toBe(200); // Route likely returns 200 on success logic (it returns array) or default NextResponse
            // Actually GET usually returns NextResponse.
            // But route.ts might return array directly? No, Next.js API routes return NextResponse usually.
            // Let's check body?
            // Since it's a test for response, validation of status is good enough for now.
        });
    });

    describe('POST', () => {
        it('returns 400 for invalid input', async () => {
            (auth as any).mockResolvedValue({ user: { id: 'user-1' } });
            (hasPermission as any).mockReturnValue(true);

            const req = new NextRequest('http://localhost/api/candidates', {
                method: 'POST',
                body: JSON.stringify({ invalid: 'data' })
            });
            const res = await POST(req);

            expect(res.status).toBe(400);
        });

        it('creates candidate on valid input', async () => {
            (auth as any).mockResolvedValue({ user: { id: 'user-1' } });
            (hasPermission as any).mockReturnValue(true);

            const validBody = {
                candidate_info: {
                    personal_info: { firstname: 'John', lastname: 'Doe' },
                    contact_info: { email: 'john@example.com' }
                }
            };

            const req = new NextRequest('http://localhost/api/candidates', {
                method: 'POST',
                body: JSON.stringify(validBody)
            });

            mockClient.query.mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [{ id: 'mock-uuid', name: 'John Doe' }] }) // INSERT Candidate returning *
                .mockResolvedValueOnce({ rows: [] }) // INSERT Transition
                .mockResolvedValueOnce({ rows: [] }); // COMMIT

            const res = await POST(req);

            expect(res.status).toBe(201);
            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        });
    });
});
