"use client";

import React from 'react';
import { getPositionGroupContentClassName } from './candidate-display-utils';
import { CandidateCardGrid, CandidateListView } from './PositionGroupCandidateViews';
import { PositionGroupEmptyState } from './PositionGroupEmptyState';
import { CandidateTableView } from './PositionGroupTableView';
import type { PositionGroupContentProps } from './position-group-types';

export function PositionGroupContent({
  applicants,
  viewMode,
  onCandidateClick,
  onKeyboardClick
}: PositionGroupContentProps): React.ReactElement {
  if (applicants.length === 0) {
    return <PositionGroupEmptyState />;
  }

  return (
    <div className={getPositionGroupContentClassName(viewMode)}>
      {viewMode === 'card' && (
        <CandidateCardGrid applicants={applicants} onCandidateClick={onCandidateClick} />
      )}
      {viewMode === 'list' && (
        <CandidateListView
          applicants={applicants}
          onCandidateClick={onCandidateClick}
          onKeyboardClick={onKeyboardClick}
        />
      )}
      {viewMode === 'table' && (
        <CandidateTableView
          applicants={applicants}
          onCandidateClick={onCandidateClick}
          onKeyboardClick={onKeyboardClick}
        />
      )}
    </div>
  );
}
