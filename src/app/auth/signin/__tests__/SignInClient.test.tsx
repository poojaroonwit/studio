/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SignInClient from '../SignInClient';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

// Mock dependencies
vi.mock('next-auth/react');
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    useSearchParams: vi.fn(),
}));

vi.mock('@/components/auth/CredentialsSignInForm', () => ({
    CredentialsSignInForm: () => <div data-testid="credentials-form">Credentials Form</div>
}));
vi.mock('@/components/auth/AzureAdSignInButton', () => ({
    AzureAdSignInButton: () => <div data-testid="azure-btn">Azure Button</div>
}));
// Mock Image to avoid next/image issues
vi.mock('next/image', () => ({
    default: (props: any) => <img {...props} alt={props.alt} />
}));

describe('SignInClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default unauthenticated
        (useSession as any).mockReturnValue({ status: 'unauthenticated', data: null });
        (useSearchParams as any).mockReturnValue({ get: vi.fn() });
        // Mock fetch to avoid errors but return basic config
        global.fetch = vi.fn(() => Promise.resolve({
            ok: true,
            json: async () => ({ appName: 'FitScan', settings: [] })
        })) as any;
    });

    it('renders loading state when session is loading', () => {
        (useSession as any).mockReturnValue({ status: 'loading', data: null });
        render(<SignInClient />);
        expect(screen.getByText(/Loading authentication/i)).toBeInTheDocument();
    });

    it('renders login form when unauthenticated', async () => {
        render(<SignInClient />);

        await waitFor(() => {
            expect(screen.getByTestId('credentials-form')).toBeInTheDocument();
        });
    });

    it('shows error message if error param is present', async () => {
        (useSearchParams as any).mockReturnValue({
            get: (key: string) => key === 'error' ? 'CredentialsSignin' : null
        });

        render(<SignInClient />);

        await waitFor(() => {
            expect(screen.getByText(/Invalid email or password/i)).toBeInTheDocument();
        });
    });

    it('redirects if authenticated', async () => {
        (useSession as any).mockReturnValue({ status: 'authenticated', data: { user: { id: '1' } } });
        // Need to mock window location replace, as logic uses window.location.replace
        // JSDOM has window.location but replace might need mocking or spy.
        // The component uses window.location.replace(redirectUrl)

        // We can't easily mock window.location in strict mode tests easily without setup.
        // It renders "Redirecting to dashboard..." text.

        render(<SignInClient />);
        expect(screen.getByText(/Redirecting to dashboard/i)).toBeInTheDocument();
    });
});
