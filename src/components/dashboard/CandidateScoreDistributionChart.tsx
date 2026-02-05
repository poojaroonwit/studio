"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Bar } from 'react-chartjs-2';
import { Chart } from 'chart.js';
import { Loader2, BarChart3, CalendarIcon, XCircle } from "lucide-react";
import type { Applicant } from "@/lib/types";
import { format, subMonths, subWeeks, subYears, startOfMonth, startOfWeek, startOfYear, endOfMonth, endOfWeek, endOfYear, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, eachYearOfInterval, addDays, parseISO } from 'date-fns';
import { cn, isValidDate, safeGetTime, safeDateDiff, safeGetDateFromRange } from "@/lib/utils";
import { DateRange } from 'react-day-picker';
import { useChartSetup } from '@/hooks/use-chart-setup';
import { isDataLabelsAvailable } from '@/lib/chartjs-setup';
import { getScoreRangesForChart } from "@/lib/scoreUtils";
import { useRouter } from 'next/navigation';

interface CandidateScoreDistributionChartProps {
  candidates: Applicant[];
  initialData?: { label: string; count: number }[];
  isLoading?: boolean;
  dynamicHeight?: number;
}

// Reuse period selection constants
const PERIOD_TYPES = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last', value: 'lastN' },
  { label: 'This', value: 'this' },
  { label: 'Past', value: 'pastN' },
  { label: 'Custom', value: 'custom' },
];
const PERIOD_UNITS = [
  { label: 'Day(s)', value: 'day' },
  { label: 'Week(s)', value: 'week' },
  { label: 'Month(s)', value: 'month' },
  { label: 'Year(s)', value: 'year' },
];

