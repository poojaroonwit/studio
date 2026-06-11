"use client";

import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowPathIcon as Loader2,
  CheckCircleIcon as CheckCircle,
  ClockIcon as Clock,
  XCircleIcon as XCircle,
} from '@heroicons/react/24/outline';

interface QueueSummary {
  total?: number;
  queued?: number;
  inprocess?: number;
  success?: number;
  error?: number;
}

interface SummaryCardConfig {
  label: string;
  value: number;
  color: 'gray' | 'blue' | 'yellow' | 'green' | 'red';
  icon: ReactNode;
}

const colorClasses: Record<SummaryCardConfig['color'], {
  border: string;
  overlay: string;
  label: string;
  value: string;
  icon: string;
}> = {
  gray: {
    border: 'border-gray-200 dark:border-gray-800',
    overlay: 'from-gray-50 to-gray-100 dark:from-gray-950/50 dark:to-gray-900/50',
    label: 'text-gray-600 dark:text-gray-400',
    value: 'text-gray-800 dark:text-gray-200',
    icon: 'bg-gray-500 dark:bg-gray-600',
  },
  blue: {
    border: 'border-blue-200 dark:border-blue-800',
    overlay: 'from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50',
    label: 'text-blue-600 dark:text-blue-400',
    value: 'text-blue-800 dark:text-blue-200',
    icon: 'bg-blue-500 dark:bg-blue-600',
  },
  yellow: {
    border: 'border-yellow-200 dark:border-yellow-800',
    overlay: 'from-yellow-50 to-yellow-100 dark:from-yellow-950/50 dark:to-yellow-900/50',
    label: 'text-yellow-600 dark:text-yellow-400',
    value: 'text-yellow-800 dark:text-yellow-200',
    icon: 'bg-yellow-500 dark:bg-yellow-600',
  },
  green: {
    border: 'border-green-200 dark:border-green-800',
    overlay: 'from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50',
    label: 'text-green-600 dark:text-green-400',
    value: 'text-green-800 dark:text-green-200',
    icon: 'bg-green-500 dark:bg-green-600',
  },
  red: {
    border: 'border-red-200 dark:border-red-800',
    overlay: 'from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/50',
    label: 'text-red-600 dark:text-red-400',
    value: 'text-red-800 dark:text-red-200',
    icon: 'bg-red-500 dark:bg-red-600',
  },
};

function SummaryCard({ label, value, color, icon }: SummaryCardConfig) {
  const classes = colorClasses[color];

  return (
    <Card className={`group relative overflow-hidden border-2 ${classes.border} hover:border-opacity-80 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm shadow-lg`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${classes.overlay} opacity-100 transition-opacity duration-300`} />
      <CardContent className="relative p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className={`text-xs font-semibold uppercase tracking-wide ${classes.label}`}>{label}</p>
            <p className={`text-2xl font-bold ${classes.value}`}>{value}</p>
          </div>
          <div className={`p-2 rounded-lg ${classes.icon} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ApplicantImportQueueSummaryCardsProps {
  summary?: QueueSummary;
}

export function ApplicantImportQueueSummaryCards({ summary }: ApplicantImportQueueSummaryCardsProps) {
  const cards: SummaryCardConfig[] = [
    {
      label: 'Total',
      value: summary?.total ?? 0,
      color: 'gray',
      icon: <span className="text-white text-xs font-bold">T</span>,
    },
    {
      label: 'Queued',
      value: summary?.queued ?? 0,
      color: 'blue',
      icon: <Clock className="h-4 w-4 text-white" />,
    },
    {
      label: 'Processing',
      value: summary?.inprocess ?? 0,
      color: 'yellow',
      icon: <Loader2 className="h-4 w-4 text-white animate-spin" />,
    },
    {
      label: 'Success',
      value: summary?.success ?? 0,
      color: 'green',
      icon: <CheckCircle className="h-4 w-4 text-white" />,
    },
    {
      label: 'Error',
      value: summary?.error ?? 0,
      color: 'red',
      icon: <XCircle className="h-4 w-4 text-white" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map((card) => (
        <SummaryCard key={card.label} {...card} />
      ))}
    </div>
  );
}
