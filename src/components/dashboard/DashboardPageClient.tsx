// src/components/dashboard/DashboardPageClient.tsx
// Dashboard with smart animation control:
// - Animations play only on page refresh/initial load
// - Animations are disabled during SSE updates to prevent distraction
// - Manual refresh button re-enables animations
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Applicant, Position, ApplicantStatus, UserProfile } from "@/lib/types";
import { getActiveApplicantStatusesQuery, ACTIVE_APPLICANT_STATUSES, type CoreApplicantStatus } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ApplicantAvatarCompact } from "@/components/ui/applicant-avatar";
import { Users, Briefcase, CheckCircle2, UserPlus, FileWarning, UserRoundSearch, ServerCrash, Loader2, ListChecks, CalendarClock, Users2, BarChart3, AlertTriangle, Clock, Star, Target, Code, CalendarIcon, X, Timer, XCircle, ArrowRight } from "lucide-react";
import { getScoreRangesForChart, formatScoreWithGrade, getScoreColor } from "@/lib/scoreUtils";
import { formatApplicantName, formatApplicantNameWithLang } from "@/lib/applicantUtils";
import { isToday } from 'date-fns';
import parseISO from 'date-fns/parseISO';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signIn, useSession, signOut } from "next-auth/react";
import { ApplicantsPerPositionChart } from '@/components/dashboard/ApplicantsPerPositionChart';
import { CandidateScoreDistributionChart } from '@/components/dashboard/CandidateScoreDistributionChart';
import { useRouter } from 'next/navigation';
import { toast } from "react-hot-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/applicants/ApplicantKanbanView";
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


export interface DashboardMetrics {
  kpis: {
    activeApplicants: number;
    openHeadcounts: number;
    hiredThisMonth: number;
    rejectedThisMonth: number;
    highScoreApplicants: number;
    applicationsThisWeek: number;
    avgTimeToHire: string;
  };
  timeSeries: { date: string; count: number }[];
  scoreDistribution: { range: string; count: number }[];
  pipelineStages: { stage: string; count: number }[];
  pipelineRecruiters: { recruiter: string; count: number }[];
}

const DEFAULT_METRICS: DashboardMetrics = {
  kpis: {
    activeApplicants: 0,
    openHeadcounts: 0,
    hiredThisMonth: 0,
    rejectedThisMonth: 0,
    highScoreApplicants: 0,
    applicationsThisWeek: 0,
    avgTimeToHire: '0.00'
  },
  timeSeries: [],
  scoreDistribution: [],
  pipelineStages: [],
  pipelineRecruiters: []
};

interface DashboardPageClientProps {
  initialApplicants: Applicant[];
  initialPositions: Position[];
  initialUsers: UserProfile[]; // Or a simplified version like Pick<UserProfile, 'id' | 'role'>
  initialMetrics: DashboardMetrics;
  initialFetchError?: string;
  authError?: boolean; // Added from server
  permissionError?: boolean; // Added from server
  initialStageIds: Record<string, string | undefined>;
  initialStageNames: Record<string, string>;
}

const BACKLOG_EXCLUSION_STATUSES: ApplicantStatus[] = []; // Will be populated with stage IDs
const INTERVIEW_STATUSES: ApplicantStatus[] = []; // Will be populated with stage IDs

