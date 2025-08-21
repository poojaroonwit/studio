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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, Briefcase, Edit, Loader2, ServerCrash, ShieldAlert, Users, ChevronUp, ChevronDown, Search, X, Eye } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import parseISO from 'date-fns/parseISO'
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { EditPositionModal, type EditPositionFormValues } from '@/components/positions/EditPositionModal';
import FullCandidateDetail from '@/components/candidates/FullCandidateDetail';
import CandidateDetailModal from '@/components/candidates/CandidateDetailModal';
import { getScoreBgColor, getScoreColor, formatScoreWithGrade, getScoreGrade, normalizeFitScore } from '@/lib/scoreUtils';
import { ScoreBadge } from '@/components/ui/score-color';
import { Pagination } from '@/components/ui/pagination';
import { getPositionStatusBadge } from '@/lib/positionUtils';

function displayFitScore(score: number | undefined | null) {
  if (typeof score !== 'number' || isNaN(score)) return '';
  if (score >= 0 && score <= 1) return `${Math.round(score * 100)}%`;
  return `${Math.round(score)}%`;
}

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
  const [appliedPageSize, setAppliedPageSize] = useState(50);
  const [appliedTotal, setAppliedTotal] = useState(0);
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [appliedSortColumn, setAppliedSortColumn] = useState<string>('applicationDate');
  const [appliedSortDirection, setAppliedSortDirection] = useState<'asc' | 'desc'>('desc');

  // State for candidate matches
  const [candidateMatches, setCandidateMatches] = useState<Candidate[]>([]);
  const [matchesPage, setMatchesPage] = useState(1);
  const [matchesPageSize, setMatchesPageSize] = useState(50);
  const [matchesTotal, setMatchesTotal] = useState(0);
  const [matchesSearchTerm, setMatchesSearchTerm] = useState('');
  const [matchesSortColumn, setMatchesSortColumn] = useState<string>('fitScore');
  const [matchesSortDirection, setMatchesSortDirection] = useState<'asc' | 'desc'>('desc');

  // State for all candidates (merged view)
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [allCandidatesPage, setAllCandidatesPage] = useState(1);
  const [allCandidatesPageSize, setAllCandidatesPageSize] = useState(50);
  const [allCandidatesTotal, setAllCandidatesTotal] = useState(0);
  const [allCandidatesSearchTerm, setAllCandidatesSearchTerm] = useState('');
  const [allCandidatesSortColumn, setAllCandidatesSortColumn] = useState<string>('applicationDate');
  const [allCandidatesSortDirection, setAllCandidatesSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);

  const { data: session, status: sessionStatus } = useSession();

  // Calculate total pages for pagination
  const appliedTotalPages = useMemo(() => Math.max(1, Math.ceil(appliedTotal / appliedPageSize)), [appliedTotal, appliedPageSize]);
  const matchesTotalPages = useMemo(() => Math.max(1, Math.ceil(matchesTotal / matchesPageSize)), [matchesTotal, matchesPageSize]);
  const allCandidatesTotalPages = useMemo(() => Math.max(1, Math.ceil(allCandidatesTotal / allCandidatesPageSize)), [allCandidatesTotal, allCandidatesPageSize]);

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
      query.append('page', String(appliedPage));
      query.append('limit', String(appliedPageSize));
      query.append('type', 'applied');
      if (appliedSearchTerm) {
        query.append('searchTerm', appliedSearchTerm);
      }
      if (appliedSortColumn) {
        query.append('sortColumn', appliedSortColumn);
      }
      if (appliedSortDirection) {
        query.append('sortDirection', appliedSortDirection);
      }
      
      const response = await fetch(`/api/positions/${positionId}/candidates?${query.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch candidates');
      
      const data = await response.json();
      const candidates = Array.isArray(data.data) ? data.data : [];
      
      setCandidatesApplied(candidates);
      setAppliedTotal(data.pagination?.total || candidates.length);
    } catch (error) {
      console.error('Error fetching candidates applied:', error);
      setCandidatesApplied([]);
    }
  }, [positionId, appliedPage, appliedPageSize, appliedSearchTerm, appliedSortColumn, appliedSortDirection]);

  // Fetch candidate matches (candidates with job matches for this position)
  const fetchCandidateMatches = useCallback(async () => {
    if (!positionId) return;
    
    try {
      const query = new URLSearchParams();
      query.append('page', String(matchesPage));
      query.append('limit', String(matchesPageSize));
      query.append('type', 'matched');
      if (matchesSearchTerm) {
        query.append('searchTerm', matchesSearchTerm);
      }
      if (matchesSortColumn) {
        query.append('sortColumn', matchesSortColumn);
      }
      if (matchesSortDirection) {
        query.append('sortDirection', matchesSortDirection);
      }
      
      const response = await fetch(`/api/positions/${positionId}/candidates?${query.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch candidate matches');
      
      const data = await response.json();
      const candidates = Array.isArray(data.data) ? data.data : [];
      
      setCandidateMatches(candidates);
      setMatchesTotal(data.pagination?.total || candidates.length);
    } catch (error) {
      console.error('Error fetching candidate matches:', error);
      setCandidateMatches([]);
    }
  }, [positionId, matchesPage, matchesPageSize, matchesSearchTerm, matchesSortColumn, matchesSortDirection]);

  // Fetch all candidates related to this position (both applied and matched) with pagination
  const fetchAllCandidates = useCallback(async () => {
    if (!positionId) return;
    
    try {
      const query = new URLSearchParams();
      query.append('page', String(allCandidatesPage));
      query.append('limit', String(allCandidatesPageSize));
      query.append('type', 'all');
      if (allCandidatesSearchTerm) {
        query.append('searchTerm', allCandidatesSearchTerm);
      }
      if (allCandidatesSortColumn) {
        query.append('sortColumn', allCandidatesSortColumn);
      }
      if (allCandidatesSortDirection) {
        query.append('sortDirection', allCandidatesSortDirection);
      }
      
      const response = await fetch(`/api/positions/${positionId}/candidates?${query.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch all candidates');
      
      const data = await response.json();
      const candidates = Array.isArray(data.data) ? data.data : [];
      
      setAllCandidates(candidates);
      setAllCandidatesTotal(data.pagination?.total || candidates.length);
    } catch (error) {
      console.error('Error fetching all candidates:', error);
      setAllCandidates([]);
      setAllCandidatesTotal(0);
    }
  }, [positionId, allCandidatesPage, allCandidatesPageSize, allCandidatesSearchTerm, allCandidatesSortColumn, allCandidatesSortDirection]);

  // Fetch recruiters
  const fetchRecruiters = useCallback(async () => {
    try {
      const response = await fetch('/api/users?role=Recruiter');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch recruiters' }));
        throw new Error(errorData.message || `Failed to fetch recruiters: ${response.status} ${response.statusText}`);
      }
      const responseData = await response.json();
      // Handle the correct API response structure: { users: [...], pagination: {...} }
      const recruitersArray = responseData?.users || [];
      if (!Array.isArray(recruitersArray)) {
        throw new Error('Invalid recruiter data format received');
      }
      setAvailableRecruiters(recruitersArray.map(r => ({ id: r.id, name: r.name })));
    } catch (error) {
      console.error('Error fetching recruiters:', error);
      toast.error((error as Error).message || 'Failed to fetch recruiters');
      setAvailableRecruiters([]); // Set empty array to prevent UI issues
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
  const handleSort = (column: string, type: 'applied' | 'matches' | 'all'): void => {
    if (type === 'applied') {
      if (appliedSortColumn === column) {
        setAppliedSortDirection(appliedSortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setAppliedSortColumn(column);
        setAppliedSortDirection('desc');
      }
    } else if (type === 'matches') {
      if (matchesSortColumn === column) {
        setMatchesSortDirection(matchesSortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setMatchesSortColumn(column);
        setMatchesSortDirection('desc');
      }
    } else if (type === 'all') {
      if (allCandidatesSortColumn === column) {
        setAllCandidatesSortDirection(allCandidatesSortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setAllCandidatesSortColumn(column);
        setAllCandidatesSortDirection('desc');
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
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to assign recruiter' }));
        throw new Error(errorData.message || `Failed to assign recruiter: ${response.status} ${response.statusText}`);
      }
      
      // Re-fetch candidates to update the lists
      await Promise.all([fetchCandidatesApplied(), fetchCandidateMatches(), fetchAllCandidates()]);
      toast.success('Recruiter updated successfully');
    } catch (error) {
      console.error('Error assigning recruiter:', error);
      toast.error((error as Error).message || 'Failed to assign recruiter');
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
  }, [positionId, sessionStatus]);

  // Fetch candidates when position is loaded
  useEffect(() => {
    if (position) {
      fetchCandidatesApplied();
      fetchCandidateMatches();
      fetchAllCandidates();
    }
  }, [position, positionId, sessionStatus]);

  // Refetch applied candidates when pagination or search changes
  useEffect(() => {
    if (position) {
      fetchCandidatesApplied();
    }
  }, [appliedPage, appliedPageSize, appliedSearchTerm, appliedSortColumn, appliedSortDirection, positionId, sessionStatus]);

  // Refetch candidate matches when pagination or search changes
  useEffect(() => {
    if (position) {
      fetchCandidateMatches();
    }
  }, [matchesPage, matchesPageSize, matchesSearchTerm, matchesSortColumn, matchesSortDirection, positionId, sessionStatus]);

  // Refetch all candidates when pagination or search changes
  useEffect(() => {
    if (position) {
      fetchAllCandidates();
    }
  }, [allCandidatesPage, allCandidatesPageSize, allCandidatesSearchTerm, allCandidatesSortColumn, allCandidatesSortDirection, positionId, sessionStatus]);

  // State for expanded email groups
  const [expandedEmails, setExpandedEmails] = React.useState<Record<string, boolean>>({});

  const renderGroupedCandidateTable = (
    candidates: Candidate[],
    type: 'applied' | 'matches' | 'all',
    searchTerm: string,
    setSearchTerm: (term: string) => void,
    sortColumn: string,
    sortDirection: 'asc' | 'desc',
    showTypeBadge: boolean = false,
    positionId?: string
  ): JSX.Element => {
    // Group candidates by email
    const candidatesByEmail = candidates.reduce((acc, candidate) => {
      const email = candidate.email?.toLowerCase() || '';
      if (!acc[email]) {
        acc[email] = [];
      }
      acc[email].push(candidate);
      return acc;
    }, {} as Record<string, Candidate[]>);

    // Get unique emails in order
    const emailOrder = Object.keys(candidatesByEmail).sort();



    let rowNumber = 1;
    return (
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
                <TableHead className="w-8 text-center">#</TableHead>
                <TableHead>Name / Email</TableHead>
                <TableHead>Fit Score</TableHead>
                <TableHead>Recruiter</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applied Date</TableHead>
                {showTypeBadge && <TableHead>Association</TableHead>}
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emailOrder.map((email) => {
                const group = candidatesByEmail[email];
                if (!group || group.length === 0) return null;
                if (group.length === 1) {
                  const candidate = group[0];
                  return (
                    <TableRow 
                      key={candidate.id} 
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleCandidateClick(candidate.id)}
                    >
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">{rowNumber++}</TableCell>
                      <TableCell>
                        <div>
                          {candidate.name}
                          <div className="text-xs text-muted-foreground">{candidate.email}</div>
                          {showTypeBadge && positionId && (
                            <div className="mt-1">
                              {(() => {
                                // Use the associationType from the API if available
                                if (candidate.associationType) {
                                  switch (candidate.associationType) {
                                    case 'applied_and_matched':
                                      return <Badge variant="default" className="mr-1">Applied & Matched</Badge>;
                                    case 'applied':
                                      return <Badge variant="default">Applied</Badge>;
                                    case 'matched':
                                      return <Badge variant="secondary">Matched</Badge>;
                                    default:
                                      return null;
                                  }
                                }
                                
                                // Fallback to old logic for backward compatibility
                                const hasApplied = candidate.positionId === positionId;
                                const hasJobMatch = candidate.jobMatches && candidate.jobMatches.some(jm => jm.jobId === positionId) ||
                                  (candidate.parsedData && typeof candidate.parsedData === 'object' && 'job_matches' in candidate.parsedData &&
                                   Array.isArray((candidate.parsedData as any).job_matches) && 
                                   (candidate.parsedData as any).job_matches.some((match: any) => match.jobId === positionId));
                                
                                if (hasApplied && hasJobMatch) {
                                  return <Badge variant="default" className="mr-1">Applied & Matched</Badge>;
                                } else if (hasApplied) {
                                  return <Badge variant="default">Applied</Badge>;
                                } else if (hasJobMatch) {
                                  return <Badge variant="secondary">Matched</Badge>;
                                }
                                return null;
                              })()}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {candidate.fitScore !== undefined && candidate.fitScore !== null ? (
                          <ScoreBadge score={candidate.fitScore}>
                            {formatScoreWithGrade(candidate.fitScore)}
                          </ScoreBadge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="border-r">{candidate.recruiter?.name || 'Unassigned'}</TableCell>
                      <TableCell><Badge variant="outline">{candidate.status || 'New'}</Badge></TableCell>
                      <TableCell>
                        {candidate.applicationDate ? (
                          <span title={format(parseISO(candidate.applicationDate), 'PPP')}>
                            {format(parseISO(candidate.applicationDate), 'MMM dd, yyyy')}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      {showTypeBadge && (
                        <TableCell>
                          {(() => {
                            // Use the associationType from the API if available
                            if (candidate.associationType) {
                              switch (candidate.associationType) {
                                case 'applied_and_matched':
                                  return <Badge variant="default">Applied & Matched</Badge>;
                                case 'applied':
                                  return <Badge variant="default">Applied</Badge>;
                                case 'matched':
                                  return <Badge variant="secondary">Matched</Badge>;
                                default:
                                  return <Badge variant="outline">Unknown</Badge>;
                              }
                            }
                            
                            // Fallback to old logic for backward compatibility
                            const hasApplied = candidate.positionId === positionId;
                            const hasJobMatch = candidate.jobMatches && candidate.jobMatches.some(jm => jm.jobId === positionId) ||
                              (candidate.parsedData && typeof candidate.parsedData === 'object' && 'job_matches' in candidate.parsedData &&
                               Array.isArray((candidate.parsedData as any).job_matches) && 
                               (candidate.parsedData as any).job_matches.some((match: any) => match.jobId === positionId));
                            
                            if (hasApplied && hasJobMatch) {
                              return <Badge variant="default">Applied & Matched</Badge>;
                            } else if (hasApplied) {
                              return <Badge variant="default">Applied</Badge>;
                            } else if (hasJobMatch) {
                              return <Badge variant="secondary">Matched</Badge>;
                            } else {
                              return <Badge variant="outline">Unknown</Badge>;
                            }
                          })()}
                        </TableCell>
                      )}
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
                  );
                } else {
                  const isExpanded = expandedEmails[email] !== undefined ? expandedEmails[email] : true;
                  return (
                    <React.Fragment key={email}>
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={99} className="p-0">
                          <div className="flex items-center gap-2 px-2 py-1 bg-muted">
                            <Button variant="ghost" size="icon" onClick={() => setExpandedEmails((prev) => ({ ...prev, [email]: !isExpanded }))} aria-label={isExpanded ? 'Collapse group' : 'Expand group'} className="border border-primary">
                              {isExpanded ? <ChevronDown /> : <ChevronUp />}
                            </Button>
                            <span className="font-semibold">{email}</span>
                            <span className="text-xs text-muted-foreground">({group.length} candidates)</span>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && group.map((candidate) => (
                        <TableRow 
                          key={candidate.id} 
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleCandidateClick(candidate.id)}
                        >
                          <TableCell className="text-center font-mono text-xs text-muted-foreground">{rowNumber++}</TableCell>
                          <TableCell>
                            <div>
                              {candidate.name}
                              <div className="text-xs text-muted-foreground">{candidate.email}</div>
                              {showTypeBadge && positionId && (
                                <div className="mt-1">
                                  {(() => {
                                    // Use the associationType from the API if available
                                    if (candidate.associationType) {
                                      switch (candidate.associationType) {
                                        case 'applied_and_matched':
                                          return <Badge variant="default" className="mr-1">Applied & Matched</Badge>;
                                        case 'applied':
                                          return <Badge variant="default">Applied</Badge>;
                                        case 'matched':
                                          return <Badge variant="secondary">Matched</Badge>;
                                        default:
                                          return null;
                                      }
                                    }
                                    
                                    // Fallback to old logic for backward compatibility
                                    const hasApplied = candidate.positionId === positionId;
                                    const hasJobMatch = candidate.jobMatches && candidate.jobMatches.some(jm => jm.jobId === positionId) ||
                                      (candidate.parsedData && typeof candidate.parsedData === 'object' && 'job_matches' in candidate.parsedData &&
                                       Array.isArray((candidate.parsedData as any).job_matches) && 
                                       (candidate.parsedData as any).job_matches.some((match: any) => match.jobId === positionId));
                                    
                                    if (hasApplied && hasJobMatch) {
                                      return <Badge variant="default" className="mr-1">Applied & Matched</Badge>;
                                    } else if (hasApplied) {
                                      return <Badge variant="default">Applied</Badge>;
                                    } else if (hasJobMatch) {
                                      return <Badge variant="secondary">Matched</Badge>;
                                    }
                                    return null;
                                  })()}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {candidate.fitScore !== undefined && candidate.fitScore !== null ? (
                              <ScoreBadge score={candidate.fitScore}>
                                {formatScoreWithGrade(candidate.fitScore)}
                              </ScoreBadge>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="border-r">{candidate.recruiter?.name || 'Unassigned'}</TableCell>
                          <TableCell><Badge variant="outline">{candidate.status || 'New'}</Badge></TableCell>
                          <TableCell>
                            {candidate.applicationDate ? (
                              <span title={format(parseISO(candidate.applicationDate), 'PPP')}>
                                {format(parseISO(candidate.applicationDate), 'MMM dd, yyyy')}
                              </span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          {showTypeBadge && (
                            <TableCell>
                              {(() => {
                                // Use the associationType from the API if available
                                if (candidate.associationType) {
                                  switch (candidate.associationType) {
                                    case 'applied_and_matched':
                                      return <Badge variant="default">Applied & Matched</Badge>;
                                    case 'applied':
                                      return <Badge variant="default">Applied</Badge>;
                                    case 'matched':
                                      return <Badge variant="secondary">Matched</Badge>;
                                    default:
                                      return <Badge variant="outline">Unknown</Badge>;
                                  }
                                }
                                
                                // Fallback to old logic for backward compatibility
                                const hasApplied = candidate.positionId === positionId;
                                const hasJobMatch = candidate.jobMatches && candidate.jobMatches.some(jm => jm.jobId === positionId) ||
                                  (candidate.parsedData && typeof candidate.parsedData === 'object' && 'job_matches' in candidate.parsedData &&
                                   Array.isArray((candidate.parsedData as any).job_matches) && 
                                   (candidate.parsedData as any).job_matches.some((match: any) => match.jobId === positionId));
                                
                                if (hasApplied && hasJobMatch) {
                                  return <Badge variant="default">Applied & Matched</Badge>;
                                } else if (hasApplied) {
                                  return <Badge variant="default">Applied</Badge>;
                                } else if (hasJobMatch) {
                                  return <Badge variant="secondary">Matched</Badge>;
                                } else {
                                  return <Badge variant="outline">Unknown</Badge>;
                                }
                              })()}
                            </TableCell>
                          )}
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
                      <TableRow className="bg-muted/20">
                        <TableCell colSpan={99} className="text-right text-xs italic px-4 py-2 border-t bg-muted">
                          Group total: {group.length} candidate{group.length !== 1 ? 's' : ''}
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                }
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

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
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  Created: {position.createdAt ? format(parseISO(position.createdAt), 'MMM dd, yyyy') : 'N/A'}
                </span>
                {position.updatedAt && (
                  <span>
                    Updated: {format(parseISO(position.updatedAt), 'MMM dd, yyyy')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - 2 Column Layout (40%/60%) */}
      <div className="mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 h-[calc(100vh-200px)]">
          {/* Left Column - Position Details - 40% */}
          <div className="lg:col-span-4 space-y-6 overflow-y-auto pr-4 border-r border-border custom-scrollbar pt-6 pb-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl flex items-center gap-3 font-bold">
                  <Briefcase className="h-7 w-7 text-primary" />
                  {position.title}
                </h2>
                <p className="mt-2 text-base text-muted-foreground">
                  {position.department}
                  {position.positionLevel && ` • ${position.positionLevel}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => setIsEditModalOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </div>
            </div>
            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 ">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Department</p>
                <div className="text-base">{position.department}</div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Level</p>
                <div className="text-base">{position.positionLevel || 'Not specified'}</div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="text-base">
                  {(() => {
                    const statusBadge = getPositionStatusBadge(position.isOpen, false);
                    return (
                      <Badge 
                        variant={statusBadge.variant}
                        className={statusBadge.className}
                      >
                        {statusBadge.text}
                      </Badge>
                    );
                  })()}
                </div>
              </div>
            </div>
            {/* Job Description and Match Criteria - Accordion Layout */}
            <div className="mt-6">
              <Accordion type="multiple" defaultValue={["job-description", "match-criteria"]} className="w-full space-y-1">
                {/* Job Description Accordion */}
                <AccordionItem value="job-description" className="border-t border-b rounded-none">
                  <AccordionTrigger className="text-left font-medium text-base hover:no-underline py-4">
                    📄 Job Description
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    {position.description ? (
                      <div 
                        className="wysiwyg-content prose prose-sm max-w-none text-sm"
                        dangerouslySetInnerHTML={{ __html: position.description }}
                      />
                    ) : (
                      <div className="text-muted-foreground italic text-sm">No job description provided.</div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* Match Criteria Accordion */}
                <AccordionItem value="match-criteria" className="border-t border-b rounded-none">
                  <AccordionTrigger className="text-left font-medium text-base hover:no-underline py-4">
                    🎯 Match Criteria
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    {position.matchCriteria ? (
                      <div 
                        className="wysiwyg-content prose prose-sm max-w-none text-sm"
                        dangerouslySetInnerHTML={{ __html: position.matchCriteria }}
                      />
                    ) : (
                      <div className="text-muted-foreground italic text-sm">No match criteria defined.</div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>

          {/* Right Column - Candidates - 60% */}
          <div className="lg:col-span-6 space-y-6 overflow-y-auto pl-4 custom-scrollbar pt-6 pb-6">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="text-lg font-semibold">Candidates</span>
            </div>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">
                  All ({allCandidatesTotal})
                </TabsTrigger>
                <TabsTrigger value="applied">
                  Candidates Applied ({appliedTotal})
                </TabsTrigger>
                <TabsTrigger value="matches">
                  Candidate Matches ({matchesTotal})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                {renderGroupedCandidateTable(
                  allCandidates,
                  'all',
                  allCandidatesSearchTerm,
                  setAllCandidatesSearchTerm,
                  allCandidatesSortColumn,
                  allCandidatesSortDirection,
                  true, // showTypeBadge
                  positionId // <-- pass positionId
                )}
                <Pagination
                  currentPage={allCandidatesPage}
                  totalPages={allCandidatesTotalPages}
                  pageSize={allCandidatesPageSize}
                  total={allCandidatesTotal}
                  onPageChange={setAllCandidatesPage}
                  onPageSizeChange={setAllCandidatesPageSize}
                />
              </TabsContent>
              <TabsContent value="applied" className="mt-4">
                {renderGroupedCandidateTable(
                  candidatesApplied,
                  'applied',
                  appliedSearchTerm,
                  setAppliedSearchTerm,
                  appliedSortColumn,
                  appliedSortDirection,
                  true, // showTypeBadge
                  positionId // <-- pass positionId (optional, for consistency)
                )}
                <Pagination
                  currentPage={appliedPage}
                  totalPages={appliedTotalPages}
                  pageSize={appliedPageSize}
                  total={appliedTotal}
                  onPageChange={setAppliedPage}
                  onPageSizeChange={setAppliedPageSize}
                />
              </TabsContent>
              <TabsContent value="matches" className="mt-4">
                {renderGroupedCandidateTable(
                  candidateMatches,
                  'matches',
                  matchesSearchTerm,
                  setMatchesSearchTerm,
                  matchesSortColumn,
                  matchesSortDirection,
                  true, // showTypeBadge
                  positionId // <-- pass positionId (optional, for consistency)
                )}
                <Pagination
                  currentPage={matchesPage}
                  totalPages={matchesTotalPages}
                  pageSize={matchesPageSize}
                  total={matchesTotal}
                  onPageChange={setMatchesPage}
                  onPageSizeChange={setMatchesPageSize}
                />
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
        <CandidateDetailModal
          candidateId={selectedCandidateId}
          open={isCandidateModalOpen}
          onClose={() => {
            setIsCandidateModalOpen(false);
            setSelectedCandidateId(null);
          }}
        />
      )}
    </div>
  );
}
