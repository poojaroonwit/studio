"use client";

import React from 'react';
import { ApplicantTable } from './ApplicantTable';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeftIcon as ChevronLeft, ChevronRightIcon as ChevronRight, TrashIcon as Trash2, PencilSquareIcon as FileEdit, UsersIcon as Users, ArrowPathIcon as RefreshCw, ChevronDownIcon as ChevronDown } from '@heroicons/react/24/outline';
import type { Applicant, Position, RecruitmentStage, ApplicantSource } from '@/lib/types';
import type { ApplicantSettings } from './ApplicantSettingsDrawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { PullToRefreshIndicator } from '@/components/ui/pull-to-refresh-indicator';

interface ApplicantsPageTableAreaProps {
  applicantsToRender: Applicant[];
  allPinnedApplicants: Applicant[];
  displayedApplicants: Applicant[];
  isLoading: boolean;
  tableLoading: boolean;
  updateApplicantStatus: (candidateId: string, status: string, notes?: string, suppressToast?: boolean) => Promise<void>;
  handleDeleteApplicant: (candidateId: string) => Promise<void>;
  handleAssignRecruiter: (candidateId: string, recruiterId: string | null) => Promise<void>;
  handleAssignSource: (candidateId: string, sourceId: string | null, subSource?: string | null) => Promise<void>;
  availablePositions: Position[];
  availableStages: RecruitmentStage[];
  availableRecruiter: Array<{ id: string; name: string }>;
  availableSources: ApplicantSource[];
  canEditApplicants: boolean;
  canDeleteApplicants: boolean;
  canChangeStatus: boolean;
  canBulkChangeStatus: boolean;
  canViewDetailed: boolean;
  canAssignSource: boolean;
  canAssignRecruiter: boolean;
  sortColumn: string;
  sortDirection: 'asc' | 'desc' | null;
  handleSortChange: (column: string | null, direction?: 'asc' | 'desc' | null) => Promise<void>;
  setSelectedPositionForEdit: (position: Position | null) => void;
  refreshApplicantInList: (candidateId: string, fetchTableData: any, filters: any, page: number, pageSize: number, aiMatchedApplicantIds: string[] | null) => Promise<void>;
  fetchAllPinnedApplicants: () => Promise<void>;
  selectedApplicantIds: Set<string>;
  setSelectedApplicantIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  handleBulkDelete: (candidateIds: string[]) => Promise<void>;
  handleBulkChangeStatus: (candidateIds: string[], newStatus: string, notes?: string) => Promise<void>;
  handleBulkAssignRecruiter: (candidateIds: string[], recruiterId: string | null) => Promise<void>;
  handleBulkReprocess: (candidateIds: string[]) => Promise<void>;
  setBulkNewStatus: React.Dispatch<React.SetStateAction<string>>;
  setBulkTransitionNotes: React.Dispatch<React.SetStateAction<string>>;
  setIsBulkStatusModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setBulkNewRecruiterId: React.Dispatch<React.SetStateAction<string | null>>;
  setIsBulkRecruiterModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  applicantSettings: ApplicantSettings | null;
  tableHeight: number;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  pageSize: number;
  handlePageSizeChange: (newPageSize: number) => Promise<void>;
  total: number;
  totalPages: number;
  isAiSearchActive: boolean;
  aiMatchedApplicantIds: string[] | null;
  aiRecordCount: number;
  filters: any;
  fetchTableData: (filters: any, page: number, pageSize: number) => Promise<void>;
  aiMatchedApplicantIdsForRefresh: string[] | null;
}

