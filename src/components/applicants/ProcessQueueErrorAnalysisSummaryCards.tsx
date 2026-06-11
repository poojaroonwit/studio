"use client";

import {
  ArrowTrendingUpIcon as TrendingUp,
  DocumentTextIcon as FileText,
  ExclamationTriangleIcon as AlertTriangle,
} from '@heroicons/react/24/outline';

import type { ProcessQueueAnalyticsData } from './process-queue-analytics-utils';
import { buildProcessQueueErrorAnalysisSummary } from './process-queue-error-analysis-utils';

interface ErrorAnalysisSummaryCardsProps {
  errorsByReason: ProcessQueueAnalyticsData['stats']['errorsByReason'];
  totalJobs: number;
}

export function ErrorAnalysisSummaryCards({ errorsByReason, totalJobs }: ErrorAnalysisSummaryCardsProps) {
  const summary = buildProcessQueueErrorAnalysisSummary(errorsByReason, totalJobs);

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
      <ErrorAnalysisStatCard
        icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
        label="Total Errors"
        value={summary.totalErrors}
        className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
        labelClassName="text-red-700 dark:text-red-300"
        valueClassName="text-red-600 dark:text-red-400"
      />
      <ErrorAnalysisStatCard
        icon={<FileText className="h-5 w-5 text-orange-600" />}
        label="Error Types"
        value={summary.errorTypes}
        className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20"
        labelClassName="text-orange-700 dark:text-orange-300"
        valueClassName="text-orange-600 dark:text-orange-400"
      />
      <ErrorAnalysisStatCard
        icon={<TrendingUp className="h-5 w-5 text-primary" />}
        label="Error Rate"
        value={summary.errorRate}
        className="border-primary/20 bg-primary/5 dark:border-primary/30 dark:bg-primary/10"
        labelClassName="text-primary"
        valueClassName="text-primary"
      />
    </div>
  );
}

function ErrorAnalysisStatCard({
  icon,
  label,
  value,
  className,
  labelClassName,
  valueClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  className: string;
  labelClassName: string;
  valueClassName: string;
}) {
  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className={`font-semibold ${labelClassName}`}>{label}</span>
      </div>
      <p className={`text-2xl font-bold ${valueClassName}`}>{value}</p>
    </div>
  );
}
