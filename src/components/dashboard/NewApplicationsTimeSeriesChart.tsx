"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Line } from 'react-chartjs-2';
import { Chart } from 'chart.js';
import { Loader2, TrendingUp, CalendarIcon, XCircle } from "lucide-react";
import type { Candidate } from "@/lib/types";
import { format, subMonths, subWeeks, subYears, startOfMonth, startOfWeek, startOfYear, endOfMonth, endOfWeek, endOfYear, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, eachYearOfInterval, addDays } from 'date-fns';
import parseISO from 'date-fns/parseISO';
import { cn, isValidDate, safeGetTime, safeDateDiff, safeGetDateFromRange } from "@/lib/utils";
import { DateRange } from 'react-day-picker';
import { useChartSetup } from '@/hooks/use-chart-setup';
import { isDataLabelsAvailable } from '@/lib/chartjs-setup';

interface NewApplicationsTimeSeriesChartProps {
  candidates: Candidate[];
  isLoading?: boolean;
  dynamicHeight?: number;
}

type TimePeriod = 'month' | 'week' | 'year' | 'custom';
type ComparisonPeriod = '12' | '24' | '36' | '48' | '60';

// Add new types for period selection
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

export function NewApplicationsTimeSeriesChart({ candidates, isLoading = false, dynamicHeight }: NewApplicationsTimeSeriesChartProps) {
  // Use the new chart setup hook
  const { chartReady, isLoading: chartLoading, error: chartError } = useChartSetup();

  // Ref to store chart instance
  const chartRef = useRef<Chart | null>(null);

  // New state for period selection
  const [periodType, setPeriodType] = useState<'today'|'yesterday'|'lastN'|'this'|'pastN'|'custom'>('lastN');
  const [periodUnit, setPeriodUnit] = useState<'day'|'week'|'month'|'year'>('day');
  const [periodN, setPeriodN] = useState<number>(7); // Default to 7 days for "Last N"
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 7); // Default to last 7 days
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
      const fromDate = safeGetDateFromRange(dateRange, 'from');
      const toDate = safeGetDateFromRange(dateRange, 'to');
      
      if (fromDate && toDate) {
        start = fromDate;
        end = toDate;
        const daysDiff = Math.ceil(safeDateDiff(start, end) / (1000 * 60 * 60 * 24));
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
        console.warn('Invalid date range provided, falling back to default period');
      }
    } else {
      let n = periodN;
      switch (periodType) {
        case 'today':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          // Create hourly intervals for today
          intervalFn = () => {
            const hours = [];
            for (let i = 0; i < 24; i++) {
              hours.push(new Date(start.getFullYear(), start.getMonth(), start.getDate(), i, 0, 0, 0));
            }
            return hours;
          };
          formatFn = (date: Date) => format(date, 'HH:mm');
          break;
        case 'yesterday':
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
          end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
          // Create hourly intervals for yesterday
          intervalFn = () => {
            const hours = [];
            for (let i = 0; i < 24; i++) {
              hours.push(new Date(start.getFullYear(), start.getMonth(), start.getDate(), i, 0, 0, 0));
            }
            return hours;
          };
          formatFn = (date: Date) => format(date, 'HH:mm');
          break;
        case 'lastN':
          start = new Date(now);
          end = new Date(now);
          end.setHours(23, 59, 59, 999);
          
          switch (periodUnit) {
            case 'day':
              start.setDate(start.getDate() - n);
              start.setHours(0, 0, 0, 0);
              intervalFn = eachDayOfInterval;
              formatFn = (date: Date) => format(date, 'MMM dd');
              break;
            case 'week':
              start = subWeeks(now, n);
              start.setHours(0, 0, 0, 0);
              intervalFn = eachWeekOfInterval;
              formatFn = (date: Date) => `Week ${format(date, 'w')}`;
              break;
            case 'month':
              start = subMonths(now, n);
              start.setHours(0, 0, 0, 0);
              intervalFn = eachMonthOfInterval;
              formatFn = (date: Date) => format(date, 'MMM yyyy');
              break;
            case 'year':
              start = subYears(now, n);
              start.setHours(0, 0, 0, 0);
              intervalFn = eachYearOfInterval;
              formatFn = (date: Date) => format(date, 'yyyy');
              break;
          }
          break;
        case 'this':
          if (periodUnit === 'day') {
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            // Create hourly intervals for today
            intervalFn = () => {
              const hours = [];
              for (let i = 0; i < 24; i++) {
                hours.push(new Date(start.getFullYear(), start.getMonth(), start.getDate(), i, 0, 0, 0));
              }
              return hours;
            };
            formatFn = (date: Date) => format(date, 'HH:mm');
          } else if (periodUnit === 'week') {
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
        case 'pastN':
          if (periodUnit === 'day') {
            start = new Date(now);
            start.setDate(start.getDate() - n);
            start.setHours(0, 0, 0, 0);
            end = now;
            intervalFn = eachDayOfInterval;
            formatFn = (date: Date) => format(date, 'MMM dd');
          } else if (periodUnit === 'week') {
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
    
    // Validate that startDate and endDate are valid Date objects
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      console.error('Invalid date range:', { startDate, endDate });
      return { labels: [], datasets: [] };
    }
    
    // Use new startDate, endDate, intervalFunction, formatFunction
    const intervals = intervalFunction({ start: startDate, end: endDate });
    
    // Validate that intervals is an array and contains valid Date objects
    if (!Array.isArray(intervals)) {
      console.error('intervalFunction did not return an array:', intervals);
      return { labels: [], datasets: [] };
    }
    
    // Count applications for current period
    const currentPeriodCounts = intervals.map((intervalStart: Date) => {
      // Validate that intervalStart is a valid Date object
      if (!isValidDate(intervalStart)) {
        console.error('Invalid intervalStart:', intervalStart);
        return { label: 'Invalid Date', count: 0, start: new Date(), end: new Date() };
      }
      let intervalEnd: Date;
      // Use same logic as before for intervalEnd
      if (periodType === 'custom' && dateRange?.from && dateRange?.to) {
        const fromDate = safeGetDateFromRange(dateRange, 'from');
        const toDate = safeGetDateFromRange(dateRange, 'to');
        
        if (!fromDate || !toDate) {
          console.error('Invalid dateRange dates:', { from: dateRange.from, to: dateRange.to });
          return { label: 'Invalid Date Range', count: 0, start: intervalStart, end: intervalStart };
        }
        const daysDiff = Math.ceil(safeDateDiff(fromDate, toDate) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 30) {
          intervalEnd = addDays(intervalStart, 1);
        } else if (daysDiff <= 180) {
          intervalEnd = endOfWeek(intervalStart);
        } else {
          intervalEnd = endOfMonth(intervalStart);
        }
      } else if (periodType === 'today' || periodType === 'yesterday') {
        // For today/yesterday, show hourly intervals
        intervalEnd = new Date(intervalStart.getTime() + 60 * 60 * 1000); // Add 1 hour
      } else if (periodType === 'lastN') {
        // For last N periods, use appropriate intervals based on unit
        switch (periodUnit) {
          case 'day':
            intervalEnd = addDays(intervalStart, 1);
            break;
          case 'week':
            intervalEnd = endOfWeek(intervalStart);
            break;
          case 'month':
            intervalEnd = endOfMonth(intervalStart);
            break;
          case 'year':
            intervalEnd = endOfYear(intervalStart);
            break;
          default:
            intervalEnd = addDays(intervalStart, 1);
            break;
        }
      } else {
        // For 'this' period type, use appropriate intervals based on unit
        if (periodType === 'this') {
          if (periodUnit === 'week') {
            intervalEnd = addDays(intervalStart, 1);
          } else if (periodUnit === 'month') {
            intervalEnd = addDays(intervalStart, 1);
          } else if (periodUnit === 'year') {
            intervalEnd = endOfMonth(intervalStart);
          } else {
            intervalEnd = addDays(intervalStart, 1);
          }
        } else {
          // For other period types, use the original logic
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
    const rangeLength = safeDateDiff(startDate, endDate);
    const comparisonStart = new Date(safeGetTime(startDate) - rangeLength);
    const comparisonEnd = startDate;
    
    // Validate comparison dates
    if (!isValidDate(comparisonStart) || !isValidDate(comparisonEnd)) {
      console.error('Invalid comparison dates:', { comparisonStart, comparisonEnd });
      return { labels: [], datasets: [] };
    }
    
    const comparisonIntervals = intervalFunction({ start: comparisonStart, end: comparisonEnd });
    
    // Validate comparison intervals
    if (!Array.isArray(comparisonIntervals)) {
      console.error('intervalFunction did not return an array for comparison:', comparisonIntervals);
      return { labels: [], datasets: [] };
    }
    
    const comparisonData = comparisonIntervals.map((intervalStart: Date) => {
      // Validate that intervalStart is a valid Date object
      if (!isValidDate(intervalStart)) {
        console.error('Invalid comparison intervalStart:', intervalStart);
        return { label: 'Invalid Date', count: 0, start: new Date(), end: new Date() };
      }
      let intervalEnd: Date;
      if (periodType === 'custom' && dateRange?.from && dateRange?.to) {
        const fromDate = safeGetDateFromRange(dateRange, 'from');
        const toDate = safeGetDateFromRange(dateRange, 'to');
        
        if (!fromDate || !toDate) {
          console.error('Invalid dateRange dates in comparison:', { from: dateRange.from, to: dateRange.to });
          return { label: 'Invalid Date Range', count: 0, start: intervalStart, end: intervalStart };
        }
        const daysDiff = Math.ceil(safeDateDiff(fromDate, toDate) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 30) {
          intervalEnd = addDays(intervalStart, 1);
        } else if (daysDiff <= 180) {
          intervalEnd = endOfWeek(intervalStart);
        } else {
          intervalEnd = endOfMonth(intervalStart);
        }
      } else if (periodType === 'today' || periodType === 'yesterday') {
        // For today/yesterday, show hourly intervals
        intervalEnd = new Date(intervalStart.getTime() + 60 * 60 * 1000); // Add 1 hour
      } else if (periodType === 'lastN') {
        // For last N periods, use appropriate intervals based on unit
        switch (periodUnit) {
          case 'day':
            intervalEnd = addDays(intervalStart, 1);
            break;
          case 'week':
            intervalEnd = endOfWeek(intervalStart);
            break;
          case 'month':
            intervalEnd = endOfMonth(intervalStart);
            break;
          case 'year':
            intervalEnd = endOfYear(intervalStart);
            break;
          default:
            intervalEnd = addDays(intervalStart, 1);
            break;
        }
      } else {
        // For 'this' period type, use appropriate intervals based on unit
        if (periodType === 'this') {
          if (periodUnit === 'week') {
            intervalEnd = addDays(intervalStart, 1);
          } else if (periodUnit === 'month') {
            intervalEnd = addDays(intervalStart, 1);
          } else if (periodUnit === 'year') {
            intervalEnd = endOfMonth(intervalStart);
          } else {
            intervalEnd = addDays(intervalStart, 1);
          }
        } else {
          // For other period types, use the original logic
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

  // Callback to store chart reference
  const onChartReady = (chart: any) => {
    if (chart) {
      chartRef.current = chart;
    }
  };

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
            {periodType === 'lastN' && (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={periodN}
                  onChange={e => setPeriodN(Number(e.target.value))}
                  className="w-16 h-8 text-xs border border-input bg-background text-foreground rounded-md px-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  style={{ minWidth: 40 }}
                />
                <Select value={periodUnit} onValueChange={v => setPeriodUnit(v as any)}>
                  <SelectTrigger className="w-20 h-8 text-xs">
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
            {periodType !== 'custom' && periodType !== 'pastN' && periodType !== 'today' && periodType !== 'yesterday' && periodType !== 'lastN' && (
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
                      "flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-accent hover:bg-accent/80 transition-colors text-xs font-medium shadow-sm",
                      !dateRange && "text-muted-foreground"
                    )}
                    style={{ minWidth: 180 }}
                  >
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    <span className="whitespace-nowrap">
                      {(() => {
                        const fromDate = safeGetDateFromRange(dateRange, 'from');
                        const toDate = safeGetDateFromRange(dateRange, 'to');
                        
                        if (fromDate && toDate) {
                          return (
                            <>
                              <span className="font-semibold text-blue-700">{format(fromDate, "MMM dd, yyyy")}</span>
                              <span className="mx-1 text-blue-400">–</span>
                              <span className="font-semibold text-blue-700">{format(toDate, "MMM dd, yyyy")}</span>
                            </>
                          );
                        } else if (fromDate) {
                          return <span className="font-semibold text-blue-700">{format(fromDate, "MMM dd, yyyy")}</span>;
                        } else {
                          return <span className="text-blue-400">Pick a date range</span>;
                        }
                      })()}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" style={{ minWidth: 400 }}>
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
          // style={{ 
          //   height: dynamicHeight && dynamicHeight > 0 ? `${dynamicHeight}px` : '256px',
          //   minHeight: '256px'
          // }}
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
          ) : chartError ? (
            <div className="flex items-center justify-center">
              <div className="text-center space-y-3">
                <XCircle className="h-8 w-8 text-red-500 mx-auto" />
                <p className="text-red-500 text-sm">Chart error: {chartError}</p>
                <Button 
                  onClick={() => window.location.reload()}
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : !chartReady ? (
            <div className="flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">Loading chart...</p>
              </div>
            </div>
          ) : (
                         <Line
               data={chartData}
               ref={onChartReady}
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
                       font: { size: 10 },
                       usePointStyle: true,
                       padding: 15,
                       pointStyle: 'circle',
                       generateLabels: function(chart) {
                         const original = Chart.defaults.plugins.legend.labels.generateLabels;
                         const labels = original.call(this, chart);
                         
                         labels.forEach(label => {
                           (label as any).borderWidth = 0;
                           (label as any).borderColor = 'transparent';
                         });
                         
                         return labels;
                       }
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
                                       ...(isDataLabelsAvailable() ? {
                      datalabels: {
                        display: true,
                        color: function(context: any) {
                          // Dark text for better readability
                          return '#1f2937'; // gray-800 - dark color
                        },
                        font: {
                          weight: 'bold',
                          size: 10
                        },
                        formatter: function(value: number) {
                          return typeof value === 'number' ? value : '';
                        },
                        anchor: 'end',
                        align: 'top',
                        offset: function() {
                          // Fixed distance from the point
                          return 12;
                        },
                        clamp: true,
                        clip: false,
                        backgroundColor: function(context: any) {
                          // More transparent backgrounds: blue for current, gray for previous
                          return context.datasetIndex === 0 ? 'rgba(59, 130, 246, 0.25)' : 'rgba(156, 163, 175, 0.25)';
                        },
                        borderColor: function(context: any) {
                          return context.datasetIndex === 0 ? 'rgba(59, 130, 246, 0.5)' : 'rgba(156, 163, 175, 0.5)';
                        },
                        borderWidth: 1,
                        borderRadius: 4,
                        padding: {
                          top: 2,
                          bottom: 2,
                          left: 4,
                          right: 4
                        }
                      }
                    } : {})
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
                       callback: function(value: any) {
                         // Only show ticks for reasonable intervals to prevent too many ticks
                         const maxValue = Math.max(...chartData.datasets.flatMap(dataset => dataset.data));
                         if (maxValue <= 20) {
                           return value; // Show all ticks for small ranges
                         } else if (maxValue <= 100) {
                           return Number(value) % 5 === 0 ? value : ''; // Show every 5th tick
                         } else if (maxValue <= 500) {
                           return Number(value) % 10 === 0 ? value : ''; // Show every 10th tick
                         } else {
                           return Number(value) % Math.ceil(maxValue / 50) === 0 ? value : ''; // Show max ~50 ticks
                         }
                       }
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