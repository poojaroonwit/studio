import { readJsonOrFallback } from '@/lib/response-json';

import { getPwaMetaSettings, type PwaMetaSettings } from './pwa-meta-tags-utils';
import { isPwaEnabledFromSettings } from './pwa-settings-utils';

type PwaSettingsFetcher = typeof fetch;

export interface PwaSettingsState {
  enabled: boolean;
  metaSettings: PwaMetaSettings;
}

export async function fetchPwaSettingsState(
  fetcher: PwaSettingsFetcher = fetch,
): Promise<PwaSettingsState | null> {
  const response = await fetcher('/api/settings/system-settings');
  if (!response.ok) {
    return null;
  }

  const data = await readJsonOrFallback<unknown>(response, {});
  return {
    enabled: isPwaEnabledFromSettings(data),
    metaSettings: getPwaMetaSettings(data),
  };
}
