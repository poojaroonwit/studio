import { createAccountDirectoryClient } from '@outborn/account-directory';

import { PLATFORM_MODULES, type PlatformModuleId } from '@/lib/platform-modules';

const VALID_PLATFORM_MODULES = new Map(
  PLATFORM_MODULES.map(module => [module.id.toLowerCase(), module.id] as const),
);

function getAccountBaseUrl() {
  const configured = (
    process.env.OUTBORN_ACCOUNT_AUTH_URL || process.env.OUTBORN_ACCOUNT_BASE_URL || ''
  ).trim().replace(/\/+$/, '');
  return configured || null;
}

function normalizeAccountRole(role: string) {
  const roles = role.split(',').map(value => value.trim()).filter(Boolean);
  if (roles.some(value => ['owner', 'admin'].includes(value.toLowerCase()))) return 'Admin';
  if (roles.length === 1 && roles[0].toLowerCase() === 'member') return 'Employee';
  return roles[0] || 'Employee';
}

function collectRecognizedPermissions(
  permissions: Record<string, string[]> | null | undefined,
  principalPermissions: string[] = [],
): PlatformModuleId[] {
  const candidates = new Set<string>(principalPermissions);
  for (const [resource, actions] of Object.entries(permissions ?? {})) {
    candidates.add(resource);
    for (const action of actions) {
      candidates.add(action);
      candidates.add(`${resource}:${action}`);
      candidates.add(`${resource}.${action}`);
      candidates.add(`${resource}_${action}`);
    }
  }
  const recognized = new Set<PlatformModuleId>();
  for (const candidate of candidates) {
    const moduleId = VALID_PLATFORM_MODULES.get(candidate.trim().toLowerCase());
    if (moduleId) recognized.add(moduleId);
  }
  return [...recognized];
}

export interface OutbornAccountAuthorization {
  organizationId: string | null;
  organizationName: string | null;
  role: string;
  modulePermissions: PlatformModuleId[];
}

export async function loadOutbornAccountAuthorization(accessToken: string): Promise<OutbornAccountAuthorization | null> {
  const baseUrl = getAccountBaseUrl();
  if (!baseUrl || !accessToken.trim()) return null;
  const directory = createAccountDirectoryClient({ baseUrl, getAccessToken: () => accessToken, credentials: 'omit' });
  const context = await directory.getCurrentContext();
  const organization = context.currentOrganization ?? context.organizations[0] ?? null;
  const accountRole = organization?.role || context.principal.role || 'member';
  return {
    organizationId: organization?.id ?? null,
    organizationName: organization?.name ?? null,
    role: normalizeAccountRole(accountRole),
    modulePermissions: collectRecognizedPermissions(organization?.permissions, context.principal.permissions),
  };
}
