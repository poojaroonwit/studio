"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Line } from 'react-chartjs-2';
import { Loader2, TrendingUp } from "lucide-react";
import type { Candidate } from "@/lib/types";
import { format, subMonths, subWeeks, subYears, startOfMonth, startOfWeek, startOfYear, endOfMonth, endOfWeek, endOfYear, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, eachYearOfInterval } from 'date-fns';
import parseISO from 'date-fns/parseISO';

interface NewApplicationsTimeSeriesChartProps {
  candidates: Candidate[];
  isLoading?: boolean;
}

type TimePeriod = 'month' | 'week' | 'year';
type ComparisonPeriod = '12' | '24' | '36' | '48' | '60';

export function NewApplicationsTimeSeriesChart({ candidates, isLoading = false }: NewApplicationsTimeSeriesChartProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>('24');

  const chartData = useMemo(() => {
    if (!candidates || candidates.length === 0) {
      return { labels: [], datasets: [] };
    }

    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let intervalFunction: any;
    let formatFunction: (date: Date) => string;
    let comparisonStartDate: Date;

    const comparisonPeriods = parseInt(comparisonPeriod);
    
    switch (timePeriod) {
      case 'week':
        startDate = subWeeks(now, 12); // Last 12 weeks
        endDate = now;
        comparisonStartDate = subWeeks(now, 12 + comparisonPeriods); // Dynamic comparison period
        intervalFunction = eachWeekOfInterval;
        formatFunction = (date: Date) => `Week ${format(date, 'w')}`;
        break;
      case 'year':
        startDate = subYears(now, 5); // Last 5 years
        endDate = now;
        comparisonStartDate = subYears(now, 5 + comparisonPeriods); // Dynamic comparison period
        intervalFunction = eachYearOfInterval;
        formatFunction = (date: Date) => format(date, 'yyyy');
        break;
      default: // month
        startDate = subMonths(now, 12); // Last 12 months
        endDate = now;
        comparisonStartDate = subMonths(now, 12 + comparisonPeriods); // Dynamic comparison period
        intervalFunction = eachMonthOfInterval;
        formatFunction = (date: Date) => format(date, 'MMM yyyy');
        break;
    }

    // Create intervals for current period
    const intervals = intervalFunction({ start: startDate, end: endDate });
    
    // Count applications for current period
    const currentPeriodCounts = intervals.map((intervalStart: Date) => {
      let intervalEnd: Date;
      
      switch (timePeriod) {
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

      const count = candidates.filter(candidate => {
        if (!candidate.applicationDate) return false;
        try {
          const appDate = parseISO(candidate.applicationDate);
          return appDate >= intervalStart && appDate <= intervalEnd;
        } catch {
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

    // Create comparison data
    const comparisonIntervals = intervalFunction({ start: comparisonStartDate, end: startDate });
    const comparisonData = comparisonIntervals.map((intervalStart: Date) => {
      let intervalEnd: Date;
      
      switch (timePeriod) {
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
        label: 'Current Period',
        data: currentPeriodCounts.map((item: any) => item.count),
        borderColor: 'rgba(59, 130, 246, 1)', // blue-500
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) {
            return 'rgba(59, 130, 246, 0.3)';
          }
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
          gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.6)');
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0.8)');
          return gradient;
        },
        borderWidth: 0,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 3,
      },
    ];

    // Always add comparison dataset
    datasets.push({
      label: 'Previous Period',
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
      borderWidth: 0,
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
  }, [candidates, timePeriod, comparisonPeriod]);

  const totalApplications = useMemo(() => {
    return candidates.filter(candidate => {
      if (!candidate.applicationDate) return false;
      try {
        const appDate = parseISO(candidate.applicationDate);
        const now = new Date();
        let startDate: Date;
        
        switch (timePeriod) {
          case 'week':
            startDate = subWeeks(now, 12);
            break;
          case 'year':
            startDate = subYears(now, 5);
            break;
          default:
            startDate = subMonths(now, 12);
            break;
        }
        
        return appDate >= startDate && appDate <= now;
      } catch {
        return false;
      }
    }).length;
  }, [candidates, timePeriod]);

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
    <Card className="group relative overflow-hidden border-2 border-blue-200 dark:border-blue-800 hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-card/50 backdrop-blur-sm">
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
            <Select value={comparisonPeriod} onValueChange={(value: ComparisonPeriod) => setComparisonPeriod(value)}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12 Periods</SelectItem>
                <SelectItem value="24">24 Periods</SelectItem>
                <SelectItem value="36">36 Periods</SelectItem>
                <SelectItem value="48">48 Periods</SelectItem>
                <SelectItem value="60">60 Periods</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timePeriod} onValueChange={(value: TimePeriod) => setTimePeriod(value)}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="year">Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">

        
        <div className="h-64 flex items-center justify-center">
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
                      return maxValue * 10;
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
                },
              }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
} 