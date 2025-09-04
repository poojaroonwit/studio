import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Copy, Check, Info } from 'lucide-react';
import { ScoreBadge } from '@/components/ui/score-color';
import { formatScoreWithGrade } from "@/lib/scoreUtils";
import type { Candidate, Position } from '@/lib/types';

interface JobAppliedTabProps {
  candidate: Candidate;
  allDbPositions: Position[];
  isEditing: boolean;
  onCopyJobApplied: () => void;
  copiedJobApplied: boolean;
  appliedJobId: string | null;
  appliedFitScore: number | null;
  appliedJustification: string[];
  appliedJobBadge: React.ReactNode;
  onOpenPositionDrawer: (positionId: string) => void;
}

export const JobAppliedTab: React.FC<JobAppliedTabProps> = ({
  candidate,
  allDbPositions,
  isEditing,
  onCopyJobApplied,
  copiedJobApplied,
  appliedJobId,
  appliedFitScore,
  appliedJustification,
  appliedJobBadge,
  onOpenPositionDrawer
}) => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              Job Applied
            </CardTitle>
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
        </CardHeader>
        <CardContent>
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
              onClick={() => onOpenPositionDrawer(appliedJobId)}
            >
                <div className="mb-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground text-lg">
                      {Array.isArray(allDbPositions) ? allDbPositions.find(p => p.id === appliedJobId)?.title || 'Unknown Position' : 'Unknown Position'}
                    </h4>
                    {appliedFitScore !== null && appliedFitScore !== undefined && (
                      <ScoreBadge score={appliedFitScore} className="text-sm">
                        {formatScoreWithGrade(appliedFitScore)}
                      </ScoreBadge>
                    )}
                  </div>
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
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Briefcase className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No position applied for.</p>
              <p className="text-sm">Click "Edit" to select the position this candidate applied for.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
