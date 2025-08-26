import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { CandidateSettings } from '@/components/candidates/CandidateSettingsDrawer';

const defaultSettings: CandidateSettings = {
  showCandidateColumn: true,
  showAppliedJobColumn: true,
  showJobMatchesColumn: true,
  showFitScoreColumn: true,
  showRecruiterColumn: true,
  showSourceColumn: true,
  showStatusColumn: true,
  showAppliedDateColumn: true,
  showLastUpdateColumn: true,
  showFilters: true,
  showHorizontalFitScoreFilters: true,
  fitScoreType: 'applied',
  fitScoreFilterMode: 'multi'
};

export function useCandidateSettings() {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<CandidateSettings>(defaultSettings);
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
      console.log('🔧 SETTINGS: Not authenticated, using defaults');
      setIsLoading(false);
      setSettings(defaultSettings);
      return;
    }

    try {
      console.log('🔧 SETTINGS: Loading settings for user:', session.user.id);
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/user-preferences', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // If unauthorized, user might need to re-authenticate
          setError('Authentication required. Please refresh the page.');
        } else {
          throw new Error(`Failed to load settings: ${response.status}`);
        }
        return;
      }

      const data = await response.json();
      console.log('🔧 SETTINGS: Received data:', data);
      
      // Merge with defaults in case some settings are missing
      const candidateSettings = data.candidates || {};
      const mergedSettings = {
        ...defaultSettings,
        ...candidateSettings
      };
      console.log('🔧 SETTINGS: Merged settings:', mergedSettings);
      setSettings(mergedSettings);
    } catch (err) {
      console.error('Error loading candidate settings:', err);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timeout. Please try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      }
      // Fall back to default settings
      setSettings(defaultSettings);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, status]);

  // Save settings to database
  const saveSettings = useCallback(async (newSettings: CandidateSettings) => {
    if (status !== 'authenticated' || !session?.user?.id) {
      console.log('🔧 SETTINGS: Cannot save - not authenticated');
      return;
    }

    try {
      console.log('🔧 SETTINGS: Saving settings:', newSettings);
      setError(null);

      const response = await fetch('/api/user-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelType: 'candidates',
          updates: newSettings,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      console.log('🔧 SETTINGS: Settings saved successfully');
      // Update local state
      setSettings(newSettings);
    } catch (err) {
      console.error('Error saving candidate settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      throw err; // Re-throw so the UI can handle it
    }
  }, [session?.user?.id, status]);

  // Load settings when session changes
  useEffect(() => {
    // Only load settings when status is not loading and we have a user
    if (status !== 'loading') {
      loadSettings();
    }
  }, [session?.user?.id, status]); // Remove loadSettings from dependencies to prevent infinite loops

  return {
    settings,
    setSettings: saveSettings,
    isLoading,
    error,
    reload: loadSettings,
  };
}
