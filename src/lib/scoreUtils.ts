/**
 * Score utilities for handling fit scores and letter grades
 * 
 * IMPORTANT: This system handles both decimal (0-1) and integer (0-100) score formats.
 * - Decimal scores (0.55) are automatically converted to percentages (55%)
 * - Integer scores (55) are used as-is
 * - All scores are normalized to 0-100 range for consistent grading
 */

export interface ScoreGrade {
  letter: string;
  range: string;
  min: number;
  max: number;
  color: string;
  bgColor: string;
}

export const SCORE_GRADES: ScoreGrade[] = [
  { letter: 'A', range: '81-100', min: 81, max: 100, color: 'text-black', bgColor: 'bg-green-200' },
  { letter: 'B', range: '61-80', min: 61, max: 80, color: 'text-black', bgColor: 'bg-lime-200' },
  { letter: 'C', range: '41-60', min: 41, max: 60, color: 'text-black', bgColor: 'bg-yellow-200' },
  { letter: 'D', range: '21-40', min: 21, max: 40, color: 'text-black', bgColor: 'bg-orange-200' },
  { letter: 'E', range: '0-20', min: 0, max: 20, color: 'text-black', bgColor: 'bg-red-200' },
];

/**
 * Converts a numeric score to a letter grade
 * @param score - The numeric score (0-100)
 * @returns The letter grade (A, B, C, D, E) or null if score is invalid
 */
export function getScoreGrade(score: number | null | undefined): string | null {
  if (score === null || score === undefined) {
    return null;
  }
  let normalizedScore = 0;
  if (typeof score === 'number') {
    if (score >= 0 && score <= 1) {
      normalizedScore = Math.round(score * 100);
    } else {
      normalizedScore = Math.round(score);
    }
  }
  if (normalizedScore < 0 || normalizedScore > 100) {
    return null;
  }
  
  // 0 scores are now graded as E (not null)
  // Only null/undefined scores are considered "no score"
  const grade = SCORE_GRADES.find(g => normalizedScore >= g.min && normalizedScore <= g.max);
  return grade ? grade.letter : null;
}

/**
 * Gets the full grade information for a score
 * @param score - The numeric score (0-100)
 * @returns The ScoreGrade object or null if score is invalid
 */
export function getScoreGradeInfo(score: number | null | undefined): ScoreGrade | null {
  if (score === null || score === undefined) {
    return null;
  }
  let normalizedScore = 0;
  if (typeof score === 'number') {
    if (score >= 0 && score <= 1) {
      normalizedScore = Math.round(score * 100);
    } else {
      normalizedScore = Math.round(score);
    }
  }
  if (normalizedScore < 0 || normalizedScore > 100) {
    return null;
  }
  
  // 0 scores are now graded as E (not null)
  // Only null/undefined scores are considered "no score"
  return SCORE_GRADES.find(g => normalizedScore >= g.min && normalizedScore <= g.max) || null;
}

/**
 * Gets the color class for a score grade
 * @param score - The numeric score (0-100)
 * @returns The color class string or empty string if score is invalid
 */
export function getScoreColor(score: number | null | undefined): string {
  const gradeInfo = getScoreGradeInfo(score);
  return gradeInfo ? gradeInfo.color : '';
}

/**
 * Gets the background color class for a score grade
 * @param score - The numeric score (0-100)
 * @returns The background color class string or empty string if score is invalid
 */
export function getScoreBgColor(score: number | null | undefined): string {
  const gradeInfo = getScoreGradeInfo(score);
  return gradeInfo ? gradeInfo.bgColor : 'bg-gray-200';
}

/**
 * Formats a score with its letter grade
 * @param score - The numeric score (0-100)
 * @returns Formatted string like "85% (A)" or just "85%" if no grade
 */
export function formatScoreWithGrade(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'N/A';
  let normalizedScore = 0;
  if (typeof score === 'number') {
    if (score >= 0 && score <= 1) {
      normalizedScore = Math.round(score * 100);
    } else {
      normalizedScore = Math.round(score);
    }
  }
  
  // Handle 0 score as "0% (E)" instead of "Not scored"
  // Only null/undefined scores are considered "Not scored"
  
  const grade = getScoreGrade(normalizedScore);
  return grade ? `${normalizedScore}% (${grade})` : `${normalizedScore}%`;
}

/**
 * Gets score ranges for dashboard charts with letter grades
 * @returns Array of score ranges with letter grade labels
 */
export function getScoreRangesForChart(): Array<{ label: string; min: number; max: number; letter: string }> {
  return SCORE_GRADES.map(grade => ({
    label: `${grade.letter} (${grade.range})`,
    min: grade.min,
    max: grade.max,
    letter: grade.letter
  }));
}

/**
 * Normalizes a fit score to ensure it's in the correct 0-100 integer format
 * Handles conversion from decimal (0-1) to percentage (0-100)
 * @param score - The raw score value (can be decimal, integer, null, or undefined)
 * @returns Normalized score as integer (0-100)
 */
export function normalizeFitScore(score: number | null | undefined): number {
  if (score === null || score === undefined) return 0;
  
  // If score is a decimal (0-1), convert to percentage
  if (score >= 0 && score <= 1) return Math.round(score * 100);
  
  // If score is already in 0-100 range, use as is
  if (score >= 0 && score <= 100) return Math.round(score);
  
  // For any other case, ensure it's within 0-100 range
  return Math.max(0, Math.min(100, Math.round(score)));
} 