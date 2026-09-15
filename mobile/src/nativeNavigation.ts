import { HRIVE_BASE_HOST, IN_APP_WEB_HOSTS } from './config';

const ALLOWED_APP_PREFIXES = ['/employee-portal', '/ess', '/my-workday'];

export function normalizeAppPath(path: string): string | null {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const withoutDuplicateSlashes = normalized.replace(/\/{2,}/g, '/');

  const isAllowed = ALLOWED_APP_PREFIXES.some((prefix) => (
    withoutDuplicateSlashes === prefix || withoutDuplicateSlashes.startsWith(`${prefix}/`)
  ));

  return isAllowed ? withoutDuplicateSlashes : null;
}

export function pathFromIncomingUrl(value: string): string | null {
  try {
    const parsed = new URL(value);

    if (parsed.protocol === 'hrive:') {
      const customSchemePath = `/${parsed.hostname}${parsed.pathname}`;
      return normalizeAppPath(customSchemePath);
    }

    if ((parsed.protocol === 'https:' || parsed.protocol === 'http:')
      && parsed.hostname.toLowerCase() === HRIVE_BASE_HOST.toLowerCase()) {
      return normalizeAppPath(parsed.pathname);
    }
  } catch {
    return null;
  }

  return null;
}

export function shouldStayInsideNativeWebView(value: string): boolean {
  if (value === 'about:blank' || value.startsWith('blob:') || value.startsWith('data:')) {
    return true;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }

    return IN_APP_WEB_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}
