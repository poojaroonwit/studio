import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Copy, Check, Lock } from 'lucide-react';
import { ScoreBadge } from '@/components/ui/score-color';
import { formatScoreWithGrade } from "@/lib/scoreUtils";
import { useSession } from 'next-auth/react';
import type { Candidate, Position } from '@/lib/types';
import { hasAnyPermission } from '@/lib/permissions';

interface JobMatchTabProps {
  candidate: Candidate;
  allDbPositions: Position[];
  isEditing: boolean;
  candidateJobMatches: any[];
  onJobMatchClick: (jobMatch: any) => void;
  onCopyJobMatch: (match: any, index: number) => void;
  copiedJobMatchIndex: number | null;
}

export const JobMatchTab: React.FC<JobMatchTabProps> = ({
  candidate,
  allDbPositions,
  isEditing,
  candidateJobMatches,
  onJobMatchClick,
  onCopyJobMatch,
  copiedJobMatchIndex
}) => {
  const { data: session } = useSession();
  
  // Check permissions
  const canViewJobMatches = hasAnyPermission(session?.user, ['JOB_MATCH_VIEW']);
  const canManageJobMatches = hasAnyPermission(session?.user, ['JOB_MATCH_MANAGE']);

  // If user can't view job matches, show access denied
  if (!canViewJobMatches) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Job Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Lock className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Access Denied</p>
              <p className="text-sm">You don't have permission to view job matches.</p>
              <p className="text-xs mt-2">Contact your administrator to request access.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Job Matches
            {candidateJobMatches && candidateJobMatches.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({candidateJobMatches.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {candidateJobMatches && candidateJobMatches.length > 0 ? (
              <div className="grid gap-4">
                {candidateJobMatches.map((match: any, index: number) => {
                  const position = Array.isArray(allDbPositions) ? 
                                 (allDbPositions.find(p => p.id === match.jobId) || 
                                  allDbPositions.find(p => p.title === match.jobTitle)) : null;
                  
                  const displayTitle = position?.title || match.jobTitle || match.positionTitle || 'Unknown Position';
                  
                  return (
                    <Card key={index} className={`p-4 transition-shadow relative group ${canManageJobMatches ? 'cursor-pointer hover:shadow-md' : ''}`} onClick={canManageJobMatches ? () => onJobMatchClick(match) : undefined}>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{displayTitle}</h4>
                          <div className="flex items-center gap-2">
                            {match.fitScore !== undefined && match.fitScore !== null && (
                              <ScoreBadge score={match.fitScore}>
                                {formatScoreWithGrade(match.fitScore)}
                              </ScoreBadge>
                            )}
                            {canManageJobMatches && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCopyJobMatch(match, index);
                                }}
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Copy job match information"
                              >
                                {copiedJobMatchIndex === index ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {match.matchReasons && match.matchReasons.length > 0 && (
                          <div className="mt-3">
                            <h5 className="text-sm font-medium text-muted-foreground mb-2">Match Reasons:</h5>
                            <div className="space-y-2">
                              {match.matchReasons.map((reason: string, reasonIndex: number) => {
                                const trimmedReason = reason.trim();
                                if (!trimmedReason) return null;
                                return (
                                  <div 
                                    key={reasonIndex}
                                    className="text-sm text-foreground px-3 py-2 rounded shadow-sm bg-muted"
                                  >
                                    {trimmedReason}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        
                        {position && (
                          <div className="mt-3 text-sm text-muted-foreground">
                            <div className="grid grid-cols-2 gap-4">
                              {position.department && (
                                <div>
                                  <span className="font-medium">Department:</span> {position.department}
                                </div>
                              )}
                              {(position as any).location && (
                                <div>
                                  <span className="font-medium">Location:</span> {(position as any).location}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No job matches found.</p>
                <p className="text-sm">The system will automatically find matching positions based on the candidate's profile.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
