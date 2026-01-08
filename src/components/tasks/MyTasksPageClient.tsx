// src/components/tasks/MyTasksPageClient.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from "@/components/candidates/CandidateKanbanView";
import { CandidateAvatarCompact } from '@/components/ui/candidate-avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { RecruiterAvatarCompact } from '@/components/ui/recruiter-avatar';
import { Search, Filter, Kanban, List, Users, RotateCcw, Settings, ChevronDown, Wifi } from 'lucide-react';
import { TaskBoard, TaskStage } from '@/components/tasks/TaskBoard';
import { Task } from '@/components/tasks/TaskCard';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { CardCustomizationSettings } from '@/components/tasks/CardCustomizationSettings';

import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import CandidateDetailModal from '@/components/candidates/CandidateDetailModal';
import { PositionSelectDropdown } from '@/components/candidates/PositionSelectDropdown';

import { useSharedSSE } from '@/hooks/use-shared-sse';
import { safeFetch, safeAll } from '@/lib/safe-fetch';
import { getErrorMessage, retryWithBackoff, isRetryableError } from '@/lib/networkUtils';
import { NetworkDiagnostics } from '@/components/ui/network-diagnostics';
import { formatScoreWithGrade } from '@/lib/scoreUtils';
import { SkeletonTableRows, SkeletonKanbanCard } from '@/components/ui/loading-overlay';
import { useIsMobile } from '@/hooks/use-mobile';

interface MyTasksPageClientProps {
  userSession: { id: string; role: string; name: string | null; modulePermissions?: string[] } | null;
}

