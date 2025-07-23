// src/components/dashboard/DashboardPageClient.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Candidate, Position, CandidateStatus, UserProfile } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Briefcase, CheckCircle2, UserPlus, FileWarning, UserRoundSearch, ServerCrash, Loader2, ListChecks, CalendarClock, Users2, BarChart3, AlertTriangle, Clock, Star, Target, Code, CalendarIcon, X, Timer, XCircle, ArrowRight } from "lucide-react";
import { getScoreRangesForChart, formatScoreWithGrade, getScoreColor } from "@/lib/scoreUtils";
import { formatCandidateName, formatCandidateNameWithLang } from "@/lib/candidateUtils";
import { isToday } from 'date-fns';
import parseISO from 'date-fns/parseISO';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signIn, useSession } from "next-auth/react";
import { CandidatesPerPositionChart } from '@/components/dashboard/CandidatesPerPositionChart';
import { useRouter } from 'next/navigation';
import { toast } from "react-hot-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pie, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { NewApplicationsTimeSeriesChart } from './NewApplicationsTimeSeriesChart';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend, ChartDataLabels);



interface DashboardPageClientProps {
  initialCandidates: Candidate[];
  initialPositions: Position[];
  initialUsers: UserProfile[]; // Or a simplified version like Pick<UserProfile, 'id' | 'role'>
  initialFetchError?: string;
  authError?: boolean; // Added from server
  permissionError?: boolean; // Added from server
}

const BACKLOG_EXCLUSION_STATUSES: CandidateStatus[] = ['Hired', 'Rejected', 'Offer Accepted'];
const INTERVIEW_STATUSES: CandidateStatus[] = ['Interview Scheduled', 'Interviewing'];

