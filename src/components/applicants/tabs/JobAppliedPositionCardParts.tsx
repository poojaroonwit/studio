import {
  BanknotesIcon as Banknote,
  BriefcaseIcon as Briefcase,
  CheckIcon as Check,
  DocumentDuplicateIcon as Copy,
  InformationCircleIcon as Info,
  PencilSquareIcon as Edit2,
} from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/button';
import { ScoreBadge } from '@/components/ui/score-color';
import { formatScoreWithGrade } from '@/lib/scoreUtils';
import type { Position } from '@/lib/types';
import type { UseFormRegister } from 'react-hook-form';
import type { EditApplicantFormValues } from '../hooks/use-applicant-detail-edit-form';
import { formatJobAppliedExpectedSalary } from './job-applied-tab-utils';

export function JobAppliedCopyButton({
  copiedJobApplied,
  onCopyJobApplied,
}: {
  copiedJobApplied: boolean;
  onCopyJobApplied: () => void;
}) {
  return (
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
  );
}

export function JobAppliedEmptyState() {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <Briefcase className="mx-auto h-12 w-12 mb-4 opacity-50" />
      <p>No position applied for.</p>
      <p className="text-sm">Click "Edit" to select the position this Applicant applied for.</p>
    </div>
  );
}

export function JobAppliedPositionHeader({
  appliedFitScore,
  appliedPosition,
  orgLogoUrl,
}: {
  appliedFitScore: number | null;
  appliedPosition: Position | null;
  orgLogoUrl?: string | null;
}) {
  return (
    <div className="mb-1">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-foreground text-lg flex items-center gap-2">
          {orgLogoUrl && (
            <img
              src={orgLogoUrl}
              alt="Logo"
              className="h-6 w-6 object-contain flex-shrink-0 rounded-sm"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          )}
          <span>{appliedPosition?.title || 'Unknown Position'}</span>
        </h4>
        {appliedFitScore !== null && appliedFitScore !== undefined && (
          <ScoreBadge score={appliedFitScore} className="text-sm">
            {formatScoreWithGrade(appliedFitScore)}
          </ScoreBadge>
        )}
      </div>
    </div>
  );
}

export function JobAppliedSalaryRow({
  expectedSalary,
  isEditing,
  onEditSalary,
  register,
}: {
  expectedSalary?: number | null;
  isEditing: boolean;
  onEditSalary: () => void;
  register?: UseFormRegister<EditApplicantFormValues>;
}) {
  return (
    <div
      className="flex items-center gap-2 text-sm text-muted-foreground mb-2"
      onClick={(event) => event.stopPropagation()}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.currentTarget.click();
        }
      }}
    >
      <Banknote className="h-3.5 w-3.5" />
      {isEditing && register ? (
        <div className="flex items-center gap-2 flex-1 max-w-[200px]">
          <span className="text-xs">THB</span>
          <input
            {...register('expectedSalary')}
            type="number"
            placeholder="Expected Salary"
            className="h-7 w-full bg-background/50 border border-input/50 rounded px-2 text-xs focus:ring-1 focus:ring-primary"
          />
        </div>
      ) : (
        <>
          <span>Expected: {formatJobAppliedExpectedSalary(expectedSalary)}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-muted rounded-full ml-1"
            onClick={(event) => {
              event.stopPropagation();
              onEditSalary();
            }}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        </>
      )}
    </div>
  );
}

export function JobAppliedJustifications({ justifications }: { justifications: string[] }) {
  if (justifications.length === 0) {
    return null;
  }

  return (
    <div className="mt-3">
      <h5 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
        <Info className="h-3 w-3" />
        Justification:
      </h5>
      <div className="space-y-2">
        {justifications.map((sentence, index) => (
          <div
            key={`${sentence}-${index}`}
            className="text-sm text-foreground px-3 py-2 rounded shadow-sm bg-muted"
          >
            {sentence}
          </div>
        ))}
      </div>
    </div>
  );
}
