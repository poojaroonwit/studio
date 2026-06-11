import type { ExperienceEntry } from '@/lib/types';
import {
  formatMonthDuration,
  getExperienceDurationMonths,
} from './applicant-experience-duration-utils';
import {
  formatMonthYearLabel,
  formatMonthYearLabelFromPeriod,
  getExperiencePeriodContext,
  getExperienceSortTime,
  isCurrentExperienceWithPeriod,
} from './applicant-experience-period-utils';

export function isCurrentExperience(entry: ExperienceEntry) {
  const period = getExperiencePeriodContext(entry.period);
  return isCurrentExperienceWithPeriod(entry, period);
}

export function getExperiencePeriodDisplay(entry: ExperienceEntry) {
  const period = getExperiencePeriodContext(entry.period);
  const startLabel = formatMonthYearLabel(entry.startMonth ?? null, entry.startYear ?? null) ??
    formatMonthYearLabelFromPeriod(period, 'first');
  const endLabel = isCurrentExperienceWithPeriod(entry, period)
    ? 'Present'
    : formatMonthYearLabel(entry.endMonth ?? null, entry.endYear ?? null) ??
      formatMonthYearLabelFromPeriod(period, 'last');

  return startLabel || endLabel ? { startLabel, endLabel } : null;
}

export function formatExperienceEntryDuration(entry: ExperienceEntry, now = new Date()) {
  if (entry.duration) return entry.duration;

  return formatMonthDuration(getExperienceDurationMonths(entry, now));
}

export function calculateTotalExperienceDuration(experience: ExperienceEntry[], now = new Date()) {
  const totalMonths = (Array.isArray(experience) ? experience : []).reduce((sum, entry) => {
    return sum + getExperienceDurationMonths(entry, now);
  }, 0);

  return formatMonthDuration(totalMonths);
}

export function sortExperienceByTimeline(experience: ExperienceEntry[]) {
  return [...experience].sort((a, b) => {
    const aIsCurrent = isCurrentExperience(a);
    const bIsCurrent = isCurrentExperience(b);

    if (aIsCurrent && !bIsCurrent) return -1;
    if (!aIsCurrent && bIsCurrent) return 1;

    return getExperienceSortTime(b) - getExperienceSortTime(a);
  });
}
