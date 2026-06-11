import type { UserRole } from './users-route-schema';

export function getCreateUserRoleFromGroupName(groupName: string): UserRole {
  const normalized = groupName.toLowerCase();
  if (normalized.includes('admin')) {
    return 'Admin';
  }
  if (normalized.includes('hiring') || normalized.includes('manager')) {
    return 'Hiring Manager';
  }
  return 'Recruiter';
}
