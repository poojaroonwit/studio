"use client";

import { cn } from "@/lib/utils";
import { PositionsPageLayoutModals } from "./PositionsPageLayoutModals";
import { PositionsPageMainContent } from "./PositionsPageMainContent";
import type { PositionsPageController } from "./use-positions-page-controller";

interface PositionsPageLayoutProps {
  page: PositionsPageController;
}

export function PositionsPageLayout({ page }: PositionsPageLayoutProps) {
  return (
    <div className={cn("w-full h-full positions-page-container overflow-hidden", page.isMobile && "bg-secondary/50")}>
      <PositionsPageMainContent page={page} />
      <PositionsPageLayoutModals page={page} />
    </div>
  );
}