export default function DashboardPageClient({
  initialApplicants,
  initialPositions,
  initialUsers,
  initialMetrics,
  initialFetchError,
  authError: serverAuthError = false,
  permissionError: serverPermissionError = false,
  initialStageIds,
  initialStageNames,
}: DashboardPageClientProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics || DEFAULT_METRICS);
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

  const [filteredApplicants, setFilteredApplicants] = useState<Applicant[]>(initialApplicants || []);
  const [myAssignedApplicants, setMyAssignedApplicants] = useState<Applicant[]>(initialApplicants || []); // For Recruiter, initialApplicants *are* their assigned ones
  const [allPositions, setAllPositions] = useState<Position[]>(initialPositions || []);
  const [allUsers, setAllUsers] = useState<UserProfile[]>(initialUsers || []);
  const [myBacklogApplicants, setMyBacklogApplicants] = useState<Applicant[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Client-side loading for subsequent actions if any
  const [fetchError, setFetchError] = useState<string | null>(initialFetchError || null);
  const [authError, setAuthError] = useState(serverAuthError);
  const [permissionError, setPermissionError] = useState(serverPermissionError);

  // Position drawer state
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [isPositionDrawerOpen, setIsPositionDrawerOpen] = useState(false);

  // Unassigned Applicants pagination state
  const [unassignedPage, setUnassignedPage] = useState(1);
  const [unassignedPageSize] = useState(5); // Keep showing 5 per page as before

  // REMOVED: Permission refresh hook - not needed for normal operation

  // Use the new chart setup hook
  const { chartReady, isLoading: chartLoading, error: chartError } = useChartSetup();

  // Fetch stage names when filteredApplicants changes
  useEffect(() => {
    const fetchStageNames = async () => {
      try {
        // Get all unique stage IDs from Applicants
        const uniqueStageIds = [...new Set(filteredApplicants.map(c => c.status))];
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
  }, [filteredApplicants]);

  // Placeholder for removed performance monitoring hooks

  // Check permissions for dashboard access - based on actual permissions, not hardcoded roles
  // Allow access if user has any permissions or is authenticated (more permissive)
  const modulePermissions = session?.user?.modulePermissions || [];
  const canViewDashboard = hasPermission(session?.user, 'DASHBOARD_VIEW');
  const canGenerateReports = hasPermission(session?.user, 'REPORTS_GENERATE');

  // Check if user can view all Applicants (for conditional rendering)
  const canViewAllApplicants = hasPermission(session?.user, 'Applicants_VIEW');



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
    // userRole removed - no longer needed
    const userId = session.user.id;

    try {
      const fetchOptions = { credentials: 'include' as const, timeoutMs: 10000 };
      const promises = [];
      // Check permissions to determine what data to fetch
      const canViewAllApplicants = hasPermission(session?.user, 'Applicants_VIEW');
      const canViewAllUsers = hasPermission(session?.user, 'USERS_VIEW') ||
        hasPermission(session?.user, 'USERS_CREATE') ||
        hasPermission(session?.user, 'USERS_EDIT') ||
        hasPermission(session?.user, 'USERS_DELETE') ||
        hasPermission(session?.user, 'USERS_PERMISSIONS_MANAGE');

      // Debug: Dashboard permissions check (remove in production if not needed)

      if (canViewAllApplicants) {
        promises.push(safeFetch('/api/applicants?limit=200', fetchOptions));
      } else {
        // User can only see their assigned Applicants
        promises.push(safeFetch(`/api/applicants?recruiterId=${userId}&limit=200`, fetchOptions));
      }

      if (canViewAllUsers) {
        promises.push(safeFetch('/api/users', fetchOptions));
      } else {
        promises.push(Promise.resolve({ ok: false, status: null, data: null, error: 'No permission' }));
      }

      // Positions are always needed
      promises.push(safeFetch('/api/positions', fetchOptions));

      // Metrics are now central
      promises.push(safeFetch('/api/dashboard/metrics', fetchOptions));

      const [ApplicantsRes, usersRes, positionsRes, metricsRes] = await safeAll(promises);

      if (!ApplicantsRes.ok) {
        console.warn('Skipping failed endpoint /api/applicants:', ApplicantsRes.error || ApplicantsRes.status);
        accumulatedFetchError += `Failed to fetch Applicants: ${ApplicantsRes.error}. `;
        if (canViewAllApplicants) setFilteredApplicants([]); else setMyAssignedApplicants([]);
      } else if (ApplicantsRes.data) {
        const ApplicantsData: Applicant[] = Array.isArray((ApplicantsRes.data as any)?.data) ? (ApplicantsRes.data as any).data : (Array.isArray(ApplicantsRes.data) ? ApplicantsRes.data : []);
        
        const backlogData = ApplicantsData.filter((c: Applicant) => {
          const statusName = c?.statusId ? stageNames[c.statusId] : (c?.status || '');
          return c && ACTIVE_APPLICANT_STATUSES.includes(statusName as CoreApplicantStatus);
        });

        if (canViewAllApplicants) {
          setFilteredApplicants(ApplicantsData);
          setMyAssignedApplicants(ApplicantsData); 
          setMyBacklogApplicants(backlogData); 
        } else {
          setMyAssignedApplicants(ApplicantsData);
          setMyBacklogApplicants(backlogData);
        }
      }

      if (!usersRes.ok) {
        if (canViewAllUsers) {
          console.warn('Skipping failed endpoint /api/users:', usersRes.error || usersRes.status);
          accumulatedFetchError += `Failed to fetch users: ${usersRes.error}. `;
        }
        setAllUsers([]);
      } else if (usersRes.data) {
        setAllUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      }

      if (!positionsRes.ok) {
        console.warn('Skipping failed endpoint /api/positions:', positionsRes.error || positionsRes.status);
        accumulatedFetchError += `Failed to fetch positions: ${positionsRes.error}. `;
        setAllPositions([]);
      } else if (positionsRes.data) {
        const positionsData = Array.isArray((positionsRes.data as any)?.data) ? (positionsRes.data as any).data : (Array.isArray(positionsRes.data) ? positionsRes.data : []);
        setAllPositions(positionsData);
      }

      if (metricsRes.ok && metricsRes.data) {
        setMetrics(metricsRes.data as DashboardMetrics);
      } else if (!metricsRes.ok) {
        console.warn('Failed to fetch optimized metrics:', metricsRes.error);
      }

      if (accumulatedFetchError) setFetchError(accumulatedFetchError.trim());

    } catch (error) {
      const genericMessage = (error as Error).message || "An unexpected error occurred.";
      setFetchError(genericMessage);
      setFilteredApplicants([]); setMyAssignedApplicants([]); setAllPositions([]); setAllUsers([]); setMyBacklogApplicants([]);
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
      // Use the new optimized endpoint
      const headcountRes = await safeFetch('/api/dashboard/headcount-summary', {
        credentials: 'include' as const,
        timeoutMs: 15000
      });

      if (!headcountRes.ok || !headcountRes.data) {
        console.warn('Failed to fetch headcount summary');
        setHeadcountData([]);
        return;
      }

      setHeadcountData(Array.isArray(headcountRes.data) ? headcountRes.data : []);
    } catch (error) {
      console.error('Error fetching headcount data:', error);
      setHeadcountData([]);
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
  const handleApplicantUpdate = useCallback((updatedapplicant: any) => {
    // Refresh dashboard data when Applicants are updated
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
    setFilteredApplicants(initialApplicants || []);

    // Check if user can view all Applicants or only their assigned ones
    const canViewAllApplicants = hasPermission(session?.user, 'Applicants_VIEW');

    if (!canViewAllApplicants) {
      // User can only see their assigned Applicants
      setMyAssignedApplicants(initialApplicants || []);
      setMyAssignedApplicants(initialApplicants || []);
      setMyBacklogApplicants((initialApplicants || []).filter((c: Applicant) => {
        const statusName = c.statusId ? stageNames[c.statusId] : (c.status || '');
        return ACTIVE_APPLICANT_STATUSES.includes(statusName as CoreApplicantStatus);
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
  }, [initialApplicants, initialPositions, initialUsers, initialFetchError, serverAuthError, serverPermissionError, status, modulePermissions, stageIds.hired, stageIds.rejected]);

  // REMOVED: Automatic permission refresh - this was causing the loop
  // Users can manually refresh permissions if needed using the button in the UI

  // Add error boundary for filter operations
  const safeFilterApplicants = useCallback((Applicants: any[], filterFn: (c: any) => boolean) => {
    try {
      if (!Array.isArray(Applicants)) {
        console.warn('[DASHBOARD] safeFilterApplicants: Applicants is not an array:', Applicants);
        return [];
      }
      return Applicants.filter(filterFn);
    } catch (error) {
      console.error('[DASHBOARD] Error filtering Applicants:', error);
      return [];
    }
  }, []);

  // REMOVED: Manual permission refresh - not needed

  // Fetch data when session is authenticated and initial data is missing
  useEffect(() => {
    // Flag to avoid multiple initial fetches
    let isInitialMount = true;

    if (status === 'authenticated' && session?.user?.id && isInitialMount) {
      // ONLY fetch if we REALLY don't have data from server
      const hasInitialData = (initialApplicants && initialApplicants.length > 0) || 
                            (initialPositions && initialPositions.length > 0);
      
      if (!hasInitialData) {
        fetchDataClientSide();
      }
      isInitialMount = false;
    }
  }, [status, session?.user?.id, initialApplicants, initialPositions]);

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
      if (event.type === 'Applicant_update' || event.type === 'position_update' || event.type === 'dashboard_update') {
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
  // 1. Limited server-side data (filteredApplicants) vs full API dataset
  // 2. Different filtering logic between client-side and API queries
  // 3. Real-time updates via SSE vs static initial data
  const dashboardStats = useMemo(() => {
    const safeAllApplicants = Array.isArray(filteredApplicants) ? filteredApplicants : [];
    const safeAllPositions = Array.isArray(allPositions) ? allPositions : [];
    const safeAllUsers = Array.isArray(allUsers) ? allUsers : [];
    const safeMyAssignedApplicants = Array.isArray(myAssignedApplicants) ? myAssignedApplicants : [];
    const safeMyBacklogApplicants = Array.isArray(myBacklogApplicants) ? myBacklogApplicants : [];

    const now = new Date();

    // Use pre-calculated metrics for high-level statistics with safety fallbacks
    const totalActiveApplicants = metrics?.kpis?.activeApplicants ?? 0;
    const hiredThisMonthAdmin = metrics?.kpis?.hiredThisMonth ?? 0;
    const rejectedThisMonthAdmin = metrics?.kpis?.rejectedThisMonth ?? 0;

    // Combined position statistics
    const openPositions = safeAllPositions.filter((p: Position) => p.isOpen);
    const totalOpenPositions = metrics?.kpis?.openHeadcounts ?? 0; // preferring the headcount count

    // Combined recruiter statistics
    const totalActiveRecruiter = (metrics?.pipelineRecruiters || []).length;

    // Combined today's statistics
    const newApplicantsTodayAdminList = safeAllApplicants.filter((c: Applicant) => {
      try {
        if (!c.applicationDate || typeof c.applicationDate !== 'string') return false;
        return isToday(parseISO(c.applicationDate));
      } catch { return false; }
    });

    const openPositionsWithNoApplicants = openPositions.filter((position: Position) => {
      return !safeAllApplicants.some(app => app.positionId === position.id);
    });

    // Combined my Applicants statistics - still need some filtering for UI lists
    const myActiveApplicantsList = safeMyAssignedApplicants.filter((c: Applicant) => {
      const statusName = c.status || '';
      return ACTIVE_APPLICANT_STATUSES.includes(statusName as CoreApplicantStatus);
    });
    
    // Use metrics for this if possible, but keep list-based count for UI consistency in my Applicants section
    const myApplicantsInInterviewCount = myActiveApplicantsList.filter((c: Applicant) => {
      const statusName = c.status || '';
      return statusName === 'Interview Scheduled' || statusName === 'Interviewing';
    }).length;

    const newApplicantsAssignedToMeTodayList = myActiveApplicantsList.filter((c: Applicant) => {
      try {
        if (!c.applicationDate || typeof c.applicationDate !== 'string') return false;
        return isToday(parseISO(c.applicationDate));
      } catch { return false; }
    });

    const myActionItemsList = safeMyBacklogApplicants.filter((c: Applicant) => {
      return c && c.recruiterId === session?.user?.id;
    });

    return {
      totalActiveApplicants,
      totalOpenPositions,
      openPositions,
      hiredThisMonthAdmin,
      rejectedThisMonthAdmin,
      totalActiveRecruiter,
      newApplicantsTodayAdminList,
      openPositionsWithNoApplicants,
      myActiveApplicantsList,
      myApplicantsInInterviewCount,
      newApplicantsAssignedToMeTodayList,
      myActionItemsList
    };
  }, [filteredApplicants, allPositions, allUsers, myAssignedApplicants, myBacklogApplicants, session?.user?.id]);

  // Destructure for backward compatibility
  const {
    totalActiveApplicants,
    totalOpenPositions,
    openPositions,
    hiredThisMonthAdmin,
    rejectedThisMonthAdmin,
    totalActiveRecruiter,
    newApplicantsTodayAdminList,
    openPositionsWithNoApplicants,
    myActiveApplicantsList,
    myApplicantsInInterviewCount,
    newApplicantsAssignedToMeTodayList,
    myActionItemsList
  } = dashboardStats;

  // Derived statistics from processed data
  const ApplicantscoreRanges = useMemo(() => {
    return (metrics?.scoreDistribution || []).map(item => ({
      label: item.range,
      count: item.count,
      letter: item.range.charAt(0)
    }));
  }, [metrics?.scoreDistribution]);

  const unassignedApplicantsCount = useMemo(() => {
    const safeAllApplicants = Array.isArray(filteredApplicants) ? filteredApplicants : [];
    return safeAllApplicants.filter((c: Applicant) => {
      const statusName = c.status || '';
      return ACTIVE_APPLICANT_STATUSES.includes(statusName as CoreApplicantStatus) && !c.recruiterId;
    }).length;
  }, [filteredApplicants]);

  const unassignedApplicantsList = useMemo(() => {
    const safeAllApplicants = Array.isArray(filteredApplicants) ? filteredApplicants : [];
    return safeAllApplicants.filter((c: Applicant) => {
      const statusName = c.status || '';
      return ACTIVE_APPLICANT_STATUSES.includes(statusName as CoreApplicantStatus) && !c.recruiterId;
    });
  }, [filteredApplicants]);

  // Paginated unassigned Applicants for display
  const paginatedUnassignedApplicants = useMemo(() => {
    const startIndex = (unassignedPage - 1) * unassignedPageSize;
    const endIndex = startIndex + unassignedPageSize;
    return unassignedApplicantsList.slice(startIndex, endIndex);
  }, [unassignedApplicantsList, unassignedPage, unassignedPageSize]);

  // Calculate total pages for unassigned Applicants
  const unassignedTotalPages = Math.ceil(unassignedApplicantsList.length / unassignedPageSize);

  // Calculate Average Time to Hire (in days)
  const averageTimeToHire = useMemo(() => {
    const safeAllApplicants = Array.isArray(filteredApplicants) ? filteredApplicants : [];
    const hiredApplicants = safeAllApplicants.filter((c: Applicant) => {
      const statusName = c.status || '';
      return statusName === 'Hired' && c.applicationDate && typeof c.applicationDate === 'string';
    });

    if (hiredApplicants.length === 0) return 0;

    const totalDays = hiredApplicants.reduce((total, app) => {
      try {
        const applicationDate = parseISO(app.applicationDate);
        // Validate application date
        if (!applicationDate || isNaN(applicationDate.getTime())) {
          return total;
        }

        // Find the last transition to 'Hired'
        const hiredTransition = app.transitionHistory
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
    return parseFloat((totalDays / hiredApplicants.length).toFixed(2));
  }, [filteredApplicants]);

  const highPriorityApplicants = useMemo(() => {
    const safeAllApplicants = Array.isArray(filteredApplicants) ? filteredApplicants : [];
    return safeAllApplicants.filter((c: Applicant) => {
      // High score calculation should include ALL Applicants, not just active ones
      // This matches the API query minAppliedJobFitScore:80 which applies to all Applicants

      // Use same logic as API: only check c.fitScore from database
      // API normalizes fit scores to 0-100 range, so 80% = 80
      if (typeof c.fitScore !== 'number') return false;
      return c.fitScore >= 80; // 80% threshold
    });
  }, [filteredApplicants]);

  const recentApplications = useMemo(() => {
    // Fill with pre-calculated count for the badge/indicator
    const count = metrics?.kpis?.applicationsThisWeek ?? 0;
    return Array(count).fill(null);
  }, [metrics?.kpis?.applicationsThisWeek]);

  // New Applicants assigned to me today (for recruiter) - optimized
  const newApplicantsAssignedToMeToday = useMemo(() => {
    const safeMyAssignedApplicants = Array.isArray(myAssignedApplicants) ? myAssignedApplicants : [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return safeMyAssignedApplicants.filter((c: Applicant) => {
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
  }, [myAssignedApplicants]);

  // On-process Applicants filtered list (for UI components that need actual Applicant objects)
  const onProcessApplicants = useMemo(() => {
    const safeAllApplicants = Array.isArray(filteredApplicants) ? filteredApplicants : [];
    return safeAllApplicants.filter((c: Applicant) => {
      const statusName = c.status || '';
      return ACTIVE_APPLICANT_STATUSES.includes(statusName as CoreApplicantStatus);
    });
  }, [filteredApplicants]);

  // Consolidated Pipeline Data from Metrics
  const stageSummary = useMemo(() => {
    return (metrics?.pipelineStages || []).map(item => ({
      stage: item.stage,
      stageId: item.stage, // Using stage name as ID for compatibility
      count: item.count
    }));
  }, [metrics?.pipelineStages]);

  const onProcessByStage = useMemo(() => {
    const counts: Record<string, number> = {};
    (metrics?.pipelineStages || []).forEach(item => {
      counts[item.stage] = item.count;
    });
    return counts;
  }, [metrics?.pipelineStages]);

  const onProcessByRecruiter = useMemo(() => {
    const counts: Record<string, number> = {};
    (metrics?.pipelineRecruiters || []).forEach(item => {
      counts[item.recruiter] = item.count;
    });
    return counts;
  }, [metrics?.pipelineRecruiters]);



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

  if (!canViewDashboard) {
    // Determine the best fallback route based on permissions
    const canAccessMyTasks = hasPermission(session?.user, 'TASK_BOARD_MANAGE_OWN') ||
      hasPermission(session?.user, 'TASK_BOARD_VIEW') ||
      hasPermission(session?.user, 'Applicants_VIEW');
    const canViewPositions = hasPermission(session?.user, 'POSITIONS_VIEW');

    let redirectTo = '/applicants'; // Default fallback
    if (canAccessMyTasks) {
      redirectTo = '/my-tasks';
    } else if (canViewPositions) {
      redirectTo = '/positions';
    }

    // Use setTimeout to perform redirect after render
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        router.replace(redirectTo);
      }, 0);
    }

    return (
      <div className="flex flex-col items-center justify-center h-screen gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Redirecting to {redirectTo === '/my-tasks' ? 'My Tasks' : redirectTo === '/positions' ? 'Positions' : 'Applicants'}...</p>
      </div>
    );
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
  if (isLoading && (!filteredApplicants.length && !allPositions.length)) {
    return (
      <div className="flex w-screen items-center justify-center bg-background fixed inset-0 z-50">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // Unified Dashboard - Show all metrics to everyone
  return (
    <div className="p-3 sm:p-4 md:p-6 bg-secondary/50">
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        {/* Real-time Status Indicator */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="h-6 sm:h-8 w-1 bg-gradient-to-b from-blue-500 to-blue-400 rounded-full"></div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Dashboard</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">Real-time recruitment metrics</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
            <RealTimeStatus onDataUpdate={fetchDataClientSide} />
          </div>
        </div>

        {/* Section 1: Key Statics - Row 1 */}
        <div className="space-y-4 sm:space-y-6">
          <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[ // Row 1 KPI cards array
              { // This Week's Applications
                title: "This Week's Applications",
                value: recentApplications.length,
                icon: CalendarIcon,
                color: "text-blue-500 dark:text-blue-400",
                bgColor: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50",
                borderColor: "border-blue-200 dark:border-blue-800",
                description: "New Applicants this week",
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
                description: "Declined Applicants",
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
              }
            ].map((stat, index) => (
              <Card
                key={stat.title}
                className={`group relative overflow-hidden border-2 ${stat.borderColor} hover:border-opacity-80 transition-all duration-300 hover:shadow-2xl sm:hover:-translate-y-2 bg-card/50 backdrop-blur-sm shadow-lg ${index === 0 ? 'sm:col-span-2 lg:col-span-2' : ''
                  } ${isPageRefresh && !hasSSEUpdated ? 'animate-in slide-in-from-bottom-4 fade-in-0' : ''
                  }`}
                style={{
                  animationDelay: isPageRefresh && !hasSSEUpdated ? `${index * 100}ms` : '0ms'
                }}
              >
                {/* Always show the gradient background as active */}
                <div className={`absolute inset-0 ${stat.bgColor} opacity-100 transition-opacity duration-300`}></div>
                <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3">
                  <div className="space-y-0.5 sm:space-y-1">
                    <CardTitle className="text-xs sm:text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                      {stat.title}
                    </CardTitle>
                    <p className="text-[10px] sm:text-xs text-muted-foreground/70">{stat.description}</p>
                  </div>
                  <div className={`p-2 sm:p-3 rounded-xl ${stat.bgColor} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm`}>
                    <stat.icon className={`h-4 w-4 sm:h-6 sm:w-6 ${stat.color} group-hover:drop-shadow-sm`} />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="flex items-baseline space-x-1 sm:space-x-2 justify-between">
                    <div className="flex items-baseline space-x-1 sm:space-x-2">
                      <div className="text-2xl sm:text-3xl font-bold text-foreground group-hover:text-foreground transition-colors">
                        {isLoading ? (
                          <div className="flex items-center space-x-1 sm:space-x-2">
                            <Loader2 className="h-4 w-4 sm:h-6 sm:w-6 animate-spin text-primary" />
                            <span className="text-sm sm:text-lg">...</span>
                          </div>
                        ) : (
                          stat.value.toLocaleString()
                        )}
                      </div>
                      {!isLoading && (
                        <div className="text-[10px] sm:text-xs text-muted-foreground">
                          {stat.title === "Hired This Month" || stat.title === "Rejected This Month" ? "this month" :
                            stat.title === "Avg Time to Hire" ? (Math.abs(stat.value - 1) < 0.01 ? "day" : "days") : "total"}
                        </div>
                      )}
                    </div>
                    {stat.button && (
                      <button
                        className="text-[10px] sm:text-xs text-muted-foreground transition-colors px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-md border border-transparent hover:border-gray-300 hover:bg-muted/40 hover:text-foreground focus:outline-none flex items-center space-x-0.5 sm:space-x-1 group"
                        onClick={stat.button.onClick}
                      >
                        <span className="hidden sm:inline">{stat.button.label}</span>
                        <span className="sm:hidden">View</span>
                        <ArrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Section 2: Recruiter Metrics - Row 2 */}
        <div className="space-y-4 sm:space-y-6">

          <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[ // Row 2 Recruiter cards array
              {
                title: "Active Applicants",
                value: metrics?.kpis?.activeApplicants ?? 0,
                icon: Users,
                color: "text-blue-500 dark:text-blue-400",
                bgColor: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50",
                borderColor: "border-blue-200 dark:border-blue-800",
                description: "On process Applicants",
                button: {
                  label: "View All",
                  onClick: () => router.push('/applicants?query=' + encodeURIComponent('status:' + getActiveApplicantStatusesQuery()))
                }
              },
              {
                title: "Number of Open Headcount",
                value: metrics?.kpis?.openHeadcounts ?? 0,
                icon: Briefcase,
                color: "text-emerald-500 dark:text-emerald-400",
                bgColor: "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/50",
                borderColor: "border-emerald-200 dark:border-emerald-800",
                description: "Total number of open headcount",
                button: {
                  label: "View All",
                  onClick: () => router.push('/positions?status=Open&recruiterId=all')
                }
              },
              { // High Priority
                title: "High Score (80+)",
                value: metrics?.kpis?.highScoreApplicants ?? 0,
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
                className={`group relative overflow-hidden border-2 ${stat.borderColor} hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm ${isPageRefresh && !hasSSEUpdated ? 'animate-in slide-in-from-bottom-4 fade-in-0' : ''
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
                            stat.title === "Avg Time to Hire" ? (Math.abs(stat.value - 1) < 0.01 ? "day" : "days") : "total"}
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
          <div className="border-t border-border/50 my-4 sm:my-6 md:my-8"></div>

          {/* New Applications + Applicant Scoring Analysis + SLA Monitoring Layout */}
          <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 lg:grid-cols-12">
            {/* Left side - 2 rows */}
            <div className="lg:col-span-7 space-y-3 sm:space-y-4 md:space-y-6">
              {/* Row 1: New Applications Over Time */}
              <div>
                <NewApplicationsTimeSeriesChart
                  Applicants={filteredApplicants}
                  isLoading={isLoading}
                  dynamicHeight={sharedHeight - 380}
                />
              </div>

              {/* Row 2: Applicant Scoring Analysis */}
              <div>
                <CandidateScoreDistributionChart
                  candidates={filteredApplicants}
                  isLoading={isLoading}
                  dynamicHeight={sharedHeight - 380}
                />
              </div>
            </div>

            {/* Right side - SLA Monitoring (full height) */}
            <div className="lg:col-span-5" ref={sharedRef}>
              <div className="relative space-y-4 overflow-y-auto h-full" >
                <SLAViolationsWidget onDataUpdate={fetchDataClientSide} />
                {!canViewAllApplicants && session?.user?.id && (
                  <SLAViolationsWidget recruiterId={session.user.id} onDataUpdate={fetchDataClientSide} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-border/50 my-4 sm:my-6 md:my-8"></div>

        {/* Section 3: Personal Performance (if user can't view all Applicants) */}
        {!canViewAllApplicants && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="h-6 sm:h-8 w-1 bg-gradient-to-b from-purple-500 to-purple-400 rounded-full"></div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">My Performance</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">Personal recruitment metrics</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-muted-foreground">Personal</span>
              </div>
            </div>

            <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Active Applicants",
                  value: myActiveApplicantsList.length,
                  icon: Users,
                  color: "text-purple-600",
                  bgColor: "bg-gradient-to-br from-purple-50 to-purple-100",
                  borderColor: "border-purple-200",
                  description: "In my pipeline",
                  button: {
                    label: "View All",
                    onClick: () => router.push(`/applicants?query=${encodeURIComponent(`recruiterId:${session?.user?.id} status:${getActiveApplicantStatusesQuery()}`)}`)
                  }
                },
                {
                  title: "In Interview",
                  value: myApplicantsInInterviewCount,
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
                  value: newApplicantsAssignedToMeTodayList.length,
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
                  className={`group relative overflow-hidden border-2 ${stat.borderColor} hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-white/50 backdrop-blur-sm ${isPageRefresh && !hasSSEUpdated ? 'animate-in slide-in-from-bottom-4 fade-in-0' : ''
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
                            Applicants
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
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="h-6 sm:h-8 w-1 bg-gradient-to-b from-purple-500 to-purple-400 rounded-full"></div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">Pipeline Analytics</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">Recruitment pipeline metrics</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            {/* Bar Chart: On-process by Stage */}
            <Card className={`group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm ${isPageRefresh && !hasSSEUpdated ? 'animate-in slide-in-from-bottom-4' : ''}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardHeader className="relative pb-3">
                <CardTitle className="text-base font-semibold text-foreground group-hover:text-foreground transition-colors">On-Process Applicants by Stage</CardTitle>
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
                <CardTitle className="text-base font-semibold text-foreground group-hover:text-foreground transition-colors">On-Process Applicants by Recruiter</CardTitle>
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
                        labels: Object.keys(onProcessByRecruiter),
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




        {/* Section 5: Headcount Status */}
        <div className="space-y-4 sm:space-y-6">
          <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1">
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
                  <div className="space-y-3 sm:space-y-4">
                    {headcountData.slice(0, 10).map((headcount: any) => (
                      <div key={headcount.id} className="border rounded-lg p-3 sm:p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2 sm:gap-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedPositionId(headcount.position.id);
                                setIsPositionDrawerOpen(true);
                              }}
                              className="font-medium hover:underline text-left cursor-pointer hover:text-primary/80 transition-colors text-sm sm:text-base"
                            >
                              {headcount.position.title}
                            </button>
                            <Badge variant="outline" className="text-[10px] sm:text-xs">
                              {headcount.position.department}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant={headcount.status === 'filled' ? 'default' : 'secondary'}
                              className={`text-[10px] sm:text-xs ${headcount.status === 'filled' ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}`}
                            >
                              {headcount.status === 'filled' ? 'Filled' : 'Vacant'}
                            </Badge>
                            {renderSLABadge(headcount.sla)}
                          </div>
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {headcount.position.positionLevel && (
                            <span>Level: {headcount.position.positionLevel}</span>
                          )}
                          {headcount.Applicant && (
                            <span className="ml-4">
                              Applicant: {headcount.applicant.name}
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

        {/* Section 6: Personal Action Items (if user can't view all Applicants) */}
        {!canViewAllApplicants && (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center space-x-2">
              <div className="h-5 sm:h-6 w-1 bg-red-500 rounded-full"></div>
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">My Action Items</h2>
            </div>
            <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1">
              <Card className="shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <ListChecks className="mr-2 h-5 w-5 text-red-500" />
                    My Action Items ({myActionItemsList.length})
                  </CardTitle>
                  <CardDescription>Active Applicants assigned to you requiring attention.</CardDescription>
                  {/* View button for my assigned Applicants */}
                  <Link href={`/applicants?query=${encodeURIComponent(`recruiterId:${session?.user?.id}`)}`} passHref>
                    <Button variant="outline" size="sm" className="mt-2">View My Applicants</Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {myActionItemsList.length > 0 ? (
                    <div className="overflow-x-auto -mx-2 sm:mx-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Applicant</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Applied Fit Score</TableHead>
                            <TableHead>Applied</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {myActionItemsList.slice(0, 5).map(applicant => (
                            <TableRow key={applicant.id} className="hover:bg-muted/50">
                              <TableCell>
                                {(() => {
                                  const nameInfo = formatApplicantNameWithLang(applicant);
                                  return (
                                    <Link href={`/applicants/${applicant.id}`} className="flex items-center space-x-3 hover:underline">
                                      <ApplicantAvatarCompact
                                        user={{
                                          id: applicant.id,
                                          name: nameInfo.name,
                                          avatarUrl: applicant.avatarUrl,
                                          email: applicant.email
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
                              <TableCell>{applicant.position?.title || 'N/A'}</TableCell>
                              <TableCell>
                                <StatusBadge statusId={applicant.statusId} className="capitalize" stageNames={stageNames} />
                              </TableCell>
                              <TableCell className={getScoreColor(applicant.fitScore)}>{formatScoreWithGrade(applicant.fitScore)}</TableCell>
                              <TableCell>{applicant.applicationDate ? new Date(applicant.applicationDate).toLocaleDateString() : 'N/A'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
                      <p className="text-sm text-muted-foreground">Your backlog is clear!</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {newApplicantsAssignedToMeTodayList.length > 0 && (
                <Card className="shadow-sm hover:shadow-md transition-all duration-200">
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <UserPlus className="mr-2 h-5 w-5 text-red-500" />
                      New Applicants Assigned Today ({newApplicantsAssignedToMeTodayList.length})
                    </CardTitle>
                    <CardDescription>Applicants assigned to you that applied today.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto -mx-2 sm:mx-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Applicant</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Applied Fit Score</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {newApplicantsAssignedToMeTodayList.slice(0, 5).map(applicant => (
                            <TableRow key={applicant.id} className="hover:bg-muted/50">
                              <TableCell>
                                {(() => {
                                  const nameInfo = formatApplicantNameWithLang(applicant);
                                  return (
                                    <Link href={`/applicants/${applicant.id}`} className="flex items-center space-x-3 hover:underline">
                                      <ApplicantAvatarCompact
                                        user={{
                                          id: applicant.id,
                                          name: nameInfo.name,
                                          avatarUrl: applicant.avatarUrl,
                                          email: applicant.email
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
                              <TableCell>{applicant.position?.title || 'N/A'}</TableCell>
                              <TableCell>
                                <StatusBadge statusId={applicant.statusId} className="capitalize" stageNames={stageNames} />
                              </TableCell>
                              <TableCell>{formatScoreWithGrade(applicant.fitScore)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
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