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
    if (status !== 'authenticated' || !session?.user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/user-preferences');
      if (!response.ok) {
        throw new Error('Failed to load settings');
      }

      const data = await response.json();
      
      // Merge with defaults in case some settings are missing
      const candidateSettings = data.candidates || {};
      setSettings({
        ...defaultSettings,
        ...candidateSettings
      });
    } catch (err) {
      console.error('Error loading candidate settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
      // Fall back to default settings
      setSettings(defaultSettings);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, status]);

  // Save settings to database
  const saveSettings = useCallback(async (newSettings: CandidateSettings) => {
    if (status !== 'authenticated' || !session?.user?.id) {
      return;
    }

    try {
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
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    setSettings: saveSettings,
    isLoading,
    error,
    reload: loadSettings,
  };
}
