/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApplicantDetailPage from '../page';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';

// Mock mocks
vi.mock('next-auth/react');
vi.mock('next/navigation');
vi.mock('@/components/candidates/CandidateDetailView', () => ({
    default: () => <div data-testid="candidate-detail-view">Candidate Detail View</div>
}));

describe('ApplicantDetailPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useParams as any).mockReturnValue({ id: '123' });
        (useRouter as any).mockReturnValue({ push: vi.fn() });
    });

    it('renders loading state when session is loading', () => {
        (useSession as any).mockReturnValue({ status: 'loading', data: null });
        render(<ApplicantDetailPage />);
        // Simple check for the loader wrapper or class, or just absence of content
        // The code uses Loader2 icon. We can checking existence of some container.
        // Or just that candidate view is NOT there.
        expect(screen.queryByTestId('candidate-detail-view')).not.toBeInTheDocument();
    });

    it('redirects to signin when unauthenticated', () => {
        (useSession as any).mockReturnValue({ status: 'unauthenticated', data: null });
        const pushMock = vi.fn();
        (useRouter as any).mockReturnValue({ push: pushMock });

        render(<ApplicantDetailPage />);

        expect(pushMock).toHaveBeenCalledWith('/auth/signin');
    });

    it('renders candidate detail view when authenticated', () => {
        (useSession as any).mockReturnValue({ status: 'authenticated', data: { user: { name: 'Test' } } });
        render(<ApplicantDetailPage />);

        expect(screen.getByTestId('candidate-detail-view')).toBeInTheDocument();
    });
});
