"use client";

import React from 'react';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';

import { cn } from '@/lib/utils';

import {
  getCandidateInitial,
  getPositionApplicantPreview
} from './candidate-display-utils';
import type { GroupedCandidatePosition } from './candidates-page-utils';

interface PositionGroupHeaderProps {
  position: GroupedCandidatePosition;
  isExpanded: boolean;
  onToggle: () => void;
  onKeyboardClick: (event: React.KeyboardEvent<HTMLElement>) => void;
}

export function PositionGroupHeader({
  position,
  isExpanded,
  onToggle,
  onKeyboardClick
}: PositionGroupHeaderProps): React.ReactElement {
  const applicantCount = position.applicants.length;
  const { previewApplicants, overflowCount } = getPositionApplicantPreview(position.applicants);

  return (
    <div
      className={cn(
        'flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all',
        isExpanded
          ? 'bg-transparent dark:bg-transparent'
          : 'bg-transparent hover:bg-zinc-50 dark:bg-transparent dark:hover:bg-zinc-900/40'
      )}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={onKeyboardClick}
    >
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <h2 className={cn(
            'text-lg font-bold tracking-tight',
            isExpanded ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'
          )}>
            {position.title}
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-zinc-500 flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {applicantCount} {applicantCount === 1 ? 'Candidate' : 'Candidates'}
            </span>
            {position.department && <span className="text-zinc-300 dark:text-zinc-700">|</span>}
            {position.department && <span className="text-sm text-zinc-500">{position.department}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex -space-x-2 mr-2">
          {previewApplicants.map((applicant) => (
            <div
              key={applicant.id}
              className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-200 dark:bg-zinc-800 overflow-hidden flex items-center justify-center text-[10px] font-bold"
            >
              {getCandidateInitial(applicant.name)}
            </div>
          ))}
          {overflowCount > 0 && (
            <div className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-500 font-bold">
              +{overflowCount}
            </div>
          )}
        </div>

        <div className={cn(
          'p-2 rounded-full transition-transform duration-300',
          isExpanded ? 'bg-zinc-200/50 dark:bg-zinc-800' : ''
        )}>
          {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </div>
      </div>
    </div>
  );
}
