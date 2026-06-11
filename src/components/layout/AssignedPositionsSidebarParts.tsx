"use client";

import {
  ArrowPathIcon as Loader2,
  ArrowPathIcon as RotateCcw,
  BriefcaseIcon as Briefcase,
} from "@heroicons/react/24/outline";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import type { AssignedPosition, AssignedPositionsSidebarProps } from "./AssignedPositionsSidebarTypes";

type AssignedPositionsVariant = NonNullable<AssignedPositionsSidebarProps["variant"]>;

interface AssignedPositionsLoadingStateProps {
  className?: string;
}

export function AssignedPositionsLoadingState({ className }: AssignedPositionsLoadingStateProps) {
  return (
    <div className={cn("flex items-center justify-center p-4", className)}>
      <Loader2 className="h-4 w-4 animate-spin" />
    </div>
  );
}

interface AssignedPositionsErrorStateProps {
  error: string;
  className?: string;
  onRetry: () => void;
}

export function AssignedPositionsErrorState({
  error,
  className,
  onRetry,
}: AssignedPositionsErrorStateProps) {
  return (
    <div className={cn("p-4 text-sm text-muted-foreground", className)}>
      <p>Error loading positions: {error}</p>
      <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
        Retry
      </Button>
    </div>
  );
}

interface AssignedPositionsEmptyStateProps {
  variant: AssignedPositionsVariant;
  className?: string;
}

export function AssignedPositionsEmptyState({
  variant,
  className,
}: AssignedPositionsEmptyStateProps) {
  return (
    <div className={cn(variant === "compact" ? "px-0" : "p-4 text-center", className)}>
      {variant !== "compact" && (
        <>
          <Briefcase className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No assigned positions</p>
        </>
      )}
    </div>
  );
}

interface AssignedPositionsListProps {
  positions: AssignedPosition[];
  variant: AssignedPositionsVariant;
  className?: string;
  onRefresh: () => void;
  onPositionClick: (positionId: string) => void;
}

export function AssignedPositionsList({
  positions,
  variant,
  className,
  onRefresh,
  onPositionClick,
}: AssignedPositionsListProps) {
  return (
    <div className={cn(variant === "compact" ? "space-y-1" : "space-y-3", className)}>
      <AssignedPositionsHeader
        count={positions.length}
        variant={variant}
        onRefresh={onRefresh}
      />
      <ScrollArea className={cn("min-w-0 flex-1", variant === "compact" ? "px-0" : "px-3")}>
        <div className="relative min-w-0">
          <ul className={cn("mt-2 space-y-1 pl-0 min-w-0", variant === "compact" ? "mt-1" : "")}>
            {positions.map((position) => (
              <AssignedPositionListItem
                key={position.id}
                position={position}
                onPositionClick={onPositionClick}
              />
            ))}
          </ul>
        </div>
      </ScrollArea>
    </div>
  );
}

interface AssignedPositionsHeaderProps {
  count: number;
  variant: AssignedPositionsVariant;
  onRefresh: () => void;
}

function AssignedPositionsHeader({
  count,
  variant,
  onRefresh,
}: AssignedPositionsHeaderProps) {
  if (variant === "compact") {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2 px-3">
        <Briefcase className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Positions</span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-sidebar-accent"
            onClick={onRefresh}
            title="Refresh positions"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Badge variant="secondary" className="text-xs">
            {count}
          </Badge>
        </div>
      </div>
      <div className="px-3">
        <div className="border-t" />
      </div>
    </>
  );
}

interface AssignedPositionListItemProps {
  position: AssignedPosition;
  onPositionClick: (positionId: string) => void;
}

function AssignedPositionListItem({
  position,
  onPositionClick,
}: AssignedPositionListItemProps) {
  return (
    <li className="relative">
      <div className="flex items-stretch gap-1 min-w-0">
        <div className="relative flex flex-col items-center justify-center w-6 h-7">
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-border/70" />
          <span
            className={cn(
              "inline-flex items-center justify-center h-5 min-w-[24px] px-1 rounded text-[10px] tabular-nums z-10",
              "backdrop-blur-sm bg-white/50 text-muted-foreground group-hover:text-foreground group-hover:border-foreground/60",
            )}
          >
            {position.headcount.filled}/{position.headcount.total}
          </span>
        </div>

        <SidebarMenuButton
          className="w-full justify-start h-7 pr-1 min-w-0"
          size="default"
          onClick={() => onPositionClick(position.id)}
          title={position.title}
        >
          <span className="flex-1 min-w-0 text-sm overflow-hidden text-ellipsis whitespace-nowrap block">
            {position.title}
          </span>
        </SidebarMenuButton>
      </div>
    </li>
  );
}
