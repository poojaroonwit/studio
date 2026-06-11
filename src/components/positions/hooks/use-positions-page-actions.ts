"use client";

import { useCallback, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';

import type { Position } from '@/lib/types';

import type { usePositionReferenceData } from './use-position-reference-data';
import type { usePositionsPageFilters } from './use-positions-page-filters';
import type { usePositionsPageUiState } from './use-positions-page-ui-state';

type PositionsPageActionsOptions = {
  fetchPositions: () => void;
  filters: ReturnType<typeof usePositionsPageFilters>;
  isMobile: boolean;
  referenceData: Pick<ReturnType<typeof usePositionReferenceData>, 'fetchRecruiterStats'>;
  uiState: Pick<
    ReturnType<typeof usePositionsPageUiState>,
    | 'setEditingPositionId'
    | 'setIsEditDrawerOpen'
    | 'setIsNewDrawerOpen'
    | 'setPositionToDelete'
    | 'setSelectedPositionId'
  >;
};

export function usePositionsPageActions({
  fetchPositions,
  filters,
  isMobile,
  referenceData,
  uiState,
}: PositionsPageActionsOptions) {
  const router = useRouter();

  const openPosition = useCallback((positionId: string) => {
    if (isMobile) {
      router.push(`/positions/${positionId}`);
      return;
    }

    uiState.setSelectedPositionId(positionId);
    uiState.setIsNewDrawerOpen(true);
  }, [isMobile, router, uiState]);

  const editPosition = useCallback((positionId: string) => {
    if (isMobile) {
      router.push(`/positions/${positionId}?edit=true`);
      return;
    }

    uiState.setEditingPositionId(positionId);
    uiState.setIsEditDrawerOpen(true);
  }, [isMobile, router, uiState]);

  const handleMobileEditClick = useCallback((positionId: string, event: MouseEvent) => {
    event.stopPropagation();
    editPosition(positionId);
  }, [editPosition]);

  const handleMobileDeleteClick = useCallback((position: Position, event: MouseEvent) => {
    event.stopPropagation();
    uiState.setPositionToDelete(position);
  }, [uiState]);

  const handleImportSuccess = useCallback(() => {
    fetchPositions();
    referenceData.fetchRecruiterStats();
  }, [fetchPositions, referenceData]);

  const handlePageChange = useCallback((newPage: number) => {
    filters.setPage(newPage);
    filters.updateURL(newPage);
  }, [filters]);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    filters.setPageSize(newPageSize);
    filters.setPage(1);
    filters.updateURL(1, newPageSize);
  }, [filters]);

  return {
    editPosition,
    handleImportSuccess,
    handleMobileDeleteClick,
    handleMobileEditClick,
    handlePageChange,
    handlePageSizeChange,
    openPosition,
  };
}
