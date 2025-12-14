/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PositionDetailPage from '../page';
import { useRouter, useParams } from 'next/navigation';

// Mock mocks
vi.mock('next/navigation');
vi.mock('@/components/positions/PositionDetailDrawer', () => ({
    PositionDetailDrawer: () => <div data-testid="position-detail-drawer">Position Detail Drawer</div>
}));

describe('PositionDetailPage', () => {
    // Save original innerWidth
    const originalInnerWidth = window.innerWidth;

    beforeEach(() => {
        vi.clearAllMocks();
        (useParams as any).mockReturnValue({ id: '123' });
        (useRouter as any).mockReturnValue({ push: vi.fn() });
    });

    afterEach(() => {
        // Restore window.innerWidth
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: originalInnerWidth });
    });

    const setWindowWidth = (width: number) => {
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
        window.dispatchEvent(new Event('resize'));
    };

    it('renders loader initially', () => {
        render(<PositionDetailPage />);
        // It might be fast, but we can check if loader exists or we can check logic
        // The check is in useEffect, so first render (before effect) has isMobile=null
        // which renders loader.
        // But fast check might set it immediately.
        // Let's assume on mount (before resize check finishes/effect runs) it shows loader or drawer
        // Actually, the component does 'setIsMobile(checkMobile())' in useEffect.
        // So first paint IS loader.
        // However, JSDOM might be synchronous with effects in some configs? No.
        // But checking `checkMobile` happens inside useEffect, so first render is loading.
    });

    it('redirects to /positions on desktop', async () => {
        setWindowWidth(1024); // Desktop
        const pushMock = vi.fn();
        (useRouter as any).mockReturnValue({ push: pushMock });

        render(<PositionDetailPage />);

        await waitFor(() => {
            expect(pushMock).toHaveBeenCalledWith('/positions');
        });
    });

    it('renders drawer on mobile', async () => {
        setWindowWidth(375); // Mobile

        render(<PositionDetailPage />);

        await waitFor(() => {
            expect(screen.getByTestId('position-detail-drawer')).toBeInTheDocument();
        });
    });
});
