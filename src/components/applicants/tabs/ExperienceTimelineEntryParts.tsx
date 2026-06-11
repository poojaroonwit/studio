import type { ReactNode } from 'react';
import { BuildingOffice2Icon as Building2 } from '@heroicons/react/24/outline';

import { formatScoreWithGrade } from '@/lib/scoreUtils';
import { isVisiblePositionLevel } from './experience-tab-utils';
import type { ExperienceDisplayEntry } from './ExperienceTabTypes';

export function ExperiencePeriod({
  duration,
  periodDisplay,
}: {
  duration: string;
  periodDisplay: ReactNode;
}) {
  if (!periodDisplay && !duration) {
    return null;
  }

  return (
    <>
      {periodDisplay && <span>{periodDisplay}</span>}
      {duration && (
        <>
          <span>-</span>
          <span>{duration}</span>
        </>
      )}
    </>
  );
}

export function ExperiencePositionHeading({
  entry,
  isMobile = false,
}: {
  entry: ExperienceDisplayEntry;
  isMobile?: boolean;
}) {
  const positionLevel = isVisiblePositionLevel(entry.positionLevel)
    ? ` (${entry.positionLevel})`
    : '';

  if (isMobile) {
    return (
      <h4 className="text-sm font-semibold text-foreground leading-tight mb-1">
        {entry.position || 'Position not specified'}
        {positionLevel && <span className="text-xs text-muted-foreground font-normal">{positionLevel}</span>}
      </h4>
    );
  }

  return (
    <div className="mb-2">
      <span className="text-sm text-primary font-semibold">
        {entry.position || 'Position not specified'}
      </span>
      {positionLevel && (
        <span className="text-sm text-foreground font-semibold">
          {positionLevel}
        </span>
      )}
    </div>
  );
}

export function ExperienceCompanyLine({
  company,
  isMobile = false,
}: {
  company?: string | null;
  isMobile?: boolean;
}) {
  if (!company) {
    return null;
  }

  if (isMobile) {
    return (
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Building2 className="h-3 w-3" />
        {company}
      </p>
    );
  }

  return (
    <div className="mb-3 flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs text-foreground">{company}</span>
    </div>
  );
}

export function ExperienceFitScore({
  fitScore,
  isMobile = false,
}: {
  fitScore: number | null;
  isMobile?: boolean;
}) {
  if (fitScore === null) {
    return null;
  }

  if (isMobile) {
    return (
      <div className="flex flex-col items-center flex-shrink-0">
        <span className="text-xl font-bold text-primary leading-none">{formatScoreWithGrade(fitScore)}</span>
        <span className="text-[10px] text-muted-foreground">{fitScore}%</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center ml-6">
      <span className="text-4xl font-extrabold text-primary leading-none">{formatScoreWithGrade(fitScore)}</span>
      <span className="text-lg text-muted-foreground font-semibold mt-1">
        {formatScoreWithGrade(fitScore)}
      </span>
    </div>
  );
}
