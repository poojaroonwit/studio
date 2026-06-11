"use client";

import type { ReactNode } from 'react';
import { BarChart3, Users, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ApplicantsPerPositionHeader() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="h-8 w-1 bg-gradient-to-b from-blue-500 to-blue-400 rounded-full" />
        <div>
          <h2 className="text-2xl font-bold text-foreground">Applicants per Position</h2>
          <p className="text-sm text-muted-foreground mt-1">Distribution across open headcount</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
        <span className="text-xs text-muted-foreground">Analytics</span>
      </div>
    </div>
  );
}

export function ApplicantsPerPositionCard({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <Card className="group relative overflow-hidden border-2 border-blue-200 hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white/50 backdrop-blur-sm hover:shadow-blue-500/20">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold text-foreground group-hover:text-gray-900 transition-colors">
            {title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
          <BarChart3 className="h-6 w-6 text-blue-600 group-hover:drop-shadow-sm" />
        </div>
      </CardHeader>
      <CardContent className="relative">
        {children}
      </CardContent>
    </Card>
  );
}

export function ApplicantsPerPositionEmptyState() {
  return (
    <ApplicantsPerPositionCard
      title="No Data Available"
      description="No Applicant data available for positions."
    >
      <div className="h-[300px] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Users className="h-12 w-12 text-blue-300 mx-auto" />
          <p className="text-muted-foreground">No applicants assigned to positions yet</p>
        </div>
      </div>
    </ApplicantsPerPositionCard>
  );
}

export function ApplicantsPerPositionErrorState({ chartError }: { chartError: string }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center space-y-3">
        <XCircle className="h-8 w-8 text-red-500 mx-auto" />
        <p className="text-red-500 text-sm">Chart error: {chartError}</p>
        <Button onClick={() => window.location.reload()} className="mt-2">
          Retry
        </Button>
      </div>
    </div>
  );
}

export function ApplicantsPerPositionLoadingState() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
        <p className="text-muted-foreground">Loading chart...</p>
      </div>
    </div>
  );
}

export function ApplicantsPerPositionSummary({
  activePositions,
  totalApplicants,
}: {
  activePositions: number;
  totalApplicants: number;
}) {
  const averageApplicants = activePositions > 0 ? Math.round(totalApplicants / activePositions) : 0;

  return (
    <div className="mt-6 grid grid-cols-3 gap-4">
      <SummaryTile label="Total Applicants" value={totalApplicants} color="blue" />
      <SummaryTile label="Active Positions" value={activePositions} color="emerald" />
      <SummaryTile label="Avg per Position" value={averageApplicants} color="amber" />
    </div>
  );
}

function SummaryTile({
  color,
  label,
  value,
}: {
  color: 'amber' | 'blue' | 'emerald';
  label: string;
  value: number;
}) {
  const styles = {
    amber: 'from-amber-50 to-amber-100 border-amber-200 text-amber-600',
    blue: 'from-blue-50 to-blue-100 border-blue-200 text-blue-600',
    emerald: 'from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-600',
  };

  return (
    <div className={`text-center p-3 rounded-lg bg-gradient-to-br border ${styles[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium opacity-80">{label}</div>
    </div>
  );
}