export default function DashboardPageClient({
  initialCandidates,
  initialPositions,
  initialUsers,
  initialFetchError,
  authError: serverAuthError = false,
  permissionError: serverPermissionError = false,
}: DashboardPageClientProps) {
  const { data: session, status } = useSession();

  // Check permissions
  const canViewDashboard = session?.user?.role === 'Admin' || 
    session?.user?.modulePermissions?.includes('DASHBOARD_VIEW');
  
  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (status === 'unauthenticated') {
    return <div>Please sign in to view the dashboard.</div>;
  }

  if (!canViewDashboard) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to view the dashboard. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }
  const [allCandidates, setAllCandidates] = useState<Candidate[]>(initialCandidates || []);
  const [myAssignedCandidates, setMyAssignedCandidates] = useState<Candidate[]>(initialCandidates || []); // For Recruiter, initialCandidates *are* their assigned ones
  const [allPositions, setAllPositions] = useState<Position[]>(initialPositions || []);
  const [allUsers, setAllUsers] = useState<UserProfile[]>(initialUsers || []);
  const [myBacklogCandidates, setMyBacklogCandidates] = useState<Candidate[]>([]);

  const [isLoading, setIsLoading] = useState(false); // Client-side loading for subsequent actions if any
  const [fetchError, setFetchError] = useState<string | null>(initialFetchError || null);
  const [authError, setAuthError] = useState(serverAuthError);
  const [permissionError, setPermissionError] = useState(serverPermissionError);
  const router = useRouter();

  // Function to re-fetch data on client if needed (e.g., after an action or for a refresh button)
  const fetchDataClientSide = useCallback(async () => {
    if (status !== 'authenticated' || !session?.user?.id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setFetchError(null);
    let accumulatedFetchError = "";
    const userRole = session.user.role;
    const userId = session.user.id;

    try {
      const fetchOptions = { credentials: 'include' as const };
      const promises = [];
      if (userRole === 'Admin' || userRole === 'Hiring Manager') {
        promises.push(fetch('/api/candidates', fetchOptions));
        promises.push(fetch('/api/users', fetchOptions));
        promises.push(Promise.resolve(null));
      } else if (userRole === 'Recruiter') {
        promises.push(fetch(`/api/candidates?assignedRecruiterId=${userId}`, fetchOptions));
        promises.push(Promise.resolve(null));
        promises.push(fetch(`/api/candidates?assignedRecruiterId=${userId}`, fetchOptions));
      } else {
        promises.push(Promise.resolve(null)); promises.push(Promise.resolve(null)); promises.push(Promise.resolve(null));
      }
      promises.push(fetch('/api/positions', fetchOptions));

      const [candidatesResOrNull, usersResOrNull, myBacklogCandidatesResOrNull, positionsRes] = await Promise.all(promises);

      if (candidatesResOrNull && !candidatesResOrNull.ok) {
        const errorText = candidatesResOrNull.statusText || `Status: ${candidatesResOrNull.status}`;
        accumulatedFetchError += `Failed to fetch candidates: ${errorText}. `;
        if (userRole === 'Admin' || userRole === 'Hiring Manager') setAllCandidates([]); else setMyAssignedCandidates([]);
      } else if (candidatesResOrNull) {
        const response = await candidatesResOrNull.json();
        const candidatesData: Candidate[] = Array.isArray(response.data) ? response.data : (Array.isArray(response) ? response : []);
        if (userRole === 'Admin' || userRole === 'Hiring Manager') setAllCandidates(candidatesData); else setMyAssignedCandidates(candidatesData);
      }

      if (usersResOrNull && !usersResOrNull.ok) { 
        const errorText = usersResOrNull.statusText || `Status: ${usersResOrNull.status}`;
        accumulatedFetchError += `Failed to fetch users: ${errorText}. `;
        setAllUsers([]); 
      }
      else if (usersResOrNull) { 
        const usersData = await usersResOrNull.json();
        setAllUsers(Array.isArray(usersData) ? usersData : []);
      }

      if (myBacklogCandidatesResOrNull && !myBacklogCandidatesResOrNull.ok) { 
        const errorText = myBacklogCandidatesResOrNull.statusText || `Status: ${myBacklogCandidatesResOrNull.status}`;
        accumulatedFetchError += `Failed to fetch backlog candidates: ${errorText}. `;
        setMyBacklogCandidates([]); 
      }
      else if (myBacklogCandidatesResOrNull) {
        const response = await myBacklogCandidatesResOrNull.json();
        const backlogData: Candidate[] = Array.isArray(response.data) ? response.data : (Array.isArray(response) ? response : []);
        setMyBacklogCandidates(backlogData.filter(c => !BACKLOG_EXCLUSION_STATUSES.includes(c.status)));
      }

      if (!positionsRes || !positionsRes.ok) { 
        const errorText = positionsRes?.statusText || `Status: ${positionsRes?.status}`;
        accumulatedFetchError += `Failed to fetch positions: ${errorText}. `;
        setAllPositions([]); 
      }
      else { 
        const response = await positionsRes.json();
        const positionsData = Array.isArray(response.data) ? response.data : (Array.isArray(response) ? response : []);
        setAllPositions(positionsData);
      }

      if (accumulatedFetchError) setFetchError(accumulatedFetchError.trim());

    } catch (error) {
      const genericMessage = (error as Error).message || "An unexpected error occurred.";
      setFetchError(genericMessage);
      setAllCandidates([]); setMyAssignedCandidates([]); setAllPositions([]); setAllUsers([]); setMyBacklogCandidates([]);
    } finally {
      setIsLoading(false);
    }
  }, [status, session?.user?.id, session?.user?.role]);

  useEffect(() => {
    // Handle initial state passed from server component
    setAllCandidates(initialCandidates || []);
    if (session?.user?.role === 'Recruiter') {
      setMyAssignedCandidates(initialCandidates || []); // For recruiter, initial IS their assigned
      setMyBacklogCandidates((initialCandidates || []).filter(c => !BACKLOG_EXCLUSION_STATUSES.includes(c.status)));
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
  }, [initialCandidates, initialPositions, initialUsers, initialFetchError, serverAuthError, serverPermissionError, status, session?.user?.role, toast]);

  // Fetch data when session is authenticated and initial data is empty
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      // Only fetch if we don't have data already
      const hasData = (initialCandidates && initialCandidates.length > 0) || 
                     (initialPositions && initialPositions.length > 0) || 
                     (initialUsers && initialUsers.length > 0);
      
      if (!hasData) {
        fetchDataClientSide();
      }
    }
  }, [status, session?.user?.id, initialCandidates, initialPositions, initialUsers, fetchDataClientSide]);

  useEffect(() => {
    const eventSource = new EventSource('/api/dashboard/stream');
    eventSource.onmessage = (event) => {
      // Optionally, parse event.data for more granular updates
      fetchDataClientSide(); // Refresh dashboard data on any event
    };
    return () => eventSource.close();
  }, [fetchDataClientSide]);

  const totalActiveCandidates = useMemo(() => {
    const safeAllCandidates = Array.isArray(allCandidates) ? allCandidates : [];
    return safeAllCandidates.filter((c: Candidate) => !BACKLOG_EXCLUSION_STATUSES.includes(c.status)).length;
  }, [allCandidates]);
  const totalOpenPositions = useMemo(() => {
    const safeAllPositions = Array.isArray(allPositions) ? allPositions : [];
    return safeAllPositions.filter((p: Position) => p.isOpen).length;
  }, [allPositions]);

  // Memoize open positions to avoid repeated filtering
  const openPositions = useMemo(() => {
    const safeAllPositions = Array.isArray(allPositions) ? allPositions : [];
    return safeAllPositions.filter((p: Position) => p.isOpen);
  }, [allPositions]);
  const hiredThisMonthAdmin = useMemo(() => {
    const safeAllCandidates = Array.isArray(allCandidates) ? allCandidates : [];
    const now = new Date();
    return safeAllCandidates.filter((c: Candidate) => {
      if (c.status !== 'Hired' || !c.applicationDate || typeof c.applicationDate !== 'string') return false;
      try {
        const appDate = parseISO(c.applicationDate);
        return appDate.getMonth() === now.getMonth() && appDate.getFullYear() === now.getFullYear();
      } catch { return false; }
    }).length;
  }, [allCandidates]);

  const rejectedThisMonthAdmin = useMemo(() => {
    const safeAllCandidates = Array.isArray(allCandidates) ? allCandidates : [];
    const now = new Date();
    return safeAllCandidates.filter((c: Candidate) => {
      if (c.status !== 'Rejected' || !c.applicationDate || typeof c.applicationDate !== 'string') return false;
      try {
        const appDate = parseISO(c.applicationDate);
        return appDate.getMonth() === now.getMonth() && appDate.getFullYear() === now.getFullYear();
      } catch { return false; }
    }).length;
  }, [allCandidates]);
  const totalActiveRecruiters = useMemo(() => {
    const safeAllUsers = Array.isArray(allUsers) ? allUsers : [];
    return safeAllUsers.filter((u: UserProfile) => u.role === 'Recruiter').length;
  }, [allUsers]);
  const newCandidatesTodayAdminList = useMemo(() => {
    const safeAllCandidates = Array.isArray(allCandidates) ? allCandidates : [];
    return safeAllCandidates.filter((c: Candidate) => {
      try {
        if (!c.applicationDate || typeof c.applicationDate !== 'string') return false;
        return isToday(parseISO(c.applicationDate));
      } catch { return false; }
    });
  }, [allCandidates]);
  const openPositionsWithNoCandidates = useMemo(() => {
    const safeAllPositions = Array.isArray(allPositions) ? allPositions : [];
    const safeAllCandidates = Array.isArray(allCandidates) ? allCandidates : [];
    return safeAllPositions.filter((position: Position) => {
      if (!position.isOpen) return false;
      return !safeAllCandidates.some(candidate => candidate.positionId === position.id);
    });
  }, [allPositions, allCandidates]);

  const myActiveCandidatesList = useMemo(() => {
    const safeMyAssignedCandidates = Array.isArray(myAssignedCandidates) ? myAssignedCandidates : [];
    return safeMyAssignedCandidates.filter((c: Candidate) => !BACKLOG_EXCLUSION_STATUSES.includes(c.status));
  }, [myAssignedCandidates]);
  const myCandidatesInInterviewCount = useMemo(() => {
    const safeMyActiveCandidatesList = Array.isArray(myActiveCandidatesList) ? myActiveCandidatesList : [];
    return safeMyActiveCandidatesList.filter((c: Candidate) => INTERVIEW_STATUSES.includes(c.status)).length;
  }, [myActiveCandidatesList]);
  const newCandidatesAssignedToMeTodayList = useMemo(() => {
    const safeMyActiveCandidatesList = Array.isArray(myActiveCandidatesList) ? myActiveCandidatesList : [];
    return safeMyActiveCandidatesList.filter((c: Candidate) => {
      try {
        if (!c.applicationDate || typeof c.applicationDate !== 'string') return false;
        return isToday(parseISO(c.applicationDate));
      } catch { return false; }
    });
  }, [myActiveCandidatesList]);
  const myActionItemsList = useMemo(() => {
    const safeMyBacklogCandidates = Array.isArray(myBacklogCandidates) ? myBacklogCandidates : [];
    return safeMyBacklogCandidates.filter((c: Candidate) => c.recruiterId === session?.user?.id);
  }, [myBacklogCandidates, session?.user?.id]);

  // Derived statistics from processed data
  const candidateScoreRanges = useMemo(() => {
    const safeAllCandidates = Array.isArray(allCandidates) ? allCandidates : [];
    const scoreRanges = getScoreRangesForChart();
    const scoreRangeCounts: { [key: string]: number } = {};
    
    safeAllCandidates.forEach((candidate: Candidate) => {
      if (!BACKLOG_EXCLUSION_STATUSES.includes(candidate.status)) {
        scoreRanges.forEach(range => {
          if (typeof candidate.fitScore === 'number' && candidate.fitScore >= range.min && candidate.fitScore <= range.max) {
            scoreRangeCounts[range.label] = (scoreRangeCounts[range.label] || 0) + 1;
          }
        });
      }
    });
    
    return scoreRanges.map(range => ({
      label: range.label,
      count: scoreRangeCounts[range.label] || 0
    }));
  }, [allCandidates]);

  const unassignedCandidatesCount = useMemo(() => {
    const safeAllCandidates = Array.isArray(allCandidates) ? allCandidates : [];
    return safeAllCandidates.filter((c: Candidate) => 
      !BACKLOG_EXCLUSION_STATUSES.includes(c.status) && !c.recruiterId
    ).length;
  }, [allCandidates]);

  const unassignedCandidatesList = useMemo(() => {
    const safeAllCandidates = Array.isArray(allCandidates) ? allCandidates : [];
    return safeAllCandidates.filter((c: Candidate) => 
      !BACKLOG_EXCLUSION_STATUSES.includes(c.status) && !c.recruiterId
    );
  }, [allCandidates]);

  // Calculate Average Time to Hire (in days)
  const averageTimeToHire = useMemo(() => {
    const safeAllCandidates = Array.isArray(allCandidates) ? allCandidates : [];
    const hiredCandidates = safeAllCandidates.filter((c: Candidate) => 
      c.status === 'Hired' && c.applicationDate && typeof c.applicationDate === 'string'
    );

    if (hiredCandidates.length === 0) return 0;

    const totalDays = hiredCandidates.reduce((total, candidate) => {
      try {
        const applicationDate = parseISO(candidate.applicationDate);
        // Find the last transition to 'Hired'
        const hiredTransition = candidate.transitionHistory
          .filter(t => t.stage === 'Hired')
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const hireDate = hiredTransition ? parseISO(hiredTransition.date) : null;
        if (!hireDate) return total;
        const daysDiff = Math.ceil((hireDate.getTime() - applicationDate.getTime()) / (1000 * 60 * 60 * 24));
        return total + Math.max(0, daysDiff); // Ensure non-negative values
      } catch {
        return total;
      }
    }, 0);

    // Return float with two decimals
    return parseFloat((totalDays / hiredCandidates.length).toFixed(2));
  }, [allCandidates]);

  const highPriorityCandidates = useMemo(() => {
    const safeAllCandidates = Array.isArray(allCandidates) ? allCandidates : [];
    return safeAllCandidates.filter((c: Candidate) => 
      !BACKLOG_EXCLUSION_STATUSES.includes(c.status) && 
      typeof c.fitScore === 'number' && c.fitScore > 80
    );
  }, [allCandidates]);

  const recentApplications = useMemo(() => {
    const safeAllCandidates = Array.isArray(allCandidates) ? allCandidates : [];
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return safeAllCandidates.filter((c: Candidate) => {
      if (!c.applicationDate || typeof c.applicationDate !== 'string') return false;
      try {
        const appDate = parseISO(c.applicationDate);
        return appDate >= sevenDaysAgo && appDate <= now;
      } catch { return false; }
    });
  }, [allCandidates]);

  // Stage summary metrics
  const stageSummary = useMemo(() => {
    const safeAllCandidates = Array.isArray(allCandidates) ? allCandidates : [];
    const stageCounts: { [key: string]: number } = {};
    
    safeAllCandidates.forEach((candidate: Candidate) => {
      if (!BACKLOG_EXCLUSION_STATUSES.includes(candidate.status)) {
        const status = candidate.status;
        stageCounts[status] = (stageCounts[status] || 0) + 1;
      }
    });
    
    return Object.entries(stageCounts).map(([stage, count]) => ({
      stage,
      count
    })).sort((a, b) => b.count - a.count);
  }, [allCandidates]);

  // New candidates assigned to me today (for recruiter) - optimized
  const newCandidatesAssignedToMeToday = useMemo(() => {
    const safeMyAssignedCandidates = Array.isArray(myAssignedCandidates) ? myAssignedCandidates : [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return safeMyAssignedCandidates.filter((c: Candidate) => {
      if (!c.applicationDate || typeof c.applicationDate !== 'string') return false;
      try {
        const appDate = parseISO(c.applicationDate);
        appDate.setHours(0, 0, 0, 0);
        return appDate.getTime() === today.getTime();
      } catch { 
        return false; 
      }
    });
  }, [myAssignedCandidates]);

  // On-process candidates (not in BACKLOG_EXCLUSION_STATUSES)
  const onProcessCandidates = useMemo(() => {
    const safeAllCandidates = Array.isArray(allCandidates) ? allCandidates : [];
    return safeAllCandidates.filter(
      (c) => !BACKLOG_EXCLUSION_STATUSES.includes(c.status)
    );
  }, [allCandidates]);

  // Pie chart: On-process by stage
  const onProcessByStage = useMemo(() => {
    const stageCounts: Record<string, number> = {};
    onProcessCandidates.forEach((c) => {
      stageCounts[c.status] = (stageCounts[c.status] || 0) + 1;
    });
    return stageCounts;
  }, [onProcessCandidates]);

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

  if (authError) return ( <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-4"> <ServerCrash className="w-16 h-16 text-destructive mb-4" /> <h2 className="text-2xl font-semibold text-foreground mb-2">Authentication Error</h2> <p className="text-muted-foreground mb-4 max-w-md">{fetchError || "You need to be signed in to view the dashboard."}</p> <Button onClick={() => signIn(undefined, { callbackUrl: window.location.pathname })} className="btn-hover-primary-gradient">Sign In</Button> </div> );
  if (permissionError) return ( <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-4"> <ServerCrash className="w-16 h-16 text-destructive mb-4" /> <h2 className="text-2xl font-semibold text-foreground mb-2">Permission Denied</h2> <p className="text-muted-foreground mb-4 max-w-md">{fetchError || "You do not have permission to view this page."}</p> <Button onClick={() => router.push('/')} className="btn-hover-primary-gradient">Go to Home</Button> </div> );
  if (fetchError && !isLoading && initialFetchError) return ( <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center"> <ServerCrash className="w-16 h-16 text-destructive mb-4" /> <h2 className="text-2xl font-semibold text-foreground mb-2">Data Loading Error</h2> <p className="text-muted-foreground mb-6 max-w-md"> Could not load dashboard data: {fetchError} </p> <Button onClick={fetchDataClientSide} className="btn-hover-primary-gradient">Try Again</Button> </div> );
  // Show loading state only for initial load, not for statistics calculations
  if (isLoading && (!allCandidates.length && !allPositions.length)) return ( <div className="flex h-screen w-screen items-center justify-center bg-background fixed inset-0 z-50"> <Loader2 className="h-16 w-16 animate-spin text-primary" /> </div> );

  // Unified Dashboard - Show all metrics to everyone
  return (
    <div className="space-y-8 p-6">
    
      {/* Dashboard Header */}
     

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
                  const weekQuery = `applicationDateStart:${weekAgo.toISOString()} applicationDateEnd:${today.toISOString()}`;
                  router.push('/candidates?query=' + encodeURIComponent(weekQuery));
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
                  router.push('/candidates?query=' + encodeURIComponent(hiredQuery));
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
                  router.push('/candidates?query=' + encodeURIComponent(rejectedQuery));
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
              className={`group relative overflow-hidden border-2 ${stat.borderColor} hover:border-opacity-80 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm shadow-lg`}
              style={{
                animationDelay: `${index * 100}ms`
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
              value: totalActiveCandidates, 
              icon: Users, 
              color: "text-blue-500 dark:text-blue-400", 
              bgColor: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50",
              borderColor: "border-blue-200 dark:border-blue-800",
              description: "On process candidates",
              button: {
                label: "View All",
                onClick: () => router.push('/candidates?query=' + encodeURIComponent('status:Active'))
              }
            },
            { 
              title: "Open Positions", 
              value: totalOpenPositions, 
              icon: Briefcase, 
              color: "text-emerald-500 dark:text-emerald-400", 
              bgColor: "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/50",
              borderColor: "border-emerald-200 dark:border-emerald-800",
              description: "Available roles",
              button: {
                label: "View All",
                onClick: () => router.push('/positions?status=Open')
              }
            },
            { // High Priority
              title: "High Priority",
              value: highPriorityCandidates.length,
              icon: UserRoundSearch,
              color: "text-yellow-500 dark:text-yellow-400", 
              bgColor: "bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/50 dark:to-yellow-900/50",
              borderColor: "border-yellow-200 dark:border-yellow-800",
              description: "Need attention",
              button: {
                label: "View All",
                onClick: () => router.push('/candidates?query=' + encodeURIComponent('matchingFitScoreMin:80 matchingFitScoreMax:100'))
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
                onClick: () => router.push('/candidates?query=' + encodeURIComponent('assignedRecruiterId:null'))
              }
            }
          ].map((stat, index) => (
            <Card 
              key={stat.title} 
              className={`group relative overflow-hidden border-2 ${stat.borderColor} hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm`}
              style={{
                animationDelay: `${index * 100}ms`
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

        {/* New Applications Time Series Chart */}
        <NewApplicationsTimeSeriesChart 
          candidates={allCandidates} 
          isLoading={isLoading} 
        />
      </div>

      {/* Section 2: Recruiter Performance (if applicable) */}
      {session?.user?.role === 'Recruiter' && (
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
                  onClick: () => router.push(`/candidates?query=${encodeURIComponent(`recruiterId:${session?.user?.id} status:Active`)}`)
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
                  onClick: () => router.push(`/candidates?query=${encodeURIComponent(`recruiterId:${session?.user?.id} status:Interview`)}`)
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
                  onClick: () => router.push(`/candidates?query=${encodeURIComponent(`recruiterId:${session?.user?.id} applicationDate:${new Date().toISOString().slice(0, 10)}`)}`)
                }
              }
            ].map((stat, index) => (
              <Card 
                key={stat.title} 
                className={`group relative overflow-hidden border-2 ${stat.borderColor} hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-white/50 backdrop-blur-sm`}
                style={{
                  animationDelay: `${index * 150}ms`
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

      {/* Section 3: Pipeline Analytics - Charts */}
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
          {/* Pie Chart: On-process by Stage */}
          <Card className="group relative overflow-hidden border-2 border-purple-200 dark:border-purple-800 hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm">
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
                ) : (
                  <Pie
                    data={{
                      labels: Object.keys(onProcessByStage),
                      datasets: [
                        {
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
                          borderWidth: 2,
                          borderColor: 'rgba(255, 255, 255, 0.8)',
                        },
                      ],
                    }}
                    options={{
                      plugins: {
                        legend: {
                          display: true,
                          position: 'right',
                          labels: { 
                            color: 'rgb(100, 116, 139)', 
                            font: { size: 13 },
                            usePointStyle: true,
                            padding: 15
                          },
                        },
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
                    }}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bar Chart: On-process by Recruiter */}
          <Card className="group relative overflow-hidden border-2 border-purple-200 dark:border-purple-800 hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm">
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
                ) : (
                  <Bar
                    data={{
                      labels: Object.keys(onProcessByRecruiter).map((id) => recruiterIdToName[id] || id),
                      datasets: [
                        {
                          label: 'Candidates',
                          data: Object.values(onProcessByRecruiter),
                          backgroundColor: 'rgba(147, 51, 234, 0.8)', // purple-600
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

      {/* Section 4: Candidate Scoring Analysis - Chart.js Horizontal Bar Chart */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-1 bg-gradient-to-b from-blue-500 to-blue-400 rounded-full"></div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Candidate Scoring Analysis</h2>
              <p className="text-sm text-muted-foreground mt-1">Distribution by fit score quality</p>
            </div>
          </div>
        <div className="flex items-center space-x-2">
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-muted-foreground">Interactive</span>
        </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">This chart shows the distribution of candidates by their fit score, helping you quickly identify the quality mix in your pipeline.</p>
        {/* Sort score ranges by count descending */}
        {(() => {
          const sortedScoreRanges = [...candidateScoreRanges].sort((b, a) => b.count - a.count);
          return (
            <Card className="shadow-sm hover:shadow-md transition-all duration-200">
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                <Bar
                  data={{
                    labels: sortedScoreRanges.map(r => r.label),
                    datasets: [
                      {
                        label: 'Candidates',
                        data: sortedScoreRanges.map(r => r.count),
                        backgroundColor: [
                          'rgba(239, 68, 68, 0.8)',    // red-500
                          'rgba(249, 115, 22, 0.8)',   // orange-500
                          'rgba(234, 179, 8, 0.8)',    // yellow-500
                          'rgba(59, 130, 246, 0.8)',   // blue-500
                          'rgba(34, 197, 94, 0.8)',    // green-500
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
                      datalabels: {
                        anchor: 'end',
                        align: 'end',
                        color: '#22223b',
                        font: { weight: 'bold', size: 14 },
                        formatter: function(value) {
                          return value;
                        }
                      }
                    },
                    onClick: (event, elements) => {
                      if (elements.length > 0) {
                        const index = elements[0].index;
                        const range = sortedScoreRanges[index];
                        if (range) {
                          // Get the original score ranges to find min/max values
                          const scoreRanges = getScoreRangesForChart();
                          const originalRange = scoreRanges.find(r => r.label === range.label);
                          if (originalRange) {
                            const query = `matchingFitScoreMin:${originalRange.min} matchingFitScoreMax:${originalRange.max}`;
                            router.push('/candidates?query=' + encodeURIComponent(query));
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
                        ticks: { color: '#64748b', font: { size: 13 } },
                      },
                    },
                  }}
                  height={100}
                />
                )}
              </CardContent>
            </Card>
          );
        })()}
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
                    <TableHead>Fit Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unassignedCandidatesList.slice(0, 5).map(candidate => (
                    <TableRow key={candidate.id} className="hover:bg-muted/50">
                      <TableCell>
                        {(() => {
                          const nameInfo = formatCandidateNameWithLang(candidate);
                          return (
                            <Link href={`/candidates/${candidate.id}`} className="flex items-center space-x-3 hover:underline">
                              <Avatar size="sm" className="border border-border">
                                <AvatarImage src={candidate.avatarUrl || `https://placehold.co/32x32.png?text=${nameInfo.name?.charAt(0) || 'C'}`} alt={nameInfo.name} />
                                <AvatarFallback className="text-xs font-medium">{nameInfo.name?.charAt(0)?.toUpperCase() || 'C'}</AvatarFallback>
                              </Avatar>
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
                        <Badge variant="outline" className="capitalize">{candidate.status}</Badge>
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
            </CardContent>
          </Card>

          {/* Positions Needing Applicants */}
          <Card className="shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Briefcase className="mr-2 h-5 w-5 text-blue-500" />
                Positions Needing Applicants ({openPositionsWithNoCandidates.length})
              </CardTitle>
              <CardDescription>
                Open positions with no candidates yet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : openPositionsWithNoCandidates.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Position</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openPositionsWithNoCandidates.slice(0, 5).map(position => (
                      <TableRow key={position.id} className="hover:bg-muted/50">
                        <TableCell>
                          <Link href={`/positions/${position.id}`} className="font-medium hover:underline">
                            {position.title}
                          </Link>
                        </TableCell>
                        <TableCell>{position.department}</TableCell>
                        <TableCell>{position.positionLevel || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-green-600 border-green-600">Open</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
                  <p className="text-sm text-muted-foreground">All open positions have applicants!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section 7: Recruiter Action Items (if applicable) */}
      {session?.user?.role === 'Recruiter' && (
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
                <Link href={`/candidates?query=${encodeURIComponent(`recruiterId:${session?.user?.id}`)}`} passHref>
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
                        <TableHead>Fit Score</TableHead>
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
                                <Link href={`/candidates/${candidate.id}`} className="flex items-center space-x-3 hover:underline">
                                  <Avatar size="sm" className="border border-border">
                                    <AvatarImage src={candidate.avatarUrl || `https://placehold.co/32x32.png?text=${nameInfo.name?.charAt(0) || 'C'}`} alt={nameInfo.name} />
                                    <AvatarFallback className="text-xs font-medium">{nameInfo.name?.charAt(0)?.toUpperCase() || 'C'}</AvatarFallback>
                                  </Avatar>
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
                            <Badge variant="outline" className="capitalize">{candidate.status}</Badge>
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
                        <TableHead>Fit Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {newCandidatesAssignedToMeTodayList.slice(0, 5).map(candidate => (
                        <TableRow key={candidate.id} className="hover:bg-muted/50">
                          <TableCell>
                            {(() => {
                              const nameInfo = formatCandidateNameWithLang(candidate);
                              return (
                                <Link href={`/candidates/${candidate.id}`} className="flex items-center space-x-3 hover:underline">
                                  <Avatar size="sm" className="border border-border">
                                    <AvatarImage src={candidate.avatarUrl || `https://placehold.co/32x32.png?text=${nameInfo.name?.charAt(0) || 'C'}`} alt={nameInfo.name} />
                                    <AvatarFallback className="text-xs font-medium">{nameInfo.name?.charAt(0)?.toUpperCase() || 'C'}</AvatarFallback>
                                  </Avatar>
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
                            <Badge variant="outline" className="capitalize">{candidate.status}</Badge>
                          </TableCell>
                          <TableCell>{candidate.fitScore || 0}%</TableCell>
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
        </div>
      );}

