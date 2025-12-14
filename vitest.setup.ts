import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global mocks
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        prefetch: vi.fn(),
        back: vi.fn(),
    }),
    useParams: () => ({}),
    useSearchParams: () => ({
        get: vi.fn(),
        getAll: vi.fn(),
        has: vi.fn(),
    }),
    usePathname: () => '',
}));

vi.mock('next-auth/react', () => ({
    useSession: () => ({
        data: { user: { name: 'Test User', email: 'test@example.com' } },
        status: 'authenticated',
    }),
    signIn: vi.fn(),
    signOut: vi.fn(),
}));

// ResizeObserver mock
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// IntersectionObserver mock
global.IntersectionObserver = class IntersectionObserver {
    readonly root: Element | null = null;
    readonly rootMargin: string = '';
    readonly thresholds: ReadonlyArray<number> = [];

    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) { }

    disconnect() { }
    observe() { }
    takeRecords(): IntersectionObserverEntry[] { return []; }
    unobserve() { }
};

// window.matchMedia mock
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});
