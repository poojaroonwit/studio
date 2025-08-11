// src/components/tasks/MyTasksPageClient.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, RefreshCw, Kanban, List, Users } from 'lucide-react';
import { TaskBoard, Task, TaskStage } from '@/components/tasks/TaskBoard';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';

import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import CandidateDetailModal from '@/components/candidates/CandidateDetailModal';
import { PositionSelectDropdown } from '@/components/candidates/PositionSelectDropdown';

interface MyTasksPageClientProps {
  userSession: { id: string; role: string; name: string | null } | null;
}

export function MyTasksPageClient({ userSession }: MyTasksPageClientProps) {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [filters, setFilters] = useState<any>({});
  const [candidates, setCandidates] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [isStageFilterOpen, setIsStageFilterOpen] = useState(false);
  const { data: session } = useSession();
  const [metadataLoaded, setMetadataLoaded] = useState(false);
  const stageFilterRef = useRef<HTMLDivElement>(null);
  

  
  // Add debouncing for search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close stage filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (stageFilterRef.current && !stageFilterRef.current.contains(event.target as Node)) {
        setIsStageFilterOpen(false);
      }
    };

    if (isStageFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStageFilterOpen]);

  // Permission check: can view all recruiters?
  const canViewAllRecruiters = userSession?.role === 'Admin' || (session?.user?.modulePermissions?.includes('MANAGE_ALL_TASKS'));



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
    
    // Listen for recruitment stage updates via SSE
    const eventSource = new EventSource('/api/candidates/sse');
    eventSource.addEventListener('recruitment-stages', (event: MessageEvent) => {
      try {
        const updatedStages = JSON.parse(event.data);
        setStages(updatedStages.map((s: any) => s.name));
      } catch (e) {
        console.error('Error parsing recruitment stages update:', e);
      }
    });
    
    return () => {
      eventSource.close();
    };
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
    return candidates.map(candidate => ({
      id: candidate.id,
      title: candidate.name,
      description: candidate.parsedData?.summary || candidate.email,
      status: candidate.status,
      priority: candidate.fitScore > 80 ? 'high' : candidate.fitScore > 60 ? 'medium' : 'low',
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
    }));
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
    const candidate = task.originalCandidate;
    if (!candidate) {
      console.error('No original candidate found for task:', task);
      return;
    }

    // Validate the new value
    if (!newStatus || typeof newStatus !== 'string' || newStatus.trim() === '') {
      toast.error('Invalid value: Value cannot be empty');
      return;
    }

    // Validate status is one of the expected values
    const validStatuses = [
      'Applied', 'Screening', 'Shortlisted', 'Interview Scheduled', 'Interviewing', 
      'Offer Sent', 'Offer Accepted', 'Hired', 'Rejected', 'Withdrawn'
    ];
    
    if (!validStatuses.includes(newStatus)) {
      console.error('Invalid status value:', newStatus);
      toast.error(`Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`);
      return;
    }

    // Validate candidate ID is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(candidate.id)) {
      console.error('Invalid candidate ID format:', candidate.id);
      toast.error('Invalid candidate ID format');
      return;
    }

    // Validate required fields are present
    if (!candidate.name || !candidate.email) {
      console.error('Missing required fields:', { name: candidate.name, email: candidate.email });
      toast.error('Candidate is missing required fields (name or email)');
      return;
    }

    // Check if the status is the same (no change needed)
    if (candidate.status === newStatus) {
      console.log('Status unchanged, no update needed');
      return;
    }

    console.log('Moving candidate:', candidate.id, 'from', candidate.status, 'to', newStatus);
    console.log('Candidate data:', candidate);
    console.log('Request payload:', { status: newStatus });

    // Optimistically update UI
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === candidate.id
          ? { ...c, status: newStatus }
          : c
      )
    );

    // Test API endpoint accessibility first
    fetch(`/api/candidates/${candidate.id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }).then(response => {
      console.log('GET API Response status:', response.status);
      if (!response.ok) {
        console.error('Candidate not found or API endpoint not accessible');
        // Revert optimistic update
        setCandidates((prev) =>
          prev.map((c) =>
            c.id === candidate.id
              ? { ...c, status: candidate.status }
              : c
          )
        );
        toast.error('Candidate not found or API endpoint not accessible');
        return;
      }
      
      // If GET succeeds, proceed with PUT
      return fetch(`/api/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    }).then(async response => {
      if (!response) return; // GET failed, don't proceed
      
      console.log('API Response status:', response.status);
      console.log('API Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        // Get error details from response
        let errorMessage = 'Failed to update candidate status';
        let errorDetails = '';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          errorDetails = errorData.error || errorData.details || '';
          console.error('API Error Response:', errorData);
        } catch (e) {
          // If we can't parse the error response, use the status text
          errorMessage = `${errorMessage}: ${response.statusText}`;
          console.error('Could not parse error response:', e);
        }
        
        console.error('API Error:', response.status, errorMessage, 'for candidate:', candidate.id);
        if (errorDetails) {
          console.error('Error details:', errorDetails);
        }
        
        // Revert optimistic update on error
        setCandidates((prev) =>
          prev.map((c) =>
            c.id === candidate.id
              ? { ...c, status: candidate.status }
              : c
          )
        );
        
        // Show more specific error messages based on status code
        if (response.status === 500) {
          toast.error('Server error: Please try again or contact support');
        } else if (response.status === 404) {
          toast.error('Candidate not found');
        } else if (response.status === 400) {
          toast.error(errorMessage || 'Invalid request data');
        } else {
          toast.error(errorMessage);
        }
      } else {
        console.log('Successfully moved candidate:', candidate.id, 'to status:', newStatus);
        toast.success(`Moved ${candidate.name} to ${newStatus}`);
      }
    }).catch(error => {
      console.error('Network error updating candidate status:', error, 'for candidate:', candidate.id);
      // Revert optimistic update on error
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidate.id
            ? { ...c, status: candidate.status }
            : c
        )
      );
      toast.error('Network error: Failed to update candidate status. Please try again.');
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

  const handleRefresh = () => {
    // Trigger a refresh of the data
    const currentFilters = { ...filters };
    setFilters({});
    setTimeout(() => setFilters(currentFilters), 100);
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
             {/* Left: Search and Quick Filters */}
             <div className="flex flex-wrap items-center gap-3 flex-1">
               {/* Search */}
               <div className="relative">
                 {loading ? (
                   <RefreshCw className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                 ) : (
                   <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                 )}
                 <Input
                   className="pl-10 h-9 w-64 text-sm"
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
                 <Select value={filters.recruiterId || 'all'} onValueChange={v => setFilters((f: any) => ({ ...f, recruiterId: v === 'all' ? '' : v }))}>
                   <SelectTrigger className="h-9 w-48 text-sm">
                     <SelectValue placeholder="All Recruiters" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="all">All Recruiters</SelectItem>
                     {recruiters.map((r: any) => (
                       <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               )}

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
             </div>

             {/* Right: Board Controls */}
             <div className="flex items-center gap-2">
              {/* Stage Filter */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 text-xs gap-2"
                  onClick={() => setIsStageFilterOpen(!isStageFilterOpen)}
                >
                  <Filter className="h-3 w-3" />
                  {selectedStages.length === 0 
                    ? `All Stages (${stages.length})` 
                    : `${selectedStages.length} Stage${selectedStages.length !== 1 ? 's' : ''}`
                  }
                </Button>
                
                {/* Stage Filter Dropdown */}
                {isStageFilterOpen && (
                  <div 
                    ref={stageFilterRef}
                    className="absolute top-full right-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-50"
                  >
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700">
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
                              "flex items-center px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
                              isSelected && "bg-blue-50 dark:bg-blue-900/20"
                            )}
                            onClick={() => toggleStageSelection(stage)}
                          >
                            <div className={cn(
                              "w-4 h-4 rounded border-2 mr-3 flex items-center justify-center transition-colors",
                              isSelected 
                                ? "bg-blue-600 border-blue-600" 
                                : "border-gray-300 dark:border-gray-600"
                            )}>
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <span className={cn(
                              "text-sm font-medium",
                              isSelected && "text-blue-600 dark:text-blue-400"
                            )}>
                              {stage}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* View Mode Toggle */}
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-auto">
                <TabsList className="grid w-auto grid-cols-2 h-9">
                  <TabsTrigger value="kanban" className="text-xs px-3">
                    <Kanban className="w-3 h-3 mr-1" />
                    Kanban
                  </TabsTrigger>
                  <TabsTrigger value="table" className="text-xs px-3">
                    <List className="w-3 h-3 mr-1" />
                    List
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Refresh */}
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={cn("w-4 h-4 mr-1", loading && "animate-spin")}/>
                Refresh
              </Button>
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
          <div className="overflow-x-auto scrollbar-custom scroll-smooth">
            {/* Board Views */}
            {viewMode === 'kanban' ? (
              <div className="min-w-max h-full">

                <TaskBoard
                  tasks={convertCandidatesToTasks(displayedCandidates)}
                  stages={convertStagesToTaskStages(filteredStages)}
                  onMoveTask={handleMoveTask}
                  onTaskClick={(task) => setSelectedTask(task.originalCandidate)}
                  showAssignee={true}
                  showPriority={false}
                  showDueDate={false}
                  showTags={true}
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
                            <Avatar size="lg" className="border-2 border-border">
                              <AvatarImage
                                src={candidate.avatarUrl ? candidate.avatarUrl : `https://placehold.co/48x48.png?text=${candidate.name?.charAt(0) || 'T'}`}
                                alt={candidate.name}
                                onError={e => { e.currentTarget.src = `https://placehold.co/48x48.png?text=${candidate.name?.charAt(0) || 'T'}`; }}
                              />
                              <AvatarFallback className="text-sm font-medium">{candidate.name?.charAt(0)?.toUpperCase() || 'T'}</AvatarFallback>
                            </Avatar>
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


    </div>
  );
}
