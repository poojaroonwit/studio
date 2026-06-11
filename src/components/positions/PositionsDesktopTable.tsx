import { SkeletonTableRows } from '@/components/ui/loading-overlay';
import { Table, TableBody, TableHeader } from '@/components/ui/table';

import { PositionsDesktopTableHeader } from './PositionsDesktopTableHeader';
import { PositionsDesktopTableRow } from './PositionsDesktopTableRow';
import type { PositionsDesktopTableProps } from './PositionsDesktopTableTypes';

export function PositionsDesktopTable({
  positions,
  isLoading,
  isTableLoading,
  isJobMatchEnabled,
  page,
  pageSize,
  selectedIds,
  allSelected,
  sortColumn,
  sortDirection,
  openMenu,
  isLoadingHeadcount,
  headcountData,
  availableRecruiter,
  canAssignPositionRecruiter,
  assigningRecruiter,
  onSelectAll,
  onRowSelect,
  onOpenMenuChange,
  onSort,
  onViewPosition,
  onEditPosition,
  onDeletePosition,
  onAssignRecruiter,
  onResetAssigning,
}: PositionsDesktopTableProps) {
  return (
    <div className="positions-table-scroll table-scrollbar flex-1 overflow-auto">
      <Table className="min-w-full table-content-expandable">
        <TableHeader className="table-sticky-header">
          <PositionsDesktopTableHeader
            allSelected={allSelected}
            isJobMatchEnabled={isJobMatchEnabled}
            openMenu={openMenu}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onOpenMenuChange={onOpenMenuChange}
            onSelectAll={onSelectAll}
            onSort={onSort}
          />
        </TableHeader>
        <TableBody className="h-full">
          {isTableLoading || isLoading ? (
            <SkeletonTableRows rows={10} columns={isJobMatchEnabled ? 9 : 8} />
          ) : (
            positions.map((position, index) => (
              <PositionsDesktopTableRow
                key={position.id}
                availableRecruiter={availableRecruiter}
                assigningRecruiter={assigningRecruiter}
                canAssignPositionRecruiter={canAssignPositionRecruiter}
                headcountData={headcountData}
                index={index}
                isJobMatchEnabled={isJobMatchEnabled}
                isLoadingHeadcount={isLoadingHeadcount}
                onAssignRecruiter={onAssignRecruiter}
                onDeletePosition={onDeletePosition}
                onEditPosition={onEditPosition}
                onResetAssigning={onResetAssigning}
                onRowSelect={onRowSelect}
                onViewPosition={onViewPosition}
                page={page}
                pageSize={pageSize}
                position={position}
                selectedIds={selectedIds}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
