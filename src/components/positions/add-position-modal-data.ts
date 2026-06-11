import { readJsonOrFallback } from '@/lib/response-json';

import {
  normalizeAddPositionGrades,
  normalizeAddPositionRecruiterOptions,
  normalizeDefaultMatchCriteria,
} from './add-position-modal-utils';

export async function fetchDefaultMatchCriteria() {
  const response = await fetch('/api/settings/system-settings');
  if (!response.ok) return '';

  return normalizeDefaultMatchCriteria(await readJsonOrFallback<unknown>(response, {}));
}

export async function fetchAddPositionGrades() {
  const response = await fetch('/api/settings/grades');
  if (!response.ok) return [];

  return normalizeAddPositionGrades(await readJsonOrFallback<unknown>(response, []));
}

export async function fetchAddPositionRecruiters() {
  const response = await fetch('/api/users?role=Recruiter');
  if (!response.ok) return [];

  return normalizeAddPositionRecruiterOptions(await readJsonOrFallback<unknown>(response, {}));
}
