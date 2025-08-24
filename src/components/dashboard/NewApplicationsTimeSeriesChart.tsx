"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Line } from 'react-chartjs-2';
import { Loader2, TrendingUp, CalendarIcon } from "lucide-react";
import type { Candidate } from "@/lib/types";
import { format, subMonths, subWeeks, subYears, startOfMonth, startOfWeek, startOfYear, endOfMonth, endOfWeek, endOfYear, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, eachYearOfInterval, addDays } from 'date-fns';
import parseISO from 'date-fns/parseISO';
import { cn } from "@/lib/utils";
import { DateRange } from 'react-day-picker';

interface NewApplicationsTimeSeriesChartProps {
  candidates: Candidate[];
  isLoading?: boolean;
  dynamicHeight?: number;
}

type TimePeriod = 'month' | 'week' | 'year' | 'custom';
type ComparisonPeriod = '12' | '24' | '36' | '48' | '60';

// Add new types for period selection
const PERIOD_TYPES = [
  { label: 'This', value: 'this' },
  { label: 'Last', value: 'last' },
  { label: 'Past', value: 'pastN' },
  { label: 'Custom', value: 'custom' },
];
const PERIOD_UNITS = [
  { label: 'Week(s)', value: 'week' },
  { label: 'Month(s)', value: 'month' },
  { label: 'Year(s)', value: 'year' },
];

