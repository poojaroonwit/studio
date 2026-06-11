"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';

import { useIsMobile } from '@/hooks/use-mobile';
import type { RecruitmentStage } from '@/lib/types';
import type { CandidateDisplayApplicant, CandidateViewMode } from './candidate-display-utils';
import {
  filterCandidatePositions,
  getCandidatePageErrorMessage,
  getDefaultPipelineStageIds,
  isCandidatesFilterActive,
  type CandidateOpenFilter,
  type GroupedCandidatePosition,
} from './candidates-page-utils';
import {
  fetchCandidatePositions,
  fetchCandidateRecruitmentStages,
} from './candidates-page-api';

export function useCandidatesPage() {
  const [data, setData] = useState<GroupedCandidatePosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<CandidateViewMode>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateDisplayApplicant | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);
  const [isOpenFilter, setIsOpenFilter] = useState<CandidateOpenFilter>(true);
  const [mineOnlyFilter, setMineOnlyFilter] = useState(true);
  const [pipelineOnlyFilter, setPipelineOnlyFilter] = useState<string[]>([]);
  const [isPipelineFilterInitialized, setIsPipelineFilterInitialized] = useState(false);
  const [stages, setStages] = useState<RecruitmentStage[]>([]);
  const [isStagesLoading, setIsStagesLoading] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) {
      setViewMode('list');
    }
  }, [isMobile]);

  const fetchStages = useCallback(async () => {
    setIsStagesLoading(true);
    try {
      const result = await fetchCandidateRecruitmentStages();
      setStages(result);
      setPipelineOnlyFilter(getDefaultPipelineStageIds(result));
    } catch (err) {
      console.error('Error fetching stages:', err);
      setError('Could not load recruitment stages');
    } finally {
      setIsPipelineFilterInitialized(true);
      setIsStagesLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchCandidatePositions({ isOpenFilter, mineOnlyFilter, pipelineOnlyFilter }));
      setError(null);
    } catch (err) {
      setError(getCandidatePageErrorMessage(err, 'Failed to fetch candidates'));
      toast.error('Could not load candidates');
    } finally {
      setLoading(false);
    }
  }, [isOpenFilter, mineOnlyFilter, pipelineOnlyFilter]);

  useEffect(() => {
    void fetchStages();

    const handleOpenSearch = () => setIsSearchDrawerOpen(true);
    window.addEventListener('candidates:toggle-mobile-search', handleOpenSearch);
    return () => window.removeEventListener('candidates:toggle-mobile-search', handleOpenSearch);
  }, [fetchStages]);

  useEffect(() => {
    if (!isPipelineFilterInitialized) return;
    void fetchData();
  }, [fetchData, isPipelineFilterInitialized]);

  const handleCandidateClick = useCallback((candidate: CandidateDisplayApplicant) => {
    setSelectedCandidate(candidate);
    setIsDetailOpen(true);
  }, []);

  const closeDetail = useCallback(() => {
    setIsDetailOpen(false);
    setTimeout(() => setSelectedCandidate(null), 300);
  }, []);

  const filteredData = useMemo(() => filterCandidatePositions(data, searchQuery), [data, searchQuery]);
  const hasActiveFilters = isCandidatesFilterActive({
    isOpenFilter,
    mineOnlyFilter,
    pipelineOnlyFilter,
  });

  return {
    closeDetail,
    error,
    fetchData,
    filteredData,
    handleCandidateClick,
    hasActiveFilters,
    isDetailOpen,
    isMobile,
    isOpenFilter,
    isSearchDrawerOpen,
    isStagesLoading,
    loading,
    mineOnlyFilter,
    pipelineOnlyFilter,
    searchQuery,
    selectedCandidate,
    setIsOpenFilter,
    setIsSearchDrawerOpen,
    setMineOnlyFilter,
    setPipelineOnlyFilter,
    setSearchQuery,
    setViewMode,
    stages,
    viewMode,
  };
}
