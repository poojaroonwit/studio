"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import {
  MyTasksLoadingState,
  MyTasksMobileUnavailableState,
} from "@/components/tasks/MyTasksPageStates";
import { MyTasksPageClientView } from "./MyTasksPageClientView";
import type { MyTasksPageClientProps } from "./MyTasksPageClientTypes";
import { useMyTasksPageClient } from "./use-my-tasks-page-client";

export function MyTasksPageClient({ userSession }: MyTasksPageClientProps) {
  const isMobile = useIsMobile();
  const page = useMyTasksPageClient({ userSession });

  if (page.isAuthLoading) {
    return <MyTasksLoadingState message="Loading..." />;
  }

  if (!page.isAuthenticated) {
    return <MyTasksLoadingState message="Redirecting to sign in..." />;
  }

  if (isMobile) {
    return <MyTasksMobileUnavailableState />;
  }

  if (!page.metadataLoaded) {
    return <MyTasksLoadingState message="Loading your board preferences..." />;
  }

  return (
    <MyTasksPageClientView
      actions={page.actions}
      searchInputRef={page.searchInputRef}
      state={page.state}
    />
  );
}
