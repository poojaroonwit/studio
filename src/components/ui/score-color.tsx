// Shared fit score color logic for all components

import React from 'react';

export interface ScoreColorInfo {
  label: string;
  min: number;
  max: number;
  bg: string;
  text: string;
}

export const SCORE_COLOR_STOPS: ScoreColorInfo[] = [
  { label: 'E (0-20)', min: 0, max: 20, bg: 'bg-red-400', text: 'text-white' },
  { label: 'D (21-40)', min: 21, max: 40, bg: 'bg-orange-400', text: 'text-black' },
  { label: 'C (41-60)', min: 41, max: 60, bg: 'bg-yellow-200', text: 'text-black' },
  { label: 'B (61-80)', min: 61, max: 80, bg: 'bg-yellow-400', text: 'text-black' },
  { label: 'A (81-100)', min: 81, max: 100, bg: 'bg-lime-400', text: 'text-black' },
];

export function getScoreColorInfo(score: number | null | undefined): ScoreColorInfo {
  // Return default if score is invalid
  if (score === null || score === undefined || isNaN(Number(score))) {
    return SCORE_COLOR_STOPS[0];
  }
  
  let normalized = 0;
  if (typeof score === 'number') {
    if (score > 0 && score <= 1) {
      normalized = Math.round(score * 100);
    } else {
      normalized = Math.round(score);
    }
  } else {
    return SCORE_COLOR_STOPS[0];
  }
  
  // Ensure normalized is within valid range
  if (normalized < 0 || normalized > 100) {
    return SCORE_COLOR_STOPS[0];
  }
  
  for (const stop of SCORE_COLOR_STOPS) {
    if (normalized >= stop.min && normalized <= stop.max) {
      return stop;
    }
  }
  
  // Fallback to default
  return SCORE_COLOR_STOPS[0];
}

export function ScoreBadge({ score, className = '', children }: { score: number | null | undefined, className?: string, children?: React.ReactNode }) {
  // Additional safety check for score
  if (score === null || score === undefined) {
    return null;
  }
  
  // Additional type checking
  if (typeof score !== 'number' || isNaN(score)) {
    console.warn('ScoreBadge: Invalid score value:', score, typeof score);
    return null;
  }
  
  const info = getScoreColorInfo(score);
  
  // Additional safety check for info
  if (!info || !info.label) {
    console.warn('ScoreBadge: Invalid info object:', info);
    return null;
  }
  
  // Ensure all className parts are valid strings
  const bgClass = info.bg || '';
  const textClass = info.text || '';
  const additionalClass = className || '';
  
  // Additional safety check for label
  if (typeof info.label !== 'string') {
    console.warn('ScoreBadge: Invalid label type:', info.label, typeof info.label);
    return null;
  }
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${bgClass} ${textClass} ${additionalClass}`.trim()}>
      {children ?? info.label}
    </span>
  );
} 