"use client";

import type { ComponentType, SVGProps } from "react";
import {
  ArrowTrendingUpIcon as TrendingUp,
  CircleStackIcon as Database,
  ClockIcon as Clock,
  ExclamationTriangleIcon as AlertTriangle,
} from "@heroicons/react/24/outline";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProcessQueueOverviewStats {
  totalJobs: number;
  avgDuration: number;
  jobsByType: Array<{ type: string; count: number }>;
}

interface ProcessQueueOverviewCardsProps {
  stats: ProcessQueueOverviewStats;
}

interface OverviewCardDefinition {
  title: string;
  value: string | number;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

function buildOverviewCards(stats: ProcessQueueOverviewStats): OverviewCardDefinition[] {
  return [
    {
      title: "Total Jobs",
      value: stats.totalJobs,
      icon: Database,
      color: "text-blue-500 dark:text-blue-400",
      bgColor: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50",
      borderColor: "border-blue-200 dark:border-blue-800",
      description: "All processed jobs",
    },
    {
      title: "Avg Duration",
      value: `${stats.avgDuration.toFixed(1)}m`,
      icon: Clock,
      color: "text-teal-500 dark:text-teal-400",
      bgColor: "bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950/50 dark:to-teal-900/50",
      borderColor: "border-teal-200 dark:border-teal-800",
      description: "Average processing time",
    },
    {
      title: "Completed Jobs",
      value: stats.jobsByType.find((job) => job.type === "success")?.count || 0,
      icon: TrendingUp,
      color: "text-green-500 dark:text-green-400",
      bgColor: "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50",
      borderColor: "border-green-200 dark:border-green-800",
      description: "Successfully processed",
    },
    {
      title: "Failed Jobs",
      value: stats.jobsByType.find((job) => job.type === "failed" || job.type === "error")?.count || 0,
      icon: AlertTriangle,
      color: "text-red-500 dark:text-red-400",
      bgColor: "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/50",
      borderColor: "border-red-200 dark:border-red-800",
      description: "Jobs with errors",
    },
  ];
}

export function ProcessQueueOverviewCards({ stats }: ProcessQueueOverviewCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {buildOverviewCards(stats).map((stat) => (
        <Card
          key={stat.title}
          className={`group relative overflow-hidden border-2 ${stat.borderColor} hover:border-opacity-80 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm shadow-lg`}
        >
          <div className={`absolute inset-0 ${stat.bgColor} opacity-100 transition-opacity duration-300`} />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                {stat.title}
              </CardTitle>
              <p className="text-xs text-muted-foreground/70">{stat.description}</p>
            </div>
            <div className={`p-3 rounded-xl ${stat.bgColor} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm`}>
              <stat.icon className={`h-6 w-6 ${stat.color} group-hover:drop-shadow-sm`} />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex items-baseline space-x-2">
              <div className="text-3xl font-bold text-foreground group-hover:text-foreground transition-colors">
                {stat.value}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
