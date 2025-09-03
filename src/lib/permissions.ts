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

// New function to check permissions with role and module permissions
export function checkPermission(
  userRole: string, 
  modulePermissions: PlatformModuleId[], 
  permissionId: PlatformModuleId
): boolean {
  // Admin role has access to everything
  if (userRole === 'Admin') {
    return true;
  }
  
  // Check if user has the specific permission
  return Array.isArray(modulePermissions) && modulePermissions.includes(permissionId);
}