export function MyTasksPageClient({ userSession }: MyTasksPageClientProps) {
  const isMobile = useIsMobile();

  // Use persistent user preferences
  const { 
    taskBoard: preferences, 
    updateTaskBoardPreferences, 
    resetTaskBoardPreferences,
    isLoaded 
  } = useUserPreferences();

  // Memoize the preferences object to prevent unnecessary re-renders
  const memoizedPreferences = useMemo(() => preferences, [
    preferences.cardWidth,
    preferences.customCardWidth,
    preferences.showAvatar,
    preferences.showName,
    preferences.showEmail,
    preferences.showFitScore,
    preferences.showAssignee,
    preferences.showSkills,
    preferences.showJobApplied,
    preferences.searchTerm,
    preferences.filterPriority,
    preferences.filterAssignee,
    preferences.selectedStages,
    preferences.viewMode
  ]);

  // Initialize viewMode with a ref to track if it's been set from preferences
  const viewModeInitializedRef = useRef(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban'); // Default to kanban
  const [filters, setFilters] = useState<any>({});
  const [candidates, setCandidates] = useState<any[]>([]);
  const [stages, setStages] = useState<Array<{id: string, name: string, description?: string, sortOrder?: number, colorComplete?: string, colorBadge?: string, isSystem?: boolean}>>([]);
  const [recruiters, setRecruiter] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);

  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [isStageFilterOpen, setIsStageFilterOpen] = useState(false);
  const [isCardSettingsOpen, setIsCardSettingsOpen] = useState(false);
  const [showNetworkDiagnostics, setShowNetworkDiagnostics] = useState(false);
  const [hasNetworkError, setHasNetworkError] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [metadataLoaded, setMetadataLoaded] = useState(false);
  const [totalCandidates, setTotalCandidates] = useState(0);
  
  // Admin users can access my-tasks page - no automatic redirect
  
  // Add debouncing for search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add debouncing for preference updates to prevent rapid changes
  const preferenceUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedPreferencesRef = useRef<{ viewMode: string; selectedStages: string[] }>({ 
    viewMode: 'kanban', 
    selectedStages: [] 
  });

  // Enhanced candidate update handler with conflict resolution
  const handleCandidateUpdate = useCallback((updateData: any) => {
    
    
    const updatedCandidate = updateData?.candidate || updateData;
    
    if (!updatedCandidate || !updatedCandidate.id) {
      
      return;
    }
    
    
    
    setCandidates(prevCandidates => {
      const existingIndex = prevCandidates.findIndex(c => c.id === updatedCandidate.id);
      if (existingIndex !== -1) {
        const updated = [...prevCandidates];
        const existing = updated[existingIndex];
        
        
        
        // Merge updates while preserving any local changes that haven't been confirmed
        const merged = { 
          ...existing, 
          ...updatedCandidate,
          // Preserve local status if it's different from the updated one (might be a pending change)
          status: existing.status !== updatedCandidate.status ? existing.status : updatedCandidate.status
        };
        
        updated[existingIndex] = merged;
        
        return updated;
      } else {
        // Add new candidate if not found
        
        return [...prevCandidates, updatedCandidate];
      }
    });
  }, []);

  const handlePositionUpdate = useCallback((updatedPosition: any) => {
    // Handle position updates if needed
  }, []);

  const handlePresenceUpdate = useCallback((presence: any) => {
    // Handle presence updates if needed
  }, []);

  const handleNotification = useCallback((notification: any) => {
    // Handle notifications if needed
  }, []);

  // Use shared SSE connection for realtime updates (aligned with dashboard, position page, and position sidebar)
  const { isConnected: realtimeConnected, subscribeToEvents } = useSharedSSE();
  
  useEffect(() => {
    let mounted = true;
    let refreshTimeout: NodeJS.Timeout;
    let lastUpdateTime = 0;
    const MIN_UPDATE_INTERVAL = 300; // Reduced from 1000ms to 300ms for faster updates
    
    // Only subscribe to events if user is authenticated
    if (status !== 'authenticated' || !session?.user?.id) {
      return;
    }
    
    // Subscribe to shared SSE events
    const unsubscribe = subscribeToEvents((event) => {
      if (!mounted) return;
      
      if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
        console.log('[MyTasksPage] SSE event received via shared connection:', event);
      }
      
      // Handle different event types with improved debouncing and rate limiting
      if (event.type === 'candidate_update' || event.type === 'position_update' || event.type === 'dashboard_update') {
        const now = Date.now();
        
        // Rate limit updates to prevent excessive reloading
        if (now - lastUpdateTime < MIN_UPDATE_INTERVAL) {
          if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
            console.log('[MyTasksPage] Update rate limited, skipping');
          }
          return;
        }
        
        if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
          console.log('[MyTasksPage] Processing update event:', event.type);
        }
        
        // Clear existing timeout and set new one to prevent rapid successive calls
        if (refreshTimeout) {
          clearTimeout(refreshTimeout);
        }
        
        refreshTimeout = setTimeout(() => {
          if (mounted && status === 'authenticated' && session?.user?.id) {
            lastUpdateTime = Date.now();
            // Only fetch if not currently loading
            if (!loading) {
              // Trigger a refresh by updating the refresh trigger
              setRefreshTrigger(prev => prev + 1);
            }
          }
        }, 200); // Reduced from 1000ms to 200ms for much faster response
      }
    });
    
    return () => {
      mounted = false;
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      unsubscribe();
    };
  }, [status, session?.user?.id, loading, subscribeToEvents]);

  // Handle refresh trigger from realtime updates
  useEffect(() => {
    if (refreshTrigger > 0) {
      const fetchCandidates = async () => {
        setLoading(true);
        try {
          const params = new URLSearchParams();
          if (filters.name) params.append('name', filters.name);
          if (filters.positionId) params.append('positionId', filters.positionId);
          if (filters.stage) params.append('status', filters.stage);
          if (filters.recruiterId) params.append('recruiterId', filters.recruiterId);
          
          const result = await safeFetch(`/api/taskboard/candidates?${params.toString()}`, { timeoutMs: 6000 });
          if (result.ok && result.data) {
            setCandidates(Array.isArray(result.data) ? result.data : ((result.data as any)?.data || []));
          } else {
            console.warn('Skipping failed endpoint /api/candidates:', result.error || result.status);
            setCandidates([]);
          }
        } catch (e) {
          console.error('Error fetching candidates:', e);
        } finally {
          setLoading(false);
        }
      };
      fetchCandidates();
    }
  }, [refreshTrigger, filters.name, filters.positionId, filters.stage, filters.recruiterId]);


  // Add periodic refresh as fallback (reduced from 30 to 10 seconds for better responsiveness)
  useEffect(() => {
    if (!session?.user?.id) return;
    
    const interval = setInterval(() => {
      // Only refresh if not currently loading and we have candidates
      if (!loading && candidates.length > 0) {
        
        const refreshCandidates = async () => {
          try {
            const params = new URLSearchParams();
            if (filters.name) params.append('name', filters.name);
            if (filters.positionId) params.append('positionId', filters.positionId);
            if (filters.stage) params.append('status', filters.stage);
            if (filters.recruiterId) params.append('recruiterId', filters.recruiterId);
            
            const result = await safeFetch(`/api/taskboard/candidates?${params.toString()}`, { timeoutMs: 6000 });
            if (result.ok && result.data) {
              const newCandidates = Array.isArray(result.data) ? result.data : ((result.data as any)?.data || []);
            
              // Only update if the data has actually changed
              if (JSON.stringify(newCandidates.map((c: any) => ({ id: c.id, status: c.status, updatedAt: c.updatedAt }))) !== 
                  JSON.stringify(candidates.map((c: any) => ({ id: c.id, status: c.status, updatedAt: c.updatedAt })))) {
                setCandidates(newCandidates);
                console.log('[MyTasksPageClient] Periodic refresh updated candidates');
              }
            } else {
              console.warn('Skipping failed endpoint /api/candidates (periodic):', result.error || result.status);
            }
          } catch (error) {
            console.error('[MyTasksPageClient] Error in periodic refresh:', error);
          } finally {
          }
        };
        
        refreshCandidates();
      }
    }, 10000); // Reduced from 30 seconds to 10 seconds for better responsiveness
    
    return () => clearInterval(interval);
  }, [session?.user?.id, loading, candidates, filters, realtimeConnected]);




  // Permission check: If user is a recruiter (not Admin and doesn't have CANDIDATES_VIEW permission), 
  // only show their assigned candidates
  const isRecruiter = userSession?.role === 'Recruiter' && 
    !userSession?.modulePermissions?.includes('CANDIDATES_VIEW');

  // Check if user can see all recruiters (has USERS_VIEW or CANDIDATES_VIEW permission)
  const canSeeAllRecruiter = userSession?.modulePermissions?.includes('USERS_VIEW') || 
    userSession?.modulePermissions?.includes('CANDIDATES_VIEW');

  // Set initial recruiter filter for recruiters (but not when no stages are selected)
  useEffect(() => {
    if (isRecruiter && userSession?.id && !filters.recruiterId && selectedStages.length > 0) {
      setFilters((prev: any) => ({ ...prev, recruiterId: userSession.id }));
    }
  }, [isRecruiter, userSession?.id, filters.recruiterId, selectedStages.length]);

  // Update local state when preferences are loaded - only once
  useEffect(() => {
    if (isLoaded && !viewModeInitializedRef.current) {
      viewModeInitializedRef.current = true;
      
      setViewMode(memoizedPreferences.viewMode);
      setSelectedStages(memoizedPreferences.selectedStages);
      // Update the last saved preferences to match what we just loaded
      lastSavedPreferencesRef.current = {
        viewMode: memoizedPreferences.viewMode,
        selectedStages: memoizedPreferences.selectedStages
      };
    }
  }, [isLoaded, memoizedPreferences.viewMode, memoizedPreferences.selectedStages]);

  // Update preferences when local state changes, but only if they differ from current preferences
  // and only after the initial load is complete
  useEffect(() => {
    if (isLoaded && viewModeInitializedRef.current) {
      const currentPreferences = {
        viewMode,
        selectedStages: JSON.stringify(selectedStages)
      };
      const lastSaved = {
        viewMode: lastSavedPreferencesRef.current.viewMode,
        selectedStages: JSON.stringify(lastSavedPreferencesRef.current.selectedStages)
      };
      
      // Only update if preferences actually changed
      if (currentPreferences.viewMode !== lastSaved.viewMode || 
          currentPreferences.selectedStages !== lastSaved.selectedStages) {
        

        
        // Clear any existing timeout
        if (preferenceUpdateTimeoutRef.current) {
          clearTimeout(preferenceUpdateTimeoutRef.current);
        }
        
        // Debounce the preference update
        preferenceUpdateTimeoutRef.current = setTimeout(() => {

          updateTaskBoardPreferences({
            viewMode,
            selectedStages,
          });
          // Update the last saved preferences
          lastSavedPreferencesRef.current = {
            viewMode,
            selectedStages: [...selectedStages]
          };
        }, 300); // 300ms debounce
      }
    }
  }, [viewMode, selectedStages, isLoaded, updateTaskBoardPreferences]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (preferenceUpdateTimeoutRef.current) {
        clearTimeout(preferenceUpdateTimeoutRef.current);
      }
    };
  }, []);

  // Manual view mode toggle handler
  const handleViewModeChange = useCallback((newViewMode: string) => {
    // Prevent changes during initial load
    if (!isLoaded || !viewModeInitializedRef.current) {

      return;
    }
    
    // Type guard to ensure valid view mode
    if (newViewMode !== 'kanban' && newViewMode !== 'table') {
      return;
    }
    

    setViewMode(newViewMode);
  }, [viewMode, isLoaded]);

  // Fetch stages, recruiters, positions on mount
  useEffect(() => {
    const fetchMeta = async () => {
      setLoading(true);
      try {
        const [stagesResult, recruitersResult, positionsResult] = await safeAll([
          safeFetch('/api/recruitment-stages', { timeoutMs: 8000 }),
          safeFetch('/api/users?role=Recruiter', { timeoutMs: 8000 }),
          safeFetch('/api/positions', { timeoutMs: 8000 }),
        ]);
        
        if (stagesResult.ok && stagesResult.data) {
          const stagesData = stagesResult.data;
        // Store stages with both ID and name for proper filtering
        const stageData = Array.isArray(stagesData) ? stagesData.map((s: any) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          sortOrder: s.sort_order,
          colorComplete: s.color_complete,
          colorBadge: s.color_badge,
          isSystem: s.is_system
        })) : [];
          setStages(stageData);
        } else {
          console.warn('Skipping failed endpoint /api/recruitment-stages:', stagesResult.error || stagesResult.status);
        }
        
        if (recruitersResult.ok && recruitersResult.data) {
          // Handle the correct API response structure: { users: [...], pagination: {...} }
          const recruitersArray = (recruitersResult.data as any)?.users || [];
          setRecruiter(Array.isArray(recruitersArray) ? recruitersArray : []);
        } else {
          console.warn('Skipping failed endpoint /api/users (recruiters):', recruitersResult.error || recruitersResult.status);
        }
        
        if (positionsResult.ok && positionsResult.data) {
          setPositions(Array.isArray((positionsResult.data as any)?.data) ? (positionsResult.data as any).data : []);
        } else {
          console.warn('Skipping failed endpoint /api/positions:', positionsResult.error || positionsResult.status);
        }
        
        setMetadataLoaded(true);
      } catch (e) {
        console.error('Error fetching metadata:', e);
        setMetadataLoaded(true); // Set to true even on error to prevent infinite loading
      } finally {
        setLoading(false);
      }
    };
    fetchMeta();
  }, []);

  // Get total count first (fast query)
  useEffect(() => {
    const fetchTotalCount = async () => {
      try {
        const result = await safeFetch('/api/candidates?forCounts=true', { timeoutMs: 8000 });
        if (result.ok && result.data) {
          setTotalCandidates((result.data as any)?.total || 0);
        } else {
          console.warn('Skipping failed endpoint /api/candidates (counts):', result.error || result.status);
        }
      } catch (e) {
        console.error('Error fetching total count:', e);
      }
    };
    fetchTotalCount();
  }, []);

  // Initial load of candidates (with pagination for better performance)
  useEffect(() => {
    const fetchCandidates = async () => {
      setLoading(true);
      try {
        // Use optimized taskboard endpoint for faster loading - request all candidates
        const result = await safeFetch('/api/taskboard/candidates?limit=50000&page=1', { timeoutMs: 6000 });
        if (result.ok && result.data) {
          setCandidates(Array.isArray(result.data) ? result.data : ((result.data as any)?.data || []));
        } else {
          console.warn('Skipping failed endpoint /api/candidates (initial):', result.error || result.status);
          setCandidates([]);
        }
      } catch (e) {
        console.error('Error fetching candidates:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchCandidates();
  }, []); // Only run on mount

  // Debounced fetch candidates when filters change
  useEffect(() => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      const fetchCandidates = async () => {
        setLoading(true);
        try {
          const params = new URLSearchParams();
          if (filters.name) params.append('name', filters.name);
          if (filters.positionId) params.append('positionId', filters.positionId);
          if (filters.stage) params.append('status', filters.stage);
          if (filters.recruiterId && filters.recruiterId !== '') params.append('recruiterId', filters.recruiterId);
          
          // If no filters are applied, use the same endpoint as initial load to get all candidates
          // Recruiter filter should apply even when no stages are selected
          const hasFilters = filters.name || filters.positionId || filters.stage || (filters.recruiterId && filters.recruiterId !== '');
          const shouldShowAll = !hasFilters;
          // Request all candidates - pagination is handled by "See More" button in UI
          if (!params.has('limit')) {
            params.append('limit', '50000'); // Request all candidates (no practical limit)
          }
          const endpoint = shouldShowAll
            ? '/api/taskboard/candidates?limit=50000&page=1' // Get all candidates when showing all
            : `/api/taskboard/candidates?${params.toString()}`;
          
          console.log('Fetching candidates with endpoint:', endpoint);
          
          const result = await safeFetch(endpoint, { timeoutMs: 6000 });
          if (result.ok && result.data) {
            setCandidates(Array.isArray(result.data) ? result.data : ((result.data as any)?.data || []));
            console.log('Successfully loaded candidates:', Array.isArray(result.data) ? result.data.length : ((result.data as any)?.data || []).length);
          } else {
            console.warn('Skipping failed endpoint /api/candidates (filtered):', result.error || result.status);
            setCandidates([]);
          }
        } catch (e) {
          console.error('Error fetching candidates:', e);
        } finally {
          setLoading(false);
        }
      };
      fetchCandidates();
    }, 300); // 300ms delay

    // Cleanup timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [filters]);

  // Update filters when selectedStages changes
  useEffect(() => {
    if (selectedStages.length > 0) {
      setFilters((prev: any) => ({ ...prev, stage: selectedStages.join(',') }));
    } else {
      setFilters((prev: any) => {
        const { stage, ...rest } = prev;
        return rest;
      });
    }
  }, [selectedStages]);

  // Filter candidates based on user role and permissions
  const filteredCandidates = useMemo(() => {
    // Defensive check to prevent temporal dead zone issues
    if (!Array.isArray(candidates)) {
      console.warn('MyTasksPageClient: candidates is not an array:', candidates);
      return [];
    }
    
    try {
      // The API already handles permission-based filtering, so we just return all candidates
      // that the API returned. The API will only return candidates the user has permission to see.
      return candidates;
    } catch (error) {
      console.error('MyTasksPageClient: Error in filteredCandidates useMemo:', error);
      return [];
    }
  }, [candidates]);

  // Filtering logic (for fitScore, if not supported by API)
  const displayedCandidates = useMemo(() => {
    try {
      // Defensive check to prevent filter errors
      if (!Array.isArray(filteredCandidates)) {
        console.warn('MyTasksPageClient: filteredCandidates is not an array:', filteredCandidates);
        return [];
      }
      
      return filteredCandidates.filter((c) => {
        try {
          if (filters.minFitScore !== undefined && c.fitScore < filters.minFitScore) return false;
          if (filters.maxFitScore !== undefined && c.fitScore > filters.maxFitScore) return false;
          return true;
        } catch (error) {
          console.warn('MyTasksPageClient: Error filtering candidate by fitScore:', error, c);
          return false;
        }
      });
    } catch (error) {
      console.error('MyTasksPageClient: Error in displayedCandidates useMemo:', error);
      return [];
    }
  }, [filteredCandidates, filters]);

  // Convert candidates to tasks for the task board
  const convertCandidatesToTasks = (candidates: any[]): Task[] => {
    return candidates.map(candidate => {
      const task = {
        id: candidate.id,
        title: candidate.name,
        description: candidate.parsedData?.summary || '', // Only use summary, don't fallback to email
        email: candidate.email, // Always include email separately
        status: candidate.statusId,
        priority: (candidate.fitScore > 0.8 ? 'high' : candidate.fitScore > 0.6 ? 'medium' : 'low') as 'low' | 'medium' | 'high' | 'urgent',
        assignee: candidate.recruiter ? {
          id: candidate.recruiter.id,
          name: candidate.recruiter.name,
          avatarUrl: candidate.recruiter.avatarUrl
        } : undefined,
        dueDate: candidate.applicationDate,
        tags: candidate.position?.title ? [candidate.position.title] : [],
        createdAt: candidate.createdAt,
        updatedAt: candidate.updatedAt,
        fitScore: candidate.fitScore,
        avatarUrl: candidate.avatarUrl,
        skills: candidate.parsedData?.skills || [],
        // Keep original candidate data for backward compatibility
        originalCandidate: candidate
      };
      

      
      return task;
    });
  };

  // Convert stages to task stages
  const convertStagesToTaskStages = (stages: Array<{id: string, name: string, description?: string, sortOrder?: number, colorComplete?: string, colorBadge?: string, isSystem?: boolean}>): TaskStage[] => {
    return stages.map((stage, index) => ({
      id: stage.id,
      name: stage.name,
      color: stage.colorBadge || '#6b7280', // Use colorBadge if available, otherwise default
      description: stage.description || `Candidates in ${stage.name} stage`,
      sortOrder: stage.sortOrder || index, // Use sortOrder if available, otherwise default
      colorComplete: stage.colorComplete,
      isSystem: stage.isSystem
    }));
  };

  // Handle task movement - Improved version with proper error handling
  const handleMoveTask = async (task: Task, newStatus: string) => {
    // Prevent moving to the same status
    if (task.status === newStatus) {
      return;
    }
    
    // Find the original candidate
    const candidate = candidates.find(c => c.id === task.id);
    if (!candidate) {
      toast.error('Candidate not found');
      return;
    }

    // Find the stage name for the new status
    const targetStage = stages.find(stage => stage.id === newStatus);
    const stageName = targetStage?.name || 'Unknown Stage';

    try {
      // Show loading state
      toast.loading(`Moving ${candidate.name} to ${stageName}...`, { id: `move-${candidate.id}` });
      
      // Update the candidate status
      const result = await safeFetch('/api/candidates/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_status',
          candidateIds: [candidate.id],
          newStatus: newStatus
        }),
        timeoutMs: 10000
      });

      if (!result.ok) {
        console.warn('Skipping failed endpoint /api/candidates/bulk-action:', result.error || result.status);
        throw new Error(`Failed to update status: ${result.error}`);
      }

      const responseData = result.data;
      
      // Only update local state if the API call was successful
      if ((responseData as any)?.updatedCount > 0) {
        // Update local state optimistically but let real-time updates handle the final state
        setCandidates((prev) =>
          prev.map((c) =>
            c.id === candidate.id
              ? { ...c, statusId: newStatus }
              : c
          )
        );
        
        toast.success(`Moved ${candidate.name} to ${stageName}`, { id: `move-${candidate.id}` });
      } else {
        // If no candidates were updated, show error
        toast.error(`Failed to move ${candidate.name}: No candidates updated`, { id: `move-${candidate.id}` });
      }
      
    } catch (error) {
      console.error('Error updating candidate status:', error);
      toast.error(`Failed to update candidate status: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: `move-${candidate.id}` });
      
      // Revert the visual change if the API call failed
      // The real-time update will handle the final state
    }
  };

  // Stage filter functions

  const toggleStageSelection = (stageId: string) => {
    setSelectedStages(prev => {
      if (prev.includes(stageId)) {
        return prev.filter(id => id !== stageId);
      } else {
        return [...prev, stageId];
      }
    });
  };

  // Filter stages based on selection
  const filteredStages = useMemo(() => {
    try {
      // Defensive check to prevent filter errors
      if (!Array.isArray(stages)) {
        console.warn('MyTasksPageClient: stages is not an array:', stages);
        return [];
      }
      
      if (selectedStages.length === 0) {
        return stages; // Show all stages if none selected
      }
      
      return stages.filter(stage => {
        try {
          return selectedStages.includes(stage.id);
        } catch (error) {
          console.warn('MyTasksPageClient: Error filtering stage:', error, stage);
          return false;
        }
      });
    } catch (error) {
      console.error('MyTasksPageClient: Error in filteredStages useMemo:', error);
      return [];
    }
  }, [stages, selectedStages]);

  // Handle authentication
  if (status === 'loading') {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground text-sm">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated' || !userSession) {
    // Check if we're already on the signin page or if a logout is in progress
    const isOnSigninPage = typeof window !== 'undefined' && window.location.pathname === '/auth/signin';
    const isLogoutInProgress = typeof window !== 'undefined' && window.location.search.includes('signout=true');
    
    if (!isOnSigninPage && !isLogoutInProgress) {
      // Redirect to signin page instead of showing error message
      router.replace('/auth/signin');
    }
    
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground text-sm">Redirecting to sign in...</p>
          </div>
        </div>
      </div>
    );
  }

  // On mobile, show a simple message instead of the full task board UI
  if (isMobile) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 py-10 text-center">
        <h1 className="mb-2 text-lg font-semibold">My Tasks is not available on mobile yet</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Please use the desktop version to manage your task board.
        </p>
      </div>
    );
  }

  if (!metadataLoaded) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground text-sm">Loading your board preferences...</p>
          </div>
        </div>
      </div>
    );
  }

  // --- UI ---
  return (
                  <div className="flex flex-col h-screen bg-background">
                {/* Enhanced Board Header - Always Sticky within main content */}
      <div className="bg-card border-b border-border shadow-sm sticky top-16 z-20 backdrop-blur-sm bg-card/95">
        <div className="px-6 py-4 space-y-4">
                     {/* Main Controls Row */}
           <div className="flex flex-wrap items-center gap-3 justify-between">
             {/* Left: Candidate Count and Search */}
             <div className="flex flex-wrap items-center gap-3 flex-1">
               {/* Candidate Count Badge */}
               <div className="flex items-center gap-2">
                 <Badge variant="secondary" className="h-9 px-3 text-sm font-medium">
                   {loading ? (
                     <div className="flex items-center gap-2">
                       <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                       Loading...
                     </div>
                   ) : (
                     <div className="flex items-center gap-2">
                       <Users className="w-3 h-3" />
                       {(() => {
                         // Check if any manual filters are applied
                         const hasManualFilters = filters.name || filters.positionId || filters.stage || filters.recruiterId || 
                                                  filters.minFitScore !== undefined || filters.maxFitScore !== undefined;
                         
                         // If no manual filters and user can view all candidates, show simple count
                         if (!hasManualFilters && !isRecruiter) {
                           return `${totalCandidates} candidates`;
                         }
                         
                         // If no manual filters but user has limited permissions, show permission-based count
                         if (!hasManualFilters && isRecruiter) {
                           return `${totalCandidates} total candidates (${displayedCandidates.length} assigned to you)`;
                         }
                         
                         // If manual filters are applied, show filtered count
                         return `${totalCandidates} total candidates (${displayedCandidates.length} filtered)`;
                       })()}
                     </div>
                   )}
                 </Badge>
               </div>

               {/* Search */}
               <div className="relative">
                 {loading ? (
                   <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin rounded-full border-b-2 border-current" />
                 ) : (
                   <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                 )}
                 <Input
                   className="pl-10 h-9 w-48 text-sm"
                   placeholder="Search candidates..."
                   value={filters.name || ''}
                   onChange={e => setFilters((f: any) => ({ ...f, name: e.target.value }))}
                   disabled={loading}
                 />
               </div>

               {/* Quick Filters */}
               <div className="w-48">
                 <PositionSelectDropdown
                   value={filters.positionId || ""}
                   onValueChange={v => setFilters((f: any) => ({ ...f, positionId: v || "" }))}
                   placeholder="All Positions"
                   showOpenStatus={true}
                   filterOpenOnly={false}
                   showNoneOption={true}
                 />
               </div>

               {/* Stage filter is now handled by the TaskBoard component's built-in multi-select filter */}

               {/* Recruiter Filter - Show for all users with permission to access task board */}
               <Popover>
                   <PopoverTrigger asChild>
                     <Button
                       variant="outline"
                       role="combobox"
                       className="h-9 w-48 text-sm justify-between"
                     >
                       {filters.recruiterId ? (
                         <div className="flex items-center gap-2">
                           {(() => {
                             const selectedRecruiter = recruiters.find((r: any) => r.id === filters.recruiterId);
                             return selectedRecruiter ? (
                               <>
                                 <RecruiterAvatarCompact
                                   user={{
                                     id: selectedRecruiter.id,
                                     name: selectedRecruiter.name,
                                     avatarUrl: selectedRecruiter.avatarUrl,
                                     personalColor: selectedRecruiter.personalColor
                                   }}
                                   size="xs"
                                 />
                                 <span className="truncate">{selectedRecruiter.name}</span>
                               </>
                             ) : (
                               <span>Unknown recruiter</span>
                             );
                           })()}
                         </div>
                       ) : (
                         <span className="text-muted-foreground">All Recruiter</span>
                       )}
                       <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
                     </Button>
                   </PopoverTrigger>
                   <PopoverContent className="w-64 p-0" align="start">
                     <div className="p-3 border-b border-border">
                       <div className="flex items-center justify-between">
                         <h4 className="text-sm font-medium">Select Recruiter</h4>
                         <div className="flex gap-1">
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => setFilters((f: any) => ({ ...f, recruiterId: '' }))}
                             className="h-6 px-2 text-xs"
                           >
                             All
                           </Button>
                         </div>
                       </div>
                     </div>
                     <div className="p-2 max-h-64 overflow-y-auto">
                       {/* All recruiters option - Only show if user can see all recruiters */}
                       {canSeeAllRecruiter && (
                         <button
                           onClick={() => setFilters((f: any) => ({ ...f, recruiterId: '' }))}
                           className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent text-left"
                         >
                           <div className="h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                             <Users className="h-3 w-3 text-gray-500" />
                           </div>
                           <div className="flex flex-col flex-1">
                             <span className="text-sm">All Recruiter</span>
                             <span className="text-xs text-muted-foreground">Show all recruiters</span>
                           </div>
                           {!filters.recruiterId && (
                             <div className="w-3 h-3 rounded-full bg-primary" />
                           )}
                         </button>
                       )}

                       {/* Available recruiters */}
                       {recruiters.map((r: any) => (
                         <button
                           key={r.id}
                           onClick={() => setFilters((f: any) => ({ ...f, recruiterId: r.id }))}
                           className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent text-left"
                         >
                           <RecruiterAvatarCompact
                             user={{
                               id: r.id,
                               name: r.name,
                               avatarUrl: r.avatarUrl,
                               personalColor: r.personalColor
                             }}
                             size="xs"
                           />
                           <div className="flex flex-col flex-1">
                             <span className="text-sm font-medium truncate">{r.name}</span>
                             <span className="text-xs text-muted-foreground">Recruiter</span>
                           </div>
                           {filters.recruiterId === r.id && (
                             <div className="w-3 h-3 rounded-full bg-primary" />
                           )}
                         </button>
                       ))}
                     </div>
                   </PopoverContent>
                 </Popover>

               {/* Stage Filter */}
               <div className="w-48">
                 <Popover open={isStageFilterOpen} onOpenChange={setIsStageFilterOpen}>
                   <PopoverTrigger asChild>
                     <Button
                       variant="outline"
                       size="sm"
                       className="h-9 w-full justify-between text-sm"
                     >
                       <div className="flex items-center gap-2">
                         <Filter className="h-3 w-3" />
                         {selectedStages.length === 0 
                           ? `All Stages (${stages.length})` 
                           : `${selectedStages.length} Stage${selectedStages.length !== 1 ? 's' : ''}`
                         }
                       </div>
                     </Button>
                   </PopoverTrigger>
                   <PopoverContent className="w-64 p-0" align="end">
                     <div className="p-3 border-b border-border">
                       <h4 className="text-sm font-medium">Filter Stages</h4>
                     </div>
                     
                     <div className="max-h-48 overflow-y-auto">
                       {/* Individual stage options */}
                       {stages.map((stage) => {
                         const isSelected = selectedStages.includes(stage.id);
                         return (
                           <div
                             key={stage.id}
                             className={cn(
                               "flex items-center px-3 py-2 cursor-pointer hover:bg-accent transition-colors",
                               isSelected && "bg-accent"
                             )}
                             onClick={() => toggleStageSelection(stage.id)}
                           >
                             <div className={cn(
                               "w-4 h-4 rounded border-2 mr-3 flex items-center justify-center transition-colors",
                               isSelected 
                                 ? "bg-primary border-primary" 
                                 : "border-border"
                             )}>
                               {isSelected && (
                                 <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                                   <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                 </svg>
                               )}
                             </div>
                             <span className={cn(
                               "text-sm",
                               isSelected && "font-medium"
                             )}>
                               {stage.name}
                             </span>
                           </div>
                         );
                       })}
                     </div>
                   </PopoverContent>
                 </Popover>
               </div>

             </div>

             {/* Right: Board Controls */}
             <div className="flex items-center gap-2">

              {/* Card Settings Button */}
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-2"
                onClick={() => setIsCardSettingsOpen(true)}
                title="Customize card display"
              >
                <Settings className="w-4 h-4" />
              </Button>



              {/* View Mode Toggle */}
              <div className="flex items-center gap-2">
                 <Tabs 
                   value={viewMode} 
                   onValueChange={handleViewModeChange} 
                   className="w-auto"
                 >
                  <TabsList className="grid w-auto grid-cols-2 h-9">
                    <TabsTrigger value="kanban" className="text-xs px-2">
                      <Kanban className="w-4 h-4" />
                    </TabsTrigger>
                    <TabsTrigger value="table" className="text-xs px-2">
                      <List className="w-4 h-4" />
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                
                {/* Debug indicator - only show in development */}
                {/* {process.env.NODE_ENV === 'development' && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>
                      {!isLoaded ? "Loading..." : 
                       !viewModeInitializedRef.current ? "Syncing..." : 
                       "Ready"}
                    </span>
                  </div>
                )} */}
              </div>

              {/* Network Diagnostics Button (shown when there are network errors) */}
              {hasNetworkError && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-2 text-orange-600 border-orange-200 hover:bg-orange-50"
                  onClick={() => setShowNetworkDiagnostics(true)}
                  title="Network diagnostics"
                >
                  <Wifi className="w-4 h-4" />
                </Button>
              )}


            </div>
          </div>
        </div>
      </div>

      {/* Board Content with proper spacing for sticky header */}
      <div className="flex-1 bg-background">
        {loading ? (
          <div className="p-6">
            {viewMode === 'kanban' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-fade-in">
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonKanbanCard key={`skeleton-${i}`} />
                ))}
            </div>
            ) : (
              <div className="border rounded-lg shadow overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Task</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Recruiter</TableHead>
                      <TableHead className="w-[100px] hidden sm:table-cell">Fit Score</TableHead>
                      <TableHead className="text-right w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SkeletonTableRows rows={10} columns={6} />
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        ) : displayedCandidates.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="w-16 h-16 flex items-center justify-center">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">No candidates found</h3>
                <p className="text-muted-foreground text-sm">
                  {Object.keys(filters).length > 0 
                    ? "Try adjusting your filters to see more results."
                    : "No candidates are currently assigned to you."
                  }
                </p>
              </div>
              {Object.keys(filters).length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => setFilters({})}
                  className="mt-2"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full">
            {/* Board Views */}
            {viewMode === 'kanban' ? (
              <div className="h-full">

                <TaskBoard
                  tasks={convertCandidatesToTasks(displayedCandidates)}
                  stages={convertStagesToTaskStages(filteredStages)}
                  onMoveTask={handleMoveTask}
                  onTaskClick={(task) => setSelectedTask(task.originalCandidate)}
                  cardPreferences={{
                    cardWidth: memoizedPreferences.cardWidth,
                    customCardWidth: memoizedPreferences.customCardWidth,
                    showAvatar: memoizedPreferences.showAvatar,
                    showName: memoizedPreferences.showName,
                    showEmail: memoizedPreferences.showEmail,
                    showFitScore: memoizedPreferences.showFitScore,
                    showAssignee: memoizedPreferences.showAssignee,
                    showSkills: memoizedPreferences.showSkills,
                    showJobApplied: memoizedPreferences.showJobApplied,
                  }}
                />
              </div>
            ) : (
              // Table View (styled like candidate list)
              <div className="border rounded-lg shadow overflow-hidden min-w-max">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Task</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Recruiter</TableHead>
                      <TableHead className="w-[100px] hidden sm:table-cell">Fit Score</TableHead>
                      <TableHead className="text-right w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <SkeletonTableRows rows={10} columns={6} />
                    ) : (
                      displayedCandidates.map((candidate, index) => (
                      <TableRow 
                        key={candidate.id} 
                        className="cursor-pointer hover:bg-muted/40 content-fade-in"
                        style={{ animationDelay: `${index * 20}ms` }}
                        onClick={() => {
                       
                        setSelectedTask(candidate);
                      }}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <CandidateAvatarCompact
                              user={{
                                id: candidate.id,
                                name: candidate.name,
                                avatarUrl: candidate.avatarUrl,
                                email: candidate.email
                              }}
                              size="lg"
                              className=""
                            />
                            <div>
                              <span className="font-medium text-foreground hover:underline cursor-pointer">{candidate.name}</span>
                              <div className="text-xs text-muted-foreground">{candidate.email}</div>
                            </div>
                          </div>
                        </TableCell>
                                                  <TableCell>
                            <StatusBadge statusId={candidate.statusId} className="text-xs font-medium px-2.5 py-0.5 rounded-full" />
                          </TableCell>
                        <TableCell className="text-foreground">{candidate.position?.title || candidate.positionId}</TableCell>
                        <TableCell className="text-foreground">{candidate.recruiter?.name || candidate.recruiterId}</TableCell>
                        <TableCell className="hidden sm:table-cell text-foreground">{formatScoreWithGrade(candidate.fitScore)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={e => { 
                            e.stopPropagation(); 
                           
                            setSelectedTask(candidate); 
                          }}>
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedTask && (
        <>
          <CandidateDetailModal
            candidateId={selectedTask.id}
            open={!!selectedTask}
            onClose={() => {
              setSelectedTask(null);
            }}
          />
        </>
      )}

      {/* Card Settings Drawer */}
      <Sheet open={isCardSettingsOpen} onOpenChange={setIsCardSettingsOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px]" sheetId="my-tasks-card-settings-drawer">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Card Customization Settings
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <CardCustomizationSettings
              preferences={memoizedPreferences}
              onUpdatePreferences={updateTaskBoardPreferences}
              onResetPreferences={resetTaskBoardPreferences}
              isSaving={false}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Network Diagnostics Modal */}
      {showNetworkDiagnostics && (
        <NetworkDiagnostics onClose={() => setShowNetworkDiagnostics(false)} />
      )}

    </div>
  );
}
