"use client";

import type { ComponentType, SVGProps } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  DashboardStatContent,
  DashboardStatHeader,
} from "./DashboardStatCardParts";

export interface DashboardStatCardItem {
  title: string;
  value: number;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  button?: {
    label: string;
    onClick: () => void;
  };
}

export type DashboardStatCardVariant = "featured" | "default" | "personal";

interface DashboardStatCardProps {
  stat: DashboardStatCardItem;
  index: number;
  isLoading: boolean;
  isPageRefresh: boolean;
  hasSSEUpdated: boolean;
  variant?: DashboardStatCardVariant;
  animationDelayMs?: number;
  className?: string;
}

export function DashboardStatCard({
  stat,
  index,
  isLoading,
  isPageRefresh,
  hasSSEUpdated,
  variant = "default",
  animationDelayMs = 100,
  className,
}: DashboardStatCardProps) {
  const isFeatured = variant === "featured";
  const isPersonal = variant === "personal";
  const showAnimation = isPageRefresh && !hasSSEUpdated;
  const showAction = Boolean(stat.button) && !isPersonal;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-2 transition-all duration-300 hover:border-opacity-80 backdrop-blur-sm",
        stat.borderColor,
        isFeatured
          ? "bg-card/50 shadow-lg hover:shadow-2xl sm:hover:-translate-y-2"
          : "hover:shadow-xl hover:-translate-y-2",
        isPersonal ? "bg-white/50" : "bg-card/50",
        showAnimation && "animate-in slide-in-from-bottom-4 fade-in-0",
        className,
      )}
      style={{
        animationDelay: showAnimation ? `${index * animationDelayMs}ms` : "0ms",
      }}
    >
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-300",
          stat.bgColor,
          isFeatured ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      />
      <DashboardStatHeader isFeatured={isFeatured} stat={stat} />
      <DashboardStatContent
        isFeatured={isFeatured}
        isLoading={isLoading}
        isPersonal={isPersonal}
        showAction={showAction}
        stat={stat}
        variant={variant}
      />
    </Card>
  );
}
