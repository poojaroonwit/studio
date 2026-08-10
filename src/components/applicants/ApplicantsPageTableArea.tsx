"use client";

import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { getApplicantTablePaginationState } from './applicant-page-utils';
import { ApplicantsPageTableAreaFooters } from './ApplicantsPageTableAreaFooters';
import { ApplicantsPageTableAreaSurfaceBridge } from './ApplicantsPageTableAreaSurfaceBridge';
import type { ApplicantsPageTableAreaProps } from './ApplicantsPageTableAreaTypes';

export function ApplicantsPageTableArea(props: ApplicantsPageTableAreaProps) {
  const {
    aiMatchedApplicantIds,
    aiRecordCount,
    fetchTableData,
    filters,
    isAiSearchActive,
    page,
    pageSize,
    total,
    totalPages,
  } = props;
  const isMobile = useIsMobile();

  const handleRefresh = async () => {
    await fetchTableData(filters, page, pageSize);
  };

  const {
    elementRef: pullToRefreshRef,
    isRefreshing,
    pullProgress,
  } = usePullToRefresh({
    onRefresh: handleRefresh,
    enabled: isMobile,
  });
  const paginationState = getApplicantTablePaginationState({
    isAiSearchActive,
    aiMatchedApplicantIds,
    aiRecordCount,
    total,
    page,
    pageSize,
    totalPages,
  });

  return (
    <>
      <ApplicantsPageTableAreaSurfaceBridge
        {...props}
        isMobile={isMobile}
        pullProgress={pullProgress}
        isRefreshing={isRefreshing}
        pullToRefreshRef={pullToRefreshRef as React.RefObject<HTMLDivElement>}
      />
      <ApplicantsPageTableAreaFooters
        {...props}
        isMobile={isMobile}
        paginationState={paginationState}
      />
    </>
  );
}
