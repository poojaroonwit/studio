import type { PlatformModuleId } from '@/lib/types';

/**
 * Check if a user has a specific permission
 * @param userRole - The user's role
 * @param userPermissions - The user's permissions array
 * @param requiredPermission - The permission to check
 * @returns boolean - True if user has permission
 */
export function hasPermission(
  userRole: string | undefined,
  userPermissions: PlatformModuleId[] | undefined,
  requiredPermission: PlatformModuleId
): boolean {
  // Admin users have full access to everything
  if (userRole === 'Admin') {
    return true;
  }
  
  // For non-admin users, check specific permissions
  const permissions = Array.isArray(userPermissions) ? userPermissions : [];
  return permissions.includes(requiredPermission);
}

/**
 * Check if a user has any of the specified permissions
 * @param userRole - The user's role
 * @param userPermissions - The user's permissions array
 * @param requiredPermissions - Array of permissions to check
 * @returns boolean - True if user has at least one of the permissions
 */
export function hasAnyPermission(
  userRole: string | undefined,
  userPermissions: PlatformModuleId[] | undefined,
  requiredPermissions: PlatformModuleId[]
): boolean {
  // Admin users have full access to everything
  if (userRole === 'Admin') {
    return true;
  }
  
  // For non-admin users, check if they have any of the required permissions
  const permissions = Array.isArray(userPermissions) ? userPermissions : [];
  return requiredPermissions.some(permission => permissions.includes(permission));
}

/**
 * Check if a user has all of the specified permissions
 * @param userRole - The user's role
 * @param userPermissions - The user's permissions array
 * @param requiredPermissions - Array of permissions to check
 * @returns boolean - True if user has all of the permissions
 */
export function hasAllPermissions(
  userRole: string | undefined,
  userPermissions: PlatformModuleId[] | undefined,
  requiredPermissions: PlatformModuleId[]
): boolean {
  // Admin users have full access to everything
  if (userRole === 'Admin') {
    return true;
  }
  
  // For non-admin users, check if they have all of the required permissions
  const permissions = Array.isArray(userPermissions) ? userPermissions : [];
  return requiredPermissions.every(permission => permissions.includes(permission));
}

/**
 * Get user permissions for display purposes
 * @param userRole - The user's role
 * @param userPermissions - The user's permissions array
 * @returns string - Human-readable permission description
 */
export function getUserPermissionDescription(
  userRole: string | undefined,
  userPermissions: PlatformModuleId[] | undefined
): string {
  if (userRole === 'Admin') {
    return 'Full system access';
  }
  
  const permissions = Array.isArray(userPermissions) ? userPermissions : [];
  if (permissions.length === 0) {
    return 'No specific permissions';
  }
  
  return `${permissions.length} permission${permissions.length !== 1 ? 's' : ''}`;
}

/**
 * Common permission groups for easier checking
 */
export const PERMISSION_GROUPS = {
  // Candidate management permissions
  CANDIDATE_MANAGEMENT: [
    'CANDIDATES_VIEW',
    'CANDIDATES_CREATE',
    'CANDIDATES_EDIT_BASIC',
    'CANDIDATES_EDIT_SENSITIVE',
    'CANDIDATES_DELETE'
  ] as PlatformModuleId[],
  
  // Position management permissions
  POSITION_MANAGEMENT: [
    'POSITIONS_VIEW',
    'POSITIONS_CREATE',
    'POSITIONS_EDIT_BASIC',
    'POSITIONS_EDIT_DETAILED',
    'POSITIONS_DELETE'
  ] as PlatformModuleId[],
  
  // User management permissions
  USER_MANAGEMENT: [
    'USERS_VIEW',
    'USERS_CREATE',
    'USERS_EDIT',
    'USERS_DELETE',
    'USERS_PERMISSIONS_MANAGE'
  ] as PlatformModuleId[],
  
  // System administration permissions
  SYSTEM_ADMINISTRATION: [
    'SYSTEM_SETTINGS_VIEW',
    'SYSTEM_SETTINGS_EDIT',
    'LOGS_VIEW',
    'LOGS_EXPORT',
    'UPLOAD_QUEUE_MANAGE'
  ] as PlatformModuleId[],
  
  // Task board permissions
  TASK_BOARD_MANAGEMENT: [
    'TASK_BOARD_VIEW',
    'TASK_BOARD_MANAGE_OWN',
    'TASK_BOARD_MANAGE_ALL'
  ] as PlatformModuleId[]
} as const;
