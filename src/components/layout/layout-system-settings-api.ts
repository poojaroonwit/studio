import { readJsonOrFallback } from '../../lib/response-json';

export async function fetchLayoutSystemSettings(): Promise<unknown> {
  const response = await fetch('/api/settings/system-settings');
  if (!response.ok) {
    return null;
  }

  return readJsonOrFallback<unknown>(response, {});
}
