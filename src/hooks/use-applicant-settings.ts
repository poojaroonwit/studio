import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { ApplicantSettings } from '@/components/applicants/ApplicantSettingsDrawer';

const defaultSettings: ApplicantSettings = {
  showApplicantColumn: true,
  showAppliedJobColumn: true,
  showJobMatchesColumn: true,
  showFitScoreColumn: true,
  showRecruiterColumn: true,
  showSourceColumn: true,
  showStatusColumn: true,
  showAppliedDateColumn: true,
  showLastUpdateColumn: false,
  showCreatedDateColumn: false,
  columnOrder: [
    'applicant',
    'appliedJob',
    'jobMatches',
    'fitScore',
    'recruiter',
    'source',
    'status',
    'appliedDate',
    'lastUpdate',
    'createdAt'
  ],
  showFilters: true,
  showHorizontalFitScoreFilters: true,
  fitScoreType: 'applied',
  fitScoreFilterMode: 'single',
  rowHeight: 'normal',
  showPinSection: true,
  pageSize: 20,
  sortColumn: 'applicationDate',
  sortDirection: 'desc'
};

export function useApplicantSettings() {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<ApplicantSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load settings from database
  const loadSettings = useCallback(async () => {
    // If session is still loading, wait a bit and try again
    if (status === 'loading') {
      // Don't make recursive calls - let the useEffect handle retries
      return;
    }

    // If not authenticated, set loading to false and use defaults
    if (status !== 'authenticated' || !session?.user?.id) {
      setIsLoading(false);
      setSettings(defaultSettings);
      return;
    }

    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      let timeoutId: NodeJS.Timeout | null = null;
      
      try {
        setIsLoading(true);
        setError(null);

        // Create AbortController for timeout instead of using AbortSignal.timeout
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const startTime = Date.now();
        const response = await fetch('/api/user-preferences', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });
        const duration = Date.now() - startTime;
        // console.log(`User preferences API call took ${duration}ms`);
        
        // Clear timeout on successful response
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      
        if (!response.ok) {
          if (response.status === 401) {
            // If unauthorized, user might need to re-authenticate
            setError('Authentication required. Please refresh the page.');
            break;
          } else {
            throw new Error(`Failed to load settings: ${response.status}`);
          }
        }

        const data = await response.json();
        
        // Merge with defaults in case some settings are missing
        const applicantSettings = data.applicants || {};
        const mergedSettings = {
          ...defaultSettings,
          ...applicantSettings
        };
        setSettings(mergedSettings);
        setIsLoading(false);
        break; // Success, exit retry loop
        
      } catch (err) {
        // Clear timeout on error
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        retryCount++;
        
        // Only log non-timeout errors to avoid console spam
        if (!(err instanceof Error && err.name === 'AbortError')) {
          console.error(`Error loading applicant settings (attempt ${retryCount}):`, err);
        }
        
        if (retryCount >= maxRetries) {
          // Final attempt failed
          if (err instanceof Error && err.name === 'AbortError') {
            console.warn('Applicant settings request timed out after 10 seconds');
            setError('Request timeout. Please try again.');
          } else {
            setError(err instanceof Error ? err.message : 'Failed to load settings');
          }
          // Fall back to default settings
          setSettings(defaultSettings);
          setIsLoading(false);
        } else {
          // Wait before retry with exponential backoff
          const delay = 1000 * retryCount; // Reduced delay: 1s, 2s, 3s
          // console.log(`Retrying applicant settings load in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }, [session?.user?.id, status]);

  // Save settings to database
  const saveSettings = useCallback(async (newSettings: ApplicantSettings) => {
    if (status !== 'authenticated' || !session?.user?.id) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    setError(null);

    let timeoutId: NodeJS.Timeout | null = null;

    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch('/api/user-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelType: 'applicants',
          updates: newSettings,
        }),
        signal: controller.signal,
      });

      // Clear timeout on successful response
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save settings: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // Update local state
      setSettings(newSettings);
    } catch (err) {
      // Clear timeout on error
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      // Only log non-timeout errors to avoid console spam
      if (!(err instanceof Error && err.name === 'AbortError')) {
        console.error('Error saving applicant settings:', err);
      }
      
      // Provide more specific error messages
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn('Applicant settings save request timed out after 10 seconds');
        setError('Request timeout. Please try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to save settings');
      }
      
      throw err; // Re-throw so the UI can handle it
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, status]);

  // Load settings when session changes
  useEffect(() => {
    let isMounted = true;
    
    // Only load settings when status is not loading and we have a user
    if (status !== 'loading') {
      loadSettings().catch((error) => {
        // Only log errors if component is still mounted
        if (isMounted) {
          console.error('Error loading applicant settings:', error);
        }
      });
    }
    
    return () => {
      isMounted = false;
    };
  }, [loadSettings, status]); // Include loadSettings in dependencies to prevent stale closures

  return {
    settings,
    setSettings: saveSettings,
    isLoading,
    error,
    reload: loadSettings,
    clearError: () => setError(null),
  };
}
