import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

import { DEFAULT_AI_POWER_SEARCH_PROMPT } from './ai-power-search-default-prompt';
import {
  fetchAiPowerSearchPrompt,
  saveAiPowerSearchPrompt,
} from './ai-power-search-settings-api';

export function useAiPowerSearchPrompt() {
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCurrentPrompt = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setCurrentPrompt(await fetchAiPowerSearchPrompt());
    } catch (loadError) {
      console.error('Error fetching current prompt:', loadError);
      setError('Failed to load current system prompt');
      setCurrentPrompt(DEFAULT_AI_POWER_SEARCH_PROMPT);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCurrentPrompt();
  }, [loadCurrentPrompt]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await saveAiPowerSearchPrompt(currentPrompt);
      toast.success('AI Power Search system prompt updated successfully');
      setIsEditing(false);
    } catch (saveError) {
      console.error('Error saving system prompt:', saveError);
      toast.error(saveError instanceof Error ? saveError.message : 'Failed to save system prompt');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm('Are you sure you want to reset the system prompt to the default? This action cannot be undone.')) {
      return;
    }

    setCurrentPrompt(DEFAULT_AI_POWER_SEARCH_PROMPT);
    toast.success('System prompt reset to default');
  };

  const handleCancel = () => {
    setIsEditing(false);
    void loadCurrentPrompt();
  };

  return {
    currentPrompt,
    error,
    handleCancel,
    handleReset,
    handleSave,
    isEditing,
    isLoading,
    isSaving,
    setCurrentPrompt,
    setIsEditing,
  };
}
