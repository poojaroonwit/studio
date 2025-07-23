"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Position, Candidate, UserProfile } from '@/lib/types';
import { signIn, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Briefcase, Edit, Loader2, ServerCrash, ShieldAlert, Users, ChevronUp, ChevronDown, Search, X, Eye } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import parseISO from 'date-fns/parseISO';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { EditPositionModal, type EditPositionFormValues } from '@/components/positions/EditPositionModal';
import FullCandidateDetail from '@/components/candidates/FullCandidateDetail';

export default function PositionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const positionId = params.id as string;

  // State for position and general data
  const [position, setPosition] = useState<Position | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [availableRecruiters, setAvailableRecruiters] = useState<{ id: string; name: string }[]>([]);

  // State for candidates applied
  const [candidatesApplied, setCandidatesApplied] = useState<Candidate[]>([]);
  const [appliedPage, setAppliedPage] = useState(1);
  const [appliedPageSize, setAppliedPageSize] = useState(20);
  const [appliedTotal, setAppliedTotal] = useState(0);
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [appliedSortColumn, setAppliedSortColumn] = useState<string>('applicationDate');
  const [appliedSortDirection, setAppliedSortDirection] = useState<'asc' | 'desc'>('desc');

  // State for candidate matches
  const [candidateMatches, setCandidateMatches] = useState<Candidate[]>([]);
  const [matchesPage, setMatchesPage] = useState(1);
  const [matchesPageSize, setMatchesPageSize] = useState(20);
  const [matchesTotal, setMatchesTotal] = useState(0);
  const [matchesSearchTerm, setMatchesSearchTerm] = useState('');
  const [matchesSortColumn, setMatchesSortColumn] = useState<string>('fitScore');
  const [matchesSortDirection, setMatchesSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);

  const { data: session, status: sessionStatus } = useSession();

  // Fetch position data
  const fetchPosition = useCallback(async () => {
    if (!positionId || sessionStatus !== 'authenticated') return;
    
    try {
      const response = await fetch(`/api/positions/${positionId}`);
      if (!response.ok) {
        if (response.status === 401) {
          setAuthError(true);
          signIn(undefined, { callbackUrl: `/positions/${positionId}` });
          return;
        }
        throw new Error('Failed to fetch position');
      }
      const data = await response.json();
      setPosition(data);
    } catch (error) {
      console.error('Error fetching position:', error);
      setFetchError((error as Error).message || 'Could not load position.');
    }
  }, [positionId, sessionStatus]);

  // Fetch candidates applied to this position
  const fetchCandidatesApplied = useCallback(async () => {
    if (!positionId) return;
    
    try {
      const query = new URLSearchParams();
      query.append('positionId', positionId);
      query.append('limit', String(appliedPageSize));
      query.append('offset', String((appliedPage - 1) * appliedPageSize));
      if (appliedSearchTerm) {
        query.append('search', appliedSearchTerm);
      }
      
      const response = await fetch(`/api/candidates?${query.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch candidates');
      
      const data = await response.json();
      let candidates = Array.isArray(data.data) ? data.data : data.data ? [data.data] : [];
      
      // Sort candidates
      candidates = candidates.sort((a: Candidate, b: Candidate) => {
        const aValue = getSortValue(a, appliedSortColumn);
        const bValue = getSortValue(b, appliedSortColumn);
        const multiplier = appliedSortDirection === 'asc' ? 1 : -1;
        return aValue < bValue ? -1 * multiplier : aValue > bValue ? 1 * multiplier : 0;
      });
      
      setCandidatesApplied(candidates);
      setAppliedTotal(data.pagination?.total || data.total || candidates.length);
    } catch (error) {
      console.error('Error fetching candidates applied:', error);
      setCandidatesApplied([]);
    }
  }, [positionId, appliedPage, appliedPageSize, appliedSearchTerm, appliedSortColumn, appliedSortDirection]);

  // Fetch candidate matches (candidates with job matches for this position)
  const fetchCandidateMatches = useCallback(async () => {
    if (!positionId) return;
    
    try {
      // Fetch all candidates and filter those with job matches for this position
      const query = new URLSearchParams();
      query.append('limit', String(matchesPageSize));
      query.append('offset', String((matchesPage - 1) * matchesPageSize));
      if (matchesSearchTerm) {
        query.append('search', matchesSearchTerm);
      }
      
      const response = await fetch(`/api/candidates?${query.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch candidate matches');
      
      const data = await response.json();
      let candidates = Array.isArray(data.data) ? data.data : data.data ? [data.data] : [];
      
      // Filter candidates that have job matches for this position
      const matchedCandidates = candidates.filter((candidate: Candidate) => {
        // Check if candidate has job matches for this position
        // This is a simplified approach - you might need to adjust based on your job match data structure
        return candidate.jobMatches && candidate.jobMatches.some((match: any) => match.jobId === positionId);
      });
      
      // Sort candidates
      matchedCandidates.sort((a: Candidate, b: Candidate) => {
        const aValue = getSortValue(a, matchesSortColumn);
        const bValue = getSortValue(b, matchesSortColumn);
        const multiplier = matchesSortDirection === 'asc' ? 1 : -1;
        return aValue < bValue ? -1 * multiplier : aValue > bValue ? 1 * multiplier : 0;
      });
      
      setCandidateMatches(matchedCandidates);
      setMatchesTotal(matchedCandidates.length);
    } catch (error) {
      console.error('Error fetching candidate matches:', error);
      setCandidateMatches([]);
    }
  }, [positionId, matchesPage, matchesPageSize, matchesSearchTerm, matchesSortColumn, matchesSortDirection]);

  // Fetch recruiters
  const fetchRecruiters = useCallback(async () => {
    try {
      const response = await fetch('/api/users?role=Recruiter');
      if (!response.ok) throw new Error('Failed to fetch recruiters');
      const data: UserProfile[] = await response.json();
      setAvailableRecruiters(data.map(r => ({ id: r.id, name: r.name })));
    } catch (error) {
      console.error('Error fetching recruiters:', error);
    }
  }, []);

  // Helper function to get sortable value
  const getSortValue = (candidate: Candidate, column: string): string | number => {
    switch (column) {
      case 'name': return candidate.name?.toLowerCase() || '';
      case 'email': return candidate.email?.toLowerCase() || '';
      case 'fitScore': return candidate.fitScore || 0;
      case 'applicationDate': return candidate.applicationDate || '';
      case 'status': return candidate.status?.toLowerCase() || '';
      default: return '';
    }
  };

  // Handle sort
  const handleSort = (column: string, type: 'applied' | 'matches'): void => {
    if (type === 'applied') {
      if (appliedSortColumn === column) {
        setAppliedSortDirection(appliedSortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setAppliedSortColumn(column);
        setAppliedSortDirection('desc');
      }
    } else {
      if (matchesSortColumn === column) {
        setMatchesSortDirection(matchesSortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setMatchesSortColumn(column);
        setMatchesSortDirection('desc');
      }
    }
  };

  // Handle recruiter assignment
  const handleAssignRecruiter = async (candidateId: string, recruiterId: string | null) => {
    try {
      const response = await fetch(`/api/candidates/${candidateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recruiterId }),
      });
      if (!response.ok) throw new Error('Failed to assign recruiter');
      
      // Re-fetch candidates to update the lists
      await Promise.all([fetchCandidatesApplied(), fetchCandidateMatches()]);
      toast.success('Recruiter updated successfully');
    } catch (error) {
      toast.error('Failed to assign recruiter');
    }
  };

  // Handle position edit
  const handleEditPosition = async (positionId: string, data: EditPositionFormValues) => {
    try {
      const response = await fetch(`/api/positions/${positionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Failed to update position');
      
      const updatedPosition = await response.json();
      setPosition(updatedPosition.position || updatedPosition);
      setIsEditModalOpen(false);
      toast.success('Position updated successfully');
    } catch (error) {
      toast.error('Failed to update position');
    }
  };

  // Handle candidate click
  const handleCandidateClick = (candidateId: string) => {
    setSelectedCandidateId(candidateId);
    setIsCandidateModalOpen(true);
  };

  // Initial data fetch
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (sessionStatus === 'unauthenticated') {
      signIn(undefined, { callbackUrl: `/positions/${positionId}` });
      return;
    }
    
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchPosition(),
          fetchRecruiters()
        ]);
      } catch (err) {
        // Log error for debugging
        console.error('Error in loadInitialData:', err);
        setFetchError((err instanceof Error ? err.message : 'Unknown error in loadInitialData'));
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();
  }, [positionId, sessionStatus, fetchPosition, fetchRecruiters]);

  // Fetch candidates when position is loaded
  useEffect(() => {
    if (position) {
      fetchCandidatesApplied();
      fetchCandidateMatches();
    }
  }, [position, fetchCandidatesApplied, fetchCandidateMatches]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // Auth error state
  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center p-6">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-6">You need to be signed in to view position details.</p>
        <Button onClick={() => signIn(undefined, { callbackUrl: `/positions/${positionId}` })}>Sign In</Button>
      </div>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center p-6">
        <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Error Loading Position</h2>
        <p className="text-muted-foreground mb-6">{fetchError}</p>
        <Button onClick={fetchPosition}>Try Again</Button>
      </div>
    );
  }

  // Not found state
  if (!position) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center p-6">
        <Briefcase className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-foreground">Position Not Found</h2>
        <p className="text-muted-foreground">The requested position could not be found.</p>
        <Button onClick={() => router.push('/positions')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Positions
        </Button>
      </div>
    );
  }

  const renderCandidateTable = (
    candidates: Candidate[],
    type: 'applied' | 'matches',
    searchTerm: string,
    setSearchTerm: (term: string) => void,
    sortColumn: string,
    sortDirection: 'asc' | 'desc'
  ): JSX.Element => (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => handleSort('name', type)}>
                <div className="flex items-center gap-1">
                  Name
                  {sortColumn === 'name' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('email', type)}>
                <div className="flex items-center gap-1">
                  Email
                  {sortColumn === 'email' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort(type === 'applied' ? 'fitScore' : 'fitScore', type)}>
                <div className="flex items-center gap-1">
                  {type === 'applied' ? 'Fit Score' : 'Match Score'}
                  {sortColumn === 'fitScore' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead>Recruiter</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('status', type)}>
                <div className="flex items-center gap-1">
                  Status
                  {sortColumn === 'status' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('applicationDate', type)}>
                <div className="flex items-center gap-1">
                  Applied Date
                  {sortColumn === 'applicationDate' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.map((candidate: Candidate) => (
              <TableRow 
                key={candidate.id} 
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => handleCandidateClick(candidate.id)}
              >
                <TableCell className="font-medium">{candidate.name}</TableCell>
                <TableCell>{candidate.email}</TableCell>
                <TableCell>
                  {candidate.fitScore ? (
                    <Badge variant="secondary">{candidate.fitScore}%</Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  <Select
                    value={candidate.recruiterId || ''}
                    onValueChange={(value) => handleAssignRecruiter(candidate.id, value || null)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Assign recruiter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {availableRecruiters.map((recruiter) => (
                        <SelectItem key={recruiter.id} value={recruiter.id}>
                          {recruiter.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{candidate.status || 'New'}</Badge>
                </TableCell>
                <TableCell>
                  {candidate.applicationDate ? (
                    <span title={format(parseISO(candidate.applicationDate), 'PPP')}>
                      {formatDistanceToNow(parseISO(candidate.applicationDate), { addSuffix: true })}
                    </span>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCandidateClick(candidate.id);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {candidates.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No candidates found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/positions')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Positions
              </Button>
              <div className="h-6 w-px bg-border" />
              <h1 className="text-2xl font-bold">Position Details</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - 2 Column Layout (30%/70%) */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
          {/* Left Column - 30% */}
          <div className="lg:col-span-3 space-y-6 bg-white rounded-lg shadow-sm p-6 border border-border">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="text-2xl flex items-center gap-3 font-bold text-foreground">
                  <Briefcase className="h-7 w-7 text-primary" />
                  {position.title}
                </div>
                <div className="mt-2 text-base text-muted-foreground">
                  {position.department}
                  {position.positionLevel && ` • ${position.positionLevel}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={position.isOpen ? "default" : "destructive"}>
                  {position.isOpen ? "Open" : "Closed"}
                </Badge>
                <Button onClick={() => setIsEditModalOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </div>
            </div>
            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Department</label>
                <p className="text-base">{position.department}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Level</label>
                <p className="text-base">{position.positionLevel || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <p className="text-base">
                  <Badge variant={position.isOpen ? "default" : "destructive"}>
                    {position.isOpen ? "Open" : "Closed"}
                  </Badge>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <p className="text-base">
                  {position.createdAt ? format(parseISO(position.createdAt), 'PPP') : 'N/A'}
                </p>
              </div>
            </div>
            {/* Job Description */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Job Description</label>
              <div className="mt-2 p-4 bg-muted rounded-lg min-h-[200px]">
                {position.description ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: position.description }} 
                    className="prose prose-sm max-w-none text-foreground"
                  />
                ) : (
                  <p className="text-muted-foreground italic">No job description provided.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - 70% */}
          <div className="lg:col-span-7 space-y-6 bg-white rounded-lg shadow-sm p-6 border border-border">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="text-lg font-semibold">Candidates</span>
            </div>
            <Tabs defaultValue="applied" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="applied">
                  Candidates Applied ({appliedTotal})
                </TabsTrigger>
                <TabsTrigger value="matches">
                  Candidate Matches ({matchesTotal})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="applied" className="mt-4">
                {renderCandidateTable(
                  candidatesApplied,
                  'applied',
                  appliedSearchTerm,
                  setAppliedSearchTerm,
                  appliedSortColumn,
                  appliedSortDirection
                )}
              </TabsContent>
              <TabsContent value="matches" className="mt-4">
                {renderCandidateTable(
                  candidateMatches,
                  'matches',
                  matchesSearchTerm,
                  setMatchesSearchTerm,
                  matchesSortColumn,
                  matchesSortDirection
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Modals */}
      <EditPositionModal
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        position={position}
        onEditPosition={handleEditPosition}
      />

      {selectedCandidateId && isCandidateModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-7xl h-full max-h-[95vh] flex flex-col bg-background rounded-lg shadow-2xl border border-border overflow-hidden">
            <FullCandidateDetail 
              candidateId={selectedCandidateId} 
              isModal={true} 
              onClose={() => {
                setIsCandidateModalOpen(false);
                setSelectedCandidateId(null);
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
