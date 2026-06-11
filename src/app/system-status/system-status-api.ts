import { getJsonString, readJsonObject } from '@/lib/response-json';

import type { SystemStatus } from './system-status-types';

export type MinioBucketCheckResult =
  | {
      ok: true;
      message: string;
      status: SystemStatus;
    }
  | {
      ok: false;
      isUnauthorized: boolean;
      message: string;
    };

export async function checkMinioBucketStatus(): Promise<MinioBucketCheckResult> {
  const response = await fetch('/api/setup/check-minio-bucket');
  const data = await readJsonObject(response);
  const message = getJsonString(data, 'message');

  if (!response.ok) {
    return {
      ok: false,
      isUnauthorized: response.status === 401 || response.status === 403,
      message: message || `Error: ${response.status}`,
    };
  }

  return {
    ok: true,
    status: normalizeMinioBucketStatus(getJsonString(data, 'status')),
    message: message || 'Bucket status checked.',
  };
}

function normalizeMinioBucketStatus(status: string | undefined): SystemStatus {
  const allowedStatuses: SystemStatus[] = ['checking', 'ok', 'warning', 'error', 'info', 'disabled', 'enabled'];
  return allowedStatuses.includes(status as SystemStatus) ? status as SystemStatus : 'info';
}
