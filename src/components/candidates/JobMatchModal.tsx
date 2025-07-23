import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Building, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Briefcase,
  ArrowRight,
  X,
  Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatScoreWithGrade } from '@/lib/utils';

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
  statistics?: {
    totalApplied: number;
    totalMatching: number;
    matchingNotApplied: number;
  } | undefined;
}

// Utility for displaying fitScore as a percentage and grade
function displayFitScoreWithGrade(score: number | undefined | null) {
  if (typeof score !== 'number' || isNaN(score)) return '0% (E)';
  let percent = score;
  if (score >= 0 && score <= 1) percent = Math.round(score * 100);
  else percent = Math.round(score);
  let grade = 'E';
  if (percent >= 80) grade = 'A';
  else if (percent >= 60) grade = 'B';
  else if (percent >= 40) grade = 'C';
  else if (percent >= 20) grade = 'D';
  return `${percent}% (${grade})`;
}

export default function JobMatchModal({ isOpen, onClose, jobMatch, statistics }: JobMatchModalProps) {
  const router = useRouter();
  const [loadingStats, setLoadingStats] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [stats, setStats] = useState(statistics || {
    totalApplied: 0,
    totalMatching: 0,
    matchingNotApplied: 0
  });

  useEffect(() => {
    if (isOpen && jobMatch?.jobId) {
      fetchStatistics();
    }
  }, [isOpen, jobMatch?.jobId]);

  const fetchStatistics = async () => {
    if (!jobMatch?.jobId) return;
    
    setLoadingStats(true);
    try {
      const response = await fetch(`/api/positions/${jobMatch.jobId}/statistics`);
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

  const handleNavigateToCandidates = (filterType: 'applied' | 'matching' | 'matchingNotApplied') => {
    if (!jobMatch?.jobId || isNavigating) return;
    
    setIsNavigating(true);
    
    let advancedQuery = '';
    switch (filterType) {
      case 'applied':
        // Show candidates who have applied to this position (any status)
        advancedQuery = `positionId:${jobMatch.jobId}`;
        break;
      case 'matching':
        // Show candidates with good fit score for this position using matching fit score
        advancedQuery = `positionId:${jobMatch.jobId} matchingFitScoreMin:70 matchingFitScoreMax:100`;
        break;
      case 'matchingNotApplied':
        // Show candidates with high fit score who haven't applied yet
        // Use matching fit score with higher threshold
        advancedQuery = `positionId:${jobMatch.jobId} matchingFitScoreMin:80 matchingFitScoreMax:100`;
        break;
    }
    
    // Use setTimeout to prevent rapid state changes
    setTimeout(() => {
      router.replace(`/candidates?query=${encodeURIComponent(advancedQuery)}`);
      onClose();
    }, 100);
  };

  if (!jobMatch) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              {jobMatch.position?.title || jobMatch.jobTitle}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row gap-6 p-6 flex-1 min-h-0">
          {/* Left Column - Job Information and Match Reasons */}
          <div className="lg:flex-1 space-y-6 overflow-y-auto pr-2">
            {/* Job Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Job Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Department:</span>
                      <span className={jobMatch.position?.department ? 'text-foreground' : 'text-muted-foreground italic'}>
                        {jobMatch.position?.department || 'Not specified'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Status:</span>
                      <Badge variant={jobMatch.position?.isOpen ? "default" : "secondary"}>
                        {jobMatch.position?.isOpen ? 'Open' : 'Closed'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">Match Score:</span>
                      <Badge variant="outline" className="text-primary border-primary">
                        {displayFitScoreWithGrade(jobMatch.fitScore)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {jobMatch.position?.description && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Description:</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {jobMatch.position.description}
                    </p>
                  </div>
                )}

                {jobMatch.position?.requirements && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Requirements:</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {jobMatch.position.requirements}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Match Reasons */}
            {Array.isArray(jobMatch.matchReasons) && jobMatch.matchReasons.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Justification</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {jobMatch.matchReasons.map((reason, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-primary text-xs mt-1">•</span>
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Static Candidate Statistics */}
          <div className="lg:w-80 flex-shrink-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Candidate Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-blue-500" />
                      <div>
                        <div className="text-sm font-medium">Applied</div>
                        <div className="text-xs text-muted-foreground">Candidates</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {loadingStats ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          stats.totalApplied
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleNavigateToCandidates('applied')}
                        disabled={isNavigating}
                        className="h-6 px-2 text-xs"
                      >
                        {isNavigating ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            View
                            <ArrowRight className="ml-1 h-3 w-3" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50 dark:bg-green-950/20">
                    <div className="flex items-center gap-3">
                      <UserCheck className="h-5 w-5 text-green-500" />
                      <div>
                        <div className="text-sm font-medium">Matching</div>
                        <div className="text-xs text-muted-foreground">Candidates</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-600 dark:text-green-400">
                        {loadingStats ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          stats.totalMatching
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleNavigateToCandidates('matching')}
                        disabled={isNavigating}
                        className="h-6 px-2 text-xs"
                      >
                        {isNavigating ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            View
                            <ArrowRight className="ml-1 h-3 w-3" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg bg-orange-50 dark:bg-orange-950/20">
                    <div className="flex items-center gap-3">
                      <UserX className="h-5 w-5 text-orange-500" />
                      <div>
                        <div className="text-sm font-medium">Potential</div>
                        <div className="text-xs text-muted-foreground">Not Applied</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                        {loadingStats ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          stats.matchingNotApplied
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleNavigateToCandidates('matchingNotApplied')}
                        disabled={isNavigating}
                        className="h-6 px-2 text-xs"
                      >
                        {isNavigating ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            View
                            <ArrowRight className="ml-1 h-3 w-3" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 