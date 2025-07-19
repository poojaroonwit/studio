"use client"

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { Candidate, Position } from "@/lib/types"
import { BarChart3, TrendingUp, Users } from "lucide-react";
// Static imports for chart elements
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface CandidatesPerPositionChartProps {
  candidates: Candidate[];
  positions: Position[];
}

export function CandidatesPerPositionChart({ candidates, positions }: CandidatesPerPositionChartProps) {
  // Memoize the data processing to prevent unnecessary recalculations
  const data = useMemo(() => {
    // Ensure inputs are arrays before processing
    const safeCandidates = Array.isArray(candidates) ? candidates : [];
    const safePositions = Array.isArray(positions) ? positions : [];
    
    // Create a map for faster candidate counting
    const candidateCountMap = new Map<string, number>();
    safeCandidates.forEach(candidate => {
      if (candidate.positionId) {
        candidateCountMap.set(candidate.positionId, (candidateCountMap.get(candidate.positionId) || 0) + 1);
      }
    });
    
    return safePositions
      .map(position => {
        const candidateCount = candidateCountMap.get(position.id) || 0;
        return {
          position: position.title.length > 15 ? `${position.title.substring(0,12)}...` : position.title, // Truncate long titles
          fullPositionTitle: position.title,
          candidates: candidateCount,
        };
      })
      .filter(item => item.candidates > 0) // Only show positions with candidates
      .sort((a, b) => b.candidates - a.candidates); // Sort by candidate count descending
  }, [candidates, positions]);

  const totalCandidates = useMemo(() => {
    return data.reduce((sum, item) => sum + item.candidates, 0);
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-1 bg-gradient-to-b from-blue-500 to-blue-400 rounded-full"></div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Candidates per Position</h2>
              <p className="text-sm text-muted-foreground mt-1">Distribution across open positions</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-muted-foreground">Analytics</span>
          </div>
        </div>
        
        <Card className="group relative overflow-hidden border-2 border-blue-200 hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white/50 backdrop-blur-sm hover:shadow-blue-500/20">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold text-foreground group-hover:text-gray-900 transition-colors">
                No Data Available
              </CardTitle>
              <p className="text-sm text-muted-foreground">No candidate data available for positions.</p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
              <BarChart3 className="h-6 w-6 text-blue-600 group-hover:drop-shadow-sm" />
            </div>
        </CardHeader>
          <CardContent className="relative h-[300px] flex items-center justify-center">
            <div className="text-center space-y-3">
              <Users className="h-12 w-12 text-blue-300 mx-auto" />
              <p className="text-muted-foreground">No candidates assigned to positions yet</p>
            </div>
        </CardContent>
      </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-1 bg-gradient-to-b from-blue-500 to-blue-400 rounded-full"></div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Candidates per Position</h2>
            <p className="text-sm text-muted-foreground mt-1">Distribution across open positions</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-muted-foreground">Analytics</span>
        </div>
      </div>
      
      <Card className="group relative overflow-hidden border-2 border-blue-200 hover:border-opacity-80 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white/50 backdrop-blur-sm hover:shadow-blue-500/20">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold text-foreground group-hover:text-gray-900 transition-colors">
              Position Distribution
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {totalCandidates} total candidates across {data.length} positions
            </p>
          </div>
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
            <BarChart3 className="h-6 w-6 text-blue-600 group-hover:drop-shadow-sm" />
          </div>
      </CardHeader>
        <CardContent className="relative">
          <div className="h-[400px] w-full">
        <Bar
          data={{
            labels: data.map(d => d.position),
            datasets: [
              {
                label: 'Candidates',
                data: data.map(d => d.candidates),
                    backgroundColor: [
                      'rgba(59, 130, 246, 0.8)',   // blue-500
                      'rgba(16, 185, 129, 0.8)',   // emerald-500
                      'rgba(245, 158, 11, 0.8)',   // amber-500
                      'rgba(239, 68, 68, 0.8)',    // red-500
                      'rgba(139, 92, 246, 0.8)',   // violet-500
                      'rgba(236, 72, 153, 0.8)',   // pink-500
                      'rgba(34, 197, 94, 0.8)',    // green-500
                      'rgba(249, 115, 22, 0.8)',   // orange-500
                    ],
                borderRadius: 8,
                borderSkipped: false,
                barPercentage: 0.7,
                    borderWidth: 0,
                    hoverBackgroundColor: [
                      'rgba(59, 130, 246, 1)',      // blue-600
                      'rgba(16, 185, 129, 1)',      // emerald-600
                      'rgba(245, 158, 11, 1)',      // amber-600
                      'rgba(239, 68, 68, 1)',       // red-600
                      'rgba(139, 92, 246, 1)',      // violet-600
                      'rgba(236, 72, 153, 1)',      // pink-600
                      'rgba(34, 197, 94, 1)',       // green-600
                      'rgba(249, 115, 22, 1)',      // orange-600
                    ],
              },
            ],
          }}
          options={{
            indexAxis: 'y',
            responsive: true,
                maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              title: { display: false },
              tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#1f2937',
                    bodyColor: '#374151',
                    borderColor: 'rgba(59, 130, 246, 0.2)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false,
                callbacks: {
                      title: function(context) {
                        const dataIndex = context[0].dataIndex;
                        return data[dataIndex]?.fullPositionTitle || context[0].label;
                      },
                  label: function(context) {
                    return ` ${context.parsed.x} candidates`;
                  }
                }
              }
            },
            scales: {
              x: {
                beginAtZero: true,
                    grid: { 
                      color: 'rgba(100,116,139,0.1)',
                    },
                    ticks: {
                      color: '#6b7280',
                      font: {
                        size: 12,
                        weight: 500
                      },
                      padding: 8,
                    },
                    border: {
                      display: false
                    }
              },
              y: {
                    grid: { 
                      display: false,
                    },
                    ticks: {
                      color: '#6b7280',
                      font: {
                        size: 12,
                        weight: 500
                      },
                      padding: 8,
                    },
                    border: {
                      display: false
                    }
                  }
                },
                animation: {
                  duration: 1000,
                  easing: 'easeOutQuart',
                  onProgress: function(animation) {
                    const chart = animation.chart;
                    const ctx = chart.ctx;
                    const dataset = chart.data.datasets[0];
                    const meta = chart.getDatasetMeta(0);
                    
                    meta.data.forEach((bar, index) => {
                      const data = dataset.data[index];
                      const model = bar;
                      
                      if (model) {
                        ctx.save();
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.font = '12px Inter, sans-serif';
                        ctx.fillStyle = '#374151';
                        
                        const x = model.x;
                        const y = model.y;
                        
                        if (data && typeof data === 'number' && data > 0) {
                          ctx.fillText(data.toString(), x + 15, y);
                        }
                        ctx.restore();
                      }
                    });
                  }
                },
                interaction: {
                  intersect: false,
                  mode: 'index'
                }
              }}
            />
          </div>
          
          {/* Summary Stats */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">{totalCandidates}</div>
              <div className="text-xs text-blue-600/80 font-medium">Total Candidates</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
              <div className="text-2xl font-bold text-emerald-600">{data.length}</div>
              <div className="text-xs text-emerald-600/80 font-medium">Active Positions</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
              <div className="text-2xl font-bold text-amber-600">
                {data.length > 0 ? Math.round(totalCandidates / data.length) : 0}
              </div>
              <div className="text-xs text-amber-600/80 font-medium">Avg per Position</div>
            </div>
          </div>
      </CardContent>
    </Card>
    </div>
  )
}
