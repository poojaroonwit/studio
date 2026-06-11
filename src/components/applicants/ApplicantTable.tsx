"use client";

import {
  Table,
  TableBody,
  TableHeader,
} from '@/components/ui/table';

import ApplicantDetailModal from './ApplicantDetailModal';
import {
  ApplicantDeleteDialog,
  ApplicantDesktopRows,
  ApplicantMobileSections,
  ApplicantTableEmptyState,
  ApplicantTableHeaderRow,
  ApplicantTableLoadingState,
} from './ApplicantTableSections';
import type { ApplicantTableProps } from './ApplicantTableTypes';
import { useApplicantTableController } from './use-applicant-table-controller';

export function ApplicantTable({
  applicants,
  allPinnedApplicants = [],
  availablePositions,
  availableStages,
  availableRecruiter,
  availableSources,
  onAssignRecruiter,
  onAssignSource,
  onDeleteApplicant,
  isLoading,
  onRefreshApplicantData,
  selectedApplicantIds,
  onToggleSelectApplicant,
  onToggleSelectAllApplicants,
  isAllApplicantsSelected,
  baseIndex = 0,
  sortColumn,
  sortDirection,
  onSort,
  canEditApplicants = false,
  canDeleteApplicants = false,
  canViewDetailed = false,
  canAssignSource = false,
  settings,
}: ApplicantTableProps) {
  const table = useApplicantTableController({
    applicants,
    allPinnedApplicants,
    availableRecruiter,
    availableSources,
    availableStages,
    canAssignSource,
    canDeleteApplicants,
    canEditApplicants,
    canViewDetailed,
    onAssignRecruiter,
    onAssignSource,
    onDeleteApplicant,
    onRefreshApplicantData,
    onToggleSelectApplicant,
    selectedApplicantIds,
    settings,
  });

  if (isLoading) {
    return (
      <ApplicantTableLoadingState
        isJobMatchEnabled={table.isJobMatchEnabled}
        settings={settings}
        showSelectAll={false}
        sortColumn={sortColumn || null}
        sortDirection={sortDirection || null}
        onSort={onSort}
        visibleColumnCount={table.visibleColumnCount}
      />
    );
  }

  if (!Array.isArray(applicants) || applicants.length === 0) {
    return <ApplicantTableEmptyState />;
  }

  if (table.isMobile) {
    return (
      <>
        <ApplicantMobileSections
          allApplicants={applicants}
          allDbPositions={availablePositions}
          applicantsByPinStatus={table.applicantsByPinStatus}
          baseIndex={baseIndex}
          onApplicantClick={table.handleRowClick}
          onToggleSelectApplicant={onToggleSelectApplicant}
          selectedApplicantIds={table.safeSelectedApplicantIds}
          settings={settings}
          stageColors={table.stageColors}
          stageNames={table.stageNames}
        />

        <ApplicantTableDialogs
          applicantToDelete={table.applicantToDelete}
          isDetailModalOpen={table.isDetailModalOpen}
          onCancelDelete={table.cancelDelete}
          onCloseDetail={table.closeApplicantDetail}
          onConfirmDelete={table.executeDelete}
          selectedApplicantSummary={table.selectedApplicantSummary}
        />
      </>
    );
  }

  return (
    <>
      <div className="overflow-hidden table-container-responsive">
        <div className="h-full w-full overflow-auto table-scrollbar">
          <Table className="min-w-full table-content-expandable table-fixed [&_td]:overflow-hidden [&_th]:overflow-hidden">
            <TableHeader>
              <ApplicantTableHeaderRow
                isAllApplicantsSelected={isAllApplicantsSelected}
                isJobMatchEnabled={table.isJobMatchEnabled}
                onSort={onSort}
                onToggleSelectAllApplicants={onToggleSelectAllApplicants}
                settings={settings}
                showSelectAll
                sortColumn={sortColumn || null}
                sortDirection={sortDirection || null}
              />
            </TableHeader>
            <TableBody>
              <ApplicantDesktopRows
                applicants={applicants}
                applicantsByPinStatus={table.applicantsByPinStatus}
                baseIndex={baseIndex}
                renderApplicantRows={table.renderApplicantRows}
                settings={settings}
                visibleColumnCount={table.visibleColumnCount}
              />
            </TableBody>
          </Table>
        </div>
      </div>

      <ApplicantTableDialogs
        applicantToDelete={table.applicantToDelete}
        isDetailModalOpen={table.isDetailModalOpen}
        onCancelDelete={table.cancelDelete}
        onCloseDetail={table.closeApplicantDetail}
        onConfirmDelete={table.executeDelete}
        selectedApplicantSummary={table.selectedApplicantSummary}
      />
    </>
  );
}

function ApplicantTableDialogs({
  applicantToDelete,
  isDetailModalOpen,
  onCancelDelete,
  onCloseDetail,
  onConfirmDelete,
  selectedApplicantSummary,
}: {
  applicantToDelete: ApplicantTableProps['applicants'][number] | null;
  isDetailModalOpen: boolean;
  onCancelDelete: () => void;
  onCloseDetail: () => void;
  onConfirmDelete: () => void;
  selectedApplicantSummary: { id: string; name: string } | null;
}) {
  return (
    <>
      {selectedApplicantSummary && (
        <ApplicantDetailModal
          applicantId={selectedApplicantSummary.id}
          open={isDetailModalOpen}
          onClose={onCloseDetail}
        />
      )}
      <ApplicantDeleteDialog
        applicant={applicantToDelete}
        onCancel={onCancelDelete}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}
