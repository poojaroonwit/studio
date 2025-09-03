import type { PlatformModuleId } from '@/lib/types';

export interface SessionLikeUser {
  modulePermissions?: PlatformModuleId[];
}

export function hasPermission(user: SessionLikeUser | null | undefined, permission: PlatformModuleId): boolean {
  if (!user) return false;
  return Array.isArray(user.modulePermissions) && user.modulePermissions.includes(permission);
}

export function hasAnyPermission(user: SessionLikeUser | null | undefined, required: PlatformModuleId[]): boolean {
  if (!user) return false;
  const perms = Array.isArray(user.modulePermissions) ? user.modulePermissions : [];
  return required.some(p => perms.includes(p));
}

export function hasAllPermissions(user: SessionLikeUser | null | undefined, required: PlatformModuleId[]): boolean {
  if (!user) return false;
  const perms = Array.isArray(user.modulePermissions) ? user.modulePermissions : [];
  return required.every(p => perms.includes(p));
}
