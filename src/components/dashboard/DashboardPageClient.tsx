// src/components/dashboard/DashboardPageClient.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Candidate, Position, CandidateStatus, UserProfile } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Briefcase, CheckCircle2, UserPlus, FileWarning, UserRoundSearch, ServerCrash, Loader2, ListChecks, CalendarClock, Users2, BarChart3, AlertTriangle, Clock, Star, Target, Code, CalendarIcon, X } from "lucide-react";
import { getScoreRangesForChart, formatScoreWithGrade, getScoreColor } from "@/lib/scoreUtils";
import { formatCandidateName } from "@/lib/candidateUtils";
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
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);



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
  const [allCandidates, setAllCandidates] = useState<Candidate[]>(initialCandidates || []);
  const [myAssignedCandidates, setMyAssignedCandidates] = useState<Candidate[]>(initialCandidates || []); // For Recruiter, initialCandidates *are* their assigned ones
  const [allPositions, setAllPositions] = useState<Position[]>(initialPositions || []);
  const [allUsers, setAllUsers] = useState<UserProfile[]>(initialUsers || []);
  const [myBacklogCandidates, setMyBacklogCandidates] = useState<Candidate[]>([]);

  const [isLoading, setIsLoading] = useState(false); // Client-side loading for subsequent actions if any
  const [fetchError, setFetchError] = useState<string | null>(initialFetchError || null);
  const [authError, setAuthError] = useState(serverAuthError);
  const [permissionError, setPermissionError] = useState(serverPermissionError);

  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  // Function to re-fetch data on client if needed (e.g., after an action or for a refresh button)
  const fetchDataClientSide = useCallback(async () => {
    if (sessionStatus !== 'authenticated' || !session?.user?.id) {
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
        const candidatesData: Candidate[] = response.data || response; // Handle both paginated and direct response
        if (userRole === 'Admin' || userRole === 'Hiring Manager') setAllCandidates(candidatesData); else setMyAssignedCandidates(candidatesData);
      }

      if (usersResOrNull && !usersResOrNull.ok) { 
        const errorText = usersResOrNull.statusText || `Status: ${usersResOrNull.status}`;
        accumulatedFetchError += `Failed to fetch users: ${errorText}. `;
        setAllUsers([]); 
      }
      else if (usersResOrNull) { 
        const usersData = await usersResOrNull.json();
        setAllUsers(usersData); 
      }

      if (myBacklogCandidatesResOrNull && !myBacklogCandidatesResOrNull.ok) { 
        const errorText = myBacklogCandidatesResOrNull.statusText || `Status: ${myBacklogCandidatesResOrNull.status}`;
        accumulatedFetchError += `Failed to fetch backlog candidates: ${errorText}. `;
        setMyBacklogCandidates([]); 
      }
      else if (myBacklogCandidatesResOrNull) {
        const response = await myBacklogCandidatesResOrNull.json();
        const backlogData: Candidate[] = response.data || response; // Handle both paginated and direct response
        setMyBacklogCandidates(backlogData.filter(c => !BACKLOG_EXCLUSION_STATUSES.includes(c.status)));
      }

      if (!positionsRes || !positionsRes.ok) { 
        const errorText = positionsRes?.statusText || `Status: ${positionsRes?.status}`;
        accumulatedFetchError += `Failed to fetch positions: ${errorText}. `;
        setAllPositions([]); 
      }
      else { 
        const response = await positionsRes.json();
        const positionsData = response.data || response; // Handle both paginated and direct response
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
  }, [sessionStatus, session?.user?.id, session?.user?.role]);

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

    if (sessionStatus === 'unauthenticated' && !serverAuthError) {
        signIn(undefined, { callbackUrl: window.location.pathname });
    }
    // Show error as toast popup if present
    if (initialFetchError) {
      toast.error(initialFetchError);
    }
  }, [initialCandidates, initialPositions, initialUsers, initialFetchError, serverAuthError, serverPermissionError, sessionStatus, session?.user?.role, toast]);

  // Fetch data when session is authenticated and initial data is empty
  useEffect(() => {
    if (sessionStatus === 'authenticated' && session?.user?.id) {
      // Only fetch if we don't have data already
      const hasData = (initialCandidates && initialCandidates.length > 0) || 
                     (initialPositions && initialPositions.length > 0) || 
                     (initialUsers && initialUsers.length > 0);
      
      if (!hasData) {
        fetchDataClientSide();
      }
    }
  }, [sessionStatus, session?.user?.id, initialCandidates, initialPositions, initialUsers, fetchDataClientSide]);

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

  if (authError) return ( <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-4"> <ServerCrash className="w-16 h-16 text-destructive mb-4" /> <h2 className="text-2xl font-semibold text-foreground mb-2">Authentication Error</h2> <p className="text-muted-foreground mb-4 max-w-md">{fetchError || "You need to be signed in to view the dashboard."}</p> <Button onClick={() => signIn(undefined, { callbackUrl: window.location.pathname })} className="btn-hover-primary-gradient">Sign In</Button> </div> );
  if (permissionError) return ( <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-4"> <ServerCrash className="w-16 h-16 text-destructive mb-4" /> <h2 className="text-2xl font-semibold text-foreground mb-2">Permission Denied</h2> <p className="text-muted-foreground mb-4 max-w-md">{fetchError || "You do not have permission to view this page."}</p> <Button onClick={() => router.push('/')} className="btn-hover-primary-gradient">Go to Home</Button> </div> );
  if (fetchError && !isLoading && initialFetchError) return ( <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center"> <ServerCrash className="w-16 h-16 text-destructive mb-4" /> <h2 className="text-2xl font-semibold text-foreground mb-2">Data Loading Error</h2> <p className="text-muted-foreground mb-6 max-w-md"> Could not load dashboard data: {fetchError} </p> <Button onClick={fetchDataClientSide} className="btn-hover-primary-gradient">Try Again</Button> </div> );
  // Show loading state only for initial load, not for statistics calculations
  if (isLoading && (!allCandidates.length && !allPositions.length)) return ( <div className="flex h-screen w-screen items-center justify-center bg-background fixed inset-0 z-50"> <Loader2 className="h-16 w-16 animate-spin text-primary" /> </div> );

  // Unified Dashboard - Show all metrics to everyone
  return (
    <div className="space-y-8 p-6">
      {/* Dashboard Header with Clear All Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-1 bg-primary rounded-full"></div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        </div>
        {/* Removed Clear All Filters button as per request */}
      </div>

      {/* Section 1: Key Performance Indicators */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-1 bg-primary rounded-full"></div>
          <h2 className="text-xl font-semibold text-foreground">Key Performance Indicators</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[
            { title: "Total Active Candidates", value: totalActiveCandidates, icon: Users, color: "text-primary", bgColor: "bg-primary/10" },
            { title: "Open Positions", value: totalOpenPositions, icon: Briefcase, color: "text-accent", bgColor: "bg-accent/10" },
            { title: "Hired This Month", value: hiredThisMonthAdmin, icon: CheckCircle2, color: "text-green-500", bgColor: "bg-green-500/10" },
            { title: "Active Recruiters", value: totalActiveRecruiters, icon: Users2, color: "text-purple-500", bgColor: "bg-purple-500/10"},
            { title: "Unassigned Candidates", value: unassignedCandidatesCount, icon: UserRoundSearch, color: "text-orange-500", bgColor: "bg-orange-500/10"}
        ].map(stat => (
            <Card key={stat.title} className="shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
            </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : stat.value}
                </div>
              </CardContent>
          </Card>
        ))}
        </div>
      </div>

      {/* Section 2: Recruiter Performance (if applicable) */}
      {session?.user?.role === 'Recruiter' && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="h-6 w-1 bg-purple-500 rounded-full"></div>
            <h2 className="text-xl font-semibold text-foreground">My Performance</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">My Active Candidates</CardTitle>
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Users className="h-5 w-5 text-purple-500" />
                </div>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-foreground">{myActiveCandidatesList.length}</div></CardContent>
            </Card>
            <Card className="shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">My Candidates in Interview</CardTitle>
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <UserRoundSearch className="h-5 w-5 text-purple-500" />
                </div>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-foreground">{myCandidatesInInterviewCount}</div></CardContent>
            </Card>
            <Card className="shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">New Candidates Today (Assigned)</CardTitle>
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <CalendarClock className="h-5 w-5 text-purple-500" />
                </div>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-foreground">{newCandidatesAssignedToMeTodayList.length}</div></CardContent>
        </Card>
          </div>
        </div>
      )}

      {/* Section 3: Candidate Scoring Analysis - Chart.js Horizontal Bar Chart */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-1 bg-blue-500 rounded-full"></div>
          <h2 className="text-xl font-semibold text-foreground">Candidate Scoring Analysis</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-2">This chart shows the distribution of candidates by their fit score, helping you quickly identify the quality mix in your pipeline.</p>
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


      {/* Section 5: Unassigned Candidates */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-6 w-1 bg-orange-500 rounded-full"></div>
            <h2 className="text-xl font-semibold text-foreground">Unassigned Candidates</h2>
          </div>
          <Link href="/candidates?query=recruiterId:unassigned" passHref>
            <Button variant="outline" size="sm">
              View All ({unassignedCandidatesCount})
            </Button>
          </Link>
        </div>
        <Card className="shadow-sm hover:shadow-md transition-all duration-200">
          <CardContent className="pt-6">
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
                    <TableHead>Applied</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unassignedCandidatesList.slice(0, 5).map(candidate => (
                    <TableRow key={candidate.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Link href={`/candidates/${candidate.id}`} className="flex items-center space-x-3 hover:underline">
                          <Avatar size="sm" className="border border-border">
                            <AvatarImage src={candidate.avatarUrl || `https://placehold.co/32x32.png?text=${formatCandidateName(candidate)?.charAt(0) || 'C'}`} alt={formatCandidateName(candidate)} />
                            <AvatarFallback className="text-xs font-medium">{formatCandidateName(candidate)?.charAt(0)?.toUpperCase() || 'C'}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{formatCandidateName(candidate)}</span>
                        </Link>
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
                <p className="text-sm text-muted-foreground">All candidates have been assigned to recruiters!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 6: Recent Activity - Tables */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-1 bg-orange-500 rounded-full"></div>
          <h2 className="text-xl font-semibold text-foreground">Recent Activity</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {/* Unassigned Candidates */}
          <Card className="shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Users className="mr-2 h-5 w-5 text-red-500" />
                Unassigned Candidates ({unassignedCandidatesCount})
              </CardTitle>
              <CardDescription>
                Candidates not assigned to any recruiter
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{unassignedCandidatesCount}</div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push('/candidates?query=' + encodeURIComponent('recruiterId:unassigned'))}
                >
                  View All
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* New Candidates Today */}
          <Card className="shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <UserPlus className="mr-2 h-5 w-5 text-orange-500" /> 
                New Candidates Today ({newCandidatesTodayAdminList.length})
              </CardTitle>
              <CardDescription>
                Candidates who applied today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{newCandidatesTodayAdminList.length}</div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const today = new Date().toISOString().slice(0, 10);
                    const query = `applicationDateStart:${today} applicationDateEnd:${today}`;
                    router.push('/candidates?query=' + encodeURIComponent(query));
                  }}
                >
                  View All
                </Button>
                </div>
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
                      <TableHead></TableHead> {/* For View button */}
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
                        <TableCell>{position.position_level || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-green-600 border-green-600">Open</Badge>
                        </TableCell>
                        <TableCell>
                          <Link href={`/candidates?query=${encodeURIComponent(`positionId:${position.id}`)}`} passHref>
                            <Button variant="outline" size="sm">View</Button>
                          </Link>
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
                            <Link href={`/candidates/${candidate.id}`} className="flex items-center space-x-3 hover:underline">
                              <Avatar size="sm" className="border border-border">
                                <AvatarImage src={candidate.avatarUrl || `https://placehold.co/32x32.png?text=${formatCandidateName(candidate)?.charAt(0) || 'C'}`} alt={formatCandidateName(candidate)} />
                                <AvatarFallback className="text-xs font-medium">{formatCandidateName(candidate)?.charAt(0)?.toUpperCase() || 'C'}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{formatCandidateName(candidate)}</span>
                            </Link>
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
                            <Link href={`/candidates/${candidate.id}`} className="flex items-center space-x-3 hover:underline">
                              <Avatar size="sm" className="border border-border">
                                <AvatarImage src={candidate.avatarUrl || `https://placehold.co/32x32.png?text=${formatCandidateName(candidate)?.charAt(0) || 'C'}`} alt={formatCandidateName(candidate)} />
                                <AvatarFallback className="text-xs font-medium">{formatCandidateName(candidate)?.charAt(0)?.toUpperCase() || 'C'}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{formatCandidateName(candidate)}</span>
                            </Link>
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

      {/* Section 8: Status-based Statistics */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-1 bg-purple-500 rounded-full"></div>
          <h2 className="text-xl font-semibold text-foreground">Status Overview</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {/* High Priority Candidates */}
          <Card className="shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <AlertTriangle className="mr-2 h-5 w-5 text-orange-500" />
                High Priority Candidates ({highPriorityCandidates.length})
              </CardTitle>
              <CardDescription>Candidates with high fit scores (&gt;80) in active stages.</CardDescription>
              {/* View button for high priority candidates */}
              <Link href={`/candidates?query=${encodeURIComponent('matchingFitScoreMin:80 matchingFitScoreMax:100 status:Applied,Screening,Interview Scheduled,Interviewing')}`} passHref>
                <Button variant="outline" size="sm" className="mt-2">View High Priority</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {highPriorityCandidates.length > 0 ? (
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
                    {highPriorityCandidates.slice(0, 5).map(candidate => (
                      <TableRow key={candidate.id} className="hover:bg-muted/50">
                        <TableCell>
                          <Link href={`/candidates/${candidate.id}`} className="flex items-center space-x-3 hover:underline">
                            <Avatar size="sm" className="border border-border">
                              <AvatarImage src={candidate.avatarUrl || `https://placehold.co/32x32.png?text=${formatCandidateName(candidate)?.charAt(0) || 'C'}`} alt={formatCandidateName(candidate)} />
                              <AvatarFallback className="text-xs font-medium">{formatCandidateName(candidate)?.charAt(0)?.toUpperCase() || 'C'}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{formatCandidateName(candidate)}</span>
                          </Link>
                        </TableCell>
                        <TableCell>{candidate.position?.title || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{candidate.status}</Badge>
                        </TableCell>
                        <TableCell className="text-green-600 font-semibold">{formatScoreWithGrade(candidate.fitScore)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
                  <p className="text-sm text-muted-foreground">No high priority candidates at the moment.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Applications */}
          <Card className="shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Clock className="mr-2 h-5 w-5 text-blue-500" />
                Recent Applications ({recentApplications.length})
              </CardTitle>
              <CardDescription>Candidates who applied in the last 7 days.</CardDescription>
              {/* View button for recent applications */}
              <Link href={`/candidates?query=${encodeURIComponent(`applicationDateStart:${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)} applicationDateEnd:${new Date().toISOString().slice(0, 10)}`)}`} passHref>
                <Button variant="outline" size="sm" className="mt-2">View Recent</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : recentApplications.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Applied</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentApplications.slice(0, 5).map(candidate => (
                      <TableRow key={candidate.id} className="hover:bg-muted/50">
                        <TableCell>
                          <Link href={`/candidates/${candidate.id}`} className="flex items-center space-x-3 hover:underline">
                            <Avatar size="sm" className="border border-border">
                              <AvatarImage src={candidate.avatarUrl || `https://placehold.co/32x32.png?text=${formatCandidateName(candidate)?.charAt(0) || 'C'}`} alt={formatCandidateName(candidate)} />
                              <AvatarFallback className="text-xs font-medium">{formatCandidateName(candidate)?.charAt(0)?.toUpperCase() || 'C'}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{formatCandidateName(candidate)}</span>
                          </Link>
                        </TableCell>
                        <TableCell>{candidate.position?.title || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{candidate.status}</Badge>
                        </TableCell>
                        <TableCell>{candidate.applicationDate ? new Date(candidate.applicationDate).toLocaleDateString() : 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No recent applications.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section 9: Analytics Chart */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-1 bg-indigo-500 rounded-full"></div>
          <h2 className="text-xl font-semibold text-foreground">Analytics Overview</h2>
        </div>
        {isLoading ? (
        <Card className="shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle>Candidates per Position</CardTitle>
              <CardDescription>Overview of candidate distribution across open positions.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
        ) : (
          <CandidatesPerPositionChart candidates={allCandidates} positions={openPositions} />
        )}
      </div>

      {/* Section 8: High Priority Candidates */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-1 bg-green-500 rounded-full"></div>
          <h2 className="text-xl font-semibold text-foreground">High Priority Candidates</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {/* High Fit Score Candidates */}
          <Card className="shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Star className="mr-2 h-5 w-5 text-yellow-500" />
                High Fit Score (80+)
              </CardTitle>
              <CardDescription>
                Candidates with excellent fit scores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">High Score</div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push('/candidates?query=' + encodeURIComponent('matchingFitScoreMin:80 matchingFitScoreMax:100'))}
                >
                  View All
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Stage Candidates */}
          <Card className="shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Target className="mr-2 h-5 w-5 text-purple-500" />
                Active Stages
              </CardTitle>
              <CardDescription>
                Candidates in active recruitment stages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">Active</div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push('/candidates?query=' + encodeURIComponent('status:Applied,Screening,Interview Scheduled,Interviewing'))}
                >
                  View All
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section 9: Recent Activity */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-1 bg-blue-500 rounded-full"></div>
          <h2 className="text-xl font-semibold text-foreground">Recent Activity</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {/* This Week's Applications */}
          <Card className="shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <CalendarIcon className="mr-2 h-5 w-5 text-blue-500" />
                This Week's Applications
              </CardTitle>
              <CardDescription>
                Candidates who applied this week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">This Week</div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                    const query = `applicationDateStart:${weekAgo.toISOString().slice(0, 10)} applicationDateEnd:${today.toISOString().slice(0, 10)}`;
                    router.push('/candidates?query=' + encodeURIComponent(query));
                  }}
                >
                  View All
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Engineering Candidates */}
          <Card className="shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Code className="mr-2 h-5 w-5 text-green-500" />
                Engineering Candidates
              </CardTitle>
              <CardDescription>
                Candidates with engineering background
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">Engineering</div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push('/candidates?query=' + encodeURIComponent('education:Engineering,Computer Science,Software'))}
                >
                  View All
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
