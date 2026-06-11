"use client";

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import ApplicantSourceAlertDialog from '@/components/settings/ApplicantSourceAlertDialog';
import ApplicantSourceModal from '@/components/settings/ApplicantSourceModal';

import {
  ApplicantSourcesErrorBanner,
  ApplicantSourcesHeader,
  ApplicantSourcesTable,
} from './ApplicantSourcesPageParts';
import { useApplicantSourcesPage } from './use-applicant-sources-page';

export default function ApplicantSourcesPage() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const isAuthenticated = sessionStatus === 'authenticated';

  const {
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
  } = useApplicantSourcesPage(isAuthenticated);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [router, sessionStatus]);

  if (sessionStatus === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (sessionStatus === 'unauthenticated') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <ApplicantSourcesHeader
        showLogoOnly={showLogoOnly}
        onCreate={openCreateModal}
      />

      {fetchError && (
        <ApplicantSourcesErrorBanner
          message={fetchError}
          onRetry={fetchSources}
        />
      )}

      <ApplicantSourcesTable
        sources={sources}
        isLoading={isLoading}
        isReordering={isReordering}
        onEdit={openEditModal}
        onDelete={setSourceToDelete}
        onReorder={handleReorder}
      />

      <ApplicantSourceModal
        open={isModalOpen}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        source={editingSource}
      />

      <ApplicantSourceAlertDialog
        open={!!sourceToDelete}
        onConfirm={handleDeleteSelected}
        onCancel={() => setSourceToDelete(null)}
        source={sourceToDelete}
      />
    </div>
  );
}
