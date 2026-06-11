import React from 'react';
import {
  BriefcaseIcon as Briefcase,
} from '@heroicons/react/24/outline';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Position } from '@/lib/types';
import type { UseFormRegister } from 'react-hook-form';
import type { EditApplicantFormValues } from '../hooks/use-applicant-detail-edit-form';
import {
  getNonEmptyJobAppliedJustifications,
} from './job-applied-tab-utils';
import {
  JobAppliedCopyButton,
  JobAppliedEmptyState,
  JobAppliedJustifications,
  JobAppliedPositionHeader,
  JobAppliedSalaryRow,
} from './JobAppliedPositionCardParts';

interface JobAppliedPositionCardProps {
  appliedJobId: string | null;
  appliedPosition: Position | null;
  appliedFitScore: number | null;
  appliedJustification: string[];
  appliedJobBadge: React.ReactNode;
  copiedJobApplied: boolean;
  isEditing: boolean;
  orgLogoUrl?: string | null;
  expectedSalary?: number | null;
  register?: UseFormRegister<EditApplicantFormValues>;
  onCopyJobApplied: () => void;
  onOpenPositionDrawer: (positionId: string) => void;
  onEditSalary: () => void;
}

export function JobAppliedPositionCard({
  appliedJobId,
  appliedPosition,
  appliedFitScore,
  appliedJustification,
  appliedJobBadge,
  copiedJobApplied,
  isEditing,
  orgLogoUrl,
  expectedSalary,
  register,
  onCopyJobApplied,
  onOpenPositionDrawer,
  onEditSalary,
}: JobAppliedPositionCardProps) {
  const justifications = getNonEmptyJobAppliedJustifications(appliedJustification);

  return (
    <Card className="bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-600" />
            Job Applied
          </CardTitle>
          {appliedJobId && (
            <JobAppliedCopyButton
              copiedJobApplied={copiedJobApplied}
              onCopyJobApplied={onCopyJobApplied}
            />
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
            onClick={(e) => {
              e.stopPropagation();
              onOpenPositionDrawer(appliedJobId);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.currentTarget.click();
              }
            }}
          >
            <JobAppliedPositionHeader
              appliedFitScore={appliedFitScore}
              appliedPosition={appliedPosition}
              orgLogoUrl={orgLogoUrl}
            />
            {appliedPosition?.positionLevel ? (
              <div className="text-sm text-muted-foreground mb-2">
                {appliedPosition.positionLevel}
              </div>
            ) : null}

            <JobAppliedSalaryRow
              expectedSalary={expectedSalary}
              isEditing={isEditing}
              onEditSalary={onEditSalary}
              register={register}
            />
            {appliedJobBadge && (
              <div className="mb-2">
                {appliedJobBadge}
              </div>
            )}
            <JobAppliedJustifications justifications={justifications} />
          </div>
        ) : (
          <JobAppliedEmptyState />
        )}
      </CardContent>
    </Card>
  );
}
