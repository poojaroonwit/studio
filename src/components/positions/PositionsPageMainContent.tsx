"use client";

import React from "react";

import { PositionsActiveFilterBar } from "./PositionsActiveFilterBar";
import { PositionsDesktopToolbar } from "./PositionsDesktopToolbar";
import { PositionsListContent } from "./PositionsListContent";
import { PositionsMobileSearchBar } from "./PositionsMobileSearchBar";
import { PositionsRecruiterSidebar } from "./PositionsRecruiterSidebar";
import type { PositionsPageController } from "./use-positions-page-controller";

interface PositionsPageMainContentProps {
  page: PositionsPageController;
}

export function PositionsPageMainContent({ page }: PositionsPageMainContentProps) {
  const { filters, referenceData, searchControls, uiState } = page;

  return (
    <div className="flex h-full overflow-hidden">
      <PositionsRecruiterSidebar
        isLoading={page.isLoading}
        recruiters={page.availableRecruiter}
        selectedRecruiterId={filters.selectedRecruiterId}
        recruiterStats={referenceData.recruiterStats}
        onRecruiterSelect={filters.handleRecruiterSelect}
      />

      <div className="flex-1 positions-content-area h-full">
        <div ref={page.contentRef} className="flex flex-col h-full overflow-hidden">
          {page.isMobile && (
            <PositionsMobileSearchBar
              searchTerm={filters.searchTerm}
              inputRef={searchControls.searchInputRef}
              onSearchChange={searchControls.handleSearchChange}
              onSearchFocus={searchControls.handleSearchFocus}
              onSearchKeyDown={searchControls.handleSearchKeyDown}
              onClearSearch={page.handleClearSearch}
            />
          )}

          <PositionsDesktopToolbar
            isLoading={page.isLoading}
            isMobile={page.isMobile}
            isLoadingHeadcount={page.isLoadingHeadcount}
            vacantFromOpenPositions={page.vacantFromOpenPositions}
            searchTerm={filters.searchTerm}
            statusFilter={filters.statusFilter}
            departmentFilter={filters.departmentFilter}
            selectedHiringManagerId={filters.selectedHiringManagerId}
            allDepartments={referenceData.allDepartments}
            availableHiringManagers={page.availableHiringManagers}
            isLoadingDepartments={referenceData.isLoadingDepartments}
            activeFilterCount={filters.activeFilterCount}
            gradeFilter={filters.gradeFilter}
            allGrades={referenceData.allGrades}
            onSearchChange={searchControls.handleSearchChange}
            onStatusChange={filters.handleStatusFilterChange}
            onDepartmentChange={filters.handleDepartmentSelect}
            onHiringManagerChange={filters.handleHiringManagerSelect}
            onClearFilters={filters.clearVisibleFilters}
            onGradeChange={filters.handleGradeSelect}
            onAddPosition={() => uiState.setIsAddModalOpen(true)}
            onImportPositions={() => page.setIsImportModalOpen(true)}
            onExportPositions={page.handleExportPositions}
          />

          {filters.hasActiveVisibleFilters && (
            <PositionsActiveFilterBar
              searchTerm={filters.searchTerm}
              statusFilter={filters.statusFilter}
              departmentFilter={filters.departmentFilter}
              selectedRecruiterId={filters.selectedRecruiterId}
              selectedRecruiterName={page.selectedRecruiterName}
              onClear={filters.clearVisibleFilters}
            />
          )}

          <PositionsListContent
            positions={page.positions}
            sortedPositions={page.sortedPositions}
            isMobile={page.isMobile}
            isLoading={page.isLoading}
            isTableLoading={page.isTableLoading}
            isJobMatchEnabled={page.isJobMatchEnabled}
            isLoadingHeadcount={page.isLoadingHeadcount}
            emptyStateMessage={filters.emptyStateMessage}
            showAddFirstPositionButton={filters.showAddFirstPositionButton}
            mobileDisplayCount={page.mobileDisplayCount}
            onMobileDisplayCountChange={page.setMobileDisplayCount}
            pullToRefreshRef={page.pullToRefreshRef as React.RefObject<HTMLDivElement>}
            pullProgress={page.pullProgress}
            isRefreshing={page.isRefreshing}
            headcountData={page.headcountData}
            page={filters.page}
            pageSize={filters.pageSize}
            totalPages={page.totalPages}
            total={page.total}
            selectedIds={page.selectedIds}
            allSelected={page.allSelected}
            sortColumn={uiState.sortColumn}
            sortDirection={uiState.sortDirection}
            openMenu={uiState.openMenu}
            availableRecruiter={page.availableRecruiter}
            canAssignPositionRecruiter={page.canAssignPositionRecruiter}
            assigningRecruiter={page.assigningRecruiter}
            onAddPosition={() => uiState.setIsAddModalOpen(true)}
            onMobilePositionClick={page.openPosition}
            onMobileEditClick={page.handleMobileEditClick}
            onMobileDeleteClick={page.handleMobileDeleteClick}
            onUpdateMatchCriteria={() => page.setIsBulkMatchCriteriaModalOpen(true)}
            onBulkDelete={() => page.setShowBulkDeleteConfirm(true)}
            onClearSelection={() => page.setSelectedIds([])}
            onSelectAll={page.handleSelectAll}
            onRowSelect={page.handleRowSelect}
            onOpenMenuChange={uiState.setOpenMenu}
            onSort={uiState.handleSort}
            onViewPosition={page.openPosition}
            onEditPosition={page.editPosition}
            onDeletePosition={uiState.setPositionToDelete}
            onAssignRecruiter={page.handleAssignRecruiterToPosition}
            onResetAssigning={page.resetAssigningRecruiter}
            onPageChange={page.handlePageChange}
            onPageSizeChange={page.handlePageSizeChange}
          />
        </div>
      </div>
    </div>
  );
}