export function CandidateScoreDistributionChart({ candidates, initialData, isLoading = false, dynamicHeight }: CandidateScoreDistributionChartProps) {
  const { chartReady, isLoading: chartLoading, error: chartError } = useChartSetup();
  const router = useRouter();
  const chartRef = useRef<Chart | null>(null);

  const [periodType, setPeriodType] = useState<'today'|'yesterday'|'lastN'|'this'|'pastN'|'custom'>('lastN');
  const [periodUnit, setPeriodUnit] = useState<'day'|'week'|'month'|'year'>('day');
  const [periodN, setPeriodN] = useState<number>(7);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 7);
    return { from: startDate, to: now };
  });

  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start: Date = now;
    let end: Date = now;
    
    if (periodType === 'custom' && dateRange?.from && dateRange?.to) {
      const fromDate = safeGetDateFromRange(dateRange, 'from');
      const toDate = safeGetDateFromRange(dateRange, 'to');
      if (fromDate && toDate) {
        start = fromDate;
        end = toDate;
      }
    } else {
      let n = periodN;
      switch (periodType) {
        case 'today':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          break;
        case 'yesterday':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
          break;
        case 'lastN':
          switch (periodUnit) {
            case 'day':
              start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - n);
              end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
              break;
            case 'week':
              start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (n * 7));
              end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
              break;
            case 'month':
              start = new Date(now.getFullYear(), now.getMonth() - n, now.getDate());
              end = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 23, 59, 59, 999);
              break;
            case 'year':
              start = new Date(now.getFullYear() - n, now.getMonth(), now.getDate());
              end = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 23, 59, 59, 999);
              break;
          }
          break;
        case 'this':
          switch (periodUnit) {
            case 'day':
              start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
              break;
            case 'week':
              start = startOfWeek(now);
              end = endOfWeek(now);
              break;
            case 'month':
              start = startOfMonth(now);
              end = endOfMonth(now);
              break;
            case 'year':
              start = startOfYear(now);
              end = endOfYear(now);
              break;
          }
          break;
        case 'pastN':
          switch (periodUnit) {
            case 'day':
              start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - n);
              end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
              break;
            case 'week':
              start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (n * 7));
              end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
              break;
            case 'month':
              start = new Date(now.getFullYear(), now.getMonth() - n, now.getDate());
              end = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 23, 59, 59, 999);
              break;
            case 'year':
              start = new Date(now.getFullYear() - n, now.getMonth(), now.getDate());
              end = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 23, 59, 59, 999);
              break;
          }
          break;
      }
    }
    return { startDate: start, endDate: end };
  }, [periodType, periodUnit, periodN, dateRange]);

  const filteredCandidates = useMemo(() => {
    if (!candidates || candidates.length === 0) return [];
    return candidates.filter(candidate => {
      if (!candidate.createdAt) return false;
      const date = parseISO(candidate.createdAt);
      return date >= startDate && date <= endDate;
    });
  }, [candidates, startDate, endDate]);

  const candidateScoreRanges = useMemo(() => {
    const scoreRanges = getScoreRangesForChart();
    const isDefaultPeriod = periodType === 'lastN' && periodUnit === 'day' && periodN === 7;
    if (initialData && isDefaultPeriod) {
      return scoreRanges.map(range => {
        const preCalc = initialData.find(d => d.label === range.label);
        return { ...range, count: preCalc ? preCalc.count : 0 };
      });
    }
    const rangeCounts = scoreRanges.map(range => ({ ...range, count: 0 }));
    filteredCandidates.forEach(candidate => {
      if (candidate.fitScore !== null && candidate.fitScore !== undefined) {
        const normalizedScore = Math.round(candidate.fitScore);
        const range = rangeCounts.find(r => normalizedScore >= r.min && normalizedScore <= r.max);
        if (range) range.count++;
      }
    });
    return rangeCounts;
  }, [filteredCandidates, initialData, periodType, periodUnit, periodN]);

  const formatPeriodDisplay = () => {
    if (periodType === 'custom' && dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd')}`;
    }
    switch (periodType) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'lastN': return `Last ${periodN} ${periodUnit}${periodN > 1 ? 's' : ''}`;
      case 'this': return `This ${periodUnit}`;
      case 'pastN': return `Past ${periodN} ${periodUnit}${periodN > 1 ? 's' : ''}`;
      default: return 'Last 7 days';
    }
  };

  return (
    <Card className="shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-3 md:z-auto z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-500" />
            <CardTitle className="text-base font-semibold text-foreground">
              Candidate Score Distribution
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Select value={periodType} onValueChange={(value: any) => setPeriodType(value)}>
              <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIOD_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value} className="text-xs">{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(periodType === 'lastN' || periodType === 'pastN') && (
              <>
                <Select value={periodN.toString()} onValueChange={(value) => setPeriodN(parseInt(value))}>
                  <SelectTrigger className="w-[60px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 14, 30, 60, 90].map((n) => (
                      <SelectItem key={n} value={n.toString()} className="text-xs">{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={periodUnit} onValueChange={(value: any) => setPeriodUnit(value)}>
                  <SelectTrigger className="w-[80px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIOD_UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value} className="text-xs">{unit.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            {periodType === 'custom' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[200px] h-8 text-xs justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd")}` : format(dateRange.from, "MMM dd")) : <span>Pick a date range</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
        <CardDescription className="text-muted-foreground/70 text-xs">
          Distribution by fit score quality - {formatPeriodDisplay()}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-3">
        {isLoading ? (
          <div className="h-[200px] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : chartError ? (
          <div className="h-[200px] flex items-center justify-center">
            <div className="text-center space-y-3">
              <XCircle className="h-8 w-8 text-red-500 mx-auto" /><p className="text-red-500 text-sm">Chart error: {chartError}</p>
              <Button onClick={() => window.location.reload()} className="mt-2">Retry</Button>
            </div>
          </div>
        ) : !chartReady ? (
          <div className="h-[200px] flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-muted-foreground">Loading chart...</p>
            </div>
          </div>
        ) : (
          <Bar
            data={{
              labels: (() => {
                const gradeOrder = ['A', 'B', 'C', 'D', 'E'];
                return [...candidateScoreRanges].sort((itemA, itemB) => {
                  const aGrade = itemA.letter || itemA.label[0];
                  const bGrade = itemB.letter || itemB.label[0];
                  return gradeOrder.indexOf(aGrade) - gradeOrder.indexOf(bGrade);
                }).map(r => r.label);
              })(),
              datasets: [{
                label: 'Candidates',
                data: (() => {
                  const gradeOrder = ['A', 'B', 'C', 'D', 'E'];
                  return [...candidateScoreRanges].sort((itemA, itemB) => {
                    const aGrade = itemA.letter || itemA.label[0];
                    const bGrade = itemB.letter || itemB.label[0];
                    return gradeOrder.indexOf(aGrade) - gradeOrder.indexOf(bGrade);
                  }).map(r => r.count);
                })(),
                backgroundColor: ['rgba(163, 230, 53, 0.8)', 'rgba(250, 204, 21, 0.8)', 'rgba(254, 240, 138, 0.8)', 'rgba(251, 146, 60, 0.8)', 'rgba(248, 113, 113, 0.8)'],
                borderRadius: 8,
                borderSkipped: false,
                barPercentage: 0.7,
              }],
            }}
            options={{
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (context) => ` ${context.parsed.x} candidates` } },
                ...(isDataLabelsAvailable() ? { datalabels: { anchor: 'end', align: 'end', color: '#22223b', font: { weight: 'bold', size: 14 }, formatter: (value: any) => value } } : {})
              },
              onClick: (event, elements) => {
                if (elements.length > 0) {
                  const index = elements[0].index;
                  const gradeOrder = ['A', 'B', 'C', 'D', 'E'];
                  const sortedScoreRanges = [...candidateScoreRanges].sort((itemA, itemB) => {
                    const aGrade = itemA.letter || itemA.label[0];
                    const bGrade = itemB.letter || itemB.label[0];
                    return gradeOrder.indexOf(aGrade) - gradeOrder.indexOf(bGrade);
                  });
                  const range = sortedScoreRanges[index];
                  if (range) {
                    const scoreRanges = getScoreRangesForChart();
                    const originalRange = scoreRanges.find(r => r.label === range.label);
                    if (originalRange) {
                      const query = `minAppliedJobFitScore:${originalRange.min} maxAppliedJobFitScore:${originalRange.max}`;
                      router.push('/candidates?query=' + encodeURIComponent(query));
                    }
                  }
                }
              },
              scales: {
                x: { beginAtZero: true, grid: { color: 'rgba(100,116,139,0.1)' }, ticks: { color: '#64748b', font: { size: 13 } } },
                y: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
              },
            }}
            height={200}
          />
        )}
      </CardContent>
    </Card>
  );
}
