"use client";

import { PositionDetailDrawer } from "@/components/positions/PositionDetailDrawer";

import {
  AssignedPositionsEmptyState,
  AssignedPositionsErrorState,
  AssignedPositionsList,
  AssignedPositionsLoadingState,
} from "./AssignedPositionsSidebarParts";
import type { AssignedPositionsSidebarProps } from "./AssignedPositionsSidebarTypes";
import { useAssignedPositionsSidebar } from "./use-assigned-positions-sidebar";

export function AssignedPositionsSidebar({
  className,
  variant = "default",
}: AssignedPositionsSidebarProps) {
  const sidebar = useAssignedPositionsSidebar();

  if (!sidebar.user) {
    return null;
  }

  if (sidebar.isLoading) {
    return <AssignedPositionsLoadingState className={className} />;
  }

  if (sidebar.error) {
    return (
      <AssignedPositionsErrorState
        error={sidebar.error}
        className={className}
        onRetry={() => sidebar.fetchAssignedPositions(true)}
      />
    );
  }

  if (sidebar.positions.length === 0) {
    return <AssignedPositionsEmptyState variant={variant} className={className} />;
  }

  return (
    <>
      <AssignedPositionsList
        positions={sidebar.positions}
        variant={variant}
        className={className}
        onRefresh={() => sidebar.fetchAssignedPositions(true)}
        onPositionClick={sidebar.openPosition}
      />
      <PositionDetailDrawer
        isOpen={sidebar.isPositionDrawerOpen}
        onOpenChange={sidebar.setIsPositionDrawerOpen}
        positionId={sidebar.selectedPositionId}
      />
    </>
  );
}
