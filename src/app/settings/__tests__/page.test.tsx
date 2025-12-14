/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SettingsPage from '../page'; // Valid import for default export
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Mock mocks
vi.mock('next-auth/react');
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock Lucide icons to avoid issues? (Optional, but usually fine)

describe('SettingsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: async () => ({ showLogoOnly: false }) })) as any;
    });

    it('renders loading initially', () => {
        (useSession as any).mockReturnValue({ status: 'loading', data: null });
        render(<SettingsPage />);
        expect(screen.getByText(/Loading settings/i)).toBeInTheDocument();
    });

    it('renders settings grid for authenticated admin', async () => {
        (useSession as any).mockReturnValue({
            status: 'authenticated',
            data: { user: { role: 'Admin', modulePermissions: [] } }
        });

        render(<SettingsPage />);

        await waitFor(() => {
            expect(screen.getByText('System Settings')).toBeInTheDocument();
            expect(screen.getByText('User Management')).toBeInTheDocument();
        });
    });

    it('filters settings based on permissions (Recruiter)', async () => {
        // Recruiter only has API access in the list? Or none of the adminOnly ones.
        // settingsItems have `adminOnlyOrPermission`.
        // Let's assume Recruiter has no extra permissions.
        (useSession as any).mockReturnValue({
            status: 'authenticated',
            data: { user: { role: 'Recruiter', modulePermissions: [] } }
        });

        render(<SettingsPage />);

        await waitFor(() => {
            // Admin cards should NOT be there if they require adminOnlyOrPermission and user is Recruiter
            // checking logic: adminOnlyOrPermission: true -> (item.adminOnly) OR checkPermission.
            // If user is Recruiter, checkPermission likely fails unless they have it.
            // 'System Settings' is adminOnlyOrPermission.
            expect(screen.queryByText('System Settings')).not.toBeInTheDocument();

            // API Docs is public (no permissionId)
            expect(screen.getByText('API Documentation')).toBeInTheDocument();
        });
    });
});
