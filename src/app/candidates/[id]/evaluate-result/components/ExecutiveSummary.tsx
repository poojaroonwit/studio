"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, BrainCircuit, FileText as FileTextIcon } from 'lucide-react';
import { Bar, Radar } from 'react-chartjs-2';
import type { AveragedEvaluationData, GroupedTrait, GroupedSkill } from '../types';
import { formatPersonalityScore } from '../utils';

interface ExecutiveSummaryProps {
  averagedEvaluationData: AveragedEvaluationData | null;
  personalityGroups: GroupedTrait[];
  expertiseGroups: GroupedSkill[];
  chartReady: boolean;
}

export function ExecutiveSummary({
  averagedEvaluationData,
  personalityGroups,
  expertiseGroups,
  chartReady,
}: ExecutiveSummaryProps) {
  const allSkills = expertiseGroups.flatMap(group => group.skills);
  const overallAverage = allSkills.length > 0
    ? allSkills.reduce((sum, skill) => sum + skill.percentage, 0) / allSkills.length
    : 0;

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-600 rounded-lg">
          <FileTextIcon className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Executive Summary</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Overall Personality Score with Chart */}
        {averagedEvaluationData && (
          <Card className="border-0 md:border shadow-none md:shadow-sm rounded-none md:rounded-lg bg-transparent md:bg-muted/30">
            <CardContent className="p-0 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <Badge className="bg-green-100 text-green-800">
                  Personality
                </Badge>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-3xl font-bold text-gray-900">
                    {Math.round(averagedEvaluationData.overallScore * 20)}%
                  </p>
                  <p className="text-sm text-gray-600">
                    Overall Score ({formatPersonalityScore(averagedEvaluationData.overallScore)}/5)
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${averagedEvaluationData.overallScore * 20}%` }}
                    />
                  </div>
                </div>
                {personalityGroups.length > 0 && chartReady && (
                  <div className="h-64 mt-4 flex justify-center">
                    <Radar
                      data={{
                        labels: personalityGroups.map(g => g.groupName),
                        datasets: [{
                          label: 'Average Score (%)',
                          data: personalityGroups.map(g =>
                            Math.round(g.traits.reduce((sum, t) => sum + t.percentage, 0) / g.traits.length)
                          ),
                          backgroundColor: personalityGroups.map(g => {
                            const color = g.groupColor;
                            // Convert hex to rgba with opacity
                            if (color.startsWith('#')) {
                              const r = parseInt(color.slice(1, 3), 16);
                              const g = parseInt(color.slice(3, 5), 16);
                              const b = parseInt(color.slice(5, 7), 16);
                              return `rgba(${r}, ${g}, ${b}, 0.2)`;
                            }
                            return color;
                          }),
                          borderColor: personalityGroups.map(g => g.groupColor),
                          borderWidth: 2,
                          pointBackgroundColor: personalityGroups.map(g => g.groupColor),
                          pointBorderColor: '#fff',
                          pointHoverBackgroundColor: '#fff',
                          pointHoverBorderColor: personalityGroups.map(g => g.groupColor),
                          pointRadius: 4,
                          pointHoverRadius: 6,
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (context) => `${Math.round(context.parsed.r ?? 0)}%`
                            }
                          }
                        },
                        scales: {
                          r: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                              stepSize: 20,
                              callback: (value) => `${Math.round(Number(value))}%`
                            },
                            grid: {
                              color: 'rgba(0, 0, 0, 0.1)'
                            },
                            pointLabels: {
                              font: {
                                size: 12
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overall Expertise Score with Chart */}
        {expertiseGroups.length > 0 && (
          <Card className="border-0 md:border shadow-none md:shadow-sm rounded-none md:rounded-lg bg-transparent md:bg-muted/30">
            <CardContent className="p-0 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BrainCircuit className="h-5 w-5 text-blue-600" />
                </div>
                <Badge className="bg-blue-100 text-blue-800">
                  Expertise
                </Badge>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-3xl font-bold text-gray-900">
                    {overallAverage.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600">
                    Average Test Score
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${overallAverage}%` }}
                    />
                  </div>
                </div>
                {chartReady && (
                  <div className="h-64 mt-4 flex justify-center">
                    <Bar
                      data={{
                        labels: expertiseGroups.map(g => g.groupName),
                        datasets: [{
                          label: 'Average Score (%)',
                          data: expertiseGroups.map(g =>
                            Math.round(g.skills.reduce((sum, s) => sum + s.percentage, 0) / g.skills.length)
                          ),
                          backgroundColor: expertiseGroups.map(g => g.groupColor),
                          borderRadius: 8,
                          borderSkipped: false,
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (context) => `${Math.round(context.parsed.y ?? 0)}%`
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                              callback: (value) => `${Math.round(Number(value))}%`
                            }
                          }
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

