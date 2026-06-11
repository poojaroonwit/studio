"use client";

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

import {
  getJsonErrorMessage,
  getJsonString,
  readJsonObject,
  readJsonOrFallback,
} from '../../../lib/response-json';
import {
  applyApplicantSourceSaveResult,
  getApplicantSourceErrorMessage,
  saveApplicantSource,
  type ApplicantSourceSettingsFormData,
} from '../../../components/settings/applicant-source-utils';
import type { ApplicantSource } from '@/lib/types';

export function useApplicantSourcesPage(isAuthenticated: boolean) {
  const [showLogoOnly, setShowLogoOnly] = useState(false);
  const [sources, setSources] = useState<ApplicantSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<ApplicantSource | null>(null);
  const [sourceToDelete, setSourceToDelete] = useState<ApplicantSource | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const fetchSources = useCallback(async () => {
    try {
      setIsLoading(true);
      setFetchError(null);

      const response = await fetch('/api/settings/Applicant-sources');
      if (!response.ok) {
        throw new Error(`Failed to fetch sources: ${response.status}`);
      }

      setSources(await readJsonOrFallback<ApplicantSource[]>(response, []));
    } catch (error) {
      console.error('Failed to fetch sources:', error);
      setFetchError(getApplicantSourceErrorMessage(error, 'Failed to fetch sources'));
      toast.error('Failed to load Applicant sources');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSources();
    }
  }, [fetchSources, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const fetchShowLogoOnly = async () => {
      try {
        const response = await fetch('/api/settings/system-settings');
        if (response.ok) {
          const data = await readJsonObject(response);
          setShowLogoOnly(getJsonString(data, 'showLogoOnly') === 'true' || data.showLogoOnly === true);
        }
      } catch (error) {
        console.error('Error fetching showLogoOnly setting:', error);
      }
    };

    fetchShowLogoOnly();
  }, [isAuthenticated]);

  const openCreateModal = () => {
    setEditingSource(null);
    setIsModalOpen(true);
  };

  const openEditModal = (source: ApplicantSource) => {
    setEditingSource(source);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSource(null);
  };

  const handleModalSubmit = async (data: ApplicantSourceSettingsFormData) => {
    try {
      const result = await saveApplicantSource(data, editingSource);
      setSources(prev => applyApplicantSourceSaveResult(prev, result));
      toast.success(result.mode === 'update'
        ? 'Applicant source updated successfully'
        : 'Applicant source created successfully');

      closeModal();
    } catch (error) {
      console.error('Failed to save source:', error);
      toast.error(getApplicantSourceErrorMessage(error, 'Failed to save Applicant source'));
    }
  };

  const handleDeleteSelected = async () => {
    if (!sourceToDelete) {
      return;
    }

    try {
      const response = await fetch(`/api/settings/Applicant-sources/${sourceToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(getJsonErrorMessage(await readJsonObject(response), 'Failed to delete source'));
      }

      setSources(prev => prev.filter(source => source.id !== sourceToDelete.id));
      toast.success('Applicant source deleted successfully');
      setSourceToDelete(null);
    } catch (error) {
      console.error('Failed to delete source:', error);
      toast.error(getApplicantSourceErrorMessage(error, 'Failed to delete Applicant source'));
    }
  };

  const handleReorder = async (sourceId: string, newSortOrder: number) => {
    try {
      setIsReordering(true);

      const response = await fetch(`/api/settings/Applicant-sources/${sourceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: newSortOrder }),
      });

      if (!response.ok) {
        throw new Error('Failed to update sort order');
      }

      await fetchSources();
      toast.success('Order updated successfully');
    } catch (error) {
      console.error('Failed to reorder:', error);
      toast.error('Failed to update order');
    } finally {
      setIsReordering(false);
    }
  };

  return {
    showLogoOnly,
    sources,
    isLoading,
    fetchError,
    isModalOpen,
    editingSource,
    sourceToDelete,
    isReordering,
    fetchSources,
    openCreateModal,
    openEditModal,
    closeModal,
    handleModalSubmit,
    handleDeleteSelected,
    setSourceToDelete,
    handleReorder,
  };
}
