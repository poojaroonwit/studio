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
    hasAnyPermission: vi.fn()
}));
vi.mock('@/lib/auditLog', () => ({
    logAudit: vi.fn()
}));
vi.mock('@/lib/webhooks', () => ({
    dispatchWebhooks: { userCreated: vi.fn() }
}));
vi.mock('@/lib/userWarningDefaults', () => ({
    createDefaultWarningConfigurations: vi.fn()
}));
vi.mock('@/lib/auth', () => ({
    clearUserValidationCache: vi.fn()
}));
vi.mock('bcryptjs', () => ({
    default: { hash: vi.fn().mockResolvedValue('hashed_password') }
}));
vi.mock('uuid', () => ({
    v4: () => 'mock-uuid-user'
}));

// Mock Prisma using vi.hoisted
const { mockPrisma } = vi.hoisted(() => {
    return {
        mockPrisma: {
            user: {
                count: vi.fn(),
                findMany: vi.fn(),
                create: vi.fn(),
                findUnique: vi.fn(),
            },
            userGroup: {
                findFirst: vi.fn(),
                findUnique: vi.fn(),
                create: vi.fn(),
                update: vi.fn()
            },
            userTeam: {
                findUnique: vi.fn()
            }
        }
    };
});

vi.mock('@/lib/prisma', () => ({
    default: mockPrisma
}));

import { auth } from '@/auth';
import { getPool } from '@/lib/db';
import { hasAnyPermission } from '@/lib/permissions';

describe('Users API', () => {
    let mockPoolClient: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock DB Pool for getPool queries (last login)
        mockPoolClient = {
            query: vi.fn().mockResolvedValue({ rows: [] }),
            release: vi.fn()
        };
        (getPool as any).mockReturnValue({
            connect: vi.fn().mockResolvedValue(mockPoolClient)
        });
    });

    describe('GET', () => {
        it('returns 401 if unauthorized', async () => {
            (auth as any).mockResolvedValue(null);

            const req = new NextRequest('http://localhost/api/users');
            const res = await GET(req);

            expect(res.status).toBe(401);
        });

        it('returns users if authorized', async () => {
            (auth as any).mockResolvedValue({ user: { id: 'user-1', role: 'Admin' } });
            (hasAnyPermission as any).mockReturnValue(true);

            mockPrisma.user.count.mockResolvedValue(1);
            mockPrisma.user.findMany.mockResolvedValue([
                { id: 'u1', name: 'User 1', email: 'u1@example.com', role: 'Recruiter' }
            ]);

            const req = new NextRequest('http://localhost/api/users');
            const res = await GET(req);

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.users).toHaveLength(1);
            expect(data.pagination.totalCount).toBe(1);
        });
    });

    describe('POST', () => {
        it('returns 403 if no permission', async () => {
            (auth as any).mockResolvedValue({ user: { id: 'user-1' } });
            (hasAnyPermission as any).mockReturnValue(false); // No USERS_CREATE

            const req = new NextRequest('http://localhost/api/users', {
                method: 'POST',
                body: JSON.stringify({ name: 'New User' })
            });
            const res = await POST(req);

            expect(res.status).toBe(403);
        });

        it('creates user on valid input', async () => {
            (auth as any).mockResolvedValue({ user: { id: 'user-1' } });
            (hasAnyPermission as any).mockReturnValue(true);

            const validBody = {
                name: 'New User',
                email: 'new@example.com',
                password: 'password123',
                role: 'Recruiter'
            };

            const req = new NextRequest('http://localhost/api/users', {
                method: 'POST',
                body: JSON.stringify(validBody)
            });

            // Mock finding default group
            mockPrisma.userGroup.findFirst.mockResolvedValue({ id: 'g1', name: 'Recruiter', isDefault: true });
            // Mock finding or verifying group existence
            mockPrisma.userGroup.findUnique.mockResolvedValue({ id: 'g1', name: 'Recruiter', permissions: [] });

            mockPrisma.user.create.mockResolvedValue({
                id: 'mock-uuid-user',
                name: 'New User',
                email: 'new@example.com',
                role: 'Recruiter'
            });

            const res = await POST(req);

            expect(res.status).toBe(201);
            expect(mockPrisma.user.create).toHaveBeenCalled();
        });
    });
});
