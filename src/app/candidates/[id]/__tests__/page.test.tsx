/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CandidateDetailPage from '../page';
import { useRouter, useParams } from 'next/navigation';

// Mock next/navigation
vi.mock('next/navigation', () => ({
    useRouter: vi.fn(),
    useParams: vi.fn(),
}));

describe('CandidateDetailPage', () => {
    it('redirects to applicants page on mount', () => {
        const replaceMock = vi.fn();
        (useRouter as any).mockReturnValue({
            replace: replaceMock,
        });
        (useParams as any).mockReturnValue({
            id: '123',
        });

        render(<CandidateDetailPage />);

        expect(screen.getByText('Redirecting to applicants page...')).toBeInTheDocument();

        expect(replaceMock).toHaveBeenCalledWith('/applicants/123');
    });
});