export function NewApplicationsTimeSeriesChart({ candidates, isLoading = false, dynamicHeight }: NewApplicationsTimeSeriesChartProps) {
  // New state for period selection
  const [periodType, setPeriodType] = useState<'this'|'last'|'pastN'|'custom'>('pastN');
  const [periodUnit, setPeriodUnit] = useState<'week'|'month'|'year'>('week');
  const [periodN, setPeriodN] = useState<number>(12);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    const startDate = subMonths(now, 12);
    return {
      from: startDate,
      to: now
    };
  });

  // Calculate start and end dates based on new periodType/unit/N
  const { startDate, endDate, intervalFunction, formatFunction } = useMemo(() => {
    const now = new Date();
    let start: Date = now;
    let end: Date = now;
    let intervalFn: any = eachWeekOfInterval;
    let formatFn: (date: Date) => string = (date) => format(date, 'MMM dd');
    if (periodType === 'custom' && dateRange?.from && dateRange?.to) {
      start = dateRange.from;
      end = dateRange.to;
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 30) {
        intervalFn = eachDayOfInterval;
        formatFn = (date: Date) => format(date, 'MMM dd');
      } else if (daysDiff <= 180) {
        intervalFn = eachWeekOfInterval;
        formatFn = (date: Date) => `Week ${format(date, 'w')}`;
      } else {
        intervalFn = eachMonthOfInterval;
        formatFn = (date: Date) => format(date, 'MMM yyyy');
      }
    } else {
      let n = periodN;
      switch (periodType) {
        case 'this':
          if (periodUnit === 'week') {
            start = startOfWeek(now);
            end = endOfWeek(now);
            intervalFn = eachDayOfInterval;
            formatFn = (date: Date) => format(date, 'EEE dd');
          } else if (periodUnit === 'month') {
            start = startOfMonth(now);
            end = endOfMonth(now);
            intervalFn = eachWeekOfInterval;
            formatFn = (date: Date) => `Week ${format(date, 'w')}`;
          } else {
            start = startOfYear(now);
            end = endOfYear(now);
            intervalFn = eachMonthOfInterval;
            formatFn = (date: Date) => format(date, 'MMM');
          }
          break;
        case 'last':
          if (periodUnit === 'week') {
            start = startOfWeek(subWeeks(now, 1));
            end = endOfWeek(subWeeks(now, 1));
            intervalFn = eachDayOfInterval;
            formatFn = (date: Date) => format(date, 'EEE dd');
          } else if (periodUnit === 'month') {
            start = startOfMonth(subMonths(now, 1));
            end = endOfMonth(subMonths(now, 1));
            intervalFn = eachWeekOfInterval;
            formatFn = (date: Date) => `Week ${format(date, 'w')}`;
          } else {
            start = startOfYear(subYears(now, 1));
            end = endOfYear(subYears(now, 1));
            intervalFn = eachMonthOfInterval;
            formatFn = (date: Date) => format(date, 'MMM');
          }
          break;
        case 'pastN':
          if (periodUnit === 'week') {
            start = subWeeks(now, n);
            end = now;
            intervalFn = eachWeekOfInterval;
            formatFn = (date: Date) => `Week ${format(date, 'w')}`;
          } else if (periodUnit === 'month') {
            start = subMonths(now, n);
            end = now;
            intervalFn = eachMonthOfInterval;
            formatFn = (date: Date) => format(date, 'MMM yyyy');
          } else {
            start = subYears(now, n);
            end = now;
            intervalFn = eachYearOfInterval;
            formatFn = (date: Date) => format(date, 'yyyy');
          }
          break;
      }
    }
    return { startDate: start, endDate: end, intervalFunction: intervalFn, formatFunction: formatFn };
  }, [periodType, periodUnit, periodN, dateRange]);

  const chartData = useMemo(() => {
    if (!candidates || candidates.length === 0) {
      return { labels: [], datasets: [] };
    }
    // Use new startDate, endDate, intervalFunction, formatFunction
    const intervals = intervalFunction({ start: startDate, end: endDate });
    // Count applications for current period
    const currentPeriodCounts = intervals.map((intervalStart: Date) => {
      let intervalEnd: Date;
      // Use same logic as before for intervalEnd
      if (periodType === 'custom' && dateRange?.from && dateRange?.to) {
        const daysDiff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 30) {
          intervalEnd = addDays(intervalStart, 1);
        } else if (daysDiff <= 180) {
          intervalEnd = endOfWeek(intervalStart);
        } else {
          intervalEnd = endOfMonth(intervalStart);
        }
      } else {
        switch (periodUnit) {
          case 'week':
            intervalEnd = endOfWeek(intervalStart);
            break;
          case 'year':
            intervalEnd = endOfYear(intervalStart);
            break;
          default:
            intervalEnd = endOfMonth(intervalStart);
            break;
        }
      }
      const count = candidates.filter(candidate => {
        if (!candidate.applicationDate) return false;
        try {
          const appDate = parseISO(candidate.applicationDate);
          return appDate >= intervalStart && appDate <= intervalEnd;
        } catch (error) {
          console.error('Error parsing application date:', candidate.applicationDate, error);
          return false;
        }
      }).length;
      return {
        label: formatFunction(intervalStart),
        count,
        start: intervalStart,
        end: intervalEnd
      };
    });
    // For comparison, just use previous period of same length
    const rangeLength = endDate.getTime() - startDate.getTime();
    const comparisonStart = new Date(startDate.getTime() - rangeLength);
    const comparisonEnd = startDate;
    const comparisonIntervals = intervalFunction({ start: comparisonStart, end: comparisonEnd });
    const comparisonData = comparisonIntervals.map((intervalStart: Date) => {
      let intervalEnd: Date;
      if (periodType === 'custom' && dateRange?.from && dateRange?.to) {
        const daysDiff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 30) {
          intervalEnd = addDays(intervalStart, 1);
        } else if (daysDiff <= 180) {
          intervalEnd = endOfWeek(intervalStart);
        } else {
          intervalEnd = endOfMonth(intervalStart);
        }
      } else {
        switch (periodUnit) {
          case 'week':
            intervalEnd = endOfWeek(intervalStart);
            break;
          case 'year':
            intervalEnd = endOfYear(intervalStart);
            break;
          default:
            intervalEnd = endOfMonth(intervalStart);
            break;
        }
      }
      const count = candidates.filter(candidate => {
        if (!candidate.applicationDate) return false;
        try {
          const appDate = parseISO(candidate.applicationDate);
          return appDate >= intervalStart && appDate <= intervalEnd;
        } catch {
          return false;
        }
      }).length;
      return count;
    });
         const datasets = [
       {
         label: 'Current',
         data: currentPeriodCounts.map((item: any) => item.count),
         borderColor: 'rgba(59, 130, 246, 1)', // blue-500
         backgroundColor: (context: any) => {
           const chart = context.chart;
           const { ctx, chartArea } = chart;
           if (!chartArea) {
             return 'rgba(59, 130, 246, 0.4)';
           }
           const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
           gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
           gradient.addColorStop(0.3, 'rgba(59, 130, 246, 0.6)');
           gradient.addColorStop(0.7, 'rgba(59, 130, 246, 0.8)');
           gradient.addColorStop(1, 'rgba(59, 130, 246, 0.9)');
           return gradient;
         },
         borderWidth: 2,
         fill: true,
         tension: 0.4,
         pointBackgroundColor: 'rgba(59, 130, 246, 1)',
         pointBorderColor: '#ffffff',
         pointBorderWidth: 2,
         pointRadius: 5,
         pointHoverRadius: 8,
         pointHoverBackgroundColor: 'rgba(59, 130, 246, 1)',
         pointHoverBorderColor: '#ffffff',
         pointHoverBorderWidth: 3,
       },
     ];
         datasets.push({
       label: 'Previous',
       data: comparisonData,
       borderColor: 'rgba(156, 163, 175, 0.8)', // gray-400
       backgroundColor: (context: any) => {
         const chart = context.chart;
         const { ctx, chartArea } = chart;
         if (!chartArea) {
           return 'rgba(156, 163, 175, 0.2)';
         }
         const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
         gradient.addColorStop(0, 'rgba(156, 163, 175, 0.2)');
         gradient.addColorStop(0.5, 'rgba(156, 163, 175, 0.4)');
         gradient.addColorStop(1, 'rgba(156, 163, 175, 0.6)');
         return gradient;
       },
       borderWidth: 2,
       fill: true,
       tension: 0.4,
       pointBackgroundColor: 'rgba(156, 163, 175, 0.8)',
       pointBorderColor: '#ffffff',
       pointBorderWidth: 1,
       pointRadius: 4,
       pointHoverRadius: 6,
       pointHoverBackgroundColor: 'rgba(156, 163, 175, 0.8)',
       pointHoverBorderColor: '#ffffff',
       pointHoverBorderWidth: 2,
     });
    return {
      labels: currentPeriodCounts.map((item: any) => item.label),
      datasets,
    };
  }, [candidates, startDate, endDate, intervalFunction, formatFunction, dateRange, periodType, periodUnit, periodN]);

  const totalApplications = useMemo(() => {
    return candidates.filter(candidate => {
      if (!candidate.applicationDate) return false;
      try {
        const appDate = parseISO(candidate.applicationDate);
        return appDate >= startDate && appDate <= endDate;
      } catch {
        return false;
      }
    }).length;
  }, [candidates, startDate, endDate]);

  const averageApplications = useMemo(() => {
    if (chartData.labels.length === 0) return 0;
    const total = chartData.datasets[0].data.reduce((sum: number, count: number) => sum + count, 0);
    return Math.round(total / chartData.labels.length);
  }, [chartData]);

  const periodChange = useMemo(() => {
    if (chartData.datasets.length < 2) return null;
    
    const currentTotal = chartData.datasets[0].data.reduce((sum: number, count: number) => sum + count, 0);
    const previousTotal = chartData.datasets[1].data.reduce((sum: number, count: number) => sum + count, 0);
    
    if (previousTotal === 0) return null;
    
    const change = ((currentTotal - previousTotal) / previousTotal) * 100;
    return {
      percentage: Math.round(change),
      isPositive: change > 0
    };
  }, [chartData]);

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <CardHeader className="relative pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-foreground group-hover:text-foreground transition-colors flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              New Applications Over Time
            </CardTitle>
            <CardDescription className="text-muted-foreground/70 text-xs">
              Track application trends and patterns
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={periodType} onValueChange={v => setPeriodType(v as any)}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_TYPES.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {periodType === 'pastN' && (
              <div className="flex items-center gap-1">
                                 <input
                   type="number"
                   min={1}
                   max={100}
                   value={periodN}
                   onChange={e => setPeriodN(Number(e.target.value))}
                   className="w-16 h-8 text-xs border border-input bg-background text-foreground rounded-md px-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                   style={{ minWidth: 40 }}
                 />
                <Select value={periodUnit} onValueChange={v => setPeriodUnit(v as any)}>
                  <SelectTrigger className="w-28 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_UNITS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {periodType !== 'custom' && periodType !== 'pastN' && (
              <Select value={periodUnit} onValueChange={v => setPeriodUnit(v as any)}>
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_UNITS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {periodType === 'custom' && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors text-xs font-medium shadow-sm",
                      !dateRange && "text-muted-foreground"
                    )}
                    style={{ minWidth: 180 }}
                  >
                    <CalendarIcon className="h-4 w-4 text-blue-500" />
                    <span className="whitespace-nowrap">
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            <span className="font-semibold text-blue-700">{format(dateRange.from, "MMM dd, yyyy")}</span>
                            <span className="mx-1 text-blue-400">–</span>
                            <span className="font-semibold text-blue-700">{format(dateRange.to, "MMM dd, yyyy")}</span>
                          </>
                        ) : (
                          <span className="font-semibold text-blue-700">{format(dateRange.from, "MMM dd, yyyy")}</span>
                        )
                      ) : (
                        <span className="text-blue-400">Pick a date range</span>
                      )}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4 rounded-xl shadow-lg bg-white border border-blue-200" align="start" style={{ minWidth: 400 }}>
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    className="rounded-lg border border-blue-100 shadow-sm"
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">

        
        <div 
          className="flex items-center justify-center"
          style={{ 
            height: dynamicHeight && dynamicHeight > 0 ? `${dynamicHeight}px` : '256px',
            minHeight: '256px'
          }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : chartData.labels.length === 0 ? (
            <div className="text-center text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No application data available</p>
            </div>
          ) : (
                         <Line
               data={chartData}
               options={{
                 responsive: true,
                 maintainAspectRatio: false,
                 layout: {
                   padding: {
                     top: 20,
                     bottom: 20
                   }
                 },
                 plugins: {
                   legend: {
                     display: true,
                     position: 'top' as const,
                     labels: {
                       color: 'rgb(100, 116, 139)',
                       font: { size: 12 },
                       usePointStyle: true,
                       padding: 15
                     }
                   },
                   tooltip: {
                     backgroundColor: 'rgba(0, 0, 0, 0.8)',
                     titleColor: 'white',
                     bodyColor: 'white',
                     borderColor: 'rgba(59, 130, 246, 0.3)',
                     borderWidth: 1,
                     callbacks: {
                       label: function(context) {
                         return ` ${context.dataset.label}: ${context.parsed.y} applications`;
                       }
                     }
                   },
                   datalabels: {
                     display: true,
                     color: '#374151',
                     font: {
                       weight: 'bold',
                       size: 11
                     },
                     formatter: function(value: number) {
                       return value > 0 ? value : '';
                     },
                     anchor: 'end',
                     align: 'top',
                     offset: 4
                   }
                 },
                 scales: {
                   x: {
                     grid: { 
                       color: 'rgba(100,116,139,0.1)',
                       display: false
                     },
                     ticks: { 
                       color: 'rgb(100, 116, 139)', 
                       font: { size: 11 },
                       maxRotation: 45
                     },
                   },
                   y: {
                     beginAtZero: true,
                     grid: {
                       color: 'rgba(100,116,139,0.1)',
                     },
                     ticks: { 
                       color: 'rgb(100, 116, 139)', 
                       font: { size: 11 },
                       stepSize: 1
                     },
                     suggestedMax: (() => {
                       const maxValue = Math.max(...chartData.datasets.flatMap(dataset => dataset.data));
                       // Use a more standard approach: add 20% padding to the max value
                       return Math.ceil(maxValue * 1.2);
                     })(),
                   },
                 },
                 interaction: {
                   intersect: false,
                   mode: 'index' as const,
                 },
                 elements: {
                   point: {
                     hoverRadius: 8,
                   },
                   line: {
                     tension: 0.4,
                   },
                 },
               }}
             />
          )}
        </div>
      </CardContent>
    </Card>
  );
} 