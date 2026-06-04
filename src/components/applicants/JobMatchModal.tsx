import React, { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  UsersIcon as Users,
  UserGroupIcon as UserCheck,
  UserMinusIcon as UserX,
  BuildingOfficeIcon as Building,
  MapPinIcon as MapPin,
  CalendarIcon as Calendar,
  CurrencyDollarIcon as DollarSign,
  ArrowRightIcon as ArrowRight
} from '@heroicons/react/24/outline';
import {
  FlagIcon as Target,
  CpuChipIcon as BrainCircuit,
  DocumentTextIcon as FileText,
  UserIcon as User,
  EnvelopeIcon as Mail,
  BriefcaseIcon as Briefcase,
  ExclamationCircleIcon as AlertCircle,
  CheckCircleIcon as CheckCircle,
  XCircleIcon as XCircle,
  StarIcon as Star,
  LockClosedIcon as Lock,
  ExclamationTriangleIcon as AlertTriangle,
  ArrowTopRightOnSquareIcon as ExternalLink,
  ArrowPathIcon as Loader2,
  XMarkIcon as X
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { formatScoreWithGrade } from '@/lib/scoreUtils';
import { hasAnyPermission } from '@/lib/permissions';

interface JobMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobMatch: {
    jobId: string;
    jobTitle: string;
    fitScore: number;
    matchReasons: string[];
    position?: {
      id: string;
      title: string;
      description?: string;
      department?: string;
      location?: string;
      salary?: string;
      requirements?: string;
      isOpen: boolean;
    };
  } | null;
}

// Utility for displaying fitScore as a percentage and grade
function displayFitScoreWithGrade(score: number | undefined | null) {
  if (typeof score !== 'number' || isNaN(score)) return '0% (E)';
  return formatScoreWithGrade(score);
}

export default function JobMatchModal({ isOpen, onClose, jobMatch }: JobMatchModalProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [loadingStats, setLoadingStats] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [stats, setStats] = useState({
    totalApplied: 0,
    totalMatching: 0,
    matchingNotApplied: 0
  });

  // Ref for timeout cleanup
  const routerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check permissions
  const canViewJobMatches = hasAnyPermission(session?.user, ['JOB_MATCH_VIEW']);
  const canManageJobMatches = hasAnyPermission(session?.user, ['JOB_MATCH_MANAGE']);

  useEffect(() => {
    if (isOpen && jobMatch?.jobId) {
      fetchStatistics();
    }
  }, [isOpen, jobMatch?.jobId]);

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (routerTimeoutRef.current) {
        clearTimeout(routerTimeoutRef.current);
      }
    };
  }, []);

  const fetchStatistics = async () => {
    if (!jobMatch?.jobId) return;

    setLoadingStats(true);
    try {
      const response = await fetch(`/ api / positions / ${jobMatch.jobId}/statistics`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleNavigateToApplicants = (filterType: 'applied' | 'matching' | 'matchingNotApplied') => {
    if (!jobMatch?.jobId || isNavigating) return;

    setIsNavigating(true);

    let advancedQuery = '';
    switch (filterType) {
      case 'applied':
        // Show Applicants who have applied to this position (any status)
        advancedQuery = `positionId:${jobMatch.jobId}`;
        break;
      case 'matching':
        // Show Applicants with good fit score for this position
        advancedQuery = `positionId:${jobMatch.jobId} minAppliedJobFitScore:70`;
        break;
      case 'matchingNotApplied':
        // Show Applicants with high fit score who haven't applied yet
        advancedQuery = `positionId:${jobMatch.jobId} minAppliedJobFitScore:80`;
        break;
    }

    // Use setTimeout to prevent rapid state changes
    const timeoutId = setTimeout(() => {
      router.replace(`/applicants?query=${encodeURIComponent(advancedQuery)}`);
      onClose();
    }, 100);

    // Store timeout ID for cleanup
    if (routerTimeoutRef.current) {
      clearTimeout(routerTimeoutRef.current);
    }
    routerTimeoutRef.current = timeoutId;
  };

  if (!jobMatch) return null;

  // If user can't view job matches, show access denied
  if (!canViewJobMatches) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-destructive" />
              Access Denied
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-muted-foreground">
            <Lock className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>You don't have permission to view job matches.</p>
            <p className="text-sm mt-2">Contact your administrator to request access.</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                {jobMatch.position?.title || jobMatch.jobTitle}
              </DialogTitle>
              <DialogDescription className="mt-1">
                View job match details and compatibility information
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" aria-label="Close job match details" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row gap-6 p-6 flex-1 min-h-0">
          {/* Left Column - Job Information and Match Reasons */}
          <div className="lg:flex-1 space-y-6 overflow-y-auto pr-2">
            {/* Job Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  Job Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Location:</span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      {jobMatch.position?.location || 'Not specified'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Salary:</span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                      {jobMatch.position?.salary || 'Not specified'}
                    </p>
                  </div>
                </div>

                {jobMatch.position?.description && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Description:</span>
                    <p className="text-sm text-muted-foreground">
                      {jobMatch.position.description}
                    </p>
                  </div>
                )}

                {jobMatch.position?.requirements && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Requirements:</span>
                    <p className="text-sm text-muted-foreground">
                      {jobMatch.position.requirements}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Match Reasons Card */}
            {jobMatch.matchReasons && jobMatch.matchReasons.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Match Reasons
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {jobMatch.matchReasons.map((reason, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">{index + 1}</span>
                        </div>
                        <p className="text-sm text-foreground">{reason}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Statistics and Actions */}
          <div className="lg:w-80 space-y-6">
            {/* Fit Score Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  Fit Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">
                    {displayFitScoreWithGrade(jobMatch.fitScore)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Based on Applicant's skills and experience
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Statistics Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Position Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Applied:</span>
                      <Badge variant="secondary">{stats.totalApplied}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Good Matches:</span>
                      <Badge variant="secondary">{stats.totalMatching}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">High Matches (Not Applied):</span>
                      <Badge variant="secondary">{stats.matchingNotApplied}</Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {canManageJobMatches && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowRight className="h-5 w-5 text-primary" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => handleNavigateToApplicants('applied')}
                    disabled={isNavigating}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    View Applied Applicants
                  </Button>
                  <Button
                    onClick={() => handleNavigateToApplicants('matching')}
                    disabled={isNavigating}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <UserCheck className="mr-2 h-4 w-4" />
                    View Good Matches
                  </Button>
                  <Button
                    onClick={() => handleNavigateToApplicants('matchingNotApplied')}
                    disabled={isNavigating}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <UserX className="mr-2 h-4 w-4" />
                    View High Matches (Not Applied)
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
