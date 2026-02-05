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
export function canEditApplicant(
  user: SessionLikeUser | null | undefined, 
  applicantRecruiterId: string | null | undefined,
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
  
  // Check for global edit permissions (can edit any Applicant)
  const hasGlobalBasicEdit = perms.includes('Applicants_EDIT_BASIC') || perms.includes('Applicants_EDIT_BASIC_ALL');
  const hasGlobalSensitiveEdit = perms.includes('Applicants_EDIT_SENSITIVE') || perms.includes('Applicants_EDIT_SENSITIVE_ALL');
  
  if (hasGlobalBasicEdit || hasGlobalSensitiveEdit) {
    return { canEdit: true };
  }

  // Check for ownership-based permissions
  const isOwnApplicant = applicantRecruiterId === userId;
  const hasOwnBasicEdit = perms.includes('Applicants_EDIT_BASIC_OWN');
  const hasOwnSensitiveEdit = perms.includes('Applicants_EDIT_SENSITIVE_OWN');
  
  if (isOwnApplicant && (hasOwnBasicEdit || hasOwnSensitiveEdit)) {
    return { canEdit: true };
  }

  return { 
    canEdit: false, 
    reason: isOwnApplicant 
      ? 'No edit permissions for own assigned Applicants' 
      : 'No edit permissions for Applicants assigned to others' 
  };
}

export function canUpdateApplicantPipelineStage(
  user: SessionLikeUser | null | undefined, 
  applicantRecruiterId: string | null | undefined,
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
  if (perms.includes('Applicants_PIPELINE_STAGE_UPDATE') || perms.includes('Applicants_PIPELINE_STAGE_UPDATE_ALL')) {
    return { canUpdate: true };
  }

  // Check for ownership-based pipeline update permission
  const isOwnApplicant = applicantRecruiterId === userId;
  if (isOwnApplicant && perms.includes('Applicants_PIPELINE_STAGE_UPDATE_OWN')) {
    return { canUpdate: true };
  }

  return { 
    canUpdate: false, 
    reason: isOwnApplicant 
      ? 'No pipeline update permissions for own assigned Applicants' 
      : 'No pipeline update permissions for Applicants assigned to others' 
  };
}

export function canAssignRecruiter(
  user: SessionLikeUser | null | undefined, 
  applicantRecruiterId: string | null | undefined,
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
  if (perms.includes('Applicants_RECRUITER_ASSIGN') || perms.includes('Applicants_RECRUITER_ASSIGN_ALL')) {
    return { canAssign: true };
  }

  // Check for ownership-based recruiter assignment permission
  const isOwnApplicant = applicantRecruiterId === userId;
  if (isOwnApplicant && perms.includes('Applicants_RECRUITER_ASSIGN_OWN')) {
    return { canAssign: true };
  }

  return { 
    canAssign: false, 
    reason: isOwnApplicant 
      ? 'No recruiter assignment permissions for own assigned Applicants' 
      : 'No recruiter assignment permissions for Applicants assigned to others' 
  };
}

export function canAddComments(
  user: SessionLikeUser | null | undefined, 
  applicantRecruiterId: string | null | undefined,
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
  if (perms.includes('Applicants_COMMENTS_ADD') || perms.includes('Applicants_COMMENTS_ADD_ALL')) {
    return { canAdd: true };
  }

  // Check for ownership-based comment add permission
  const isOwnApplicant = applicantRecruiterId === userId;
  if (isOwnApplicant && perms.includes('Applicants_COMMENTS_ADD_OWN')) {
    return { canAdd: true };
  }

  return { 
    canAdd: false, 
    reason: isOwnApplicant 
      ? 'No comment permissions for own assigned Applicants' 
      : 'No comment permissions for Applicants assigned to others' 
  };
}

export function canUploadResumes(
  user: SessionLikeUser | null | undefined, 
  applicantRecruiterId: string | null | undefined,
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
  if (perms.includes('Applicants_RESUMES_UPLOAD') || perms.includes('Applicants_RESUMES_UPLOAD_ALL')) {
    return { canUpload: true };
  }

  // Check for ownership-based resume upload permission
  const isOwnApplicant = applicantRecruiterId === userId;
  if (isOwnApplicant && perms.includes('Applicants_RESUMES_UPLOAD_OWN')) {
    return { canUpload: true };
  }

  return { 
    canUpload: false, 
    reason: isOwnApplicant 
      ? 'No resume upload permissions for own assigned Applicants' 
      : 'No resume upload permissions for Applicants assigned to others' 
  };
}

export function canViewEvaluationLinks(
  user: SessionLikeUser | null | undefined
): { canView: boolean; reason?: string } {
  if (!user) {
    return { canView: false, reason: 'User not authenticated' };
  }

  // Admin can always view
  if (user.role === 'Admin') {
    return { canView: true };
  }

  const perms = Array.isArray(user.modulePermissions) ? user.modulePermissions : [];
  
  // Check for view permission
  if (perms.includes('EVALUATION_LINKS_VIEW') || 
      perms.includes('EVALUATION_LINKS_CREATE_OWN') || 
      perms.includes('EVALUATION_LINKS_CREATE_ALL') ||
      perms.includes('EVALUATION_LINKS_MANAGE_OWN') ||
      perms.includes('EVALUATION_LINKS_MANAGE_ALL')) {
    return { canView: true };
  }

  return { 
    canView: false, 
    reason: 'No permission to view evaluation links' 
  };
}

export function canCreateEvaluationLink(
  user: SessionLikeUser | null | undefined, 
  applicantRecruiterId: string | null | undefined,
  userId: string
): { canCreate: boolean; reason?: string } {
  if (!user) {
    return { canCreate: false, reason: 'User not authenticated' };
  }

  // Admin can always create
  if (user.role === 'Admin') {
    return { canCreate: true };
  }

  const perms = Array.isArray(user.modulePermissions) ? user.modulePermissions : [];
  
  // Check for global create permission
  if (perms.includes('EVALUATION_LINKS_CREATE_ALL')) {
    return { canCreate: true };
  }

  // Check for ownership-based create permission
  const isOwnApplicant = applicantRecruiterId === userId;
  if (isOwnApplicant && perms.includes('EVALUATION_LINKS_CREATE_OWN')) {
    return { canCreate: true };
  }

  return { 
    canCreate: false, 
    reason: isOwnApplicant 
      ? 'No permission to create evaluation links for own assigned Applicants' 
      : 'No permission to create evaluation links for Applicants assigned to others' 
  };
}

export function canManageEvaluationLink(
  user: SessionLikeUser | null | undefined, 
  linkCreatedById: string | null | undefined,
  userId: string
): { canManage: boolean; reason?: string } {
  if (!user) {
    return { canManage: false, reason: 'User not authenticated' };
  }

  // Admin can always manage
  if (user.role === 'Admin') {
    return { canManage: true };
  }

  const perms = Array.isArray(user.modulePermissions) ? user.modulePermissions : [];
  
  // Check for global manage permission
  if (perms.includes('EVALUATION_LINKS_MANAGE_ALL')) {
    return { canManage: true };
  }

  // Check for ownership-based manage permission
  const isOwnLink = linkCreatedById === userId;
  if (isOwnLink && perms.includes('EVALUATION_LINKS_MANAGE_OWN')) {
    return { canManage: true };
  }

  return { 
    canManage: false, 
    reason: isOwnLink 
      ? 'No permission to manage own created evaluation links' 
      : 'No permission to manage evaluation links created by others' 
  };
}