export function ApplicantsPageTableArea({
  applicantsToRender,
  allPinnedApplicants,
  displayedApplicants,
  isLoading,
  tableLoading,
  updateApplicantStatus,
  handleDeleteApplicant,
  handleAssignRecruiter,
  handleAssignSource,
  availablePositions,
  availableStages,
  availableRecruiter,
  availableSources,
  canEditApplicants,
  canDeleteApplicants,
  canChangeStatus,
  canBulkChangeStatus,
  canViewDetailed,
  canAssignSource,
  canAssignRecruiter,
  sortColumn,
  sortDirection,
  handleSortChange,
  setSelectedPositionForEdit,
  refreshApplicantInList,
  fetchAllPinnedApplicants,
  selectedApplicantIds,
  setSelectedApplicantIds,
  handleBulkDelete,
  handleBulkChangeStatus,
  handleBulkAssignRecruiter,
  handleBulkReprocess,
  setBulkNewStatus,
  setBulkTransitionNotes,
  setIsBulkStatusModalOpen,
  setBulkNewRecruiterId,
  setIsBulkRecruiterModalOpen,
  applicantSettings,
  tableHeight,
  page,
  setPage,
  pageSize,
  handlePageSizeChange,
  total,
  totalPages,
  isAiSearchActive,
  aiMatchedApplicantIds,
  aiRecordCount,
  filters,
  fetchTableData,
  aiMatchedApplicantIdsForRefresh,
}: ApplicantsPageTableAreaProps) {
  const isMobile = useIsMobile();

  // Pull-to-refresh for mobile
  const handleRefresh = async () => {
    if (filters) {
      await fetchTableData(filters, page, pageSize);
    }
  };

  const {
    elementRef: pullToRefreshRef,
    isPulling,
    isRefreshing,
    pullProgress,
  } = usePullToRefresh({
    onRefresh: handleRefresh,
    enabled: isMobile,
  });

  return (
    <>
      {/* Table */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {/* Pull to Refresh Indicator */}
        {isMobile && (
          <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
            <PullToRefreshIndicator
              pullProgress={pullProgress}
              isRefreshing={isRefreshing}
            />
          </div>
        )}
        <div
          ref={pullToRefreshRef as React.RefObject<HTMLDivElement>}
          className="flex-1 overflow-auto"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <ApplicantTable
              applicants={Array.isArray(applicantsToRender) ? applicantsToRender : []}
              allPinnedApplicants={Array.isArray(allPinnedApplicants) ? allPinnedApplicants : []}
              isLoading={(isLoading || tableLoading) && displayedApplicants.length === 0}
              onUpdateApplicant={updateApplicantStatus}
              onDeleteApplicant={handleDeleteApplicant}
              onAssignRecruiter={handleAssignRecruiter}
              onAssignSource={handleAssignSource}
              availablePositions={availablePositions}
              availableStages={availableStages}
              availableRecruiter={availableRecruiter}
              availableSources={availableSources}
              canManageApplicants={canEditApplicants}
              canEditApplicants={canEditApplicants}
              canDeleteApplicants={canDeleteApplicants}
              canChangeStatus={canChangeStatus}
              canViewDetailed={canViewDetailed}
              canAssignSource={canAssignSource}
              canAssignRecruiter={canAssignRecruiter}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={(column, direction) => {
                if (direction !== undefined && direction !== null) {
                  handleSortChange(column || 'applicationDate', direction);
                } else if (column === sortColumn) {
                  if (sortDirection === 'asc') {
                    handleSortChange(column, 'desc');
                  } else if (sortDirection === 'desc') {
                    handleSortChange(column, null);
                  } else {
                    handleSortChange(column, 'asc');
                  }
                } else {
                  handleSortChange(column, 'asc');
                }
              }}
              onEditPosition={setSelectedPositionForEdit}
              onRefreshApplicantData={async (candidateId) => {
                await refreshApplicantInList(candidateId, fetchTableData, filters, page, pageSize, aiMatchedApplicantIdsForRefresh);
                await fetchAllPinnedApplicants();
              }}
              selectedApplicantIds={selectedApplicantIds}
              onToggleSelectApplicant={(candidateId: string) => {
                const newSelected = new Set(selectedApplicantIds);
                if (newSelected.has(candidateId)) {
                  newSelected.delete(candidateId);
                } else {
                  newSelected.add(candidateId);
                }
                setSelectedApplicantIds(newSelected);
              }}
              onToggleSelectAllApplicants={() => {
                if (selectedApplicantIds.size === displayedApplicants.length) {
                  setSelectedApplicantIds(new Set());
                } else {
                  const safeDisplayedApplicants = Array.isArray(displayedApplicants) ? displayedApplicants : [];
                  setSelectedApplicantIds(new Set(safeDisplayedApplicants.map(c => c.id)));
                }
              }}
              isAllApplicantsSelected={selectedApplicantIds.size === displayedApplicants.length && displayedApplicants.length > 0}
              page={page}
              pageSize={pageSize}
              baseIndex={(page - 1) * pageSize}
              onBulkDelete={handleBulkDelete}
              onBulkChangeStatus={handleBulkChangeStatus}
              onBulkAssignRecruiter={handleBulkAssignRecruiter}
              onBulkReprocess={handleBulkReprocess}
              settings={applicantSettings ?? undefined}
              tableHeight={tableHeight}
            />
          </motion.div>
        </div>
      </div>

      {/* Bulk Action Footer */}
      {selectedApplicantIds && selectedApplicantIds.size > 0 && (
        <div className="border-t bg-muted/30 p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {selectedApplicantIds.size} Applicant{selectedApplicantIds.size !== 1 ? 's' : ''} selected
              </span>

              <div className="flex items-center gap-1">
                <Button
                  onClick={() => handleBulkDelete(Array.from(selectedApplicantIds))}
                  disabled={!canDeleteApplicants}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>

                <Button
                  onClick={() => {
                    setBulkNewStatus('');
                    setBulkTransitionNotes('');
                    setIsBulkStatusModalOpen(true);
                  }}
                  disabled={!canBulkChangeStatus}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                >
                  <FileEdit className="h-3 w-3 mr-1" />
                  Status
                </Button>

                <Button
                  onClick={() => {
                    setBulkNewRecruiterId(null);
                    setIsBulkRecruiterModalOpen(true);
                  }}
                  disabled={!canEditApplicants}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                >
                  <Users className="h-3 w-3 mr-1" />
                  Recruiter
                </Button>

                <Button
                  onClick={() => handleBulkReprocess(Array.from(selectedApplicantIds))}
                  disabled={!canEditApplicants}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Re-process
                </Button>
              </div>
            </div>

            <Button
              onClick={() => setSelectedApplicantIds(new Set())}
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Pagination / See More */}
      {isMobile ? (
        /* Mobile: See More Button */
        <div
          className={`p-4 border-t ${isMobile ? 'pb-[calc(4.5rem+env(safe-area-inset-bottom,0))]' : ''}`}
        >
          {(() => {
            const currentTotal = isAiSearchActive && aiMatchedApplicantIds ? aiRecordCount : total;
            const hasMore = page < totalPages;

            if (currentTotal === 0) {
              return (
                <div className="text-center text-sm text-muted-foreground py-2">
                  {isAiSearchActive ? 'No AI-matched applicants found' : 'No applicants found'}
                </div>
              );
            }

            if (!hasMore) {
              return (
                <div className="text-center text-sm text-muted-foreground py-2">
                  {isAiSearchActive && aiMatchedApplicantIds
                    ? `Showing all ${currentTotal} AI-matched applicants`
                    : `Showing all ${currentTotal} applicants`}
                </div>
              );
            }

            return (
              <div className="flex flex-col items-center gap-2">
                <div className="text-sm text-muted-foreground text-center">
                  {(() => {
                    const currentPageSize = pageSize;
                    const startItem = ((page - 1) * currentPageSize) + 1;
                    const endItem = Math.min(page * currentPageSize, currentTotal);
                    return isAiSearchActive && aiMatchedApplicantIds
                      ? `Showing ${startItem} to ${endItem} of ${currentTotal} AI-matched applicants`
                      : `Showing ${startItem} to ${endItem} of ${currentTotal} applicants`;
                  })()}
                </div>
                <Button
                  onClick={() => {
                    const newPage = page + 1;
                    setPage(newPage);
                    if (filters) {
                      fetchTableData(filters, newPage, pageSize);
                    }
                  }}
                  variant="outline"
                  className="w-full max-w-xs h-12 text-base font-medium active:scale-95 touch-manipulation"
                >
                  See More
                  <ChevronDown className="h-5 w-5 ml-2" />
                </Button>
              </div>
            );
          })()}
        </div>
      ) : (
        /* Desktop: Full Pagination */
        <div className="p-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                {(() => {
                  const currentTotal = isAiSearchActive && aiMatchedApplicantIds ? aiRecordCount : total;
                  const currentPageSize = pageSize;
                  const startItem = ((page - 1) * currentPageSize) + 1;
                  const endItem = Math.min(page * currentPageSize, currentTotal);

                  if (currentTotal === 0) {
                    return isAiSearchActive ? 'No AI-matched applicants found' : 'No applicants found';
                  }

                  if (isAiSearchActive && aiMatchedApplicantIds) {
                    return `Showing ${startItem} to ${endItem} of ${currentTotal} AI-matched applicants`;
                  }

                  return `Showing ${startItem} to ${endItem} of ${currentTotal} applicants`;
                })()}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Items per page:</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    const newPageSize = parseInt(value);
                    handlePageSizeChange(newPageSize);
                    if (filters) {
                      fetchTableData(filters, 1, newPageSize);
                    }
                  }}
                >
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                onClick={() => {
                  const newPage = Math.max(1, page - 1);
                  setPage(newPage);
                  if (filters) {
                    fetchTableData(filters, newPage, pageSize);
                  }
                }}
                disabled={(() => {
                  const currentTotal = isAiSearchActive && aiMatchedApplicantIds ? aiRecordCount : total;
                  return page <= 1 || currentTotal === 0;
                })()}
                variant="ghost"
                size="sm"
                className="h-8 px-3 hover:bg-muted/50 transition-colors duration-200"
              >
                <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground mr-2" />
              </Button>

              <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                {(() => {
                  const currentTotal = isAiSearchActive && aiMatchedApplicantIds ? aiRecordCount : total;
                  if (currentTotal === 0) {
                    return 'No pages';
                  }
                  return `Page ${page} of ${totalPages}`;
                })()}
              </span>

              <Button
                onClick={() => {
                  const newPage = Math.min(totalPages, page + 1);
                  setPage(newPage);
                  if (filters) {
                    fetchTableData(filters, newPage, pageSize);
                  }
                }}
                disabled={(() => {
                  const currentTotal = isAiSearchActive && aiMatchedApplicantIds ? aiRecordCount : total;
                  return page >= totalPages || currentTotal === 0;
                })()}
                variant="ghost"
                size="sm"
                className="h-8 px-3 hover:bg-muted/50 transition-colors duration-200"
              >
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
