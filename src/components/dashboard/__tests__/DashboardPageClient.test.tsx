/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardPageClient from '../DashboardPageClient';
import { useSession } from 'next-auth/react';

// Mock dependencies
vi.mock('next-auth/react');
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    usePathname: () => '/dashboard',
}));

// Mock child components to isolate dashboard logic
vi.mock('@/components/dashboard/CandidatesPerPositionChart', () => ({
    CandidatesPerPositionChart: () => <div data-testid="candidates-chart">Candidates Chart</div>
}));
vi.mock('@/components/dashboard/CandidateScoreDistributionChart', () => ({
    CandidateScoreDistributionChart: () => <div data-testid="score-chart">Score Chart</div>
}));
vi.mock('@/components/dashboard/NewApplicationsTimeSeriesChart', () => ({
    NewApplicationsTimeSeriesChart: () => <div data-testid="time-chart">Time Chart</div>
}));
vi.mock('@/components/dashboard/SLAViolationsWidget', () => ({
    SLAViolationsWidget: () => <div data-testid="sla-widget">SLA Widget</div>
}));
vi.mock('@/components/dashboard/RealTimeStatus', () => ({
    RealTimeStatus: () => <div data-testid="realtime-status">RealTime Status</div>
}));

// Mock hooks
vi.mock('@/hooks/use-enhanced-sse', () => ({
    useEnhancedSSE: () => ({ isConnected: true })
}));
vi.mock('@/hooks/use-shared-sse', () => ({
    useSharedSSE: () => ({ isConnected: true, subscribeToEvents: vi.fn(() => vi.fn()) })
}));
vi.mock('@/hooks/use-chart-setup', () => ({
    useChartSetup: () => ({ chartReady: true, isLoading: false, error: null })
}));
vi.mock('@/hooks/use-dynamic-height', () => ({
    useDynamicHeight: () => ({ height: 500, elementRef: { current: null } })
}));

describe('DashboardPageClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useSession as any).mockReturnValue({
            data: { user: { id: 'user-1', name: 'Test User', role: 'Recruiter' } },
            status: 'authenticated'
        });
    });

    const defaultProps = {
        initialCandidates: [],
        initialPositions: [],
        initialUsers: [],
        initialStageIds: {},
        initialStageNames: {}
    };

    it('renders dashboard with authenticated user', () => {
        render(<DashboardPageClient {...defaultProps} />);

        // Should verify some dashboard content
        // Since we mocked charts, we check for those mocks
        expect(screen.getByTestId('candidates-chart')).toBeInTheDocument();
        expect(screen.getByTestId('score-chart')).toBeInTheDocument();
        expect(screen.getByTestId('sla-widget')).toBeInTheDocument();
    });

    it('handles initial fetch error', () => {
        render(<DashboardPageClient {...defaultProps} initialFetchError="Failed to load data" />);
        // It likely shows a toast or an error banner. The code uses toast.error(initialFetchError).
        // Testing toaster is tricky without setup.
        // But the dashboard should still render (maybe empty state).
        expect(screen.getByTestId('candidates-chart')).toBeInTheDocument();
    });
});
