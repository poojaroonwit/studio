// src/components/dashboard/DashboardPageClient.tsx
// Dashboard with smart animation control:
// - Animations play only on page refresh/initial load
// - Animations are disabled during SSE updates to prevent distraction
// - Manual refresh button re-enables animations
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Candidate, Position, CandidateStatus, UserProfile } from "@/lib/types";
import { getActiveCandidateStatusesQuery, ACTIVE_CANDIDATE_STATUSES, type CoreCandidateStatus } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CandidateAvatarCompact } from "@/components/ui/candidate-avatar";
import { Users, Briefcase, CheckCircle2, UserPlus, FileWarning, UserRoundSearch, ServerCrash, Loader2, ListChecks, CalendarClock, Users2, BarChart3, AlertTriangle, Clock, Star, Target, Code, CalendarIcon, X, Timer, XCircle, ArrowRight } from "lucide-react";
import { getScoreRangesForChart, formatScoreWithGrade, getScoreColor } from "@/lib/scoreUtils";
import { formatCandidateName, formatCandidateNameWithLang } from "@/lib/candidateUtils";
import { isToday } from 'date-fns';
import parseISO from 'date-fns/parseISO';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signIn, useSession, signOut } from "next-auth/react";
import { CandidatesPerPositionChart } from '@/components/dashboard/CandidatesPerPositionChart';
import { useRouter } from 'next/navigation';
import { toast } from "react-hot-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/candidates/CandidateKanbanView";
import { Pie, Bar, Line } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { NewApplicationsTimeSeriesChart } from './NewApplicationsTimeSeriesChart';
import { SCORE_COLOR_STOPS } from '@/components/ui/score-color';
import { SLAViolationsWidget } from './SLAViolationsWidget';
import { useDynamicHeight } from '@/hooks/use-dynamic-height';
import { PositionDetailDrawer } from '@/components/positions/PositionDetailDrawer';
import { useEnhancedSSE } from '@/hooks/use-enhanced-sse';
import { cn } from '@/lib/utils';
import { hasPermission } from '@/lib/permissions';
import { useChartSetup } from '@/hooks/use-chart-setup';
import { isDataLabelsAvailable } from '@/lib/chartjs-setup';
import { useSharedSSE } from '@/hooks/use-shared-sse';
import { safeFetch, safeAll } from '@/lib/safe-fetch';
import { RealTimeStatus } from './RealTimeStatus';


import '../../app/dashboard/dashboard.css';


interface DashboardPageClientProps {
  initialCandidates: Candidate[];
  initialPositions: Position[];
  initialUsers: UserProfile[]; // Or a simplified version like Pick<UserProfile, 'id' | 'role'>
  initialFetchError?: string;
  authError?: boolean; // Added from server
  permissionError?: boolean; // Added from server
  initialStageIds: Record<string, string | undefined>;
  initialStageNames: Record<string, string>;
}

const BACKLOG_EXCLUSION_STATUSES: CandidateStatus[] = []; // Will be populated with stage IDs
const INTERVIEW_STATUSES: CandidateStatus[] = []; // Will be populated with stage IDs

