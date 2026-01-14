import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Briefcase, ChevronDown, ChevronRight, Copy, Check, Info, ListChecks, Lock } from 'lucide-react';
import { ScoreBadge } from '@/components/ui/score-color';
import { formatScoreWithGrade } from "@/lib/scoreUtils";
import { useSession } from 'next-auth/react';
import type { Candidate, Position } from '@/lib/types';
import { hasAnyPermission } from '@/lib/permissions';

interface JobsTabProps {
  candidate: Candidate;
  allDbPositions: Position[];
  isEditing: boolean;
  candidateJobMatches: any[];
  onJobMatchClick: (jobMatch: any) => void;
  onCopyJobMatch: (match: any, index: number) => void;
  copiedJobMatchIndex: number | null;
  onCopyJobApplied: () => void;
  copiedJobApplied: boolean;
  appliedJobId: string | null;
  appliedFitScore: number | null;
  appliedJustification: string[];
  appliedJobBadge: React.ReactNode;
}

export const JobsTab: React.FC<JobsTabProps> = ({
  candidate,
  allDbPositions,
  isEditing,
  candidateJobMatches,
  onJobMatchClick,
  onCopyJobMatch,
  copiedJobMatchIndex,
  onCopyJobApplied,
  copiedJobApplied,
  appliedJobId,
  appliedFitScore,
  appliedJustification,
  appliedJobBadge
}) => {
  const [jobAppliedOpen, setJobAppliedOpen] = useState(true);
  const [jobMatchesOpen, setJobMatchesOpen] = useState(true);
  const { data: session } = useSession();

  // Check permissions
  const canViewJobMatches = hasAnyPermission(session?.user, ['JOB_MATCH_VIEW']);
  const canManageJobMatches = hasAnyPermission(session?.user, ['JOB_MATCH_MANAGE']);

  return (
    <>
      {/* Expected Salary Section */}
      <section className="mb-6">
        <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center">
          <div className="mr-3 p-2 bg-gradient-to-br from-green-500/20 to-green-600/30 rounded-lg">
            <span className="text-green-600 dark:text-green-400 font-bold text-lg">฿</span>
          </div>
          Expected Salary
        </h2>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Expected Monthly Salary:</span>
            {candidate.expectedSalary ? (
              <span className="text-xl font-bold text-green-600 dark:text-green-400">
                ฿{candidate.expectedSalary.toLocaleString()}
              </span>
            ) : (
              <span className="text-muted-foreground italic">Not specified</span>
            )}
          </div>
        </Card>
      </section>

      {/* Job Applied Section */}
      <section className="mb-4">
        <div className="flex items-center justify-between mb-6">
          <button type="button" className="flex items-center w-full group" onClick={() => setJobAppliedOpen(o => !o)}>
            <div className="mr-3 p-2 bg-gradient-to-br from-blue-500/20 to-blue-600/30 rounded-lg">
              <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold tracking-tight flex-1 text-left">Job Applied</h2>
            {jobAppliedOpen ? <ChevronDown className="transition-transform group-hover:rotate-180" /> : <ChevronRight className="transition-transform" />}
          </button>
          {appliedJobId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCopyJobApplied}
              className="h-8 w-8 p-0"
              title="Copy job applied information"
            >
              {copiedJobApplied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        {jobAppliedOpen && (
          <div className="space-y-4 transition-all duration-200">
            {appliedJobId ? (
              <div
                className="relative rounded-lg cursor-pointer hover:shadow-xl transition-all duration-200 text-foreground"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))',
                  padding: '2px',
                  boxShadow: '0 4px 12px -2px hsla(var(--primary), 0.4), 0 2px 4px -1px hsla(var(--primary), 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'brightness(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'brightness(1)';
                }}
                onClick={() => {
                  // console.log('Job Applied card clicked');
                  const position = Array.isArray(allDbPositions) ? allDbPositions.find(p => p.id === appliedJobId) : null;
                  if (position) {
                    let normalizedFitScore = 0;
                    if (typeof appliedFitScore === 'number' && !isNaN(appliedFitScore)) {
                      if (appliedFitScore > 1 && appliedFitScore <= 100) {
                        normalizedFitScore = appliedFitScore / 100;
                      } else if (appliedFitScore >= 0 && appliedFitScore <= 1) {
                        normalizedFitScore = appliedFitScore;
                      }
                    }
                    const appliedJobData = {
                      jobId: appliedJobId,
                      jobTitle: position.title,
                      fitScore: normalizedFitScore,
                      matchReasons: appliedJustification || [],
                      position: {
                        id: position.id,
                        title: position.title,
                        description: position.description,
                        department: position.department,
                        location: (position as any).location,
                        salary: (position as any).salary,
                        requirements: (position as any).requirements,
                        isOpen: position.isOpen,
                      }
                    };
                    onJobMatchClick(appliedJobData);
                  }
                }}
              >
                <div className="rounded-lg p-4 h-full border shadow-lg bg-card">
                  <div className="mb-1">
                    <h4 className="font-semibold text-foreground text-lg">
                      {Array.isArray(allDbPositions) ? allDbPositions.find(p => p.id === appliedJobId)?.title || 'Unknown Position' : 'Unknown Position'}
                    </h4>
                  </div>
                  {(() => {
                    const position = Array.isArray(allDbPositions) ? allDbPositions.find(p => p.id === appliedJobId) : null;
                    return position?.positionLevel ? (
                      <div className="text-sm text-muted-foreground mb-2">
                        {position.positionLevel}
                      </div>
                    ) : null;
                  })()}
                  {appliedJobBadge && (
                    <div className="mb-2">
                      {appliedJobBadge}
                    </div>
                  )}
                  {appliedJustification.length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Justification:
                      </h5>
                      <div className="space-y-2">
                        {appliedJustification.map((sentence: string, index: number) => {
                          const trimmedSentence = sentence.trim();
                          if (!trimmedSentence) return null;
                          return (
                            <div
                              key={index}
                              className="text-sm text-foreground px-3 py-2 rounded shadow-sm bg-muted"
                            >
                              {trimmedSentence}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No position applied for.</p>
                <p className="text-sm">Click "Edit" to select the position this candidate applied for.</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Job Matches Section */}
      <section className="mb-4">
        <button type="button" className="flex items-center mb-6 w-full group" onClick={() => setJobMatchesOpen(o => !o)}>
          <ListChecks className="mr-2 h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold tracking-tight flex-1 text-left">
            Job Matches
            {candidateJobMatches && candidateJobMatches.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({candidateJobMatches.length})
              </span>
            )}
          </h2>
          {jobMatchesOpen ? <ChevronDown className="transition-transform group-hover:rotate-180" /> : <ChevronRight className="transition-transform" />}
        </button>
        {jobMatchesOpen && (
          <div className="space-y-4 transition-all duration-200">
            {!canViewJobMatches ? (
              <div className="text-center py-8 text-muted-foreground">
                <Lock className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Access Denied</p>
                <p className="text-sm">You don't have permission to view job matches.</p>
                <p className="text-xs mt-2">Contact your administrator to request access.</p>
              </div>
            ) : (
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
                            {match.matchReasons && Array.isArray(match.matchReasons) && match.matchReasons.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Match reasons:</p>
                                <ul className="text-sm space-y-1">
                                  {match.matchReasons.slice(0, 3).map((reason: string, reasonIndex: number) => (
                                    <li key={reasonIndex} className="flex items-start gap-2">
                                      <span className="text-primary text-xs mt-1">•</span>
                                      <span>{reason}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ListChecks className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No job matches found for this candidate.</p>
                    <p className="text-sm">Job matches will appear here if the candidate matches any positions.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
};
