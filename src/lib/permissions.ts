import type { PlatformModuleId } from '@/lib/types';

export interface SessionLikeUser {
  modulePermissions?: PlatformModuleId[];
  role?: string;
}

export function hasPermission(user: SessionLikeUser | null | undefined, permission: PlatformModuleId): boolean {
  if (!user) return false;
  // Admin role has access to everything
  if (user.role === 'Admin') {
    return true;
  }
  return Array.isArray(user.modulePermissions) && user.modulePermissions.includes(permission);
}

export function hasAnyPermission(user: SessionLikeUser | null | undefined, required: PlatformModuleId[]): boolean {
  if (!user) return false;
  // Admin role has access to everything
  if (user.role === 'Admin') {
    return true;
  }
  const perms = Array.isArray(user.modulePermissions) ? user.modulePermissions : [];
  return required.some(p => perms.includes(p));
}

export function hasAllPermissions(user: SessionLikeUser | null | undefined, required: PlatformModuleId[]): boolean {
  if (!user) return false;
  // Admin role has access to everything
  if (user.role === 'Admin') {
    return true;
  }
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

// Ownership-based permission checking functions
export function canEditCandidate(
  user: SessionLikeUser | null | undefined, 
  candidateRecruiterId: string | null | undefined,
  userId: string
): { canEdit: boolean; reason?: string } {
  if (!user) {
    return { canEdit: false, reason: 'User not authenticated' };
  }

  // Admin can always edit
  if (user.role === 'Admin') {
    return { canEdit: true };
  }

  const perms = Array.isArray(user.modulePermissions) ? user.modulePermissions : [];
  
  // Check for global edit permissions (can edit any candidate)
  const hasGlobalBasicEdit = perms.includes('CANDIDATES_EDIT_BASIC') || perms.includes('CANDIDATES_EDIT_BASIC_ALL');
  const hasGlobalSensitiveEdit = perms.includes('CANDIDATES_EDIT_SENSITIVE') || perms.includes('CANDIDATES_EDIT_SENSITIVE_ALL');
  
  if (hasGlobalBasicEdit || hasGlobalSensitiveEdit) {
    return { canEdit: true };
  }

  // Check for ownership-based permissions
  const isOwnCandidate = candidateRecruiterId === userId;
  const hasOwnBasicEdit = perms.includes('CANDIDATES_EDIT_BASIC_OWN');
  const hasOwnSensitiveEdit = perms.includes('CANDIDATES_EDIT_SENSITIVE_OWN');
  
  if (isOwnCandidate && (hasOwnBasicEdit || hasOwnSensitiveEdit)) {
    return { canEdit: true };
  }

  return { 
    canEdit: false, 
    reason: isOwnCandidate 
      ? 'No edit permissions for own assigned candidates' 
      : 'No edit permissions for candidates assigned to others' 
  };
}

export function canUpdateCandidatePipelineStage(
  user: SessionLikeUser | null | undefined, 
  candidateRecruiterId: string | null | undefined,
  userId: string
): { canUpdate: boolean; reason?: string } {
  if (!user) {
    return { canUpdate: false, reason: 'User not authenticated' };
  }

  // Admin can always update
  if (user.role === 'Admin') {
    return { canUpdate: true };
  }

  const perms = Array.isArray(user.modulePermissions) ? user.modulePermissions : [];
  
  // Check for global pipeline update permission
  if (perms.includes('CANDIDATES_PIPELINE_STAGE_UPDATE') || perms.includes('CANDIDATES_PIPELINE_STAGE_UPDATE_ALL')) {
    return { canUpdate: true };
  }

  // Check for ownership-based pipeline update permission
  const isOwnCandidate = candidateRecruiterId === userId;
  if (isOwnCandidate && perms.includes('CANDIDATES_PIPELINE_STAGE_UPDATE_OWN')) {
    return { canUpdate: true };
  }

  return { 
    canUpdate: false, 
    reason: isOwnCandidate 
      ? 'No pipeline update permissions for own assigned candidates' 
      : 'No pipeline update permissions for candidates assigned to others' 
  };
}

export function canAssignRecruiter(
  user: SessionLikeUser | null | undefined, 
  candidateRecruiterId: string | null | undefined,
  userId: string
): { canAssign: boolean; reason?: string } {
  if (!user) {
    return { canAssign: false, reason: 'User not authenticated' };
  }

  // Admin can always assign
  if (user.role === 'Admin') {
    return { canAssign: true };
  }

  const perms = Array.isArray(user.modulePermissions) ? user.modulePermissions : [];
  
  // Check for global recruiter assignment permission
  if (perms.includes('CANDIDATES_RECRUITER_ASSIGN') || perms.includes('CANDIDATES_RECRUITER_ASSIGN_ALL')) {
    return { canAssign: true };
  }

  // Check for ownership-based recruiter assignment permission
  const isOwnCandidate = candidateRecruiterId === userId;
  if (isOwnCandidate && perms.includes('CANDIDATES_RECRUITER_ASSIGN_OWN')) {
    return { canAssign: true };
  }

  return { 
    canAssign: false, 
    reason: isOwnCandidate 
      ? 'No recruiter assignment permissions for own assigned candidates' 
      : 'No recruiter assignment permissions for candidates assigned to others' 
  };
}

export function canAddComments(
  user: SessionLikeUser | null | undefined, 
  candidateRecruiterId: string | null | undefined,
  userId: string
): { canAdd: boolean; reason?: string } {
  if (!user) {
    return { canAdd: false, reason: 'User not authenticated' };
  }

  // Admin can always add comments
  if (user.role === 'Admin') {
    return { canAdd: true };
  }

  const perms = Array.isArray(user.modulePermissions) ? user.modulePermissions : [];
  
  // Check for global comment add permission
  if (perms.includes('CANDIDATES_COMMENTS_ADD') || perms.includes('CANDIDATES_COMMENTS_ADD_ALL')) {
    return { canAdd: true };
  }

  // Check for ownership-based comment add permission
  const isOwnCandidate = candidateRecruiterId === userId;
  if (isOwnCandidate && perms.includes('CANDIDATES_COMMENTS_ADD_OWN')) {
    return { canAdd: true };
  }

  return { 
    canAdd: false, 
    reason: isOwnCandidate 
      ? 'No comment permissions for own assigned candidates' 
      : 'No comment permissions for candidates assigned to others' 
  };
}

export function canUploadResumes(
  user: SessionLikeUser | null | undefined, 
  candidateRecruiterId: string | null | undefined,
  userId: string
): { canUpload: boolean; reason?: string } {
  if (!user) {
    return { canUpload: false, reason: 'User not authenticated' };
  }

  // Admin can always upload
  if (user.role === 'Admin') {
    return { canUpload: true };
  }

  const perms = Array.isArray(user.modulePermissions) ? user.modulePermissions : [];
  
  // Check for global resume upload permission
  if (perms.includes('CANDIDATES_RESUMES_UPLOAD') || perms.includes('CANDIDATES_RESUMES_UPLOAD_ALL')) {
    return { canUpload: true };
  }

  // Check for ownership-based resume upload permission
  const isOwnCandidate = candidateRecruiterId === userId;
  if (isOwnCandidate && perms.includes('CANDIDATES_RESUMES_UPLOAD_OWN')) {
    return { canUpload: true };
  }

  return { 
    canUpload: false, 
    reason: isOwnCandidate 
      ? 'No resume upload permissions for own assigned candidates' 
      : 'No resume upload permissions for candidates assigned to others' 
  };
}
