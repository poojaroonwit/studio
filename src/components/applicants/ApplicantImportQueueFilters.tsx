"use client";

import {
  ClearQueueFiltersButton,
  QueueDateRangeFilter,
  QueueDateTypeFilter,
  QueuePositionFilter,
  QueueQuickDateButtons,
  QueueSearchFilter,
  QueueSourceFilter,
  QueueStatusFilter,
} from './ApplicantImportQueueFiltersParts';
import type { ApplicantImportQueueFiltersProps } from './ApplicantImportQueueFiltersTypes';

export function ApplicantImportQueueFilters({
  availableSources,
  dateFilterType,
  dateRange,
  openSelect,
  positionFilter,
  positionSearchTerm,
  positions,
  searchTerm,
  sourceFilter,
  sourceSearchTerm,
  statusFilter,
  clearAllFilters,
  clearDateRange,
  handleDateFilterTypeChange,
  handleDateRangeChange,
  handlePositionFilterChange,
  handleSearch,
  handleSourceFilterChange,
  handleStatusFilterChange,
  setDatePreset,
  setOpenSelect,
  setPositionSearchTerm,
  setSearchTerm,
  setSourceSearchTerm,
}: ApplicantImportQueueFiltersProps) {
  const hasActiveFilters = Boolean(
    searchTerm
    || statusFilter !== 'all'
    || positionFilter !== 'all'
    || positionSearchTerm
    || sourceFilter !== 'all'
    || sourceSearchTerm
    || dateRange
    || dateFilterType !== 'create'
  );

  return (
    <div className="border-b border-border/50 p-3">
      <div className="flex items-center justify-end">
        <ClearQueueFiltersButton
          clearAllFilters={clearAllFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-8">
        <QueueSearchFilter
          handleSearch={handleSearch}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
        <QueueStatusFilter
          handleStatusFilterChange={handleStatusFilterChange}
          openSelect={openSelect}
          setOpenSelect={setOpenSelect}
          statusFilter={statusFilter}
        />
        <QueuePositionFilter
          handlePositionFilterChange={handlePositionFilterChange}
          openSelect={openSelect}
          positionFilter={positionFilter}
          positionSearchTerm={positionSearchTerm}
          positions={positions}
          setOpenSelect={setOpenSelect}
          setPositionSearchTerm={setPositionSearchTerm}
        />
        <QueueSourceFilter
          availableSources={availableSources}
          handleSourceFilterChange={handleSourceFilterChange}
          openSelect={openSelect}
          setOpenSelect={setOpenSelect}
          setSourceSearchTerm={setSourceSearchTerm}
          sourceFilter={sourceFilter}
          sourceSearchTerm={sourceSearchTerm}
        />
        <QueueDateTypeFilter
          dateFilterType={dateFilterType}
          handleDateFilterTypeChange={handleDateFilterTypeChange}
          openSelect={openSelect}
          setOpenSelect={setOpenSelect}
        />
        <QueueDateRangeFilter
          clearDateRange={clearDateRange}
          dateFilterType={dateFilterType}
          dateRange={dateRange}
          handleDateRangeChange={handleDateRangeChange}
        />
        <QueueQuickDateButtons setDatePreset={setDatePreset} />
      </div>
    </div>
  );
}
