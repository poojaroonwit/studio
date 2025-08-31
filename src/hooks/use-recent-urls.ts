import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export interface RecentUrl {
  path: string;
  label: string;
  timestamp: number;
}

// Helper function to format relative time
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Date(timestamp).toLocaleDateString();
}

const STORAGE_KEY = 'recent-urls';
const MAX_RECENT_URLS = 10;

// Map of paths to their display labels
const pathLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/candidates': 'Candidates',
  '/positions': 'Positions',
  '/my-tasks': 'My Task Board',
  '/process-queue': 'Process queue',
  '/settings': 'Settings',
  '/settings/users': 'Users',
  '/settings/webhooks': 'Webhooks',
  '/settings/preferences': 'Preferences',
  '/settings/system-preferences': 'System Preferences',
  '/settings/system-settings': 'System Settings',
  '/settings/user-groups': 'User Groups',
  '/settings/custom-fields': 'Custom Fields',

  '/settings/stages': 'Recruitment Stages',
  '/settings/logs': 'Logs',
  '/settings/api-docs': 'API Documentation',
  '/settings/api-key': 'API Key',
};

export function useRecentUrls() {
  const pathname = usePathname();
  const [recentUrls, setRecentUrls] = useState<RecentUrl[]>([]);

  // Load recent URLs from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setRecentUrls(Array.isArray(parsed) ? parsed : []);
        }
      } catch (error) {
        console.error('Failed to load recent URLs:', error);
      }
    }
  }, []);

  // Update recent URLs when pathname changes
  useEffect(() => {
    if (!pathname) return; // Skip if no pathname
    
    // Skip certain paths that shouldn't be tracked
    const skipPaths = ['/', '/api', '/_next', '/favicon.ico'];
    if (skipPaths.some(skipPath => pathname.startsWith(skipPath))) return;

    const label = pathLabels[pathname] || getPathLabel(pathname);
    
    setRecentUrls(prev => {
      // Remove existing entry for this path if it exists
      const filtered = prev.filter(url => url.path !== pathname);
      
      // Add new entry at the beginning
      const updated = [
        {
          path: pathname,
          label,
          timestamp: Date.now(),
        },
        ...filtered,
      ].slice(0, MAX_RECENT_URLS); // Keep only the most recent URLs

      // Save to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (error) {
          console.error('Failed to save recent URLs:', error);
        }
      }

      return updated;
    });
  }, [pathname]);

  const clearRecentUrls = () => {
    setRecentUrls([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return {
    recentUrls,
    clearRecentUrls,
  };
}

// Helper function to generate labels for paths not in the map
function getPathLabel(path: string): string {
  // Handle dynamic routes
      if (path.startsWith('/candidates/') && path !== '/process-queue') {
    return 'Candidate Details';
  }
  if (path.startsWith('/positions/')) {
    return 'Position Details';
  }
  if (path.startsWith('/settings/')) {
    const segment = path.split('/')[2];
    return segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : 'Settings';
  }
  
  // Fallback: capitalize the last segment
  const segments = path.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  return lastSegment ? lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1) : 'Page';
}
