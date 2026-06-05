// src/components/tasks/MyTasksPageClient.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from "@/components/applicants/applicant-kanban-utils";
import { ApplicantAvatarCompact } from '@/components/ui/applicant-avatar';
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
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { CardCustomizationSettings } from '@/components/tasks/CardCustomizationSettings';

import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import ApplicantDetailModal from '@/components/applicants/ApplicantDetailModal';
import { PositionSelectDropdown } from '@/components/applicants/PositionSelectDropdown';

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
  const [applicants, setApplicants] = useState<any[]>([]);
  const [stages, setStages] = useState<Array<{id: string, name: string, description?: string, sortOrder?: number, colorComplete?: string, colorBadge?: string, isSystem?: boolean}>>([]);
  const [recruiters, setRecruiter] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);

  const [selectedApplicantSummary, setSelectedApplicantSummary] = useState<{ id: string; name: string } | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
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
  const [totalApplicants, setTotalApplicants] = useState(0);

  const buildTaskboardApplicantParams = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.name) params.append('name', filters.name);
    if (filters.positionId) params.append('positionId', filters.positionId);
    if (filters.stage) params.append('status', filters.stage);
    if (filters.recruiterId && filters.recruiterId !== '') params.append('recruiterId', filters.recruiterId);
    if (filters.minFitScore !== undefined) params.append('minFitScore', String(filters.minFitScore));
    if (filters.maxFitScore !== undefined) params.append('maxFitScore', String(filters.maxFitScore));
    if (filters.applicationDateStart) params.append('applicationDateStart', filters.applicationDateStart);
    if (filters.applicationDateEnd) params.append('applicationDateEnd', filters.applicationDateEnd);
    if (filters.assignmentStatus) params.append('assignmentStatus', filters.assignmentStatus);
    if (filters.positionStatus) params.append('positionStatus', filters.positionStatus);
    if (filters.scoreStatus) params.append('scoreStatus', filters.scoreStatus);
    params.append('limit', '50000');
    params.append('page', '1');
    return params;
  }, [filters]);
  
  // Admin users can access my-tasks page - no automatic redirect
  
  // Add debouncing for search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  
  // Add debouncing for preference updates to prevent rapid changes
  const preferenceUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedPreferencesRef = useRef<{ viewMode: string; selectedStages: string[] }>({ 
    viewMode: 'kanban', 
    selectedStages: [] 
  });

  // Enhanced Applicant update handler with conflict resolution
  const handleApplicantUpdate = useCallback((updateData: any) => {
    
    
    const applicant = updateData?.applicant || updateData;
    
    if (!applicant || !applicant.id) {
      
      return;
    }
    
    
    
    setApplicants(prevApplicants => {
      const existingIndex = prevApplicants.findIndex(c => c.id === applicant.id);
      if (existingIndex !== -1) {
        const updated = [...prevApplicants];
        const existing = updated[existingIndex];
        
        
        
        // Merge updates while preserving any local changes that haven't been confirmed
        const merged = { 
          ...existing, 
          ...applicant,
          // Preserve local status if it's different from the updated one (might be a pending change)
          status: existing.status !== applicant.status ? existing.status : applicant.status
        };
        
        updated[existingIndex] = merged;
        
        return updated;
      } else {
        // Add new Applicant if not found
        
        return [...prevApplicants, applicant];
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
        // console.log('[MyTasksPage] SSE event received via shared connection:', event);
      }
      
      // Handle different event types with improved debouncing and rate limiting
      if (event.type === 'Applicant_update' || event.type === 'position_update' || event.type === 'dashboard_update') {
        const now = Date.now();
        
        // Rate limit updates to prevent excessive reloading
        if (now - lastUpdateTime < MIN_UPDATE_INTERVAL) {
          if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
            // console.log('[MyTasksPage] Update rate limited, skipping');
          }
          return;
        }
        
        if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
          // console.log('[MyTasksPage] Processing update event:', event.type);
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
      const fetchApplicants = async () => {
        setLoading(true);
        try {
          const params = buildTaskboardApplicantParams();
          
          const result = await safeFetch(`/api/taskboard/applicants?${params.toString()}`, { timeoutMs: 6000 });
          if (result.ok && result.data) {
            setApplicants(Array.isArray(result.data) ? result.data : ((result.data as any)?.data || []));
          } else {
            console.warn('Skipping failed endpoint /api/applicants:', result.error || result.status);
            setApplicants([]);
          }
        } catch (e) {
          console.error('Error fetching Applicants:', e);
        } finally {
          setLoading(false);
        }
      };
      fetchApplicants();
    }
  }, [refreshTrigger, buildTaskboardApplicantParams]);


  // Add periodic refresh as fallback (reduced from 30 to 10 seconds for better responsiveness)
  useEffect(() => {
    if (!session?.user?.id) return;
    
    const interval = setInterval(() => {
      // Only refresh if not currently loading and we have applicants
      if (!loading && applicants.length > 0) {
        
        const refreshApplicants = async () => {
          try {
            const params = buildTaskboardApplicantParams();
            
            const result = await safeFetch(`/api/taskboard/applicants?${params.toString()}`, { timeoutMs: 6000 });
            if (result.ok && result.data) {
              const newApplicants = Array.isArray(result.data) ? result.data : ((result.data as any)?.data || []);
            
              // Only update if the data has actually changed
              if (JSON.stringify(newApplicants.map((c: any) => ({ id: c.id, status: c.status, updatedAt: c.updatedAt }))) !== 
                  JSON.stringify(applicants.map((c: any) => ({ id: c.id, status: c.status, updatedAt: c.updatedAt })))) {
                setApplicants(newApplicants);
                // console.log('[MyTasksPageClient] Periodic refresh updated applicants');
              }
            } else {
              console.warn('Skipping failed endpoint /api/applicants (periodic):', result.error || result.status);
            }
          } catch (error) {
            console.error('[MyTasksPageClient] Error in periodic refresh:', error);
          } finally {
          }
        };
        
        refreshApplicants();
      }
    }, 10000); // Reduced from 30 seconds to 10 seconds for better responsiveness
    
    return () => clearInterval(interval);
  }, [session?.user?.id, loading, applicants, buildTaskboardApplicantParams, realtimeConnected]);




  // Permission check: If user is a recruiter (not Admin and doesn't have applicantS_VIEW permission), 
  // only show their assigned Applicants
  const isRecruiter = userSession?.role === 'Recruiter' && 
    !userSession?.modulePermissions?.includes('applicantS_VIEW');

  // Check if user can see all recruiters (has USERS_VIEW or applicantS_VIEW permission)
  const canSeeAllRecruiter = userSession?.modulePermissions?.includes('USERS_VIEW') || 
    userSession?.modulePermissions?.includes('applicantS_VIEW');

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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleFocusSearch = () => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    };

    const handleOpenFilters = () => {
      setIsStageFilterOpen(true);
    };

    window.addEventListener('mytasks:focus-search', handleFocusSearch);
    window.addEventListener('mytasks:open-filters', handleOpenFilters);

    return () => {
      window.removeEventListener('mytasks:focus-search', handleFocusSearch);
      window.removeEventListener('mytasks:open-filters', handleOpenFilters);
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

  const openApplicantDetail = useCallback((applicant: any) => {
    if (!applicant?.id) {
      return;
    }

    setSelectedApplicantSummary({
      id: applicant.id,
      name: applicant.name || 'Applicant',
    });
    setIsDetailModalOpen(true);
  }, []);

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
        const result = await safeFetch('/api/applicants?forCounts=true', { timeoutMs: 8000 });
        if (result.ok && result.data) {
          setTotalApplicants((result.data as any)?.total || 0);
        } else {
          console.warn('Skipping failed endpoint /api/applicants (counts):', result.error || result.status);
        }
      } catch (e) {
        console.error('Error fetching total count:', e);
      }
    };
    fetchTotalCount();
  }, []);

  // Initial load of Applicants (with pagination for better performance)
  useEffect(() => {
    const fetchApplicants = async () => {
      setLoading(true);
      try {
        // Use optimized taskboard endpoint for faster loading - request all applicants
        const result = await safeFetch('/api/taskboard/applicants?limit=50000&page=1', { timeoutMs: 6000 });
        if (result.ok && result.data) {
          setApplicants(Array.isArray(result.data) ? result.data : ((result.data as any)?.data || []));
        } else {
          console.warn('Skipping failed endpoint /api/applicants (initial):', result.error || result.status);
          setApplicants([]);
        }
      } catch (e) {
        console.error('Error fetching Applicants:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchApplicants();
  }, []); // Only run on mount

  // Debounced fetch Applicants when filters change
  useEffect(() => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      const fetchApplicants = async () => {
        setLoading(true);
        try {
          const params = buildTaskboardApplicantParams();
          
          // If no filters are applied, use the same endpoint as initial load to get all applicants
          // Recruiter filter should apply even when no stages are selected
          const hasFilters = Object.entries(filters).some(([, value]) =>
            value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0)
          );
          const shouldShowAll = !hasFilters;
          const endpoint = shouldShowAll
            ? '/api/taskboard/applicants?limit=50000&page=1' // Get all applicants when showing all
            : `/api/taskboard/applicants?${params.toString()}`;
          
          // console.log('Fetching Applicants with endpoint:', endpoint);
          
          const result = await safeFetch(endpoint, { timeoutMs: 6000 });
          if (result.ok && result.data) {
            setApplicants(Array.isArray(result.data) ? result.data : ((result.data as any)?.data || []));
            // console.log('Successfully loaded Applicants:', Array.isArray(result.data) ? result.data.length : ((result.data as any)?.data || []).length);
          } else {
            console.warn('Skipping failed endpoint /api/applicants (filtered):', result.error || result.status);
            setApplicants([]);
          }
        } catch (e) {
          console.error('Error fetching Applicants:', e);
        } finally {
          setLoading(false);
        }
      };
      fetchApplicants();
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

  // Filter Applicants based on user role and permissions
  const filteredApplicants = useMemo(() => {
    // Defensive check to prevent temporal dead zone issues
    if (!Array.isArray(applicants)) {
      console.warn('MyTasksPageClient: applicants is not an array:', applicants);
      return [];
    }
    
    try {
      // The API already handles permission-based filtering, so we just return all applicants
      // that the API returned. The API will only return applicants the user has permission to see.
      return applicants;
    } catch (error) {
      console.error('MyTasksPageClient: Error in filteredApplicants useMemo:', error);
      return [];
    }
  }, [applicants]);

  // Filtering logic (for fitScore, if not supported by API)
  const displayedApplicants = useMemo(() => {
    try {
      // Defensive check to prevent filter errors
      if (!Array.isArray(filteredApplicants)) {
        console.warn('MyTasksPageClient: filteredApplicants is not an array:', filteredApplicants);
        return [];
      }
      
      return filteredApplicants.filter((c) => {
        try {
          const fitScore = Number(c.fitScore || 0);
          if (filters.minFitScore !== undefined && fitScore < filters.minFitScore) return false;
          if (filters.maxFitScore !== undefined && fitScore > filters.maxFitScore) return false;
          if (filters.applicationDateStart && c.applicationDate && new Date(c.applicationDate) < new Date(filters.applicationDateStart)) return false;
          if (filters.applicationDateEnd && c.applicationDate) {
            const endDate = new Date(filters.applicationDateEnd);
            endDate.setHours(23, 59, 59, 999);
            if (new Date(c.applicationDate) > endDate) return false;
          }
          if (filters.assignmentStatus === 'assigned' && !c.recruiterId) return false;
          if (filters.assignmentStatus === 'unassigned' && c.recruiterId) return false;
          if (filters.positionStatus === 'with-position' && !c.positionId) return false;
          if (filters.positionStatus === 'without-position' && c.positionId) return false;
          if (filters.scoreStatus === 'scored' && fitScore <= 0) return false;
          if (filters.scoreStatus === 'unscored' && fitScore > 0) return false;
          return true;
        } catch (error) {
          console.warn('MyTasksPageClient: Error filtering Applicant by fitScore:', error, c);
          return false;
        }
      });
    } catch (error) {
      console.error('MyTasksPageClient: Error in displayedApplicants useMemo:', error);
      return [];
    }
  }, [filteredApplicants, filters]);

  // Convert applicants to tasks for the task board
  const convertApplicantsToTasks = (applicants: any[]): Task[] => {
    return applicants.map(applicant => {
      const task = {
        id: applicant.id,
        title: applicant.name,
        description: applicant.parsedData?.summary || '', // Only use summary, don't fallback to email
        email: applicant.email, // Always include email separately
        status: applicant.statusId,
        priority: (applicant.fitScore > 0.8 ? 'high' : applicant.fitScore > 0.6 ? 'medium' : 'low') as 'low' | 'medium' | 'high' | 'urgent',
        assignee: applicant.recruiter ? {
          id: applicant.recruiter.id,
          name: applicant.recruiter.name,
          avatarUrl: applicant.recruiter.avatarUrl
        } : undefined,
        dueDate: applicant.applicationDate,
        tags: applicant.position?.title ? [applicant.position.title] : [],
        createdAt: applicant.createdAt,
        updatedAt: applicant.updatedAt,
        fitScore: applicant.fitScore,
        avatarUrl: applicant.avatarUrl,
        skills: applicant.parsedData?.skills || [],
        // Keep original applicant data for backward compatibility
        originalapplicant: applicant
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
      description: stage.description || `Applicants in ${stage.name} stage`,
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
    
    // Find the original applicant
    const applicant = applicants.find(c => c.id === task.id);
    if (!applicant) {
      toast.error('Applicant not found');
      return;
    }

    // Find the stage name for the new status
    const targetStage = stages.find(stage => stage.id === newStatus);
    const stageName = targetStage?.name || 'Unknown Stage';

    try {
      // Show loading state
      toast.loading(`Moving ${applicant.name} to ${stageName}...`, { id: `move-${applicant.id}` });
      
      // Update the applicant status
      const result = await safeFetch('/api/applicants/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_status',
          applicantIds: [applicant.id],
          newStatus: newStatus
        }),
        timeoutMs: 10000
      });

      if (!result.ok) {
        console.warn('Skipping failed endpoint /api/applicants/bulk-action:', result.error || result.status);
        throw new Error(`Failed to update status: ${result.error}`);
      }

      const responseData = result.data;
      
      // Only update local state if the API call was successful
      if ((responseData as any)?.updatedCount > 0) {
        // Update local state optimistically but let real-time updates handle the final state
        setApplicants((prev) =>
          prev.map((c) =>
            c.id === applicant.id
              ? { ...c, statusId: newStatus }
              : c
          )
        );
        
        toast.success(`Moved ${applicant.name} to ${stageName}`, { id: `move-${applicant.id}` });
      } else {
        // If no applicants were updated, show error
        toast.error(`Failed to move ${applicant.name}: No applicants updated`, { id: `move-${applicant.id}` });
      }
      
    } catch (error) {
      console.error('Error updating applicant status:', error);
      toast.error(`Failed to update applicant status: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: `move-${applicant.id}` });
      
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

  const stageNames = useMemo(() => {
    const map: Record<string, string> = {};
    stages.forEach((stage) => {
      if (stage.id && stage.name) {
        map[stage.id] = stage.name;
      }
    });
    return map;
  }, [stages]);

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
      <div className="bg-card border-b border-border shadow-sm sticky top-0 z-20 backdrop-blur-sm bg-card/95">
        <div className="px-6 py-4 space-y-4">
                     {/* Main Controls Row */}
           <div className="flex flex-wrap items-center gap-3 justify-between">
             {/* Left: Applicant Count and Search */}
             <div className="flex flex-wrap items-center gap-3 flex-1">
               {/* Applicant Count Badge */}
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
                         const hasManualFilters = Object.entries(filters).some(([, value]) =>
                           value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0)
                         );
                         
                         // If no manual filters and user can view all Applicants, show simple count
                         if (!hasManualFilters && !isRecruiter) {
                           return `${totalApplicants} applicants`;
                         }
                         
                         // If no manual filters but user has limited permissions, show permission-based count
                         if (!hasManualFilters && isRecruiter) {
                           return `${totalApplicants} total applicants (${displayedApplicants.length} assigned to you)`;
                         }
                         
                         // If manual filters are applied, show filtered count
                         return `${totalApplicants} total applicants (${displayedApplicants.length} filtered)`;
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
                   ref={searchInputRef}
                   className="pl-10 h-9 w-48 text-sm"
                   placeholder="Search Applicants..."
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
                         <button type="button"
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
                         <button type="button"
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
                            role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); } }}>
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
        ) : displayedApplicants.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="w-16 h-16 flex items-center justify-center">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">No applicants found</h3>
                <p className="text-muted-foreground text-sm">
                  {Object.keys(filters).length > 0 
                    ? "Try adjusting your filters to see more results."
                    : "No applicants are currently assigned to you."
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
                  tasks={convertApplicantsToTasks(displayedApplicants)}
                  stages={convertStagesToTaskStages(filteredStages)}
                  onMoveTask={handleMoveTask}
                  onTaskClick={(task) => openApplicantDetail(task.originalapplicant ?? task)}
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
              // Table View (styled like Applicant list)
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
                      displayedApplicants.map((applicant, index) => (
                      <TableRow 
                        key={applicant.id} 
                        className="cursor-pointer hover:bg-muted/40 content-fade-in"
                        style={{ animationDelay: `${index * 20}ms` }}
                        onClick={() => openApplicantDetail(applicant)}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <ApplicantAvatarCompact
                              user={{
                                id: applicant.id,
                                name: applicant.name,
                                avatarUrl: applicant.avatarUrl,
                                email: applicant.email
                              }}
                              size="lg"
                              className=""
                            />
                            <div>
                              <span className="font-medium text-foreground hover:underline cursor-pointer">{applicant.name}</span>
                              <div className="text-xs text-muted-foreground">{applicant.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            statusId={applicant.statusId}
                            stageNames={stageNames}
                            className="text-xs font-medium px-2.5 py-0.5 rounded-full"
                          />
                        </TableCell>
                        <TableCell className="text-foreground">{applicant.position?.title || applicant.positionId}</TableCell>
                        <TableCell className="text-foreground">{applicant.recruiter?.name || applicant.recruiterId}</TableCell>
                        <TableCell className="hidden sm:table-cell text-foreground">{formatScoreWithGrade(applicant.fitScore)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={e => { 
                            e.stopPropagation(); 
                            openApplicantDetail(applicant); 
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
      {selectedApplicantSummary && (
        <ApplicantDetailModal
          applicantId={selectedApplicantSummary.id}
          open={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setTimeout(() => {
              setSelectedApplicantSummary(null);
            }, 100);
          }}
        />
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

