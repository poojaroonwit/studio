/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CandidateDetailView from '../CandidateDetailView';

// Mock child component
vi.mock('../FullCandidateDetail', () => ({
    default: () => <div data-testid="full-candidate-detail">Full Candidate Detail Content</div>
}));

describe('CandidateDetailView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset fetch mock
        global.fetch = vi.fn();
    });

    it('renders loading state initially', () => {
        (global.fetch as any).mockImplementation(() => new Promise(() => { })); // Never resolves
        render(<CandidateDetailView candidateId="123" />);
        expect(screen.getByText(/Loading candidate details/i)).toBeInTheDocument();
    });

    it('renders full view (resilient) on API failure', async () => {
        (global.fetch as any).mockRejectedValue(new Error('Network Error'));
        render(<CandidateDetailView candidateId="123" />);

        await waitFor(() => {
            // Component is resilient and attempts to render even if network fails
            expect(screen.getByTestId('full-candidate-detail')).toBeInTheDocument();
        });
    });

    it('renders not found state when candidate returns 404', async () => {
        // Mock specific fetches (comments, attachments, candidate)
        (global.fetch as any).mockImplementation((url: string) => {
            if (url.includes('/api/candidates/123/comments')) return Promise.resolve({ ok: true, json: async () => [] });
            if (url.includes('/api/candidates/123/resumes')) return Promise.resolve({ ok: true, json: async () => [] });
            // Candidate fetching returns 404
            if (url === '/api/candidates/123') return Promise.resolve({ ok: false, status: 404 });
            return Promise.reject(new Error('Unknown URL'));
        });

        render(<CandidateDetailView candidateId="123" />);

        await waitFor(() => {
            expect(screen.getByText(/Candidate Not Found/i)).toBeInTheDocument();
        });
    });

    it('renders full detail view on success', async () => {
        (global.fetch as any).mockImplementation((url: string) => {
            if (url.includes('/api/candidates/123/comments')) return Promise.resolve({ ok: true, json: async () => [] });
            if (url.includes('/api/candidates/123/resumes')) return Promise.resolve({ ok: true, json: async () => [] });
            if (url === '/api/candidates/123') return Promise.resolve({ ok: true, json: async () => ({ id: '123', name: 'John Doe' }) });
            return Promise.reject(new Error('Unknown URL'));
        });

        render(<CandidateDetailView candidateId="123" />);

        await waitFor(() => {
            expect(screen.getByTestId('full-candidate-detail')).toBeInTheDocument();
        });
    });
});
