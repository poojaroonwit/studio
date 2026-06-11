import { useEffect } from 'react';
import { toast } from 'react-hot-toast';

import {
  buildApplicantTableFetchRequestId,
  shouldRefreshApplicantFitScoreCountsOnMount,
  shouldSkipApplicantTableFetch,
  shouldStartApplicantRealtimeRefresh,
} from '../applicant-page-utils';
import type { UseApplicantsPageEffectsInput } from './use-applicants-page-effects-types';

export function useApplicantsPageLiveEffects({
  sessionStatus,
  serverAuthError,
  serverPermissionError,
  initialApplicantsCount,
  initialFetchError,
  filters,
  page,
  pageSize,
  sortColumn,
  sortDirection,
  isClearingFilters,
  hasInitialDataFetch,
  realtimeConnected,
  searchParams,
  currentRequestRef,
  filterChangeTimeoutRef,
  batchTimeoutRef,
  fetchTableData,
  fetchAllApplicantsForCounts,
  forceRefreshFitScoreCounts,
  onOpenSearchDrawer,
}: UseApplicantsPageEffectsInput) {
  useEffect(() => {
    const hasAdvancedQuery = Boolean(searchParams.get('query'));
    const requestId = buildApplicantTableFetchRequestId({ filters, page, pageSize, sortColumn, sortDirection });

    if (shouldSkipApplicantTableFetch({
      sessionStatus,
      serverAuthError,
      serverPermissionError,
      isClearingFilters,
      hasInitialDataFetch,
      hasAdvancedQuery,
      filters,
      initialApplicantsCount,
      page,
      pageSize,
      sortColumn,
      sortDirection,
      currentRequestId: currentRequestRef?.current,
    })) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (currentRequestRef?.current !== undefined) {
        currentRequestRef.current = requestId;
      }
      fetchTableData(filters, page, pageSize);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [
    filters,
    page,
    pageSize,
    sortColumn,
    sortDirection,
    sessionStatus,
    serverAuthError,
    serverPermissionError,
    isClearingFilters,
    hasInitialDataFetch,
    initialApplicantsCount,
    searchParams,
    currentRequestRef,
    fetchTableData,
  ]);

  useEffect(() => {
    if (shouldStartApplicantRealtimeRefresh({ realtimeConnected, sessionStatus, hasInitialDataFetch })) {
      const interval = setInterval(() => {
        if (filters) {
          fetchTableData(filters, page, pageSize);
        }
        fetchAllApplicantsForCounts();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [realtimeConnected, sessionStatus, hasInitialDataFetch, filters, page, pageSize, fetchTableData, fetchAllApplicantsForCounts]);

  useEffect(() => {
    if (initialFetchError) {
      toast.error(initialFetchError);
    }
  }, [initialFetchError]);

  useEffect(() => {
    if (shouldRefreshApplicantFitScoreCountsOnMount({
      sessionStatus,
      hasInitialDataFetch,
      initialApplicantsCount,
      hasFilters: Boolean(filters),
    })) {
      forceRefreshFitScoreCounts();
    }
  }, [sessionStatus, hasInitialDataFetch, initialApplicantsCount, filters, forceRefreshFitScoreCounts]);

  useEffect(() => {
    window.addEventListener('applicants:toggle-mobile-search', onOpenSearchDrawer);
    return () => window.removeEventListener('applicants:toggle-mobile-search', onOpenSearchDrawer);
  }, [onOpenSearchDrawer]);

  useEffect(() => {
    return () => {
      if (filterChangeTimeoutRef.current) {
        clearTimeout(filterChangeTimeoutRef.current);
      }

      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, [batchTimeoutRef, filterChangeTimeoutRef]);
}
