import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export interface TaskBoardPreferences {
  searchTerm: string;
  filterPriority: string;
  filterAssignee: string;
  selectedStages: string[];
  viewMode: 'kanban' | 'table';
  // Card customization settings
  cardWidth: 'narrow' | 'medium' | 'wide' | 'custom';
  customCardWidth?: number; // in pixels, used when cardWidth is 'custom'
  visibleCardFields: string[]; // Array of field names to show in cards
  showAvatar: boolean;
  showName: boolean;
  showEmail: boolean;
  showDescription: boolean;
  showFitScore: boolean;
  showAssignee: boolean;
  showPriority: boolean;
  showDueDate: boolean;
  showTags: boolean;
  showSkills: boolean;
  showJobApplied: boolean;
}

export interface PositionsPreferences {
  searchTerm: string;
  departmentFilter: string;
  statusFilter: string;
  selectedRecruiterId: string | null;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface AppearancePreferences {
  personalColor: string;
}

export interface UserPreferences {
  taskBoard: TaskBoardPreferences;
  positions: PositionsPreferences;
  appearance: AppearancePreferences;
}

const defaultTaskBoardPreferences: TaskBoardPreferences = {
  searchTerm: '',
  filterPriority: 'all',
  filterAssignee: 'all',
  selectedStages: [],
  viewMode: 'kanban',
  // Card customization defaults
  cardWidth: 'medium',
  customCardWidth: 256,
  visibleCardFields: ['name', 'email', 'fitScore'],
  showAvatar: true,
  showName: true,
  showEmail: true,
  showDescription: true,
  showFitScore: true,
  showAssignee: false,
  showPriority: false,
  showDueDate: false,
  showTags: false,
  showSkills: false,
  showJobApplied: false,
};

const defaultPositionsPreferences: PositionsPreferences = {
  searchTerm: '',
  departmentFilter: 'all',
  statusFilter: 'all',
  selectedRecruiterId: null,
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

const defaultAppearancePreferences: AppearancePreferences = {
  personalColor: '#3B82F6',
};

const defaultPreferences: UserPreferences = {
  taskBoard: defaultTaskBoardPreferences,
  positions: defaultPositionsPreferences,
  appearance: defaultAppearancePreferences,
};

export function useUserPreferences() {
  const { data: session, status } = useSession();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load preferences from database when session is available
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      loadPreferences();
    } else if (status === 'unauthenticated') {
      // Reset to defaults if user is not authenticated
      setPreferences(defaultPreferences);
      setIsLoaded(true);
    }
  }, [status, session?.user?.id]);

  const loadPreferences = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/user-preferences', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Merge with defaults to ensure all properties exist
        const mergedPreferences = {
          taskBoard: { ...defaultTaskBoardPreferences, ...data.taskBoard },
          positions: { ...defaultPositionsPreferences, ...data.positions },
          appearance: { ...defaultAppearancePreferences, ...data.appearance },
        };
        setPreferences(mergedPreferences);
      } else {
        console.warn('Failed to load user preferences from database, using defaults');
        setPreferences(defaultPreferences);
      }
    } catch (error) {
      console.warn('Error loading user preferences from database:', error);
      setPreferences(defaultPreferences);
    } finally {
      setIsLoaded(true);
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  const savePreferences = useCallback(async (modelType: 'taskBoard' | 'positions' | 'appearance', updates: any) => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/user-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelType,
          updates,
        }),
      });

      if (!response.ok) {
        console.warn('Failed to save user preferences to database');
      }
    } catch (error) {
      console.warn('Error saving user preferences to database:', error);
    }
  }, [session?.user?.id]);

  // Update task board preferences
  const updateTaskBoardPreferences = useCallback((updates: Partial<TaskBoardPreferences>) => {
    setPreferences(prev => ({
      ...prev,
      taskBoard: { ...prev.taskBoard, ...updates }
    }));

    // Save to database
    savePreferences('taskBoard', updates);
  }, [savePreferences]);

  // Update positions preferences
  const updatePositionsPreferences = useCallback((updates: Partial<PositionsPreferences>) => {
    setPreferences(prev => ({
      ...prev,
      positions: { ...prev.positions, ...updates }
    }));

    // Save to database
    savePreferences('positions', updates);
  }, [savePreferences]);

  // Update appearance preferences
  const updateAppearancePreferences = useCallback((updates: Partial<AppearancePreferences>) => {
    setPreferences(prev => ({
      ...prev,
      appearance: { ...prev.appearance, ...updates }
    }));

    // Save to database
    savePreferences('appearance', updates);
  }, [savePreferences]);

  // Reset task board preferences to defaults
  const resetTaskBoardPreferences = useCallback(async () => {
    if (!session?.user?.id) {
      setPreferences(prev => ({
        ...prev,
        taskBoard: defaultTaskBoardPreferences
      }));
      return;
    }

    try {
      const response = await fetch('/api/user-preferences?modelType=taskBoard', {
        method: 'DELETE',
      });

      if (response.ok) {
        setPreferences(prev => ({
          ...prev,
          taskBoard: defaultTaskBoardPreferences
        }));
      } else {
        console.warn('Failed to reset task board preferences in database');
      }
    } catch (error) {
      console.warn('Error resetting task board preferences:', error);
    }
  }, [session?.user?.id]);

  // Reset positions preferences to defaults
  const resetPositionsPreferences = useCallback(async () => {
    if (!session?.user?.id) {
      setPreferences(prev => ({
        ...prev,
        positions: defaultPositionsPreferences
      }));
      return;
    }

    try {
      const response = await fetch('/api/user-preferences?modelType=positions', {
        method: 'DELETE',
      });

      if (response.ok) {
        setPreferences(prev => ({
          ...prev,
          positions: defaultPositionsPreferences
        }));
      } else {
        console.warn('Failed to reset positions preferences in database');
      }
    } catch (error) {
      console.warn('Error resetting positions preferences:', error);
    }
  }, [session?.user?.id]);

  // Reset appearance preferences to defaults
  const resetAppearancePreferences = useCallback(async () => {
    if (!session?.user?.id) {
      setPreferences(prev => ({
        ...prev,
        appearance: defaultAppearancePreferences
      }));
      return;
    }

    try {
      const response = await fetch('/api/user-preferences?modelType=appearance', {
        method: 'DELETE',
      });

      if (response.ok) {
        setPreferences(prev => ({
          ...prev,
          appearance: defaultAppearancePreferences
        }));
      } else {
        console.warn('Failed to reset appearance preferences in database');
      }
    } catch (error) {
      console.warn('Error resetting appearance preferences:', error);
    }
  }, [session?.user?.id]);

  // Reset all preferences to defaults
  const resetAllPreferences = useCallback(async () => {
    if (!session?.user?.id) {
      setPreferences(defaultPreferences);
      return;
    }

    try {
      const response = await fetch('/api/user-preferences', {
        method: 'DELETE',
      });

      if (response.ok) {
        setPreferences(defaultPreferences);
      } else {
        console.warn('Failed to reset all preferences in database');
      }
    } catch (error) {
      console.warn('Error resetting all preferences:', error);
    }
  }, [session?.user?.id]);

  return {
    preferences,
    taskBoard: preferences.taskBoard,
    positions: preferences.positions,
    appearance: preferences.appearance,
    updateTaskBoardPreferences,
    updatePositionsPreferences,
    updateAppearancePreferences,
    resetTaskBoardPreferences,
    resetPositionsPreferences,
    resetAppearancePreferences,
    resetAllPreferences,
    isLoaded,
    isLoading,
    isAuthenticated: status === 'authenticated',
  };
}
