const DEFAULT_BASE_URL = 'https://people.outborn.co';
const DEFAULT_AUTH_HOSTS = ['account.outborn.co', 'login.microsoftonline.com'];

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  const parsed = new URL(trimmed);
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
    throw new Error('EXPO_PUBLIC_HRIVE_BASE_URL must use HTTPS outside localhost');
  }
  return parsed.toString().replace(/\/$/, '');
}

export const HRIVE_BASE_URL = normalizeBaseUrl(
  process.env.EXPO_PUBLIC_HRIVE_BASE_URL || DEFAULT_BASE_URL,
);

export const HRIVE_BASE_HOST = new URL(HRIVE_BASE_URL).hostname;

const configuredAuthHosts: string[] = (process.env.EXPO_PUBLIC_HRIVE_AUTH_HOSTS || '')
  .split(',')
  .map((host: string) => host.trim().toLowerCase())
  .filter(Boolean);

export const IN_APP_WEB_HOSTS = new Set([
  HRIVE_BASE_HOST.toLowerCase(),
  ...DEFAULT_AUTH_HOSTS,
  ...configuredAuthHosts,
]);

export const NATIVE_APP_MARKER_SCRIPT = `
  (function () {
    try {
      window.localStorage.setItem('hrive-native-app', '1');
      window.sessionStorage.setItem('hrive-native-app', '1');
    } catch (_) {}
    window.__HRIVE_NATIVE_APP__ = true;
  })();
  true;
`;

export function toHriveUrl(path: string): string {
  return new URL(path, `${HRIVE_BASE_URL}/`).toString();
}
