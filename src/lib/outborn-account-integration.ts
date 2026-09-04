export interface ApplicationIdentity {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  color?: string;
}

export const FALLBACK_APP_IDENTITY: ApplicationIdentity = {
  id: 'obsi-people',
  name: 'Obsi People',
  slug: 'obsi-people',
};

export function getAccountBaseUrl(): string | null {
  const baseUrl = process.env.OUTBORN_ACCOUNT_AUTH_URL || process.env.OUTBORN_ACCOUNT_BASE_URL || '';
  return baseUrl.trim() ? baseUrl.trim().replace(/\/+$/, '') : null;
}
