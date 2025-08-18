// src/components/tasks/MyTasksPageClient.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserAvatarCompact } from '@/components/ui/user-avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Search, Filter, Kanban, List, Users, RotateCcw, Settings, ChevronDown, Wifi } from 'lucide-react';
import { TaskBoard, Task, TaskStage } from '@/components/tasks/TaskBoard';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { CardCustomizationSettings } from '@/components/tasks/CardCustomizationSettings';

import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import CandidateDetailModal from '@/components/candidates/CandidateDetailModal';
import { PositionSelectDropdown } from '@/components/candidates/PositionSelectDropdown';
import { RealtimeIndicator } from '@/components/ui/realtime-indicator';
import { useRealtimeCollaboration } from '@/hooks/use-realtime-collaboration';
import { getErrorMessage, retryWithBackoff, isRetryableError } from '@/lib/networkUtils';
import { NetworkDiagnostics } from '@/components/ui/network-diagnostics';

interface MyTasksPageClientProps {
  userSession: { id: string; role: string; name: string | null } | null;
}

export function MyTasksPageClient({ userSession }: MyTasksPageClientProps) {
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
    preferences.showDescription,
    preferences.showFitScore,
    preferences.showAssignee,
    preferences.showPriority,
    preferences.showDueDate,
    preferences.showTags,
    preferences.showSkills,
    preferences.showJobApplied,
    preferences.searchTerm,
    preferences.filterPriority,
    preferences.filterAssignee,
    preferences.selectedStages,
    preferences.viewMode
  ]);

  const [viewMode, setViewMode] = useState<'kanban' | 'table'>(memoizedPreferences.viewMode);
  const [filters, setFilters] = useState<any>({});
  const [candidates, setCandidates] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);

  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedStages, setSelectedStages] = useState<string[]>(memoizedPreferences.selectedStages);
  const [isStageFilterOpen, setIsStageFilterOpen] = useState(false);
  const [isCardSettingsOpen, setIsCardSettingsOpen] = useState(false);
  const [showNetworkDiagnostics, setShowNetworkDiagnostics] = useState(false);
  const [hasNetworkError, setHasNetworkError] = useState(false);
  const { data: session } = useSession();
  const [metadataLoaded, setMetadataLoaded] = useState(false);
  
  // Add debouncing for search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Real-time collaboration hook
  const { isConnected: realtimeConnected } = useRealtimeCollaboration({
    onCandidateUpdate: (updatedCandidate) => {
      setCandidates(prevCandidates => {
        const existingIndex = prevCandidates.findIndex(c => c.id === updatedCandidate.id);
        if (existingIndex !== -1) {
          const updated = [...prevCandidates];
          updated[existingIndex] = { ...updated[existingIndex], ...updatedCandidate };
          return updated;
        } else {
          return [...prevCandidates, updatedCandidate];
        }
      });
    },
    onTransitionUpdate: (transition) => {
      setCandidates(prevCandidates => {
        return prevCandidates.map(candidate => {
          if (candidate.id === transition.candidateId) {
            return { ...candidate, status: transition.stage };
          }
          return candidate;
        });
      });
    },
    onRecruitmentStagesUpdate: (updatedStages) => {
      setStages(updatedStages.map((s: any) => s.name));
    }
  });



  // Permission check: can view all recruiters?
  const canViewAllRecruiters = userSession?.role === 'Admin';

  // Update local state when preferences are loaded
  useEffect(() => {
    if (isLoaded) {
      setViewMode(memoizedPreferences.viewMode);
      setSelectedStages(memoizedPreferences.selectedStages);
    }
  }, [isLoaded, memoizedPreferences.viewMode, memoizedPreferences.selectedStages]);

  // Update preferences when local state changes, but only if they differ from current preferences
  useEffect(() => {
    if (isLoaded && (
      viewMode !== memoizedPreferences.viewMode ||
      JSON.stringify(selectedStages) !== JSON.stringify(memoizedPreferences.selectedStages)
    )) {
      updateTaskBoardPreferences({
        viewMode,
        selectedStages,
      });
    }
  }, [viewMode, selectedStages, isLoaded, updateTaskBoardPreferences, memoizedPreferences.viewMode, memoizedPreferences.selectedStages]);

  // Fetch stages, recruiters, positions on mount
  useEffect(() => {
    const fetchMeta = async () => {
      setLoading(true);
      try {
        const [stagesRes, recruitersRes, positionsRes] = await Promise.all([
          fetch('/api/recruitment-stages'),
          fetch('/api/users?role=Recruiter'),
          fetch('/api/positions'),
        ]);
        const stagesData = await stagesRes.json();
        const stageNames = Array.isArray(stagesData) ? stagesData.map((s: any) => s.name) : [];
        setStages(stageNames);
        const recruitersData = await recruitersRes.json();
        setRecruiters(Array.isArray(recruitersData) ? recruitersData : []);
        const positionsData = await positionsRes.json();
        setPositions(Array.isArray(positionsData.data) ? positionsData.data : []);
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

  // Initial load of candidates
  useEffect(() => {
    const fetchCandidates = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/candidates');
        const data = await res.json();
        setCandidates(Array.isArray(data) ? data : (data.data || []));
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
        if (filters.recruiterId) params.append('recruiterId', filters.recruiterId);
        
          const res = await fetch(`/api/candidates?${params.toString()}`);
          const data = await res.json();
          setCandidates(Array.isArray(data) ? data : (data.data || []));
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

  // Filter candidates based on user role and permissions
  const filteredCandidates = useMemo(() => {
    // Defensive check to prevent temporal dead zone issues
    if (!Array.isArray(candidates)) {
      return [];
    }
    
    // If user can view all recruiters, show all candidates
    if (canViewAllRecruiters) {
      return candidates;
    }
    // Otherwise, show only candidates assigned to the current user
    return candidates.filter(c => c && c.recruiterId === userSession?.id);
  }, [candidates, userSession?.id, canViewAllRecruiters]);

  // Filtering logic (for fitScore, if not supported by API)
  const displayedCandidates = useMemo(() => {
    return filteredCandidates.filter((c) => {
      if (filters.minFitScore !== undefined && c.fitScore < filters.minFitScore) return false;
      if (filters.maxFitScore !== undefined && c.fitScore > filters.maxFitScore) return false;
      return true;
    });
  }, [filteredCandidates, filters]);

  // Convert candidates to tasks for the task board
  const convertCandidatesToTasks = (candidates: any[]): Task[] => {
    return candidates.map(candidate => {
      const task = {
        id: candidate.id,
        title: candidate.name,
        description: candidate.parsedData?.summary || '', // Only use summary, don't fallback to email
        email: candidate.email, // Always include email separately
        status: candidate.status,
        priority: (candidate.fitScore > 80 ? 'high' : candidate.fitScore > 60 ? 'medium' : 'low') as 'low' | 'medium' | 'high' | 'urgent',
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
  const convertStagesToTaskStages = (stages: string[]): TaskStage[] => {
    return stages.map((stage, index) => ({
      id: stage,
      name: stage,
      color: getStatusColor(stage).includes('blue') ? '#3b82f6' : 
             getStatusColor(stage).includes('green') ? '#10b981' : 
             getStatusColor(stage).includes('yellow') ? '#f59e0b' : 
             getStatusColor(stage).includes('red') ? '#ef4444' : '#6b7280',
      description: `Candidates in ${stage} stage`,
      sortOrder: index
    }));
  };

  // Handle task movement
  const handleMoveTask = (task: Task, newStatus: string) => {
    console.log('🔄 Attempting to move task:', task.id, 'from', task.status, 'to', newStatus);
    
    // Find the original candidate
    const candidate = candidates.find(c => c.id === task.id);
    if (!candidate) {
      console.error('❌ Candidate not found for task:', task.id);
      toast.error('Candidate not found');
      return;
    }

    // Optimistic update
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === candidate.id
          ? { ...c, status: newStatus }
          : c
      )
    );

    // Enhanced error handling with retry logic using network utilities
    const updateCandidateStatus = async (): Promise<void> => {
      try {
        // Test API endpoint accessibility first
        console.log('🔍 Testing API endpoint accessibility...');
        const testResponse = await fetch(`/api/candidates/${candidate.id}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!testResponse.ok) {
          console.error('❌ API endpoint test failed:', testResponse.status, testResponse.statusText);
          throw new Error(`API endpoint not accessible: ${testResponse.status} ${testResponse.statusText}`);
        }
        
        console.log('✅ API endpoint accessible, proceeding with status update...');
        
        // Use retry logic for the actual update
        await retryWithBackoff(async () => {
          const updateResponse = await fetch(`/api/candidates/${candidate.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
          });
          
          if (!updateResponse.ok) {
            // Get detailed error information
            let errorData = null;
            
            try {
              errorData = await updateResponse.json();
              console.error('📋 API Error Response:', errorData);
            } catch (parseError) {
              console.error('❌ Could not parse error response:', parseError);
            }
            
            console.error('❌ API Error:', updateResponse.status, 'for candidate:', candidate.id);
            
            // Create error object with status for proper handling
            const error = new Error(errorData?.message || `HTTP ${updateResponse.status}`);
            (error as any).status = updateResponse.status;
            (error as any).data = errorData;
            
            throw error;
          }
          
          return updateResponse;
        }, 2, 1000); // 2 retries, 1 second base delay
        
        console.log('✅ Status update successful, refreshing candidate data...');
        
        // Re-fetch the candidate to ensure UI reflects the persisted status
        try {
          const refreshed = await fetch(`/api/candidates/${candidate.id}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          
          if (refreshed.ok) {
            const refreshedCandidate = await refreshed.json();
            setCandidates((prev) => prev.map((c) => c.id === candidate.id ? { ...c, status: refreshedCandidate.status } : c));
            console.log('✅ Candidate data refreshed successfully');
          } else {
            console.warn('⚠️ Could not refresh candidate data, but update was successful');
          }
        } catch (refreshError) {
          console.warn('⚠️ Non-blocking refresh error:', refreshError);
          // Keep optimistic state if refresh fails
        }
        
        toast.success(`Moved ${candidate.name} to ${newStatus}`);
        
      } catch (error: any) {
        console.error('❌ Error updating candidate status:', error, 'for candidate:', candidate.id);
        
        // Revert optimistic update on error
        setCandidates((prev) =>
          prev.map((c) =>
            c.id === candidate.id
              ? { ...c, status: candidate.status }
              : c
          )
        );
        
        // Use the network utility to get user-friendly error message
        const userMessage = getErrorMessage(error);
        toast.error(userMessage);
        
        // Track network errors to show diagnostics option
        if (isRetryableError(error)) {
          setHasNetworkError(true);
        }
        
        throw error; // Re-throw to prevent further processing
      }
    };
    
    // Execute the update
    updateCandidateStatus().catch(error => {
      console.error('❌ Final error in handleMoveTask:', error);
    });
  };

  // Get status color for YouTrack-style badges
  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'Applied': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
      'Screening': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
      'Shortlisted': 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800',
      'Interview Scheduled': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
      'Interviewing': 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
      'Offer Sent': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
      'Offer Accepted': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
      'Hired': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
      'Rejected': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
      'Withdrawn': 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
  };



  // Stage filter functions
  const handleSelectAllStages = () => {
    setSelectedStages(stages);
  };

  const handleClearAllStages = () => {
    setSelectedStages([]);
  };

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
    if (selectedStages.length === 0) {
      return stages; // Show all stages if none selected
    }
    return stages.filter(stage => selectedStages.includes(stage));
  }, [stages, selectedStages]);

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
    <div className="flex flex-col h-full bg-background">
      {/* Enhanced Board Header - Always Sticky within main content */}
      <div className="bg-card border-b border-border shadow-sm sticky top-0 z-40 backdrop-blur-sm bg-card/95">
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
                       {displayedCandidates.length} candidate{displayedCandidates.length !== 1 ? 's' : ''}
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

               {canViewAllRecruiters && (
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
                                 <Avatar className="h-4 w-4">
                                   <AvatarImage src={selectedRecruiter.avatarUrl} />
                                   <AvatarFallback className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                     {selectedRecruiter.name.charAt(0).toUpperCase()}
                                   </AvatarFallback>
                                 </Avatar>
                                 <span className="truncate">{selectedRecruiter.name}</span>
                               </>
                             ) : (
                               <span>Unknown recruiter</span>
                             );
                           })()}
                         </div>
                       ) : (
                         <span className="text-muted-foreground">All Recruiters</span>
                       )}
                       <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
                     </Button>
                   </PopoverTrigger>
                   <PopoverContent className="w-48 p-0" align="start">
                     <div className="p-2">
                       <div className="text-sm font-medium mb-2">Select Recruiter</div>
                       
                       {/* All recruiters option */}
                       <button
                         onClick={() => setFilters((f: any) => ({ ...f, recruiterId: '' }))}
                         className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent text-left"
                       >
                         <div className="h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                           <Users className="h-3 w-3 text-gray-500" />
                         </div>
                         <div className="flex flex-col flex-1">
                           <span className="text-sm">All Recruiters</span>
                           <span className="text-xs text-muted-foreground">Show all recruiters</span>
                         </div>
                         {!filters.recruiterId && (
                           <div className="w-3 h-3 rounded-full bg-primary" />
                         )}
                       </button>

                       {/* Available recruiters */}
                       {recruiters.map((r: any) => (
                         <button
                           key={r.id}
                           onClick={() => setFilters((f: any) => ({ ...f, recruiterId: r.id }))}
                           className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent text-left"
                         >
                           <Avatar className="h-5 w-5">
                             <AvatarImage src={r.avatarUrl} />
                             <AvatarFallback className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                               {r.name.charAt(0).toUpperCase()}
                             </AvatarFallback>
                           </Avatar>
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
               )}

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
                       <div className="flex items-center justify-between">
                         <h4 className="text-sm font-medium">Filter Stages</h4>
                         <div className="flex gap-1">
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={handleSelectAllStages}
                             className="h-6 px-2 text-xs"
                           >
                             All
                           </Button>
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={handleClearAllStages}
                             className="h-6 px-2 text-xs"
                           >
                             Clear
                           </Button>
                         </div>
                       </div>
                     </div>
                     
                     <div className="max-h-48 overflow-y-auto">
                       {stages.map((stage) => {
                         const isSelected = selectedStages.includes(stage);
                         return (
                           <div
                             key={stage}
                             className={cn(
                               "flex items-center px-3 py-2 cursor-pointer hover:bg-accent transition-colors",
                               isSelected && "bg-accent"
                             )}
                             onClick={() => toggleStageSelection(stage)}
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
                               {stage}
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
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-auto">
                <TabsList className="grid w-auto grid-cols-2 h-9">
                  <TabsTrigger value="kanban" className="text-xs px-2">
                    <Kanban className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger value="table" className="text-xs px-2">
                    <List className="w-4 h-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>

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
      <div className="flex-1 overflow-auto bg-background">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-muted-foreground text-sm">Loading your tasks...</p>
            </div>
          </div>
        ) : displayedCandidates.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
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
                    showDescription: memoizedPreferences.showDescription,
                    showFitScore: memoizedPreferences.showFitScore,
                    showAssignee: memoizedPreferences.showAssignee,
                    showPriority: memoizedPreferences.showPriority,
                    showDueDate: memoizedPreferences.showDueDate,
                    showTags: memoizedPreferences.showTags,
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
                    {displayedCandidates.map(candidate => (
                      <TableRow key={candidate.id} className="cursor-pointer hover:bg-muted/40" onClick={() => {
                       
                        setSelectedTask(candidate);
                      }}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <UserAvatarCompact
                              user={{
                                id: candidate.id,
                                name: candidate.name,
                                avatarUrl: candidate.avatarUrl,
                                email: candidate.email
                              }}
                              size="lg"
                              className="border-2 border-border"
                            />
                            <div>
                              <span className="font-medium text-foreground hover:underline cursor-pointer">{candidate.name}</span>
                              <div className="text-xs text-muted-foreground">{candidate.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(candidate.status)} text-xs font-medium px-2.5 py-0.5 rounded-full`}>
                            {candidate.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-foreground">{candidate.position?.title || candidate.positionId}</TableCell>
                        <TableCell className="text-foreground">{candidate.recruiter?.name || candidate.recruiterId}</TableCell>
                        <TableCell className="hidden sm:table-cell text-foreground">{candidate.fitScore != null ? `${candidate.fitScore}%` : '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={e => { 
                            e.stopPropagation(); 
                           
                            setSelectedTask(candidate); 
                          }}>
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
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
        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
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
