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
import { Search, Filter, RefreshCw, Kanban, List, Users, TrendingUp } from 'lucide-react';
import { HorizontalStageKanbanView } from '@/components/candidates/CandidateKanbanView';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import CandidateDetailModal from '@/components/candidates/CandidateDetailModal';
import { PositionSelectDropdown } from '@/components/candidates/PositionSelectDropdown';
import { getScoreRangesForChart, normalizeFitScore, getScoreBgColor } from '@/lib/scoreUtils';

interface MyTasksPageClientProps {
  userSession: { id: string; role: string; name: string | null } | null;
}

// Score Distribution Bar Component
const ScoreDistributionBar = ({ candidates }: { candidates: any[] }) => {
  const scoreRanges = getScoreRangesForChart();
  
  // Calculate score distribution
  const scoreDistribution = useMemo(() => {
    const distribution = scoreRanges.map(range => ({
      ...range,
      count: 0,
      percentage: 0
    }));
    
    let totalCandidates = 0;
    
    candidates.forEach(candidate => {
      const score = candidate.fitScore;
      if (score !== null && score !== undefined) {
        const normalizedScore = normalizeFitScore(score);
        const range = distribution.find(r => normalizedScore >= r.min && normalizedScore <= r.max);
        if (range) {
          range.count++;
          totalCandidates++;
        }
      }
    });
    
    // Calculate percentages
    if (totalCandidates > 0) {
      distribution.forEach(range => {
        range.percentage = Math.round((range.count / totalCandidates) * 100);
      });
    }
    
    return distribution;
  }, [candidates]);
  
  const totalCandidates = scoreDistribution.reduce((sum, range) => sum + range.count, 0);
  
  if (totalCandidates === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">Score Distribution</h3>
        </div>
        <p className="text-sm text-muted-foreground">No candidates with scores available</p>
      </div>
    );
  }
  
  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">Score Distribution</h3>
          <Badge variant="secondary" className="text-xs">
            {totalCandidates} candidates
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          Average: {(() => {
            const totalScore = candidates.reduce((sum, c) => {
              const score = normalizeFitScore(c.fitScore);
              return sum + score;
            }, 0);
            const avgScore = totalCandidates > 0 ? Math.round(totalScore / totalCandidates) : 0;
            return `${avgScore}%`;
          })()}
        </div>
      </div>
      
      {/* Horizontal Score Bar */}
      <div className="flex h-8 rounded-lg overflow-hidden border border-border">
        {scoreDistribution.map((range, index) => {
          if (range.count === 0) return null;
          
          return (
            <div
              key={range.letter}
              className={cn(
                "flex items-center justify-center text-xs font-medium text-black relative group cursor-pointer transition-all duration-200",
                getScoreBgColor(range.min + (range.max - range.min) / 2),
                "hover:brightness-110"
              )}
              style={{ width: `${range.percentage}%` }}
              title={`${range.letter} Grade (${range.label}): ${range.count} candidates (${range.percentage}%)`}
            >
              <span className="truncate px-1">
                {range.count > 0 && (
                  <>
                    <span className="font-bold">{range.letter}</span>
                    <span className="ml-1">({range.count})</span>
                  </>
                )}
              </span>
              
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                {range.letter} Grade ({range.label})
                <br />
                {range.count} candidates ({range.percentage}%)
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-3">
        {scoreDistribution.map((range) => (
          <div key={range.letter} className="flex items-center gap-1 text-xs">
            <div 
              className={cn(
                "w-3 h-3 rounded-sm",
                getScoreBgColor(range.min + (range.max - range.min) / 2)
              )}
            />
            <span className="text-muted-foreground">
              {range.letter} ({range.label}): {range.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export function MyTasksPageClient({ userSession }: MyTasksPageClientProps) {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [filters, setFilters] = useState<any>({});
  const [candidates, setCandidates] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();
  const [metadataLoaded, setMetadataLoaded] = useState(false);
  
  // Add debouncing for search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Permission check: can view all recruiters?
  const canViewAllRecruiters = userSession?.role === 'Admin' || (session?.user?.modulePermissions?.includes('MANAGE_ALL_TASKS'));

  // Fetch stages, recruiters, positions on mount
  useEffect(() => {
    const fetchMeta = async () => {
      setLoading(true);
      try {
        const [stagesRes, recruitersRes, positionsRes] = await Promise.all([
          fetch('/api/settings/recruitment-stages'),
          fetch('/api/users?role=Recruiter'),
          fetch('/api/positions'),
        ]);
        const stagesData = await stagesRes.json();
        setStages(Array.isArray(stagesData) ? stagesData.map((s: any) => s.name) : []);
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

  // Handle drag-and-drop move - Fixed to always update status field
  const handleMoveCandidate = (candidate: any, newStatus: string) => {
    // Optimistically update UI
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === candidate.id
          ? { ...c, status: newStatus }
          : c
      )
    );
    
    // Send update to API
    fetch(`/api/candidates/${candidate.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    }).then(response => {
      if (!response.ok) {
        // Revert optimistic update on error
        setCandidates((prev) =>
          prev.map((c) =>
            c.id === candidate.id
              ? { ...c, status: candidate.status }
              : c
          )
        );
        toast.error('Failed to update candidate status');
      } else {
        toast.success(`Moved ${candidate.name} to ${newStatus}`);
      }
    }).catch(error => {
      console.error('Error updating candidate status:', error);
      // Revert optimistic update on error
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidate.id
            ? { ...c, status: candidate.status }
            : c
        )
      );
      toast.error('Failed to update candidate status');
    });
  };

  // Get status color for YouTrack-style badges
  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'Applied': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
      'Screening': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
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

              <Select value={filters.stage || 'all'} onValueChange={v => setFilters((f: any) => ({ ...f, stage: v === 'all' ? '' : v }))}>
                <SelectTrigger className="h-9 w-40 text-sm">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {stages.map((s: any) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

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
            </div>

            {/* Right: Board Controls */}
            <div className="flex items-center gap-2">
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
          <div className="p-6">


            {/* Score Distribution Bar - Only show in Kanban view */}
            {viewMode === 'kanban' && (
              <ScoreDistributionBar candidates={displayedCandidates} />
            )}

            {/* Board Views */}
            {viewMode === 'kanban' ? (
              <HorizontalStageKanbanView
                candidates={displayedCandidates}
                statuses={stages}
                onMoveCandidate={handleMoveCandidate}
                onCardClick={(candidate) => setSelectedCandidate(candidate)}
                visibleFields={['name', 'email', 'status', 'fitScore', 'positionId']}
                visibleRowValues={[]}
                visibleColumnValues={stages}
              />
            ) : (
              // Table View (styled like candidate list)
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
                    {displayedCandidates.map(candidate => (
                      <TableRow key={candidate.id} className="cursor-pointer hover:bg-muted/40" onClick={() => {
                      
                        setSelectedCandidate(candidate);
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
                          
                            setSelectedCandidate(candidate); 
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
      {selectedCandidate && (
        <>
  
          <CandidateDetailModal
            candidateId={selectedCandidate.id}
            open={!!selectedCandidate}
            onClose={() => {
     
              setSelectedCandidate(null);
            }}
          />
        </>
      )}
    </div>
  );
}