export default function DashboardPageClient({
  initialCandidates,
  initialPositions,
  initialUsers,
  initialFetchError,
  authError: serverAuthError = false,
  permissionError: serverPermissionError = false,
  initialStageIds,
  initialStageNames,
}: DashboardPageClientProps) {
  // Use stage IDs from props instead of fetching them
  const [stageIds, setStageIds] = useState<Record<string, string | undefined>>(initialStageIds);
  const [stageNames, setStageNames] = useState<Record<string, string>>(initialStageNames);
  
  // State to track if page was just refreshed (for animation control)
  const [isPageRefresh, setIsPageRefresh] = useState(true);
  const [hasSSEUpdated, setHasSSEUpdated] = useState(false);
  
  // State for headcount data with SLA
  const [headcountData, setHeadcountData] = useState<any[]>([]);
  const [headcountLoading, setHeadcountLoading] = useState(false);
  
  // Helper function to safely get stage name
  const getStageName = useCallback((stageId: string | undefined): string | null => {
    if (!stageId) return null;
    return stageNames[stageId] || null;
  }, [stageNames]);
  
  useEffect(() => {
    // Update stage IDs when props change
    setStageIds(initialStageIds);
    setStageNames(initialStageNames);
    
    // Populate status arrays with stage names for comparison
    const hiredStageName = initialStageIds.hired ? initialStageNames[initialStageIds.hired] : null;
    const rejectedStageName = initialStageIds.rejected ? initialStageNames[initialStageIds.rejected] : null;
    const offerExtendedStageName = initialStageIds.offerExtended ? initialStageNames[initialStageIds.offerExtended] : null;
    const interviewScheduledStageName = initialStageIds.interviewScheduled ? initialStageNames[initialStageIds.interviewScheduled] : null;
    const interviewingStageName = initialStageIds.interviewing ? initialStageNames[initialStageIds.interviewing] : null;
    
    if (hiredStageName && rejectedStageName && offerExtendedStageName) {
      BACKLOG_EXCLUSION_STATUSES.length = 0;
      BACKLOG_EXCLUSION_STATUSES.push(hiredStageName, rejectedStageName, offerExtendedStageName);
    }
    if (interviewScheduledStageName && interviewingStageName) {
      INTERVIEW_STATUSES.length = 0;
      INTERVIEW_STATUSES.push(interviewScheduledStageName, interviewingStageName);
    }
  }, [initialStageIds, initialStageNames]);
  
  // Set page refresh state to false after initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageRefresh(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Reset SSE update flag after a period of inactivity
  useEffect(() => {
    if (hasSSEUpdated) {
      const timer = setTimeout(() => {
        setHasSSEUpdated(false);
      }, 30000); // Reset after 30 seconds of no SSE updates
      
      return () => clearTimeout(timer);
    }
  }, [hasSSEUpdated]);
  

  
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const { data: session, status } = useSession();
  const router = useRouter();
  const { height: sharedHeight, elementRef: sharedRef } = useDynamicHeight({
    minHeight: 400,
    maxHeight: 1200
  });
  
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>(initialCandidates || []);
  const [myAssignedCandidates, setMyAssignedCandidates] = useState<Candidate[]>(initialCandidates || []); // For Recruiter, initialCandidates *are* their assigned ones
  const [allPositions, setAllPositions] = useState<Position[]>(initialPositions || []);
  const [allUsers, setAllUsers] = useState<UserProfile[]>(initialUsers || []);
  const [myBacklogCandidates, setMyBacklogCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Client-side loading for subsequent actions if any
  const [fetchError, setFetchError] = useState<string | null>(initialFetchError || null);
  const [authError, setAuthError] = useState(serverAuthError);
  const [permissionError, setPermissionError] = useState(serverPermissionError);
  
  // Position drawer state
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [isPositionDrawerOpen, setIsPositionDrawerOpen] = useState(false);

  // Unassigned candidates pagination state
  const [unassignedPage, setUnassignedPage] = useState(1);
  const [unassignedPageSize] = useState(5); // Keep showing 5 per page as before

  // REMOVED: Permission refresh hook - not needed for normal operation

  // Use the new chart setup hook
  const { chartReady, isLoading: chartLoading, error: chartError } = useChartSetup();
  
  // Fetch stage names when filteredCandidates changes
  useEffect(() => {
    const fetchStageNames = async () => {
      try {
        // Get all unique stage IDs from candidates
        const uniqueStageIds = [...new Set(filteredCandidates.map(c => c.status))];
        if (uniqueStageIds.length > 0) {
          const response = await fetch(`/api/settings/recruitment-stages?ids=${uniqueStageIds.join(',')}`);
          if (response.ok) {
            const stages = await response.json();
            const stageMap: Record<string, string> = {};
            if (Array.isArray(stages)) {
              stages.forEach((stage: { id: string; name: string }) => {
                stageMap[stage.id] = stage.name;
              });
            }
            setStageNames(stageMap);
          }
        }
      } catch (error) {
        console.error('Error fetching stage names:', error);
      }
    };
    
    fetchStageNames();
  }, [filteredCandidates]);
  
  // Placeholder for removed performance monitoring hooks

  // Check permissions for dashboard access - based on actual permissions, not hardcoded roles
  // Allow access if user has any permissions or is authenticated (more permissive)
  const modulePermissions = session?.user?.modulePermissions || [];
  const canViewDashboard = hasPermission(session?.user, 'DASHBOARD_VIEW');
  const canGenerateReports = hasPermission(session?.user, 'REPORTS_GENERATE');

  // Check if user can view all candidates (for conditional rendering)
  const canViewAllCandidates = hasPermission(session?.user, 'CANDIDATES_VIEW');



  // Function to re-fetch data on client if needed (e.g., after an action or for a refresh button)
  const fetchDataClientSide = useCallback(async () => {
    
    if (status !== 'authenticated' || !session?.user?.id) {
      setIsLoading(false);
      return;
    }
    
    // Prevent multiple simultaneous fetches
    if (isLoading) {
      return;
    }
    
    setIsLoading(true);
    setFetchError(null);
    let accumulatedFetchError = "";
    const userRole = undefined as any; // deprecated
    const userId = session.user.id;

    try {
      const fetchOptions = { credentials: 'include' as const, timeoutMs: 10000 };
      const promises = [];
      // Check permissions to determine what data to fetch
      const canViewAllCandidates = hasPermission(session?.user, 'CANDIDATES_VIEW');
      const canViewAllUsers = hasPermission(session?.user, 'USERS_VIEW') ||
                              hasPermission(session?.user, 'USERS_CREATE') ||
                              hasPermission(session?.user, 'USERS_EDIT') ||
                              hasPermission(session?.user, 'USERS_DELETE') ||
                              hasPermission(session?.user, 'USERS_PERMISSIONS_MANAGE');
      
      console.log('Dashboard permissions:', { 
        canViewAllCandidates, 
        userId: session?.user?.id,
        userRole: session?.user?.role,
        permissions: session?.user?.modulePermissions 
      });
      
      if (canViewAllCandidates) {
        promises.push(safeFetch('/api/candidates?limit=100000', fetchOptions));
      } else {
        // User can only see their assigned candidates
        promises.push(safeFetch(`/api/candidates?recruiterId=${userId}&limit=100000`, fetchOptions));
      }
      
      if (canViewAllUsers) {
        promises.push(safeFetch('/api/users', fetchOptions));
      } else {
        promises.push(Promise.resolve({ ok: false, status: null, data: null, error: 'No permission' }));
      }
      
      // For backlog candidates, use the same logic as main candidates
      if (canViewAllCandidates) {
        promises.push(safeFetch('/api/candidates?limit=100000', fetchOptions));
      } else {
        promises.push(safeFetch(`/api/candidates?recruiterId=${userId}&limit=100000`, fetchOptions));
      }
      promises.push(safeFetch('/api/positions', fetchOptions));

      const [candidatesRes, usersRes, myBacklogCandidatesRes, positionsRes] = await safeAll(promises);

      if (!candidatesRes.ok) {
        console.warn('Skipping failed endpoint /api/candidates:', candidatesRes.error || candidatesRes.status);
        accumulatedFetchError += `Failed to fetch candidates: ${candidatesRes.error}. `;
        if (canViewAllCandidates) setFilteredCandidates([]); else setMyAssignedCandidates([]);
      } else if (candidatesRes.data) {
        const candidatesData: Candidate[] = Array.isArray((candidatesRes.data as any)?.data) ? (candidatesRes.data as any).data : (Array.isArray(candidatesRes.data) ? candidatesRes.data : []);
        console.log('Dashboard fetched candidates:', candidatesData.length, 'canViewAllCandidates:', canViewAllCandidates);
        if (canViewAllCandidates) setFilteredCandidates(candidatesData); else setMyAssignedCandidates(candidatesData);
      } else {
        console.warn('No candidates data received from API');
        if (canViewAllCandidates) setFilteredCandidates([]); else setMyAssignedCandidates([]);
      }

      if (!usersRes.ok) { 
        console.warn('Skipping failed endpoint /api/users:', usersRes.error || usersRes.status);
        accumulatedFetchError += `Failed to fetch users: ${usersRes.error}. `;
        setAllUsers([]); 
      }
      else if (usersRes.data) { 
        setAllUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      }

      if (!myBacklogCandidatesRes.ok) { 
        console.warn('Skipping failed endpoint /api/candidates (backlog):', myBacklogCandidatesRes.error || myBacklogCandidatesRes.status);
        accumulatedFetchError += `Failed to fetch backlog candidates: ${myBacklogCandidatesRes.error}. `;
        // On error, safely reset backlog candidates to an empty list
        setMyBacklogCandidates([]);
      }
      else if (myBacklogCandidatesRes.data) {
        const backlogData: Candidate[] = Array.isArray((myBacklogCandidatesRes.data as any)?.data) ? (myBacklogCandidatesRes.data as any).data : (Array.isArray(myBacklogCandidatesRes.data) ? myBacklogCandidatesRes.data : []);
        setMyBacklogCandidates((() => {
          try {
            // Defensive check to prevent filter errors
            if (!Array.isArray(backlogData)) {
              return [];
            }
            
            return backlogData.filter(c => {
              try {
                const statusName = c?.status || '';
                return c && ACTIVE_CANDIDATE_STATUSES.includes(statusName as CoreCandidateStatus);
              } catch (error) {
                return false;
              }
            });
          } catch (error) {
            return [];
          }
        })());
      }

      if (!positionsRes.ok) { 
        console.warn('Skipping failed endpoint /api/positions:', positionsRes.error || positionsRes.status);
        accumulatedFetchError += `Failed to fetch positions: ${positionsRes.error}. `;
        setAllPositions([]); 
      }
      else if (positionsRes.data) { 
        const positionsData = Array.isArray((positionsRes.data as any)?.data) ? (positionsRes.data as any).data : (Array.isArray(positionsRes.data) ? positionsRes.data : []);
        setAllPositions(positionsData);
      }

      if (accumulatedFetchError) setFetchError(accumulatedFetchError.trim());

    } catch (error) {
      const genericMessage = (error as Error).message || "An unexpected error occurred.";
      setFetchError(genericMessage);
      setFilteredCandidates([]); setMyAssignedCandidates([]); setAllPositions([]); setAllUsers([]); setMyBacklogCandidates([]);
    } finally {
      setIsLoading(false);
    }
  }, [status, session?.user?.id, session?.user?.role, modulePermissions, stageIds.hired, stageIds.rejected]);

  // Function to fetch headcount data with SLA information
  const fetchHeadcountData = useCallback(async () => {
    if (status !== 'authenticated' || !session?.user?.id) {
      return;
    }
    
    setHeadcountLoading(true);
    try {
      // Fetch all open positions first
      const positionsRes = await safeFetch('/api/positions?isOpen=true&includeHeadcount=true', { 
        credentials: 'include' as const, 
        timeoutMs: 10000 
      });
      
      if (!positionsRes.ok || !positionsRes.data) {
        console.warn('Failed to fetch positions for headcount data');
        return;
      }
      
      const positions = Array.isArray((positionsRes.data as any)?.data) ? 
        (positionsRes.data as any).data : 
        (Array.isArray(positionsRes.data) ? positionsRes.data : []);
      
      // Fetch headcount data for each position
      const headcountPromises = positions.map(async (position: any) => {
        try {
          const headcountRes = await safeFetch(`/api/headcount?positionId=${position.id}`, { 
            credentials: 'include' as const, 
            timeoutMs: 5000 
          });
          
          if (!headcountRes.ok || !headcountRes.data) {
            return [];
          }
          
          const headcounts = Array.isArray(headcountRes.data) ? headcountRes.data : [];
          
          // Fetch SLA data for each headcount
          const headcountWithSLA = await Promise.all(headcounts.map(async (headcount: any) => {
            try {
              const slaRes = await safeFetch(`/api/headcount/${headcount.id}/sla`, { 
                credentials: 'include' as const, 
                timeoutMs: 5000 
              });
              
              return {
                ...headcount,
                position: position,
                sla: slaRes.ok && slaRes.data ? slaRes.data : null
              };
            } catch (error) {
              console.warn(`Failed to fetch SLA for headcount ${headcount.id}:`, error);
              return {
                ...headcount,
                position: position,
                sla: null
              };
            }
          }));
          
          return headcountWithSLA;
        } catch (error) {
          console.warn(`Failed to fetch headcounts for position ${position.id}:`, error);
          return [];
        }
      });
      
      const allHeadcounts = await Promise.all(headcountPromises);
      const flattenedHeadcounts = allHeadcounts.flat();
      
      setHeadcountData(flattenedHeadcounts);
    } catch (error) {
      console.error('Error fetching headcount data:', error);
    } finally {
      setHeadcountLoading(false);
    }
  }, [status, session?.user?.id]);

  // Helper function to render SLA badge for headcount
  const renderSLABadge = useCallback((sla: any) => {
    if (!sla || !sla.violation) {
      return <div className="text-sm text-muted-foreground">No SLA</div>;
    }

    const { violation } = sla;
    
    if (violation.isViolated) {
      return (
        <Badge variant="destructive" className="text-xs">
          {violation.daysOverdue} days overdue
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="text-xs">
          {violation.daysRemaining} days left
        </Badge>
      );
    }
  }, []);

  // FIXED: Stabilize callback functions to prevent infinite loops and temporal dead zone issues
  const handleCandidateUpdate = useCallback((updatedCandidate: any) => {
    // Refresh dashboard data when candidates are updated
    // Use setTimeout to prevent rapid successive calls
    setTimeout(() => {
      if (status === 'authenticated' && session?.user?.id) {
        fetchDataClientSide();
      }
    }, 100);
  }, [status, session?.user?.id]);

  const handlePositionUpdate = useCallback((updatedPosition: any) => {
    // Refresh dashboard data when positions are updated
    // Use setTimeout to prevent rapid successive calls
    setTimeout(() => {
      if (status === 'authenticated' && session?.user?.id) {
        fetchDataClientSide();
      }
    }, 100);
  }, [status, session?.user?.id]);

  const handleDashboardUpdate = useCallback((dashboardData: any) => {
    // Handle specific dashboard updates
    // Use setTimeout to prevent rapid successive calls
    setTimeout(() => {
      if (status === 'authenticated' && session?.user?.id) {
        if (dashboardData.type === 'metrics') {
          // Refresh all data when metrics update
          fetchDataClientSide();
        } else if (dashboardData.type === 'chart_update') {
          // Handle specific chart updates
          fetchDataClientSide();
        }
      }
    }, 100);
  }, [status, session?.user?.id]);

  const handleNotificationUpdate = useCallback((notification: any) => {
    // Handle dashboard-related notifications
  }, []);

  // Enhanced SSE hook
  const { isConnected: realtimeConnected } = useEnhancedSSE();
  
  // Local EventSource connection status for dashboard
  const [dashboardRealtimeConnected, setDashboardRealtimeConnected] = useState(false);

  useEffect(() => {
    // Handle initial state passed from server component
    setFilteredCandidates(initialCandidates || []);
    
    // Check if user can view all candidates or only their assigned ones
    const canViewAllCandidates = hasPermission(session?.user, 'CANDIDATES_VIEW');
    
    if (!canViewAllCandidates) {
      // User can only see their assigned candidates
      setMyAssignedCandidates(initialCandidates || []);
      setMyBacklogCandidates((initialCandidates || []).filter(c => {
        const statusName = c.status || '';
        return ACTIVE_CANDIDATE_STATUSES.includes(statusName as CoreCandidateStatus);
      }));
    }
    setAllPositions(initialPositions || []);
    setAllUsers(initialUsers || []);
    setFetchError(initialFetchError || null);
    setAuthError(serverAuthError);
    setPermissionError(serverPermissionError);

    if ((status as string) === 'unauthenticated' && !serverAuthError) {
        signIn(undefined, { callbackUrl: window.location.pathname });
    }
    
    // Show error as toast popup if present
    if (initialFetchError) {
      toast.error(initialFetchError);
    }
  }, [initialCandidates, initialPositions, initialUsers, initialFetchError, serverAuthError, serverPermissionError, status, modulePermissions, stageIds.hired, stageIds.rejected]);

  // REMOVED: Automatic permission refresh - this was causing the loop
  // Users can manually refresh permissions if needed using the button in the UI

  // Add error boundary for filter operations
  const safeFilterCandidates = useCallback((candidates: any[], filterFn: (c: any) => boolean) => {
    try {
      if (!Array.isArray(candidates)) {
        console.warn('[DASHBOARD] safeFilterCandidates: candidates is not an array:', candidates);
        return [];
      }
      return candidates.filter(filterFn);
    } catch (error) {
      console.error('[DASHBOARD] Error filtering candidates:', error);
      return [];
    }
  }, []);

  // REMOVED: Manual permission refresh - not needed

  // Fetch data when session is authenticated and initial data is empty
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      // Only fetch if we don't have data already
      const hasData = (initialCandidates && initialCandidates.length > 0) || 
                     (initialPositions && initialPositions.length > 0) || 
                     (initialUsers && initialUsers.length > 0);
      
      if (!hasData) {
        // Use setTimeout to prevent rapid successive calls
        setTimeout(() => {
          fetchDataClientSide();
        }, 100);
      }
    }
  }, [status, session?.user?.id, initialCandidates, initialPositions, initialUsers]);

  // Fetch headcount data when positions are available
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id && allPositions.length > 0) {
      fetchHeadcountData();
    }
  }, [status, session?.user?.id, allPositions.length, fetchHeadcountData]);

  // Use shared SSE connection instead of creating a separate one
  const { isConnected: sseConnected, subscribeToEvents } = useSharedSSE();
  
  useEffect(() => {
    setDashboardRealtimeConnected(sseConnected);
  }, [sseConnected]);

  useEffect(() => {
    let mounted = true;
    let refreshTimeout: NodeJS.Timeout;
    let lastUpdateTime = 0;
    const MIN_UPDATE_INTERVAL = 500; // Minimum 500ms between updates for better real-time experience
    
    // Only subscribe to events if user is authenticated
    if (status !== 'authenticated' || !session?.user?.id) {
      return;
    }
    
    // Subscribe to shared SSE events
    const unsubscribe = subscribeToEvents((event) => {
      if (!mounted) return;
      
      
      // Handle different event types with improved debouncing and rate limiting
      if (event.type === 'candidate_update' || event.type === 'position_update' || event.type === 'dashboard_update') {
        const now = Date.now();
        
        // Special handling for dashboard refresh events
        if (event.type === 'dashboard_update' && event.data?.type === 'refresh') {
          // Mark that SSE has updated data
          setHasSSEUpdated(true);
          
          // Clear existing timeout and set new one to prevent rapid successive calls
          if (refreshTimeout) {
            clearTimeout(refreshTimeout);
          }
          
          refreshTimeout = setTimeout(() => {
            if (mounted && status === 'authenticated' && session?.user?.id) {
              lastUpdateTime = Date.now();
              // Only fetch if we don't have recent data and not currently loading
              if (!isLoading) {
                fetchDataClientSide();
              }
            }
          }, 500); // 500ms debounce for dashboard refresh events
          return;
        }
        
        // Rate limit updates to prevent excessive reloading
        if (now - lastUpdateTime < MIN_UPDATE_INTERVAL) {
          return;
        }
        
        // Mark that SSE has updated data
        setHasSSEUpdated(true);
        
        // Clear existing timeout and set new one to prevent rapid successive calls
        if (refreshTimeout) {
          clearTimeout(refreshTimeout);
        }
        
        refreshTimeout = setTimeout(() => {
          if (mounted && status === 'authenticated' && session?.user?.id) {
            lastUpdateTime = Date.now();
            // Only fetch if we don't have recent data and not currently loading
            if (!isLoading) {
              fetchDataClientSide();
            }
          }
        }, 1000); // 1 second debounce for better performance
      }
    });
    
    return () => {
      mounted = false;
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      unsubscribe();
    };
  }, [status, session?.user?.id, isLoading, subscribeToEvents, fetchDataClientSide]); // Added fetchDataClientSide to dependencies

  // Optimized dashboard computations - combined related calculations to reduce render overhead
  // Note: Dashboard counts may differ from "View All" due to:
  // 1. Limited server-side data (filteredCandidates) vs full API dataset
  // 2. Different filtering logic between client-side and API queries
  // 3. Real-time updates via SSE vs static initial data
  const dashboardStats = useMemo(() => {
    const safeAllCandidates = Array.isArray(filteredCandidates) ? filteredCandidates : [];
    const safeAllPositions = Array.isArray(allPositions) ? allPositions : [];
    const safeAllUsers = Array.isArray(allUsers) ? allUsers : [];
    const safeMyAssignedCandidates = Array.isArray(myAssignedCandidates) ? myAssignedCandidates : [];
    const safeMyBacklogCandidates = Array.isArray(myBacklogCandidates) ? myBacklogCandidates : [];
    
    const now = new Date();
    
  // Combined candidate statistics - use same logic as candidates page
  // Note: This count may differ from API due to limited server-side data
  // The "View All" button will use API for accurate counts
  const totalActiveCandidates = safeAllCandidates.filter((c: Candidate) => {
    // Get the status name from the candidate
    const statusName = c.status || '';
    // Check if the status is in the active candidate statuses array
    return ACTIVE_CANDIDATE_STATUSES.includes(statusName as CoreCandidateStatus);
  }).length;
    
    // Combined position statistics
    const openPositions = safeAllPositions.filter((p: Position) => p.isOpen);
    const totalOpenPositions = openPositions.length;
    
    // Combined monthly statistics - use status names to match API queries
    const hiredThisMonthAdmin = safeAllCandidates.filter((c: Candidate) => {
      const statusName = c.status || '';
      if (statusName !== 'Hired' || !c.applicationDate || typeof c.applicationDate !== 'string') return false;
      try {
        const appDate = parseISO(c.applicationDate);
        return appDate.getMonth() === now.getMonth() && appDate.getFullYear() === now.getFullYear();
      } catch { return false; }
    }).length;
    
    const rejectedThisMonthAdmin = safeAllCandidates.filter((c: Candidate) => {
      const statusName = c.status || '';
      if (statusName !== 'Rejected' || !c.applicationDate || typeof c.applicationDate !== 'string') return false;
      try {
        const appDate = parseISO(c.applicationDate);
        return appDate.getMonth() === now.getMonth() && appDate.getFullYear() === now.getFullYear();
      } catch { return false; }
    }).length;
    
    // Combined recruiter statistics
    const totalActiveRecruiter = safeAllUsers.filter((u: UserProfile) => 
      u.role === 'Recruiter' || 
      (u.modulePermissions || []).includes('CANDIDATES_VIEW') ||
      (u.modulePermissions || []).includes('CANDIDATES_CREATE') ||
      (u.modulePermissions || []).includes('CANDIDATES_EDIT_BASIC') ||
      (u.modulePermissions || []).includes('CANDIDATES_EDIT_SENSITIVE') ||
      (u.modulePermissions || []).includes('CANDIDATES_EDIT_BASIC_OWN') ||
      (u.modulePermissions || []).includes('CANDIDATES_EDIT_SENSITIVE_OWN') ||
      (u.modulePermissions || []).includes('CANDIDATES_EDIT_BASIC_ALL') ||
      (u.modulePermissions || []).includes('CANDIDATES_EDIT_SENSITIVE_ALL')
    ).length;
    
    // Combined today's statistics
    const newCandidatesTodayAdminList = safeAllCandidates.filter((c: Candidate) => {
      try {
        if (!c.applicationDate || typeof c.applicationDate !== 'string') return false;
        return isToday(parseISO(c.applicationDate));
      } catch { return false; }
    });
    
    const openPositionsWithNoCandidates = openPositions.filter((position: Position) => {
      return !safeAllCandidates.some(candidate => candidate.positionId === position.id);
    });
    
    // Combined my candidates statistics - use same logic as candidates page
    const myActiveCandidatesList = safeMyAssignedCandidates.filter((c: Candidate) => {
      const statusName = c.status || '';
      return ACTIVE_CANDIDATE_STATUSES.includes(statusName as CoreCandidateStatus);
    });
    const myCandidatesInInterviewCount = myActiveCandidatesList.filter((c: Candidate) => {
      const statusName = c.status || '';
      return statusName === 'Interview Scheduled' || statusName === 'Interviewing';
    }).length;
    
    const newCandidatesAssignedToMeTodayList = myActiveCandidatesList.filter((c: Candidate) => {
      try {
        if (!c.applicationDate || typeof c.applicationDate !== 'string') return false;
        return isToday(parseISO(c.applicationDate));
      } catch { return false; }
    });
    
    // Combined action items
    const myActionItemsList = safeMyBacklogCandidates.filter((c: Candidate) => {
      try {
        return c && c.recruiterId === session?.user?.id;
      } catch (error) {
        return false;
      }
    });
    
    return {
      totalActiveCandidates,
      totalOpenPositions,
      openPositions,
      hiredThisMonthAdmin,
      rejectedThisMonthAdmin,
      totalActiveRecruiter,
      newCandidatesTodayAdminList,
      openPositionsWithNoCandidates,
      myActiveCandidatesList,
      myCandidatesInInterviewCount,
      newCandidatesAssignedToMeTodayList,
      myActionItemsList
    };
  }, [filteredCandidates, allPositions, allUsers, myAssignedCandidates, myBacklogCandidates, session?.user?.id]);

  // Destructure for backward compatibility
  const {
    totalActiveCandidates,
    totalOpenPositions,
    openPositions,
    hiredThisMonthAdmin,
    rejectedThisMonthAdmin,
    totalActiveRecruiter,
    newCandidatesTodayAdminList,
    openPositionsWithNoCandidates,
    myActiveCandidatesList,
    myCandidatesInInterviewCount,
    newCandidatesAssignedToMeTodayList,
    myActionItemsList
  } = dashboardStats;

  // Derived statistics from processed data
  const candidateScoreRanges = useMemo(() => {
    const safeAllCandidates = Array.isArray(filteredCandidates)? filteredCandidates : [];
    const scoreRanges = getScoreRangesForChart();
    const scoreRangeCounts: { [key: string]: number } = {};
    
    safeAllCandidates.forEach((candidate: Candidate) => {
      const statusName = candidate.status || '';
      if (ACTIVE_CANDIDATE_STATUSES.includes(statusName as CoreCandidateStatus)) {
        scoreRanges.forEach(range => {
          if (typeof candidate.fitScore === 'number' && candidate.fitScore >= range.min && candidate.fitScore <= range.max) {
            scoreRangeCounts[range.label] = (scoreRangeCounts[range.label] || 0) + 1;
          }
        });
      }
    });
    
    return scoreRanges.map(range => ({
      label: range.label,
      count: scoreRangeCounts[range.label] || 0,
      letter: range.letter
    }));
  }, [filteredCandidates]);

      const unassignedCandidatesCount = useMemo(() => {
      const safeAllCandidates = Array.isArray(filteredCandidates)? filteredCandidates : [];
      return safeAllCandidates.filter((c: Candidate) => {
        const statusName = c.status || '';
        return ACTIVE_CANDIDATE_STATUSES.includes(statusName as CoreCandidateStatus) && !c.recruiterId;
      }).length;
    }, [filteredCandidates]);

      const unassignedCandidatesList = useMemo(() => {
      const safeAllCandidates = Array.isArray(filteredCandidates)? filteredCandidates : [];
      return safeAllCandidates.filter((c: Candidate) => {
        const statusName = c.status || '';
        return ACTIVE_CANDIDATE_STATUSES.includes(statusName as CoreCandidateStatus) && !c.recruiterId;
      });
    }, [filteredCandidates]);

    // Paginated unassigned candidates for display
    const paginatedUnassignedCandidates = useMemo(() => {
      const startIndex = (unassignedPage - 1) * unassignedPageSize;
      const endIndex = startIndex + unassignedPageSize;
      return unassignedCandidatesList.slice(startIndex, endIndex);
    }, [unassignedCandidatesList, unassignedPage, unassignedPageSize]);

    // Calculate total pages for unassigned candidates
    const unassignedTotalPages = Math.ceil(unassignedCandidatesList.length / unassignedPageSize);

  // Calculate Average Time to Hire (in days)
      const averageTimeToHire = useMemo(() => {
      const safeAllCandidates = Array.isArray(filteredCandidates)? filteredCandidates : [];
      const hiredCandidates = safeAllCandidates.filter((c: Candidate) => {
        const statusName = c.status || '';
        return statusName === 'Hired' && c.applicationDate && typeof c.applicationDate === 'string';
      });

    if (hiredCandidates.length === 0) return 0;

    const totalDays = hiredCandidates.reduce((total, candidate) => {
      try {
        const applicationDate = parseISO(candidate.applicationDate);
        // Validate application date
        if (!applicationDate || isNaN(applicationDate.getTime())) {
          return total;
        }
        
        // Find the last transition to 'Hired'
        const hiredTransition = candidate.transitionHistory
          .filter(transition => stageIds.hired && transition.stage === stageIds.hired)
          .sort((itemA, itemB) => {
            const dateA = new Date(itemA.date);
            const dateB = new Date(itemB.date);
            // Check if dates are valid before calling getTime()
            if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
              return 0; // If either date is invalid, treat as equal
            }
            return dateB.getTime() - dateA.getTime();
          })[0];
        
        const hireDate = hiredTransition ? parseISO(hiredTransition.date) : null;
        if (!hireDate || isNaN(hireDate.getTime())) return total;
        
        const daysDiff = Math.ceil((hireDate.getTime() - applicationDate.getTime()) / (1000 * 60 * 60 * 24));
        return total + Math.max(0, daysDiff); // Ensure non-negative values
      } catch {
        return total;
      }
    }, 0);

    // Return float with two decimals
    return parseFloat((totalDays / hiredCandidates.length).toFixed(2));
  }, [filteredCandidates]);

      const highPriorityCandidates = useMemo(() => {
      const safeAllCandidates = Array.isArray(filteredCandidates)? filteredCandidates : [];
      return safeAllCandidates.filter((c: Candidate) => {
        // High score calculation should include ALL candidates, not just active ones
        // This matches the API query minAppliedJobFitScore:80 which applies to all candidates
        
        // Use same logic as API: only check c.fitScore from database
        // API normalizes fit scores to 0-100 range, so 80% = 80
        if (typeof c.fitScore !== 'number') return false;
        return c.fitScore >= 80; // 80% threshold
    });
  }, [filteredCandidates]);

  // State for API-based counts to ensure consistency with "View All"
  const [weeklyApplicationsCount, setWeeklyApplicationsCount] = useState<number>(0);
  const [apiActiveCandidatesCount, setApiActiveCandidatesCount] = useState<number>(0);
  const [apiHighScoreCount, setApiHighScoreCount] = useState<number>(0);

  // Fetch API-based counts to ensure consistency with "View All"
  useEffect(() => {
    const fetchApiCounts = async () => {
      if (status !== 'authenticated' || !session?.user?.id) return;
      
      try {
        // Fetch weekly applications count
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const weekQuery = `applicationDateStart:${weekAgo.toISOString().slice(0, 10)}`;
        
        const [weeklyResponse, activeResponse, highScoreResponse] = await Promise.all([
          fetch(`/api/candidates?query=${encodeURIComponent(weekQuery)}&forCounts=true`, {
            credentials: 'include'
          }),
          fetch(`/api/candidates?query=${encodeURIComponent('status:' + getActiveCandidateStatusesQuery())}&forCounts=true`, {
            credentials: 'include'
          }),
          fetch(`/api/candidates?query=${encodeURIComponent('minAppliedJobFitScore:80')}&forCounts=true`, {
            credentials: 'include'
          })
        ]);
        
        if (weeklyResponse.ok) {
          const data = await weeklyResponse.json();
          setWeeklyApplicationsCount(data.total || 0);
        }
        
        if (activeResponse.ok) {
          const data = await activeResponse.json();
          setApiActiveCandidatesCount(data.total || 0);
        }
        
        if (highScoreResponse.ok) {
          const data = await highScoreResponse.json();
          setApiHighScoreCount(data.total || 0);
        }
      } catch (error) {
        console.warn('Failed to fetch API counts:', error);
      }
    };

    fetchApiCounts();
  }, [status, session?.user?.id, hasSSEUpdated]); // Add hasSSEUpdated to trigger API count refresh

  const recentApplications = useMemo(() => {
    // Use the API-fetched count instead of client-side filtering
    return Array(weeklyApplicationsCount).fill(null);
  }, [weeklyApplicationsCount]);

  // Stage summary metrics
  const stageSummary = useMemo(() => {
    const safeAllCandidates = Array.isArray(filteredCandidates)? filteredCandidates : [];
    const stageCounts: { [key: string]: number } = {};
    
    safeAllCandidates.forEach((candidate: Candidate) => {
      const statusName = candidate.status || '';
      if (ACTIVE_CANDIDATE_STATUSES.includes(statusName as CoreCandidateStatus)) {
        const status = candidate.statusId || candidate.status || 'UNKNOWN';
        stageCounts[status] = (stageCounts[status] || 0) + 1;
      }
    });
    
    // Map stage IDs to names for display
    return Object.entries(stageCounts).map(([stageId, count]) => {
      // Use stageNames mapping to get readable names
      const stageName = stageNames[stageId] || stageId; // Fallback to ID if name not found
      
      return {
        stage: stageName,
        stageId: stageId,
        count
      };
    }).sort((itemA, itemB) => itemB.count - itemA.count);
  }, [filteredCandidates, stageIds, stageNames]);

  // New candidates assigned to me today (for recruiter) - optimized
  const newCandidatesAssignedToMeToday = useMemo(() => {
    const safeMyAssignedCandidates = Array.isArray(myAssignedCandidates) ? myAssignedCandidates : [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return safeMyAssignedCandidates.filter((c: Candidate) => {
      if (!c.applicationDate || typeof c.applicationDate !== 'string') return false;
      try {
        const appDate = parseISO(c.applicationDate);
        if (!appDate || isNaN(appDate.getTime())) {
          return false;
        }
        appDate.setHours(0, 0, 0, 0);
        return appDate.getTime() === today.getTime();
      } catch { 
        return false; 
      }
    });
  }, [myAssignedCandidates]);

  // On-process candidates (not in excluded statuses)
      const onProcessCandidates = useMemo(() => {
      const safeAllCandidates = Array.isArray(filteredCandidates)? filteredCandidates : [];
      return safeAllCandidates.filter((c: Candidate) => {
        const statusName = c.status || '';
        return ACTIVE_CANDIDATE_STATUSES.includes(statusName as CoreCandidateStatus);
      });
    }, [filteredCandidates]);

  // Pie chart: On-process by stage
  const onProcessByStage = useMemo(() => {
    const stageCounts: Record<string, number> = {};
    onProcessCandidates.forEach((c) => {
      const sid = c.status || 'UNKNOWN';
      stageCounts[sid] = (stageCounts[sid] || 0) + 1;
    });
    
    // Map stage IDs to names for display
    const stageCountsWithNames: Record<string, number> = {};
    Object.entries(stageCounts).forEach(([stageId, count]) => {
      // Use stageNames mapping to get readable names
      const stageName = stageNames[stageId] || stageId; // Fallback to ID if name not found
      stageCountsWithNames[stageName] = count;
    });
    
    return stageCountsWithNames;
  }, [onProcessCandidates, stageNames]);

  // Bar chart: On-process by recruiter
  const onProcessByRecruiter = useMemo(() => {
    const recruiterCounts: Record<string, number> = {};
    onProcessCandidates.forEach((c) => {
      if (c.recruiterId) {
        recruiterCounts[c.recruiterId] = (recruiterCounts[c.recruiterId] || 0) + 1;
      }
    });
    return recruiterCounts;
  }, [onProcessCandidates]);

  // Map recruiterId to name
  const recruiterIdToName = useMemo(() => {
    const map: Record<string, string> = {};
    const safeAllUsers = Array.isArray(allUsers) ? allUsers : [];
    safeAllUsers.forEach((u) => {
      map[u.id] = u.name || u.email || u.id;
    });
    return map;
  }, [allUsers]);



  // Handle conditional rendering based on status and errors
  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (status === 'unauthenticated') {
    // Check if we're already on the signin page or if a logout is in progress
    const isOnSigninPage = typeof window !== 'undefined' && window.location.pathname === '/auth/signin';
    const isLogoutInProgress = typeof window !== 'undefined' && window.location.search.includes('signout=true');
    
    if (!isOnSigninPage && !isLogoutInProgress) {
      // Redirect to signin page instead of showing message
      router.replace('/auth/signin');
    }
    
    return <div>Redirecting to sign in...</div>;
  }

  // Auto-redirect non-admin users without dashboard permissions to my-tasks
  useEffect(() => {
    if (status === 'authenticated' && session?.user && !canViewDashboard) {
      router.replace('/my-tasks');
    }
  }, [status, session, canViewDashboard, router]);

  if (!canViewDashboard) {
    return <div className="flex items-center justify-center h-screen">Redirecting to My Tasks...</div>;
  }
  // Remove stray closing brace and ensure this is inside a function/component body
  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-4">
        <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Authentication Error</h2>
        <p className="text-muted-foreground mb-4 max-w-md">{fetchError || "You need to be signed in to view the dashboard."}</p>
        <Button onClick={() => signIn(undefined, { callbackUrl: window.location.pathname })} className="btn-hover-primary-gradient">
          Sign In
        </Button>
      </div>
    );
  }

  if (permissionError) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-4">
        <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Permission Issue Detected</h2>
        <p className="text-muted-foreground mb-4 max-w-md">
          {fetchError || "There seems to be an issue with your permissions. This can happen if your role or permissions were recently updated."}
        </p>
        <div className="flex gap-2">
          <Button 
            onClick={() => window.location.reload()} 
            className="btn-hover-primary-gradient"
          >
            Reload Page
          </Button>
          <Button onClick={() => router.push('/')} variant="outline">
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  if (fetchError && !isLoading && initialFetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center">
        <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Data Loading Error</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Could not load dashboard data: {fetchError}
        </p>
        {null}
      </div>
    );
  }

  // Show loading state only for initial load, not for statistics calculations
  if (isLoading && (!filteredCandidates.length && !allPositions.length)) {
    return (
      <div className="flex w-screen items-center justify-center bg-background fixed inset-0 z-50">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // Unified Dashboard - Show all metrics to everyone
  return (
    <div className="p-6">
      <div className="space-y-8">
      {/* Real-time Status Indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-1 bg-gradient-to-b from-blue-500 to-blue-400 rounded-full"></div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
            <p className="text-sm text-muted-foreground mt-1">Real-time recruitment metrics</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {hasSSEUpdated && (
            <div className="flex items-center space-x-2 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live updates active</span>
            </div>
          )}
          <RealTimeStatus onDataUpdate={fetchDataClientSide} />
        </div>
      </div>

            {/* Section 1: Key Statics - Row 1 */}
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-4">
          {[ // Row 1 KPI cards array
            { // This Week's Applications
              title: "This Week's Applications",
              value: recentApplications.length,
              icon: CalendarIcon,
              color: "text-blue-500 dark:text-blue-400",
              bgColor: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50",
              borderColor: "border-blue-200 dark:border-blue-800",
              description: "New candidates this week",
              button: {
                label: "View All",
                onClick: () => {
                  const today = new Date();
                  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                  // Use the same query format as the API call
                  const weekQuery = `applicationDateStart:${weekAgo.toISOString().slice(0, 10)}`;
                  router.push('/applicants?query=' + encodeURIComponent(weekQuery));
                }
              }
            },
            { 
              title: "Hired This Month", 
              value: hiredThisMonthAdmin, 
              icon: CheckCircle2, 
              color: "text-green-500 dark:text-green-400", 
              bgColor: "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50",
              borderColor: "border-green-200 dark:border-green-800",
              description: "Successful placements",
              button: {
                label: "View All",
                onClick: () => {
                  const now = new Date();
                  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                  const hiredQuery = `status:Hired applicationDateStart:${monthStart.toISOString()} applicationDateEnd:${monthEnd.toISOString()}`;
                  router.push('/applicants?query=' + encodeURIComponent(hiredQuery));
                }
              }
            },
            { 
              title: "Rejected This Month", 
              value: rejectedThisMonthAdmin, 
              icon: XCircle, 
              color: "text-red-500 dark:text-red-400", 
              bgColor: "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/50",
              borderColor: "border-red-200 dark:border-red-800",
              description: "Declined candidates",
              button: {
                label: "View All",
                onClick: () => {
                  const now = new Date();
                  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                  const rejectedQuery = `status:Rejected applicationDateStart:${monthStart.toISOString()} applicationDateEnd:${monthEnd.toISOString()}`;
                  router.push('/applicants?query=' + encodeURIComponent(rejectedQuery));
                }
              }
            },
            { 
              title: "Avg Time to Hire", 
              value: averageTimeToHire, 
              icon: Timer, 
              color: "text-teal-500 dark:text-teal-400", 
              bgColor: "bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950/50 dark:to-teal-900/50",
              borderColor: "border-teal-200 dark:border-teal-800",
              description: "Days to hire"
              // No button property for this card
            }
          ].map((stat, index) => (
            <Card 
              key={stat.title} 
              className={`group relative overflow-hidden border-2 ${stat.borderColor} hover:border-opacity-80 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm shadow-lg ${
                isPageRefresh && !hasSSEUpdated ? 'animate-in slide-in-from-bottom-4 fade-in-0' : ''
              }`}
              style={{
                animationDelay: isPageRefresh && !hasSSEUpdated ? `${index * 100}ms` : '0ms'
              }}
            >
              {/* Always show the gradient background as active */}
              <div className={`absolute inset-0 ${stat.bgColor} opacity-100 transition-opacity duration-300`}></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                    {stat.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground/70">{stat.description}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm`}>
                  <stat.icon className={`h-6 w-6 ${stat.color} group-hover:drop-shadow-sm`} />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="flex items-baseline space-x-2 justify-between">
                  <div className="flex items-baseline space-x-2">
                    <div className="text-3xl font-bold text-foreground group-hover:text-foreground transition-colors">
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <span className="text-lg">...</span>
                        </div>
                      ) : (
                        stat.value.toLocaleString()
                      )}
                    </div>
                    {!isLoading && (
                      <div className="text-xs text-muted-foreground">
                        {stat.title === "Hired This Month" || stat.title === "Rejected This Month" ? "this month" : 
                          stat.title === "Avg Time to Hire" ? "days" : "total"}
                      </div>
                    )}
                  </div>
                  {stat.button && (
                    <button 
                      className="text-xs text-muted-foreground transition-colors px-2 py-1.5 rounded-md border border-transparent hover:border-gray-300 hover:bg-muted/40 hover:text-foreground focus:outline-none flex items-center space-x-1 group"
                      onClick={stat.button.onClick}
                    >
                      <span>{stat.button.label}</span>
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Section 2: Recruiter Metrics - Row 2 */}
      <div className="space-y-6">
      
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[ // Row 2 Recruiter cards array
            { 
              title: "Active Candidates", 
              value: apiActiveCandidatesCount > 0 ? apiActiveCandidatesCount : totalActiveCandidates, 
              icon: Users, 
              color: "text-blue-500 dark:text-blue-400", 
              bgColor: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50",
              borderColor: "border-blue-200 dark:border-blue-800",
              description: "On process candidates",
              button: {
                label: "View All",
                onClick: () => router.push('/applicants?query=' + encodeURIComponent('status:' + getActiveCandidateStatusesQuery()))
              }
            },
            { 
              title: "Number of Open Headcount", 
              value: openPositions.length, 
              icon: Briefcase, 
              color: "text-emerald-500 dark:text-emerald-400", 
              bgColor: "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/50",
              borderColor: "border-emerald-200 dark:border-emerald-800",
              description: "Total number of open headcount",
              button: {
                label: "View All",
                onClick: () => router.push('/positions?status=Open')
              }
            },
            { // High Priority
              title: "High Score (80+)",
              value: apiHighScoreCount > 0 ? apiHighScoreCount : highPriorityCandidates.length,
              icon: UserRoundSearch,
              color: "text-yellow-500 dark:text-yellow-400", 
              bgColor: "bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/50 dark:to-yellow-900/50",
              borderColor: "border-yellow-200 dark:border-yellow-800",
              description: "Need attention",
              button: {
                label: "View All",
                onClick: () => {
                  router.push('/applicants?query=' + encodeURIComponent('minAppliedJobFitScore:80'));
                }
              }
            },
            { 
              title: "Unassigned", 
              value: unassignedCandidatesCount, 
              icon: UserRoundSearch, 
              color: "text-orange-500 dark:text-orange-400", 
              bgColor: "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50",
              borderColor: "border-orange-200 dark:border-orange-800",
              description: "Need attention",
              button: {
                label: "View All",
                onClick: () => router.push('/applicants?query=' + encodeURIComponent('recruiterId:unassigned'))
              }
            }
          ].map((stat, index) => (
            <Card 
              key={stat.title} 
              className={`group relative overflow-hidden border-2 ${stat.borderColor} hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm ${
                isPageRefresh && !hasSSEUpdated ? 'animate-in slide-in-from-bottom-4 fade-in-0' : ''
              }`}
              style={{
                animationDelay: isPageRefresh && !hasSSEUpdated ? `${index * 100}ms` : '0ms'
              }}
            >
              <div className={`absolute inset-0 ${stat.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                    {stat.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground/70">{stat.description}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm`}>
                  <stat.icon className={`h-6 w-6 ${stat.color} group-hover:drop-shadow-sm`} />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="flex items-baseline space-x-2 justify-between">
                  <div className="flex items-baseline space-x-2">
                    <div className="text-3xl font-bold text-foreground group-hover:text-foreground transition-colors">
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <span className="text-lg">...</span>
                        </div>
                      ) : (
                        stat.value.toLocaleString(undefined, { minimumFractionDigits: stat.title === "Avg Time to Hire" ? 2 : 0, maximumFractionDigits: stat.title === "Avg Time to Hire" ? 2 : 0 })
                      )}
                    </div>
                    {!isLoading && (
                      <div className="text-xs text-muted-foreground">
                        {stat.title === "Hired This Month" ? "this month" : 
                          stat.title === "Avg Time to Hire" ? "days" : "total"}
                      </div>
                    )}
                  </div>
                  {stat.button && (
                    <button 
                      className="text-xs text-muted-foreground transition-colors px-2 py-1.5 rounded-md border border-transparent hover:border-gray-300 hover:bg-muted/40 hover:text-foreground focus:outline-none flex items-center space-x-1 group"
                      onClick={stat.button.onClick}
                    >
                      <span>{stat.button.label}</span>
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Separator */}
        <div className="border-t border-border/50 my-8"></div>

                 {/* New Applications + Candidate Scoring Analysis + SLA Monitoring Layout */}
         <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-12">
           {/* Left side - 2 rows */}
           <div className="lg:col-span-7 space-y-6">
             {/* Row 1: New Applications Over Time */}
             <div>
               <NewApplicationsTimeSeriesChart 
                 candidates={filteredCandidates} 
                 isLoading={isLoading}
                 dynamicHeight={sharedHeight - 380}
               />
             </div>

             {/* Row 2: Candidate Scoring Analysis */}
             <div>
              <Card className="shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="pb-3">
                                     <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                     <BarChart3 className="h-5 w-5 text-green-500" />
                     Candidate Score Distribution
                   </CardTitle>
                   <CardDescription className="text-muted-foreground/70 text-xs">
                     Distribution by fit score quality
                   </CardDescription>
                </CardHeader>
                <CardContent className="pt-3">
                  {isLoading ? (
                    <div className="h-[200px] flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : chartError ? (
                    <div className="h-[200px] flex items-center justify-center">
                      <div className="text-center space-y-3">
                        <XCircle className="h-8 w-8 text-red-500 mx-auto" />
                        <p className="text-red-500 text-sm">Chart error: {chartError}</p>
                        <Button 
                          onClick={() => window.location.reload()}
                          className="mt-2"
                        >
                          Retry
                        </Button>
                      </div>
                    </div>
                  ) : !chartReady ? (
                    <div className="h-[200px] flex items-center justify-center">
                      <div className="text-center space-y-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="text-muted-foreground">Loading chart...</p>
                      </div>
                    </div>
                  ) : (
                    <Bar
                      data={{
                        labels: (() => {
                          // Sort by grade order: A, B, C, D, E
                          const gradeOrder = ['A', 'B', 'C', 'D', 'E'];
                          return [...candidateScoreRanges].sort((itemA, itemB) => {
                            const aGrade = itemA.letter || itemA.label[0];
                            const bGrade = itemB.letter || itemB.label[0];
                            return gradeOrder.indexOf(aGrade) - gradeOrder.indexOf(bGrade);
                          }).map(r => r.label);
                        })(),
                        datasets: [
                          {
                            label: 'Applicants',
                            data: (() => {
                              // Sort by grade order: A, B, C, D, E
                              const gradeOrder = ['A', 'B', 'C', 'D', 'E'];
                              return [...candidateScoreRanges].sort((itemA, itemB) => {
                                const aGrade = itemA.letter || itemA.label[0];
                                const bGrade = itemB.letter || itemB.label[0];
                                return gradeOrder.indexOf(aGrade) - gradeOrder.indexOf(bGrade);
                              }).map(r => r.count);
                            })(),
                            backgroundColor: [
                              'rgba(163, 230, 53, 0.8)',   // lime-400 (A grade)
                              'rgba(250, 204, 21, 0.8)',   // yellow-400 (B grade)
                              'rgba(254, 240, 138, 0.8)',  // yellow-200 (C grade)
                              'rgba(251, 146, 60, 0.8)',   // orange-400 (D grade)
                              'rgba(248, 113, 113, 0.8)',  // red-400 (E grade)
                            ],
                            borderRadius: 8,
                            borderSkipped: false,
                            barPercentage: 0.7,
                          },
                        ],
                      }}
                      options={{
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          title: { display: false },
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                return ` ${context.parsed.x} candidates`;
                              }
                            }
                          },
                          ...(isDataLabelsAvailable() ? {
                            datalabels: {
                              anchor: 'end',
                              align: 'end',
                              color: '#22223b',
                              font: { weight: 'bold', size: 14 },
                              formatter: function(value) {
                                return value;
                              }
                            }
                          } : {})
                        },
                        onClick: (event, elements) => {
                          if (elements.length > 0) {
                            const index = elements[0].index;
                            // Sort by grade order: A, B, C, D, E
                            const gradeOrder = ['A', 'B', 'C', 'D', 'E'];
                            const sortedScoreRanges = [...candidateScoreRanges].sort((itemA, itemB) => {
                              const aGrade = itemA.letter || itemA.label[0];
                              const bGrade = itemB.letter || itemB.label[0];
                              return gradeOrder.indexOf(aGrade) - gradeOrder.indexOf(bGrade);
                            });
                            const range = sortedScoreRanges[index];
                            if (range) {
                              // Get the original score ranges to find min/max values
                              const scoreRanges = getScoreRangesForChart();
                              const originalRange = scoreRanges.find(r => r.label === range.label);
                              if (originalRange) {
                                const query = `minAppliedJobFitScore:${originalRange.min} maxAppliedJobFitScore:${originalRange.max}`;
                                router.push('/applicants?query=' + encodeURIComponent(query));
                              }
                            }
                          }
                        },
                        scales: {
                          x: {
                            beginAtZero: true,
                            grid: { color: 'rgba(100,116,139,0.1)' },
                            ticks: { color: '#64748b', font: { size: 13 } },
                          },
                          y: {
                            grid: { display: false },
                            ticks: { color: '#64748b', font: { size: 11 } },
                          },
                        },
                      }}
                      height={200}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

                                 {/* Right side - SLA Monitoring (full height) */}
            <div className="lg:col-span-5" ref={sharedRef}>
              <div className="relative space-y-4 overflow-y-auto h-full" >
                <SLAViolationsWidget onDataUpdate={fetchDataClientSide} />
                {!canViewAllCandidates && session?.user?.id && (
                  <SLAViolationsWidget recruiterId={session.user.id} onDataUpdate={fetchDataClientSide} />
                )}
              </div>
            </div>
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-border/50 my-8"></div>

      {/* Section 3: Personal Performance (if user can't view all candidates) */}
      {!canViewAllCandidates && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-1 bg-gradient-to-b from-purple-500 to-purple-400 rounded-full"></div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">My Performance</h2>
                <p className="text-sm text-muted-foreground mt-1">Personal recruitment metrics</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-purple-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-muted-foreground">Personal</span>
            </div>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { 
                title: "Active Candidates", 
                value: myActiveCandidatesList.length, 
                icon: Users, 
                color: "text-purple-600", 
                bgColor: "bg-gradient-to-br from-purple-50 to-purple-100",
                borderColor: "border-purple-200",
                description: "In my pipeline",
                button: {
                  label: "View All",
                  onClick: () => router.push(`/applicants?query=${encodeURIComponent(`recruiterId:${session?.user?.id} status:${getActiveCandidateStatusesQuery()}`)}`)
                }
              },
              { 
                title: "In Interview", 
                value: myCandidatesInInterviewCount, 
                icon: UserRoundSearch, 
                color: "text-indigo-600", 
                bgColor: "bg-gradient-to-br from-indigo-50 to-indigo-100",
                borderColor: "border-indigo-200",
                description: "Currently interviewing",
                button: {
                  label: "View All",
                  onClick: () => router.push(`/applicants?query=${encodeURIComponent(`recruiterId:${session?.user?.id} status:Interview Scheduled,Interviewing`)}`)
                }
              },
              { 
                title: "New Today", 
                value: newCandidatesAssignedToMeTodayList.length, 
                icon: CalendarClock, 
                color: "text-cyan-600", 
                bgColor: "bg-gradient-to-br from-cyan-50 to-cyan-100",
                borderColor: "border-cyan-200",
                description: "Assigned today",
                button: {
                  label: "View All",
                  onClick: () => {
                    const today = new Date();
                    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
                    const query = `recruiterId:${session?.user?.id} applicationDateStart:${todayStart.toISOString()} applicationDateEnd:${todayEnd.toISOString()}`;
                    router.push(`/applicants?query=${encodeURIComponent(query)}`);
                  }
                }
              }
            ].map((stat, index) => (
              <Card 
                key={stat.title} 
                className={`group relative overflow-hidden border-2 ${stat.borderColor} hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-white/50 backdrop-blur-sm ${
                  isPageRefresh && !hasSSEUpdated ? 'animate-in slide-in-from-bottom-4 fade-in-0' : ''
                }`}
                style={{
                  animationDelay: isPageRefresh && !hasSSEUpdated ? `${index * 150}ms` : '0ms'
                }}
              >
                <div className={`absolute inset-0 ${stat.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                      {stat.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground/70">{stat.description}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bgColor} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm`}>
                    <stat.icon className={`h-6 w-6 ${stat.color} group-hover:drop-shadow-sm`} />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="flex items-baseline space-x-2 justify-between">
                    <div className="flex items-baseline space-x-2">
                      <div className="text-3xl font-bold text-foreground group-hover:text-gray-900 transition-colors">
                        {isLoading ? (
                          <div className="flex items-center space-x-2">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="text-lg">...</span>
                          </div>
                        ) : (
                          stat.value.toLocaleString()
                        )}
                      </div>
                      {!isLoading && (
                        <div className="text-xs text-muted-foreground">
                          candidates
                        </div>
                      )}
                    </div>

                  </div>

                </CardContent>
            </Card>
            ))}
                </div>
        </div>
      )}

      {/* Separator
      <div className="border-t border-border/50 my-8"></div> */}

      {/* Section 5: Pipeline Analytics - Charts */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-1 bg-gradient-to-b from-purple-500 to-purple-400 rounded-full"></div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Pipeline Analytics</h2>
              <p className="text-sm text-muted-foreground mt-1">Recruitment pipeline metrics</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 bg-purple-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-muted-foreground">Analytics</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart: On-process by Stage */}
          <Card className={`group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm ${isPageRefresh && !hasSSEUpdated ? 'animate-in slide-in-from-bottom-4' : ''}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardHeader className="relative pb-3">
              <CardTitle className="text-base font-semibold text-foreground group-hover:text-foreground transition-colors">On-Process Candidates by Stage</CardTitle>
              <CardDescription className="text-muted-foreground/70 text-xs">Current pipeline distribution</CardDescription>
              </CardHeader>
            <CardContent className="relative">
              <div className="h-48 flex items-center justify-center">
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : chartError ? (
                  <div className="flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <XCircle className="h-8 w-8 text-red-500 mx-auto" />
                      <p className="text-red-500 text-sm">Chart error: {chartError}</p>
                      <Button 
                        onClick={() => window.location.reload()}
                        className="mt-2"
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                ) : !chartReady ? (
                  <div className="flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="text-muted-foreground">Loading chart...</p>
                    </div>
                  </div>
                ) : (
                  <Bar
                    data={{
                      labels: Object.keys(onProcessByStage),
                      datasets: [
                        {
                          label: 'Applicants',
                          data: Object.values(onProcessByStage),
                          backgroundColor: [
                            'rgba(147, 51, 234, 0.8)',  // purple-600
                            'rgba(59, 130, 246, 0.8)',  // blue-600
                            'rgba(34, 197, 94, 0.8)',   // green-600
                            'rgba(249, 115, 22, 0.8)',  // orange-600
                            'rgba(239, 68, 68, 0.8)',   // red-600
                            'rgba(168, 85, 247, 0.8)',  // violet-600
                            'rgba(236, 72, 153, 0.8)',  // pink-600
                            'rgba(14, 165, 233, 0.8)',  // sky-600
                            'rgba(245, 158, 11, 0.8)',  // amber-600
                            'rgba(16, 185, 129, 0.8)',  // emerald-600
                          ],
                          borderRadius: 8,
                          borderSkipped: false,
                          barPercentage: 0.7,
                          borderColor: 'rgba(147, 51, 234, 0.3)',
                          borderWidth: 1,
                        },
                      ],
                    }}
                    options={{
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleColor: 'white',
                          bodyColor: 'white',
                          borderColor: 'rgba(147, 51, 234, 0.3)',
                          borderWidth: 1,
                        }
                      },
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        x: {
                          grid: { color: 'rgba(100,116,139,0.1)' },
                          ticks: { color: 'rgb(100, 116, 139)', font: { size: 12 } },
                        },
                        y: {
                          beginAtZero: true,
                          grid: { color: 'rgba(100,116,139,0.1)' },
                          ticks: { color: 'rgb(100, 116, 139)', font: { size: 12 } },
                        },
                      },
                    }}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bar Chart: On-process by Recruiter */}
          <Card className={`group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm ${isPageRefresh && !hasSSEUpdated ? 'animate-in slide-in-from-bottom-4' : ''}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardHeader className="relative pb-3">
              <CardTitle className="text-base font-semibold text-foreground group-hover:text-foreground transition-colors">On-Process Candidates by Recruiter</CardTitle>
              <CardDescription className="text-muted-foreground/70 text-xs">Current recruiter workload</CardDescription>
              </CardHeader>
            <CardContent className="relative">
              <div className="h-48 flex items-center justify-center">
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : chartError ? (
                  <div className="flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <XCircle className="h-8 w-8 text-red-500 mx-auto" />
                      <p className="text-red-500 text-sm">Chart error: {chartError}</p>
                      <Button 
                        onClick={() => window.location.reload()}
                        className="mt-2"
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                ) : !chartReady ? (
                  <div className="flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="text-muted-foreground">Loading chart...</p>
                    </div>
                  </div>
                ) : (
                  <Bar
                    data={{
                      labels: Object.keys(onProcessByRecruiter).map((id) => recruiterIdToName[id] || id),
                      datasets: [
                        {
                          label: 'Applicants',
                          data: Object.values(onProcessByRecruiter),
                          backgroundColor: SCORE_COLOR_STOPS.map(stop => stop.bg.replace('bg-', 'rgba(').replace('-400', ', 0.8)')),
                          borderRadius: 8,
                          borderSkipped: false,
                          barPercentage: 0.7,
                          borderColor: 'rgba(147, 51, 234, 0.3)',
                          borderWidth: 1,
                        },
                      ],
                    }}
                    options={{
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleColor: 'white',
                          bodyColor: 'white',
                          borderColor: 'rgba(147, 51, 234, 0.3)',
                          borderWidth: 1,
                        }
                      },
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        x: {
                          grid: { color: 'rgba(100,116,139,0.1)' },
                          ticks: { color: 'rgb(100, 116, 139)', font: { size: 13 } },
                        },
                        y: {
                          beginAtZero: true,
                          grid: { color: 'rgba(100,116,139,0.1)' },
                          ticks: { color: 'rgb(100, 116, 139)', font: { size: 13 } },
                        },
                      },
                    }}
                  />
                )}
              </div>
            </CardContent>
        </Card>
          </div>
        </div>




      {/* Section 5: Unassigned Candidates and Positions Needing Applicants */}
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {/* Unassigned Candidates */}
        <Card className="shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <UserRoundSearch className="mr-2 h-5 w-5 text-orange-500" />
                Unassigned Candidates ({unassignedCandidatesCount})
              </CardTitle>
              <CardDescription>
                Candidates needing recruiter assignment
              </CardDescription>
            </CardHeader>
            <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : unassignedCandidatesList.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied Fit Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUnassignedCandidates.map(candidate => (
                    <TableRow key={candidate.id} className="hover:bg-muted/50">
                      <TableCell>
                        {(() => {
                          const nameInfo = formatCandidateNameWithLang(candidate);
                          return (
                            <Link href={`/applicants/${candidate.id}`} className="flex items-center space-x-3 hover:underline">
                              <CandidateAvatarCompact
                                user={{
                                  id: candidate.id,
                                  name: nameInfo.name,
                                  avatarUrl: candidate.avatarUrl,
                                  email: candidate.email
                                }}
                                size="sm"
                              />
                              <span 
                                className={`font-medium ${nameInfo.fontClass}`}
                                lang={nameInfo.lang}
                              >
                                {nameInfo.name}
                              </span>
                            </Link>
                          );
                        })()}
                      </TableCell>
                      <TableCell>{candidate.position?.title || 'N/A'}</TableCell>
                      <TableCell>
                        <StatusBadge statusId={candidate.statusId} className="capitalize" stageNames={stageNames} />
                      </TableCell>
                      <TableCell className={getScoreColor(candidate.fitScore)}>{formatScoreWithGrade(candidate.fitScore)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
                <p className="text-sm text-muted-foreground">All candidates have been assigned to recruiters!</p>
              </div>
            )}
            {/* Pagination controls for unassigned candidates */}
            {unassignedCandidatesList.length > 0 && unassignedTotalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {((unassignedPage - 1) * unassignedPageSize) + 1} to {Math.min(unassignedPage * unassignedPageSize, unassignedCandidatesList.length)} of {unassignedCandidatesList.length} candidates
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUnassignedPage(prev => Math.max(1, prev - 1))}
                    disabled={unassignedPage === 1}
                  >
                    Previous
                  </Button>
                  {/* Removed numbered page buttons to avoid overwhelming navigation when there are many pages */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUnassignedPage(prev => Math.min(unassignedTotalPages, prev + 1))}
                    disabled={unassignedPage === unassignedTotalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
            </CardContent>
          </Card>

          {/* Headcount with SLA Status */}
          <Card className="shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Briefcase className="mr-2 h-5 w-5 text-blue-500" />
                Headcount Status ({headcountData.length})
              </CardTitle>
              <CardDescription>
                Open headcount grouped by position with SLA information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {headcountLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : headcountData.length > 0 ? (
                <div className="space-y-4">
                  {headcountData.slice(0, 10).map((headcount: any) => (
                    <div key={headcount.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedPositionId(headcount.position.id);
                              setIsPositionDrawerOpen(true);
                            }}
                            className="font-medium hover:underline text-left cursor-pointer hover:text-primary/80 transition-colors"
                          >
                            {headcount.position.title}
                          </button>
                          <Badge variant="outline" className="text-xs">
                            {headcount.position.department}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={headcount.status === 'filled' ? 'default' : 'secondary'}
                            className={`text-xs ${headcount.status === 'filled' ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}`}
                          >
                            {headcount.status === 'filled' ? 'Filled' : 'Vacant'}
                          </Badge>
                          {renderSLABadge(headcount.sla)}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {headcount.position.positionLevel && (
                          <span>Level: {headcount.position.positionLevel}</span>
                        )}
                        {headcount.candidate && (
                          <span className="ml-4">
                            Candidate: {headcount.candidate.name}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
                  <p className="text-sm text-muted-foreground">No headcount data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section 6: Personal Action Items (if user can't view all candidates) */}
      {!canViewAllCandidates && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="h-6 w-1 bg-red-500 rounded-full"></div>
            <h2 className="text-xl font-semibold text-foreground">My Action Items</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-1">
            <Card className="shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <ListChecks className="mr-2 h-5 w-5 text-red-500" />
                  My Action Items ({myActionItemsList.length})
                </CardTitle>
                <CardDescription>Active candidates assigned to you requiring attention.</CardDescription>
                {/* View button for my assigned candidates */}
                <Link href={`/applicants?query=${encodeURIComponent(`recruiterId:${session?.user?.id}`)}`} passHref>
                  <Button variant="outline" size="sm" className="mt-2">View My Candidates</Button>
                </Link>
              </CardHeader>
              <CardContent>
                {myActionItemsList.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Candidate</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Applied Fit Score</TableHead>
                        <TableHead>Applied</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myActionItemsList.slice(0, 5).map(candidate => (
                        <TableRow key={candidate.id} className="hover:bg-muted/50">
                          <TableCell>
                            {(() => {
                              const nameInfo = formatCandidateNameWithLang(candidate);
                              return (
                                <Link href={`/applicants/${candidate.id}`} className="flex items-center space-x-3 hover:underline">
                                  <CandidateAvatarCompact
                                    user={{
                                      id: candidate.id,
                                      name: nameInfo.name,
                                      avatarUrl: candidate.avatarUrl,
                                      email: candidate.email
                                    }}
                                    size="sm"
                                  />
                                  <span 
                                    className={`font-medium ${nameInfo.fontClass}`}
                                    lang={nameInfo.lang}
                                  >
                                    {nameInfo.name}
                                  </span>
                                </Link>
                              );
                            })()}
                          </TableCell>
                          <TableCell>{candidate.position?.title || 'N/A'}</TableCell>
                          <TableCell>
                            <StatusBadge statusId={candidate.statusId} className="capitalize" stageNames={stageNames} />
                          </TableCell>
                          <TableCell className={getScoreColor(candidate.fitScore)}>{formatScoreWithGrade(candidate.fitScore)}</TableCell>
                          <TableCell>{candidate.applicationDate ? new Date(candidate.applicationDate).toLocaleDateString() : 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
                    <p className="text-sm text-muted-foreground">Your backlog is clear!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {newCandidatesAssignedToMeTodayList.length > 0 && (
              <Card className="shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <UserPlus className="mr-2 h-5 w-5 text-red-500" /> 
                    New Candidates Assigned Today ({newCandidatesAssignedToMeTodayList.length})
                  </CardTitle>
                  <CardDescription>Candidates assigned to you that applied today.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Candidate</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Applied Fit Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {newCandidatesAssignedToMeTodayList.slice(0, 5).map(candidate => (
                        <TableRow key={candidate.id} className="hover:bg-muted/50">
                          <TableCell>
                            {(() => {
                              const nameInfo = formatCandidateNameWithLang(candidate);
                              return (
                                <Link href={`/applicants/${candidate.id}`} className="flex items-center space-x-3 hover:underline">
                                  <CandidateAvatarCompact
                                    user={{
                                      id: candidate.id,
                                      name: nameInfo.name,
                                      avatarUrl: candidate.avatarUrl,
                                      email: candidate.email
                                    }}
                                    size="sm"
                                  />
                                  <span 
                                    className={`font-medium ${nameInfo.fontClass}`}
                                    lang={nameInfo.lang}
                                  >
                                    {nameInfo.name}
                                  </span>
                                </Link>
                              );
                            })()}
                          </TableCell>
                          <TableCell>{candidate.position?.title || 'N/A'}</TableCell>
                          <TableCell>
                            <StatusBadge statusId={candidate.statusId} className="capitalize" stageNames={stageNames} />
                          </TableCell>
                          <TableCell>{formatScoreWithGrade(candidate.fitScore)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
      
      {/* Position Detail Drawer */}
      <PositionDetailDrawer
        isOpen={isPositionDrawerOpen}
        onOpenChange={(open) => {
          setIsPositionDrawerOpen(open);
          if (!open) {
            setSelectedPositionId(null);
          }
        }}
        positionId={selectedPositionId}
      />
      </div>
    </div>
  );
}