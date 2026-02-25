// This declares the shape of the user object returned by the session callback
// and available in useSession() or auth()
// It needs to be augmented if you add custom properties to the session token
// In NextAuth v5, DefaultUser is not exported, so we define the base user type
type DefaultUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

import { auth } from '@/auth';

// Define platform module IDs with categories
export const PLATFORM_MODULE_CATEGORIES = {
  APPLICANT_MANAGEMENT: "Applicant Management",
  POSITION_MANAGEMENT: "Position Management",
  USER_ACCESS_CONTROL: "User Access Control",
  SYSTEM_CONFIGURATION: "System Configuration",
  LOGGING_AUDIT: "Logging & Audit",
  ANALYTICS_REPORTING: "Analytics & Reporting",
  AUTOMATION_INTEGRATION: "Automation & Integration",
} as const;

export type PlatformModuleCategory = typeof PLATFORM_MODULE_CATEGORIES[keyof typeof PLATFORM_MODULE_CATEGORIES];

export interface PlatformModule {
  id: string;
  label: string;
  category: PlatformModuleCategory;
  description: string;
  detailedDescription: string;
  impact: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiresApproval?: boolean;
}

export const PLATFORM_MODULES: PlatformModule[] = [
  // ===== Applicant MANAGEMENT =====

  // View Permissions
  {
    id: 'applicantS_VIEW',
    label: 'View Applicants',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "View basic Applicant profiles",
    detailedDescription: "Allows users to view the list of Applicants and their basic profile information. Does not include access to sensitive data.",
    impact: "Basic read access to Applicant list.",
    riskLevel: 'LOW'
  },

  {
    id: 'applicantS_VIEW_ALL',
    label: 'View All Applicants (Unrestricted)',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "View all Applicants regardless of position assignment",
    detailedDescription: "For hiring managers: allows viewing all Applicants in the system, not just those for positions where the user is assigned as an interviewer. Overrides the system-wide restriction setting.",
    impact: "Can view all Applicants regardless of position assignment. Important for senior hiring managers who need oversight.",
    riskLevel: 'MEDIUM'
  },

  {
    id: 'applicantS_VIEW_DETAILED',
    label: 'View Detailed Info',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "View resumes and interview notes",
    detailedDescription: "Grant access to sensitive Applicant details such as resumes, cover letters, interview notes, and salary expectations.",
    impact: "Access to sensitive personal data.",
    riskLevel: 'MEDIUM'
  },

  // Create/Edit Permissions
  {
    id: 'applicantS_CREATE',
    label: 'Create New Applicants',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Add new Applicant profiles to the system",
    detailedDescription: "Ability to create new Applicant profiles, add basic information, and initiate the recruitment process for new Applicants.",
    impact: "Can add new Applicants to the recruitment pipeline. Affects data quality and system integrity.",
    riskLevel: 'MEDIUM'
  },

  {
    id: 'applicantS_EDIT_BASIC',
    label: 'Edit Applicants',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Edit main contact details",
    detailedDescription: "Allows editing of basic Applicant information like name, email, and phone number.",
    impact: "Can modify contact info.",
    riskLevel: 'LOW'
  },

  {
    id: 'applicantS_EDIT_SENSITIVE',
    label: 'Edit Sensitive Applicant Information',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Edit sensitive Applicant data including salary and notes",
    detailedDescription: "Ability to modify sensitive Applicant information including salary expectations, interview notes, internal comments, and assessment scores.",
    impact: "Can modify critical Applicant data that affects hiring decisions. High impact on recruitment process.",
    riskLevel: 'HIGH'
  },

  // Ownership-based Edit Permissions
  {
    id: 'applicantS_EDIT_BASIC_OWN',
    label: 'Edit Basic Information (Own Assigned)',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Edit basic Applicant details for Applicants assigned to you",
    detailedDescription: "Ability to modify basic Applicant information (name, email, phone, general profile) only for Applicants assigned to you as recruiter.",
    impact: "Limited to own assigned Applicants. Lower risk as scope is restricted to personal workload.",
    riskLevel: 'LOW'
  },

  {
    id: 'applicantS_EDIT_SENSITIVE_OWN',
    label: 'Edit Sensitive Information (Own Assigned)',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Edit sensitive Applicant data for Applicants assigned to you",
    detailedDescription: "Ability to modify sensitive Applicant information (salary, interview notes, internal comments, assessment scores) only for Applicants assigned to you as recruiter.",
    impact: "Limited to own assigned Applicants. Medium risk as scope is restricted but includes sensitive data.",
    riskLevel: 'MEDIUM'
  },

  {
    id: 'applicantS_EDIT_BASIC_ALL',
    label: 'Edit Basic Information (All Applicants)',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Edit basic Applicant details for all Applicants",
    detailedDescription: "Ability to modify basic Applicant information (name, email, phone, general profile) for any Applicant in the system, regardless of assignment.",
    impact: "Full access to all Applicant basic information. Higher risk as scope includes all Applicants.",
    riskLevel: 'MEDIUM'
  },

  {
    id: 'applicantS_EDIT_SENSITIVE_ALL',
    label: 'Edit Sensitive Information (All Applicants)',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Edit sensitive Applicant data for all Applicants",
    detailedDescription: "Ability to modify sensitive Applicant information (salary, interview notes, internal comments, assessment scores) for any Applicant in the system, regardless of assignment.",
    impact: "Full access to all Applicant sensitive information. High risk as scope includes all Applicants and sensitive data.",
    riskLevel: 'HIGH'
  },

  // Delete Permissions
  {
    id: 'applicantS_DELETE',
    label: 'Delete Applicant Profiles',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Permanently remove Applicant profiles from the system",
    detailedDescription: "Ability to permanently delete Applicant profiles and all associated data including resumes, notes, and history. This action cannot be undone.",
    impact: "Permanent data loss. Affects audit trails and compliance requirements.",
    riskLevel: 'CRITICAL',
    requiresApproval: true
  },



  // File Management
  {
    id: 'applicantS_RESUMES_UPLOAD',
    label: 'Upload Applicant Resumes',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Upload and manage Applicant resumes and documents",
    detailedDescription: "Ability to upload, replace, and manage Applicant resumes, cover letters, and other supporting documents.",
    impact: "Controls access to Applicant documentation. Critical for recruitment process.",
    riskLevel: 'MEDIUM'
  },

  {
    id: 'applicantS_RESUMES_UPLOAD_OWN',
    label: 'Upload Resumes (Own Assigned)',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Upload resumes for Applicants assigned to you",
    detailedDescription: "Ability to upload, replace, and manage Applicant resumes, cover letters, and other supporting documents only for Applicants assigned to you as recruiter.",
    impact: "Limited to own assigned Applicants. Lower risk as scope is restricted to personal workload.",
    riskLevel: 'LOW'
  },

  {
    id: 'applicantS_RESUMES_UPLOAD_ALL',
    label: 'Upload Resumes (All Applicants)',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Upload resumes for any Applicant",
    detailedDescription: "Ability to upload, replace, and manage Applicant resumes, cover letters, and other supporting documents for any Applicant in the system, regardless of assignment.",
    impact: "Full access to Applicant documentation. Medium risk as affects all Applicant profiles.",
    riskLevel: 'MEDIUM'
  },

  {
    id: 'applicantS_RESUMES_DELETE',
    label: 'Delete Applicant Documents',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Remove Applicant resumes and attachments",
    detailedDescription: "Ability to delete Applicant resumes, cover letters, and other uploaded documents. Permanent action.",
    impact: "Permanent loss of Applicant documentation. Affects compliance and audit trails.",
    riskLevel: 'HIGH'
  },

  // Comments and Notes
  {
    id: 'applicantS_COMMENTS_VIEW',
    label: 'View Applicant Comments',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "View comments and notes on Applicant profiles",
    detailedDescription: "Access to view all comments, notes, and internal feedback on Applicant profiles.",
    impact: "Read-only access to Applicant feedback and internal communications.",
    riskLevel: 'LOW'
  },

  {
    id: 'applicantS_COMMENTS_ADD',
    label: 'Add Applicant Comments',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Add comments and notes to Applicant profiles",
    detailedDescription: "Ability to add comments, notes, and feedback to Applicant profiles. Cannot edit or delete existing comments.",
    impact: "Can contribute to Applicant feedback and internal communications.",
    riskLevel: 'LOW'
  },

  {
    id: 'applicantS_COMMENTS_ADD_OWN',
    label: 'Add Comments (Own Assigned)',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Add comments to Applicants assigned to you",
    detailedDescription: "Ability to add comments, notes, and feedback only to Applicant profiles assigned to you as recruiter.",
    impact: "Limited to own assigned Applicants. Very low risk as scope is restricted to personal workload.",
    riskLevel: 'LOW'
  },

  {
    id: 'applicantS_COMMENTS_ADD_ALL',
    label: 'Add Comments (All Applicants)',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Add comments to any Applicant",
    detailedDescription: "Ability to add comments, notes, and feedback to any Applicant profile in the system, regardless of assignment.",
    impact: "Full access to Applicant communication. Medium risk as affects all Applicant profiles.",
    riskLevel: 'MEDIUM'
  },

  {
    id: 'applicantS_COMMENTS_EDIT',
    label: 'Edit Applicant Comments',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Edit and delete Applicant comments and notes",
    detailedDescription: "Ability to edit and delete existing comments, notes, and feedback on Applicant profiles.",
    impact: "Can modify internal communications and feedback history.",
    riskLevel: 'MEDIUM'
  },

  {
    id: 'applicantS_COMMENTS_VIEW_REMARK_ONLY',
    label: 'View Remarks to HM Only',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Only allowed to view 'Remark to HM' comments",
    detailedDescription: "Restricts the user to only see comments specifically marked as 'Remark to HM'. General comments and internal notes remain hidden.",
    impact: "Restricted access to Applicant communication.",
    riskLevel: 'LOW'
  },

  {
    id: 'applicantS_ACTIVITIES_VIEW',
    label: 'View Applicant Activities',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "View activity logs and status changes",
    detailedDescription: "Access to view the history of Applicant status changes, resume uploads, and other system-logged activities.",
    impact: "Read-only access to Applicant history and workflow progression.",
    riskLevel: 'LOW'
  },

  // Source Assignment
  {
    id: 'applicantS_SOURCE_ASSIGN',
    label: 'Assign Applicant Source',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Assign and change Applicant source (e.g., LinkedIn, Referral, Job Board)",
    detailedDescription: "Ability to assign and modify the source of Applicants (where they came from). Important for tracking recruitment effectiveness and attribution.",
    impact: "Affects recruitment analytics and source tracking. Important for measuring channel effectiveness.",
    riskLevel: 'LOW'
  },

  {
    id: 'applicantS_SOURCE_ASSIGN_BULK',
    label: 'Bulk Source Assignment',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Assign source for multiple Applicants at once",
    detailedDescription: "Ability to assign or change the source for multiple Applicants simultaneously. Useful for batch corrections.",
    impact: "Can affect multiple Applicant source attributions at once. Affects analytics accuracy.",
    riskLevel: 'MEDIUM'
  },

  // Recruiter Assignment
  {
    id: 'applicantS_RECRUITER_ASSIGN',
    label: 'Assign Recruiters',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Assign Applicants to recruiters",
    detailedDescription: "Allows assigning or reassigning Applicants to specific recruiters to manage workload.",
    impact: "Changes Applicant ownership.",
    riskLevel: 'MEDIUM'
  },

  {
    id: 'applicantS_RECRUITER_ASSIGN_OWN',
    label: 'Assign Own Applicants to Recruiter',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Assign only your own Applicants to other recruiters",
    detailedDescription: "Ability to reassign Applicants that are currently assigned to you to other recruiters. Cannot assign Applicants assigned to others.",
    impact: "Limited to own assigned Applicants. Lower risk as scope is restricted to personal workload management.",
    riskLevel: 'LOW'
  },

  {
    id: 'applicantS_RECRUITER_ASSIGN_ALL',
    label: 'Assign All Applicants to Recruiter',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Assign any Applicant to recruiters",
    detailedDescription: "Ability to assign or reassign any Applicant in the system to any recruiter, regardless of current assignment.",
    impact: "Full access to Applicant ownership management. High risk as affects all Applicant assignments.",
    riskLevel: 'HIGH'
  },

  {
    id: 'applicantS_RECRUITER_ASSIGN_BULK',
    label: 'Bulk Recruiter Assignment',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Assign multiple Applicants to recruiters at once",
    detailedDescription: "Ability to assign multiple Applicants to recruiters simultaneously. Useful for workload balancing.",
    impact: "Can affect multiple recruiter workloads at once. Requires careful planning.",
    riskLevel: 'HIGH'
  },

  // Pipeline Stage Management
  {
    id: 'applicantS_PIPELINE_STAGE_UPDATE',
    label: 'Move Applicants',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Advance Applicants in pipeline",
    detailedDescription: "Allows moving Applicants between different stages of the hiring process (e.g., from Interview to Offer).",
    impact: "Advances the recruitment workflow.",
    riskLevel: 'HIGH'
  },

  {
    id: 'applicantS_PIPELINE_STAGE_UPDATE_OWN',
    label: 'Update Pipeline Stage (Own Assigned)',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Move own assigned Applicants through pipeline stages",
    detailedDescription: "Ability to move Applicants assigned to you through different stages of the recruitment pipeline. Cannot update stages for Applicants assigned to other recruiters.",
    impact: "Limited to own assigned Applicants. Medium risk as scope is restricted but affects workflow progression.",
    riskLevel: 'MEDIUM'
  },

  {
    id: 'applicantS_PIPELINE_STAGE_UPDATE_ALL',
    label: 'Update Pipeline Stage (All Applicants)',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Move any Applicant through pipeline stages",
    detailedDescription: "Ability to move any Applicant in the system through different stages of the recruitment pipeline, regardless of assignment.",
    impact: "Full access to Applicant workflow progression. High risk as affects all Applicant pipeline management.",
    riskLevel: 'HIGH'
  },

  {
    id: 'applicantS_PIPELINE_STAGE_BULK_UPDATE',
    label: 'Bulk Pipeline Stage Updates',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Update pipeline stage for multiple Applicants at once",
    detailedDescription: "Ability to move multiple Applicants through pipeline stages simultaneously. Useful for batch processing but requires careful oversight.",
    impact: "Can affect multiple Applicants' progression at once. High potential for unintended changes.",
    riskLevel: 'HIGH',
    requiresApproval: true
  },

  // Import/Export
  {
    id: 'applicantS_IMPORT',
    label: 'Import Applicant Data',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Bulk import Applicant data from external sources",
    detailedDescription: "Ability to import Applicant data from CSV files, spreadsheets, or other external sources. Can create multiple Applicant profiles at once.",
    impact: "Can add large volumes of data quickly. Risk of data quality issues and duplicates.",
    riskLevel: 'HIGH',
    requiresApproval: true
  },

  {
    id: 'applicantS_EXPORT',
    label: 'Export Applicant Data',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Export Applicant data to external formats",
    detailedDescription: "Ability to export Applicant data to CSV, Excel, or other formats. Includes personal and sensitive information.",
    impact: "Data can be taken outside the system. Important for data security and compliance.",
    riskLevel: 'MEDIUM'
  },

  // ===== POSITION MANAGEMENT =====

  {
    id: 'POSITIONS_VIEW',
    label: 'View Job Positions',
    category: PLATFORM_MODULE_CATEGORIES.POSITION_MANAGEMENT,
    description: "View job position details and lists",
    detailedDescription: "Access to view job position information including title, department, requirements, and status.",
    impact: "Read-only access to position data. No ability to modify.",
    riskLevel: 'LOW'
  },

  {
    id: 'POSITIONS_VIEW_ALL',
    label: 'View All Job Positions (Unrestricted)',
    category: PLATFORM_MODULE_CATEGORIES.POSITION_MANAGEMENT,
    description: "View all job positions regardless of interviewer assignment",
    detailedDescription: "For hiring managers: allows viewing all positions in the system, not just those where the user is assigned as an interviewer. Overrides the system-wide restriction setting.",
    impact: "Can view all positions regardless of assignment. Important for senior hiring managers who need oversight.",
    riskLevel: 'MEDIUM'
  },

  {
    id: 'POSITIONS_CREATE',
    label: 'Create Job Positions',
    category: PLATFORM_MODULE_CATEGORIES.POSITION_MANAGEMENT,
    description: "Create new job positions in the system",
    detailedDescription: "Ability to create new job positions, define requirements, set salary ranges, and configure recruitment parameters.",
    impact: "Can create new recruitment opportunities. Affects hiring strategy and resource allocation.",
    riskLevel: 'MEDIUM'
  },

  {
    id: 'POSITIONS_EDIT_BASIC',
    label: 'Edit Basic Position Information',
    category: PLATFORM_MODULE_CATEGORIES.POSITION_MANAGEMENT,
    description: "Edit basic position details like title, department, location",
    detailedDescription: "Ability to edit basic job position information such as title, department, location, and general description. Cannot modify critical recruitment parameters.",
    impact: "Can update basic position information. Limited risk to recruitment process.",
    riskLevel: 'LOW'
  },

  {
    id: 'POSITIONS_EDIT_DETAILED',
    label: 'Edit Detailed Position Information',
    category: PLATFORM_MODULE_CATEGORIES.POSITION_MANAGEMENT,
    description: "Edit detailed position requirements and parameters",
    detailedDescription: "Ability to edit detailed job position information including requirements, salary ranges, status, and recruitment parameters.",
    impact: "Can modify recruitment requirements and parameters. Affects Applicant matching and hiring process.",
    riskLevel: 'MEDIUM'
  },

  {
    id: 'POSITIONS_RECRUITER_ASSIGN',
    label: 'Assign Recruiter to Positions',
    category: PLATFORM_MODULE_CATEGORIES.POSITION_MANAGEMENT,
    description: "Assign and change recruiters responsible for positions",
    detailedDescription: "Ability to assign and reassign recruiters to specific job positions. Controls responsibility and workload distribution.",
    impact: "Affects recruiter workload and position ownership. Important for team management.",
    riskLevel: 'MEDIUM'
  },

  {
    id: 'POSITIONS_DELETE',
    label: 'Delete Job Positions',
    category: PLATFORM_MODULE_CATEGORIES.POSITION_MANAGEMENT,
    description: "Remove job positions from the system",
    detailedDescription: "Ability to delete job positions and all associated data. Affects active recruitment campaigns.",
    impact: "Can terminate recruitment campaigns. Affects active Applicants and hiring plans.",
    riskLevel: 'HIGH',
    requiresApproval: true
  },

  {
    id: 'POSITIONS_IMPORT',
    label: 'Import Position Data',
    category: PLATFORM_MODULE_CATEGORIES.POSITION_MANAGEMENT,
    description: "Bulk import job position data",
    detailedDescription: "Ability to import job position data from external sources. Can create multiple positions at once.",
    impact: "Can add large volumes of position data quickly. Risk of data quality issues.",
    riskLevel: 'HIGH',
    requiresApproval: true
  },

  {
    id: 'POSITIONS_EXPORT',
    label: 'Export Position Data',
    category: PLATFORM_MODULE_CATEGORIES.POSITION_MANAGEMENT,
    description: "Export job position data",
    detailedDescription: "Ability to export job position data to external formats for reporting and analysis.",
    impact: "Data can be taken outside the system. Important for data security.",
    riskLevel: 'LOW'
  },

  // ===== USER ACCESS CONTROL =====

  {
    id: 'USERS_VIEW',
    label: 'View User Accounts',
    category: PLATFORM_MODULE_CATEGORIES.USER_ACCESS_CONTROL,
    description: "View user account information",
    detailedDescription: "Access to view user account information including names, roles, and basic profile data.",
    impact: "Read-only access to user data. No ability to modify accounts.",
    riskLevel: 'LOW'
  },

  {
    id: 'USERS_CREATE',
    label: 'Create User Accounts',
    category: PLATFORM_MODULE_CATEGORIES.USER_ACCESS_CONTROL,
    description: "Create new user accounts",
    detailedDescription: "Ability to create new user accounts, set initial passwords, and assign basic roles.",
    impact: "Can add new users to the system. Affects system access and security.",
    riskLevel: 'HIGH'
  },

  {
    id: 'USERS_EDIT',
    label: 'Edit User Accounts',
    category: PLATFORM_MODULE_CATEGORIES.USER_ACCESS_CONTROL,
    description: "Modify user account details",
    detailedDescription: "Ability to edit user account information including names, email addresses, and basic profile data.",
    impact: "Can modify user account information. Affects user experience and data accuracy.",
    riskLevel: 'MEDIUM'
  },

  {
    id: 'USERS_DELETE',
    label: 'Delete User Accounts',
    category: PLATFORM_MODULE_CATEGORIES.USER_ACCESS_CONTROL,
    description: "Remove user accounts from the system",
    detailedDescription: "Ability to delete user accounts and all associated data. Permanent action that affects system access.",
    impact: "Permanent removal of user access. Affects system security and data ownership.",
    riskLevel: 'CRITICAL',
    requiresApproval: true
  },

  {
    id: 'USERS_PERMISSIONS_MANAGE',
    label: 'Manage User Permissions',
    category: PLATFORM_MODULE_CATEGORIES.USER_ACCESS_CONTROL,
    description: "Assign and modify user permissions",
    detailedDescription: "Ability to assign, modify, and remove individual user permissions. Controls what users can do in the system.",
    impact: "Directly affects system security and user capabilities. Critical for access control.",
    riskLevel: 'CRITICAL',
    requiresApproval: true
  },

  {
    id: 'USER_GROUPS_VIEW',
    label: 'View User Groups/Roles',
    category: PLATFORM_MODULE_CATEGORIES.USER_ACCESS_CONTROL,
    description: "View user groups and role definitions",
    detailedDescription: "Access to view user groups, roles, and their associated permissions. Read-only access.",
    impact: "Read-only access to role definitions. No ability to modify.",
    riskLevel: 'LOW'
  },

  {
    id: 'USER_GROUPS_CREATE',
    label: 'Create User Groups/Roles',
    category: PLATFORM_MODULE_CATEGORIES.USER_ACCESS_CONTROL,
    description: "Create new user groups and roles",
    detailedDescription: "Ability to create new user groups, define roles, and set permission templates.",
    impact: "Can create new role definitions. Affects organizational structure and access control.",
    riskLevel: 'HIGH'
  },

  {
    id: 'USER_GROUPS_EDIT',
    label: 'Edit User Groups/Roles',
    category: PLATFORM_MODULE_CATEGORIES.USER_ACCESS_CONTROL,
    description: "Modify existing user groups and roles",
    detailedDescription: "Ability to edit user groups, modify role definitions, and update permission assignments.",
    impact: "Can modify role definitions and permissions. Affects all users with those roles.",
    riskLevel: 'HIGH',
    requiresApproval: true
  },

  {
    id: 'USER_GROUPS_DELETE',
    label: 'Delete User Groups/Roles',
    category: PLATFORM_MODULE_CATEGORIES.USER_ACCESS_CONTROL,
    description: "Remove user groups and roles",
    detailedDescription: "Ability to delete user groups and roles. Affects all users assigned to those roles.",
    impact: "Can remove role definitions. Affects user access and organizational structure.",
    riskLevel: 'CRITICAL',
    requiresApproval: true
  },

  {
    id: 'ROLES_MANAGE',
    label: 'Manage Roles (Legacy)',
    category: PLATFORM_MODULE_CATEGORIES.USER_ACCESS_CONTROL,
    description: "Legacy permission for role management",
    detailedDescription: "Legacy permission that provides full role management capabilities. Consider using specific USER_GROUPS_* permissions instead.",
    impact: "Full control over role definitions and assignments.",
    riskLevel: 'HIGH',
    requiresApproval: true
  },

  // ===== SYSTEM CONFIGURATION =====

  {
    id: 'SYSTEM_SETTINGS_VIEW',
    label: 'View System Settings',
    category: PLATFORM_MODULE_CATEGORIES.SYSTEM_CONFIGURATION,
    description: "View system configuration settings",
    detailedDescription: "Access to view system settings including application name, logo, and basic configuration.",
    impact: "Read-only access to system configuration. No ability to modify.",
    riskLevel: 'LOW'
  },

  {
    id: 'SYSTEM_SETTINGS_EDIT',
    label: 'Edit System Settings',
    category: PLATFORM_MODULE_CATEGORIES.SYSTEM_CONFIGURATION,
    description: "Modify system configuration settings",
    detailedDescription: "Ability to modify system settings including application name, logo, branding, and basic configuration.",
    impact: "Can modify system appearance and basic configuration. Affects all users.",
    riskLevel: 'MEDIUM'
  },

  {
    id: 'WARNING_CONFIGURATIONS_VIEW',
    label: 'View Warning Configurations',
    category: PLATFORM_MODULE_CATEGORIES.SYSTEM_CONFIGURATION,
    description: "View warning threshold settings",
    detailedDescription: "Access to view system-wide warning threshold configurations, such as SLA violation limits and performance alerts.",
    impact: "Read-only access to system warning triggers.",
    riskLevel: 'LOW'
  },

  {
    id: 'WARNING_CONFIGURATIONS_MANAGE',
    label: 'Manage Warning Configurations',
    category: PLATFORM_MODULE_CATEGORIES.SYSTEM_CONFIGURATION,
    description: "Modify warning threshold settings",
    detailedDescription: "Ability to create and modify system-wide warning threshold configurations. Affects what triggers SLA notifications and UI alerts.",
    impact: "Can change warning thresholds. Affects monitoring and alerting accuracy.",
    riskLevel: 'MEDIUM'
  },

  {
    id: 'RECRUITMENT_STAGES_VIEW',
    label: 'View Recruitment Stages',
    category: PLATFORM_MODULE_CATEGORIES.SYSTEM_CONFIGURATION,
    description: "View recruitment pipeline stages",
    detailedDescription: "Access to view the recruitment pipeline stages and workflow configuration.",
    impact: "Read-only access to workflow configuration. No ability to modify.",
    riskLevel: 'LOW'
  },

  {
    id: 'RECRUITMENT_STAGES_EDIT',
    label: 'Edit Recruitment Stages',
    category: PLATFORM_MODULE_CATEGORIES.SYSTEM_CONFIGURATION,
    description: "Modify recruitment pipeline stages",
    detailedDescription: "Ability to add, edit, and remove recruitment pipeline stages. Affects workflow for all Applicants.",
    impact: "Can modify recruitment workflow. Affects all active recruitment processes.",
    riskLevel: 'HIGH',
    requiresApproval: true
  },

  {
    id: 'CUSTOM_FIELDS_VIEW',
    label: 'View Custom Fields',
    category: PLATFORM_MODULE_CATEGORIES.SYSTEM_CONFIGURATION,
    description: "View custom field definitions",
    detailedDescription: "Access to view custom field definitions for Applicants and positions.",
    impact: "Read-only access to field definitions. No ability to modify.",
    riskLevel: 'LOW'
  },

  {
    id: 'CUSTOM_FIELDS_EDIT',
    label: 'Edit Custom Fields',
    category: PLATFORM_MODULE_CATEGORIES.SYSTEM_CONFIGURATION,
    description: "Create and modify custom fields",
    detailedDescription: "Ability to create, edit, and delete custom fields for Applicants and positions. Affects data structure.",
    impact: "Can modify data structure and collection. Affects data integrity and reporting.",
    riskLevel: 'HIGH',
    requiresApproval: true
  },

  // ===== AUTOMATION & INTEGRATION =====

  {
    id: 'WEBHOOKS_VIEW',
    label: 'View Webhook Configurations',
    category: PLATFORM_MODULE_CATEGORIES.AUTOMATION_INTEGRATION,
    description: "View webhook integration settings",
    detailedDescription: "Access to view webhook configurations and integration settings.",
    impact: "Read-only access to integration settings. No ability to modify.",
    riskLevel: 'LOW'
  },

  {
    id: 'WEBHOOKS_EDIT',
    label: 'Edit Webhook Configurations',
    category: PLATFORM_MODULE_CATEGORIES.AUTOMATION_INTEGRATION,
    description: "Configure webhook integrations",
    detailedDescription: "Ability to create, edit, and delete webhook integrations. Controls external system connections.",
    impact: "Can modify external system integrations. Affects data flow and automation.",
    riskLevel: 'HIGH',
    requiresApproval: true
  },

  {
    id: 'AI_INTEGRATION_VIEW',
    label: 'View AI Integration Settings',
    category: PLATFORM_MODULE_CATEGORIES.AUTOMATION_INTEGRATION,
    description: "View AI service configurations",
    detailedDescription: "Access to view AI integration settings including API keys and service configurations.",
    impact: "Read-only access to AI settings. No ability to modify.",
    riskLevel: 'LOW'
  },

  {
    id: 'AI_INTEGRATION_EDIT',
    label: 'Edit AI Integration Settings',
    category: PLATFORM_MODULE_CATEGORIES.AUTOMATION_INTEGRATION,
    description: "Configure AI service integrations",
    detailedDescription: "Ability to configure AI services like Gemini for Applicant analysis and automation.",
    impact: "Can modify AI service configurations. Affects automated Applicant processing.",
    riskLevel: 'HIGH',
    requiresApproval: true
  },

  {
    id: 'UPLOAD_QUEUE_VIEW',
    label: 'View Upload Queue',
    category: PLATFORM_MODULE_CATEGORIES.AUTOMATION_INTEGRATION,
    description: "View file upload queue status",
    detailedDescription: "Access to view the status of file uploads and processing queue.",
    impact: "Read-only access to upload status. No ability to modify.",
    riskLevel: 'LOW'
  },

  {
    id: 'UPLOAD_QUEUE_MANAGE',
    label: 'Manage Upload Queue',
    category: PLATFORM_MODULE_CATEGORIES.AUTOMATION_INTEGRATION,
    description: "Manage file upload processing",
    detailedDescription: "Ability to manage the file upload queue, retry failed uploads, and control processing.",
    impact: "Can control file processing and automation. Affects data import workflows.",
    riskLevel: 'MEDIUM'
  },

  {
    id: 'BULK_UPLOAD_EXECUTE',
    label: 'Execute Bulk Uploads',
    category: PLATFORM_MODULE_CATEGORIES.AUTOMATION_INTEGRATION,
    description: "Perform bulk Applicant uploads",
    detailedDescription: "Ability to execute bulk upload operations for Applicants and documents.",
    impact: "Can add large volumes of data quickly. Risk of data quality issues.",
    riskLevel: 'HIGH',
    requiresApproval: true
  },

  // ===== ANALYTICS & REPORTING =====

  {
    id: 'DASHBOARD_VIEW',
    label: 'View Dashboard Analytics',
    category: PLATFORM_MODULE_CATEGORIES.ANALYTICS_REPORTING,
    description: "View main dashboard and analytics",
    detailedDescription: "Access to view the main dashboard with recruitment metrics, analytics, and performance indicators.",
    impact: "Read-only access to analytics data. No ability to modify.",
    riskLevel: 'LOW'
  },

  {
    id: 'REPORTS_GENERATE',
    label: 'Generate Reports',
    category: PLATFORM_MODULE_CATEGORIES.ANALYTICS_REPORTING,
    description: "Create and export reports",
    detailedDescription: "Ability to generate custom reports, export data, and create analytics dashboards.",
    impact: "Can extract and analyze data. Important for data security and compliance.",
    riskLevel: 'MEDIUM'
  },

  {
    id: 'WEBHOOK_ANALYTICS_VIEW',
    label: 'View Webhook Analytics',
    category: PLATFORM_MODULE_CATEGORIES.ANALYTICS_REPORTING,
    description: "View webhook performance metrics",
    detailedDescription: "Access to view webhook performance analytics, success rates, and integration metrics.",
    impact: "Read-only access to integration analytics. No ability to modify.",
    riskLevel: 'LOW'
  },

  // ===== LOGGING & AUDIT =====

  {
    id: 'LOGS_VIEW',
    label: 'View System Logs',
    category: PLATFORM_MODULE_CATEGORIES.LOGGING_AUDIT,
    description: "View system and audit logs",
    detailedDescription: "Access to view system logs, audit trails, and user activity records.",
    impact: "Read-only access to system logs. Important for compliance and security monitoring.",
    riskLevel: 'LOW'
  },

  {
    id: 'LOGS_EXPORT',
    label: 'Export System Logs',
    category: PLATFORM_MODULE_CATEGORIES.LOGGING_AUDIT,
    description: "Export system logs for analysis",
    detailedDescription: "Ability to export system logs and audit trails for external analysis and compliance reporting.",
    impact: "Can extract log data. Important for compliance and security investigations.",
    riskLevel: 'MEDIUM'
  },

  {
    id: 'APP_PERFORMANCE_VIEW',
    label: 'View Performance Metrics',
    category: PLATFORM_MODULE_CATEGORIES.LOGGING_AUDIT,
    description: "View application performance data",
    detailedDescription: "Access to view application performance metrics, system health indicators, and monitoring data.",
    impact: "Read-only access to performance data. No ability to modify.",
    riskLevel: 'LOW'
  },

  // ===== TASK MANAGEMENT =====

  {
    id: 'TASK_BOARD_VIEW',
    label: 'View Task Board',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "View task board and workflow",
    detailedDescription: "Access to view the task board for managing Applicant tasks and workflow.",
    impact: "Read-only access to task management. No ability to modify tasks.",
    riskLevel: 'LOW'
  },

  {
    id: 'TASK_BOARD_MANAGE_OWN',
    label: 'Manage Own Tasks',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Manage tasks assigned to self",
    detailedDescription: "Ability to create, edit, and complete tasks assigned to the current user.",
    impact: "Can manage personal task workflow. Limited to own tasks only.",
    riskLevel: 'LOW'
  },

  {
    id: 'TASK_BOARD_MANAGE_ALL',
    label: 'Manage All Tasks',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Manage tasks for all users",
    detailedDescription: "Ability to create, edit, assign, and manage tasks for all users in the system.",
    impact: "Can control task workflow for all users. Affects team productivity and coordination.",
    riskLevel: 'HIGH'
  },

  // ===== JOB MATCHING =====

  {
    id: 'JOB_MATCH_VIEW',
    label: 'View Job Matches',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "View Applicant-job matching results",
    detailedDescription: "Access to view job matching results and Applicant-position compatibility scores.",
    impact: "Read-only access to matching data. No ability to modify.",
    riskLevel: 'LOW'
  },

  {
    id: 'JOB_MATCH_MANAGE',
    label: 'Manage Job Matches',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Create and modify job matches",
    detailedDescription: "Ability to create, edit, and delete job matches between Applicants and positions.",
    impact: "Can control Applicant-position matching. Affects recruitment strategy.",
    riskLevel: 'MEDIUM'
  },



  // ===== USER PREFERENCES =====

  {
    id: 'USER_PREFERENCES_MANAGE_OWN',
    label: 'Manage Own Preferences',
    category: PLATFORM_MODULE_CATEGORIES.SYSTEM_CONFIGURATION,
    description: "Manage personal UI preferences",
    detailedDescription: "Ability to manage personal UI display preferences, dashboard layouts, and user-specific settings.",
    impact: "Can modify personal user experience. No impact on other users.",
    riskLevel: 'LOW'
  },

  {
    id: 'USER_PREFERENCES_MANAGE_ALL',
    label: 'Manage All User Preferences',
    category: PLATFORM_MODULE_CATEGORIES.SYSTEM_CONFIGURATION,
    description: "Manage preferences for all users",
    detailedDescription: "Ability to manage UI preferences and settings for all users in the system.",
    impact: "Can modify user experience for all users. Affects system-wide usability.",
    riskLevel: 'MEDIUM'
  },

  // ===== EVALUATION LINKS =====

  {
    id: 'EVALUATION_LINKS_VIEW',
    label: 'View Evaluation Links',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "View evaluation links for Applicants",
    detailedDescription: "Access to view evaluation links including URL, expiration date, and owner information. Cannot create or modify links.",
    impact: "Read-only access to evaluation links. No ability to create or modify.",
    riskLevel: 'LOW'
  },

  {
    id: 'EVALUATION_LINKS_CREATE_OWN',
    label: 'Create Evaluation Links (Own Assigned)',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Create evaluation links for Applicants assigned to you",
    detailedDescription: "Ability to create evaluation links only for Applicants assigned to you as recruiter. Can set expiration and login requirements.",
    impact: "Limited to own assigned Applicants. Medium risk as controls access to Applicant evaluation.",
    riskLevel: 'MEDIUM'
  },

  {
    id: 'EVALUATION_LINKS_CREATE_ALL',
    label: 'Create Evaluation Links (All Applicants)',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Create evaluation links for any Applicant",
    detailedDescription: "Ability to create evaluation links for any Applicant in the system, regardless of assignment. Can set expiration and login requirements.",
    impact: "Full access to create evaluation links. High risk as controls access to all Applicant evaluations.",
    riskLevel: 'HIGH'
  },

  {
    id: 'EVALUATION_LINKS_MANAGE_OWN',
    label: 'Manage Evaluation Links (Own Created)',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Manage evaluation links created by you",
    detailedDescription: "Ability to update, extend, or revoke evaluation links that you created. Can modify expiration dates and login requirements.",
    impact: "Limited to own created links. Medium risk as controls access to Applicant evaluation.",
    riskLevel: 'MEDIUM'
  },

  {
    id: 'EVALUATION_LINKS_MANAGE_ALL',
    label: 'Manage All Evaluation Links',
    category: PLATFORM_MODULE_CATEGORIES.APPLICANT_MANAGEMENT,
    description: "Manage all evaluation links in the system",
    detailedDescription: "Ability to update, extend, or revoke any evaluation link in the system, regardless of creator. Can modify expiration dates and login requirements.",
    impact: "Full access to manage all evaluation links. High risk as controls access to all Applicant evaluations.",
    riskLevel: 'HIGH'
  },
];

export type PlatformModuleId = PlatformModule['id'];


declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role?: UserProfile['role'];
      modulePermissions?: PlatformModuleId[];
      avatarUrl?: string | null;
      personalColor?: string | null;
      twoFactorEnabled?: boolean;
      twoFactorMethod?: 'totp' | 'email';
    } & DefaultUser; // DefaultUser includes name, email, image
  }

  interface User extends DefaultUser { // NextAuth User object
    id: string;
    role?: UserProfile['role'];
    modulePermissions?: PlatformModuleId[];
    avatarUrl?: string | null;
    personalColor?: string | null;
    twoFactorEnabled?: boolean;
    twoFactorMethod?: 'totp' | 'email';
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    modulePermissions?: PlatformModuleId[];
    avatarUrl?: string | null;
    personalColor?: string | null;
    twoFactorEnabled?: boolean;
    twoFactorMethod?: 'totp' | 'email';
  }
}

// In NextAuth v5, JWT types are handled differently
// The JWT interface is extended in the auth.ts file via the jwt callback

// Core system statuses - these might still be useful for specific logic,
// but the full list of available stages will come from the RecruitmentStage table.
export type CoreApplicantStatus =
  | 'Applied'
  | 'Screening'
  | 'Shortlisted'
  | 'Interview Scheduled'
  | 'Interviewing'
  | 'Offer Extended'
  | 'Offer Accepted'
  | 'Hired'
  | 'Rejected'
  | 'On Hold';

// This type will represent any stage name, whether core or custom.
export type ApplicantStatus = string;

// Active Applicant statuses - Applicants that are not hired or rejected
export const ACTIVE_APPLICANT_STATUSES: CoreApplicantStatus[] = [
  'Applied',
  'Screening',
  'Shortlisted',
  'Interview Scheduled',
  'Interviewing',
  'Offer Extended',
  'Offer Accepted',
  'On Hold'
];

// Utility function to get active Applicant statuses as a comma-separated string for queries
export function getActiveApplicantStatusesQuery(): string {
  return ACTIVE_APPLICANT_STATUSES.join(',');
}

export interface RecruitmentStage {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  sortOrder?: number | null;
  createdAt?: string;
  updatedAt?: string;
  color_complete?: string | null; // Custom color for completed stage node
  color_badge?: string | null; // Custom color for badge on Applicant list
}

export interface TransitionRecord {
  id: string;
  applicantId?: string;
  positionId?: string | null;
  date: string;
  stage: ApplicantStatus; // Now a string to accommodate custom stages
  notes?: string;
  actingUserId?: string | null;
  actingUserName?: string | null; // For display purposes, populated by JOIN
  createdAt?: string;
  updatedAt?: string;
}

export interface PersonalInfo {
  title_honorific?: string;
  firstname: string;
  lastname: string;
  nickname?: string;
  location?: string;
  introduction_aboutme?: string;
  avatar_url?: string;
}

export interface ContactInfo {
  email: string;
  phone?: string;
}

// New structured education entry type
export interface StructuredEducationEntry {
  id?: string;
  university: string;
  major?: string;
  field?: string;
  campus?: string;
  startMonth: number; // 1-12
  startYear: number;
  endMonth?: number; // 1-12 or null for current
  endYear?: number; // null for current
  isCurrent: boolean;
  GPA?: string;
  duration?: string; // Calculated field
}

// New structured experience entry type
export interface StructuredExperienceEntry {
  id?: string;
  company: string;
  position: string;
  description?: string;
  startMonth: number; // 1-12
  startYear: number;
  endMonth?: number; // 1-12 or null for current
  endYear?: number; // null for current
  isCurrent: boolean;
  positionLevel?: string;
  duration?: string; // Calculated field
}

// Legacy types (keep for backward compatibility)
export interface EducationEntry {
  major?: string;
  field?: string;
  period?: string; // Legacy: "Jan 2022 - Dec 2024"
  duration?: string;
  GPA?: string;
  university?: string;
  campus?: string;
  // New structured fields (optional for migration)
  startMonth?: number;
  startYear?: number;
  endMonth?: number;
  endYear?: number;
  isCurrent?: boolean;
}

export interface ExperienceEntry {
  company?: string;
  position?: string;
  description?: string;
  period?: string; // Legacy: "Jan 2022 - Dec 2024"
  duration?: string;
  is_current_position?: boolean;
  positionLevel?: string;
  // New structured fields (optional for migration)
  startMonth?: number;
  startYear?: number;
  endMonth?: number;
  endYear?: number;
  isCurrent?: boolean;
}

export interface SkillEntry {
  segment_skill?: string;
  skill?: string[];
  skill_string?: string; // For UI binding if skills are comma-separated in input
}

// Removed JobSuitableEntry and job suitability features

export interface AutomationJobMatch {
  jobId?: string;
  jobTitle?: string | null;
  fitScore: number;
  matchReasons?: string[];
  matchReasons_string?: string | null;
  is_applied_job?: boolean;
}

export interface ApplicantDetails {
  cv_language?: string;
  personal_info: PersonalInfo;
  contact_info: ContactInfo;
  education?: EducationEntry[];
  experience?: ExperienceEntry[];
  skills?: SkillEntry[];
  // job_suitable removed
  associatedMatchDetails?: {
    jobTitle: string;
    fitScore: number;
    reasons: string[];
    automationJobId?: string;
  };
  job_matches?: AutomationJobMatch[];
}

export interface AutomationApplicantWebhookEntry {
  applicant_info: ApplicantDetails;
  jobs?: AutomationJobMatch[];
  targetPositionId?: string | null;
  targetPositionTitle?: string | null;
  targetPositionDescription?: string | null;
  targetpositionLevel?: string | null;
  job_applied?: {
    jobId?: string | null;
    jobTitle?: string | null;
    fitScore?: number | null;
    justification?: string[];
  } | null;
}

export type AutomationWebhookPayload = AutomationApplicantWebhookEntry;

export interface OldParsedResumeData {
  name?: string;
  email?: string;
  phone?: string;
  education?: string[];
  skills?: string[];
  experienceYears?: number;
  summary?: string;
}

export interface Grade {
  id: string;
  name: string;
  label?: string | null;
  description?: string | null;
  minLevel: number;
  maxLevel: number;
  slaDays: number;
  color?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Position {
  id: string;
  title: string;
  department: string;
  description?: string | null;
  matchCriteria?: string | null;
  isOpen: boolean;
  positionLevel?: string | null;
  positionAttribute?: string | null;
  gradeId?: string | null;
  grade?: Grade | null;
  recruiterId?: string | null;
  recruiterName?: string | null;
  customAttributes?: Record<string, any> | null;
  customFields?: { [fieldCode: string]: any }; // Custom field values
  createdAt?: string;
  updatedAt?: string;
  applicants?: Applicant[];
  webhook_payload?: any;
  upload_id?: string;
  applicantStats?: {
    totalApplied: number;
    appliedStatusCount: number;
    totalMatching: number;
  };
}

export interface PositionLevel {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserGroup { // This is now "Role" in the UI
  id: string;
  name: string;
  description?: string | null;
  permissions?: PlatformModuleId[];
  isDefault?: boolean; // Changed from is_default to match Prisma schema
  isSystemRole?: boolean; // Changed from is_system_role to match Prisma schema
  user_count?: number; // For API response
  createdAt?: string;
  updatedAt?: string;
}

export interface UserTeam {
  id: string;
  name: string;
  description?: string | null;
  color?: string;
  isActive: boolean;
  member_count?: number; // For API response
  createdAt?: string;
  updatedAt?: string;
}

export interface ApplicantSource {
  id: string;
  name: string;
  description?: string | null;
  email?: string | null;
  logo?: string | null;
  allowSubSource: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Applicant {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  expectedSalary?: number | null;
  avatarUrl?: string | null; // For Applicant profile image
  dataAiHint?: string | null; // For Applicant profile image
  resumePath?: string | null; // Current/primary resume
  parsedData: ApplicantDetails | OldParsedResumeData | null;
  positionId: string | null;
  position?: Position | null;
  fitScore: number;
  statusId: string; // Now references RecruitmentStage.id
  status?: string | null; // For backward compatibility - the actual status name
  recruitmentStage?: RecruitmentStage | null;
  applicationDate: string;
  recruiterId?: string | null;
  recruiter?: Pick<UserProfile, 'id' | 'name' | 'email'> | null;
  sourceId?: string | null;
  source?: ApplicantSource | null;
  subSource?: string | null;
  customFields?: { [fieldCode: string]: any }; // Custom field values
  customAttributes?: Record<string, any> | null;
  assignmentJustification?: string | null;
  createdAt?: string;
  updatedAt?: string;
  isPinned?: boolean;
  pinnedAt?: string | null;
  isBlacklisted?: boolean;
  isRead?: boolean | null; // Per-user read status (null if not set for current user)
  emailDate?: string | null; // Date from email when Applicant applied via email
  emailSubject?: string | null; // Subject line of the application email
  emailId?: string | null; // Unique email message ID
  emailMetadata?: Record<string, any> | null; // Additional email metadata (headers, etc.)
  transitionHistory: TransitionRecord[];
  educationData?: StructuredEducationEntry[];
  experienceData?: StructuredExperienceEntry[];
  jobMatches?: JobMatch[]; // Job matches from the JobMatch table
  associationType?: 'applied' | 'matched' | 'applied_and_matched'; // For position-specific Applicant lists
}

export interface ResumeHistoryEntry {
  id: string;
  applicantId: string;
  filePath: string;
  originalFileName: string;
  uploadedAt: string;
  uploadedByUserId?: string | null;
  uploadedByUserName?: string | null; // For display
}

// Database model for JobMatch (matches Prisma schema)
export interface JobMatch {
  id: string;
  applicantId: string;
  jobId?: string | null;
  jobTitle?: string | null;
  fitScore: number;
  matchReasons?: string[] | null;
  jobDescriptionSummary?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Database model for ResumeHistory (now using Attachment table)
export interface ResumeHistory {
  id: string;
  applicantId: string;
  filePath: string;
  originalFileName: string;
  uploadedAt: string;
  uploadedByUserId?: string | null;
  uploadedByUserName?: string | null; // For display purposes, populated by JOIN
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  dataAiHint?: string;
  personalColor?: string;
  role: 'Admin' | 'Recruiter' | 'Hiring Manager';
  password?: string;
  authenticationMethods?: string[];
  isActive?: boolean;
  userTeamId?: string | null; // Direct foreign key to UserTeam
  userGroupId?: string | null; // Direct foreign key to UserGroup
  modulePermissions?: PlatformModuleId[];
  positionTitle?: string | null;
  createdAt?: string;
  updatedAt?: string;
  // Derived/expanded fields for UI convenience
  teams?: { id: string; name: string; color?: string }[];
  userGroupName?: string | null;
  lastLogin?: string | null; // Last login timestamp from audit logs
  customFields?: { [fieldCode: string]: any }; // Custom field values
  twoFactorEnabled?: boolean;
  twoFactorMethod?: 'totp' | 'email';

  // Azure AD / HRIS Synced Fields
  department?: string | null;
  officeLocation?: string | null;
  employeeType?: string | null;
  jobTitle?: string | null;
  companyName?: string | null;
  employeeId?: string | null;
  manager?: string | null;
  managerEmail?: string | null;
  phoneNumber?: string | null;
  hireDate?: string | Date | null;
  samAccountName?: string | null;
  contactInfo?: {
    mobilePhone?: string | null;
    businessPhone?: string | null;
    [key: string]: any;
  } | null;
}

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'AUDIT';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  source?: string;
  actingUserId?: string | null;
  actingUserName?: string | null;
  details?: Record<string, any> | null;
  createdAt?: string;
}

export type UIDisplayPreference = "Standard" | "Emphasized" | "Hidden";

export interface AttributePreference {
  path: string;
  uiPreference: UIDisplayPreference;
  customNote: string;
}






export interface ModelAttributeDefinition {
  key: string;
  label: string;
  type: string;
  description?: string;
  subAttributes?: ModelAttributeDefinition[];
  arrayItemType?: string;
}

export type CustomFieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'select_single' | 'select_multiple';
export const CUSTOM_FIELD_TYPES: CustomFieldType[] = ['text', 'textarea', 'number', 'boolean', 'date', 'select_single', 'select_multiple'];

export interface CustomFieldOption {
  id?: string;
  value: string;
  label: string;
  color?: string;
  sortOrder?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomFieldDefinition {
  id: string;
  model_name: 'Applicant' | 'Position' | 'User' | 'Headcount';
  field_key: string;
  field_code: string;
  label: string;
  field_type: CustomFieldType;
  options?: CustomFieldOption[] | null;
  is_required?: boolean;
  sort_order?: number;

  // Enhanced custom attribute fields
  attributeCode?: string;

  // Role permissions - using role IDs (UUIDs)
  viewRoles?: string[];
  editRoles?: string[];

  // Visibility settings
  showInFilter?: boolean;
  showInApplicantDetail?: boolean;
  showInFullApplicantDetail?: boolean;
  showInTaskBoardFilter?: boolean;
  showInPositionSettings?: boolean;
  showInHeadcountDetail?: boolean;

  // Section selection for display settings
  applicantDetailSection?: 'jobs' | 'applicant-info' | 'education' | 'experience' | 'job-suitability';
  positionDetailSection?: 'details' | 'criteria' | 'applicants' | 'headcount';

  // For select/multiselect fields
  allowCustomOptions?: boolean;

  createdAt?: string;
  updatedAt?: string;
}

// System-wide settings
export type SystemSettingKey =
  | 'appName'
  | 'appLogoDataUrl'
  | 'appFaviconDataUrl'
  | 'appThemePreference'
  | 'defaultMatchCriteria'
  // New contextual logo settings
  | 'loginPageLogoLightMode'
  | 'loginPageLogoDarkMode'
  | 'sidebarLogoCollapsedLightMode'
  | 'sidebarLogoExpandedLightMode'
  | 'sidebarLogoCollapsedDarkMode'
  | 'sidebarLogoExpandedDarkMode'
  | 'primaryGradientStart' // Legacy - kept for backward compatibility
  | 'primaryGradientEnd' // Legacy - kept for backward compatibility
  | 'primaryGradient' // Full gradient string with all stops
  | 'primaryButtonShadowL' // Primary button shadow light theme
  | 'primaryButtonShadowHoverL' // Primary button shadow hover light theme
  | 'primaryButtonShadowD' // Primary button shadow dark theme
  | 'primaryButtonShadowHoverD' // Primary button shadow hover dark theme
  | 'loginBackgroundGradient' // Full gradient string with all stops
  | 'evaluateHeaderBackgroundGradient' // Full gradient string with all stops
  | 'evaluateHeaderBackgroundType'
  | 'evaluateHeaderBackgroundImageUrl'
  | 'evaluateHeaderBackgroundGradientStart'
  | 'evaluateHeaderBackgroundGradientEnd'
  | 'evaluateHeaderBackgroundColor'
  | 'evaluateHeaderTextColor'
  | 'evaluatePlatformLogoDataUrl'
  | 'evaluateReportLogoDataUrl'
  // Organization branding
  | 'organizationName'
  | 'organizationAddress'
  | 'organizationContact'
  | 'organizationLogoDataUrl'
  | 'resumeProcessingWebhookUrl'
  | 'resumeProcessingWebhookToken'
  | 'resumeProcessingWebhookResponseMode'
  | 'resumeProcessingWebhookTimeout'
  | 'webhookConnectionTimeout'

  | 'preventDuplicateWebhookProcessing'
  | 'geminiApiKey'
  | 'loginPageBackgroundType'
  | 'loginPageBackgroundImageUrl'
  | 'loginPageBackgroundColor1'
  | 'loginPageBackgroundColor2'
  | 'loginPageLayoutType'
  | 'loginPageLogoSize'
  // Branding display settings
  | 'showLogoOnly'
  // Unified Login Background settings
  | 'loginBackgroundType'
  | 'loginBackgroundGradientStart'
  | 'loginBackgroundGradientEnd'
  | 'loginBackgroundColor'
  // Unified Mobile Login Background settings
  | 'loginBackgroundTypeMobile'
  | 'loginPageBackgroundImageUrlMobile'
  | 'loginBackgroundGradientStartMobile'
  | 'loginBackgroundGradientEndMobile'
  | 'loginBackgroundColorMobile'
  | 'loginBackgroundGradientMobile'
  // Sidebar Light Theme
  | 'sidebarBgStartL'
  | 'sidebarBgEndL'
  | 'sidebarTextL'
  | 'sidebarActiveBgStartL'
  | 'sidebarActiveBgEndL'
  | 'sidebarActiveTextL'
  | 'sidebarHoverBgL'
  | 'sidebarHoverTextL'
  | 'sidebarBorderL'
  // Button text colors - separate from sidebar active text
  | 'buttonTextColorL'
  | 'buttonTextColorD'
  // Sidebar Dark Theme
  | 'sidebarBgStartD'
  | 'sidebarBgEndD'
  | 'sidebarTextD'
  | 'sidebarActiveBgStartD'
  | 'sidebarActiveBgEndD'
  | 'sidebarActiveTextD'
  | 'sidebarHoverBgD'
  | 'sidebarHoverTextD'
  | 'sidebarBorderD'
  | 'appFontFamily'
  | 'loginPageContent'
  | 'loginPageFooter'
  | 'maxConcurrentProcessors'
  | 'aiPowerSearchSystemPrompt'
  | 'geminiModelSelection'
  | 'jobMatchFeatureEnabled'
  | 'basicAuthEnabled'
  | 'processQueueEnabled'
  | 'queueRetryEnabled'
  | 'queueRetryDelaySeconds'
  | 'queueMaxRetries'
  // Email Service Configuration
  | 'emailServiceEnabled'
  | 'emailSmtpHost'
  | 'emailSmtpPort'
  | 'emailSmtpSecure'
  | 'emailSmtpUser'
  | 'emailSmtpPassword'
  | 'emailFromAddress'
  | 'emailFromName'
  | 'lockoutAlertEmails'
  | 'lockoutWebhookUrl'
  // Email Templates
  | 'emailTemplateInterviewInvitation'
  | 'emailTemplateInterviewInvitationSubject'
  // Feature Toggles
  | 'interviewInvitationFeatureEnabled'
  | 'pwaEnabled'
  // Drawer Style
  | 'drawerStyle'
  // QR Code
  | 'qrCodeLogo'
  // Sidebar Logo Size
  | 'sidebarLogoSize'
  // Mobile Header Configuration
  | 'mobileHeaderGradient1'
  | 'mobileHeaderGradient2'
  | 'mobileHeaderGradient3'
  | 'mobileHeaderGradient4'
  | 'mobileHeaderFontColor'
  | 'mobileLoginLogoDataUrl'
  | 'mobileHeaderBackgroundType'
  | 'emailTemplateInterviewInvitationEditorMode'
  | 'icsDescriptionTemplate'
  // Security settings
  | 'loginPageDevToolsProtectionEnabled' // Disable dev tools and right-click on login page (default: true = protection enabled)
  | 'rightClickProtectionEnabled' // Disable right-click across entire application (default: false = protection disabled)
  | 'screenCaptureProtectionEnabled'; // Blur content when tab loses focus to protect against screen capture (default: false = protection disabled)


export interface SystemSetting {
  key: SystemSettingKey;
  value: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type LoginPageBackgroundType = "default" | "image" | "color" | "gradient" | "solid";
export type LoginPageLayoutType = 'center' | '2column';




// For the new Settings Layout sub-navigation
export interface SettingsNavigationItem {
  href: string;
  label: string;
  icon: React.ElementType;
  description: string;
  adminOnly?: boolean;
  permissionId?: PlatformModuleId;
  adminOnlyOrPermission?: boolean;
}

export interface FilterableAttribute {
  path: string; // e.g., "name", "parsedData.personal_info.location"
  label: string; // e.g., "Applicant Name", "Location (Resume)"
  type: 'string' | 'number' | 'date' | 'boolean' | 'array_string'; // To guide potential future UI or backend logic
}

// For Bulk Actions
export type ApplicantBulkAction = 'delete' | 'change_status' | 'assign_recruiter';
export type PositionBulkAction = 'delete' | 'change_status'; // Added 'change_status'

export interface ApplicantBulkActionPayload {
  action: ApplicantBulkAction;
  applicantIds: string[];
  newStatus?: ApplicantStatus; // For 'change_status'
  notes?: string | null; // For 'change_status' transition notes
  newRecruiterId?: string | null; // For 'assign_recruiter'
}

export interface PositionBulkActionPayload {
  action: PositionBulkAction;
  positionIds: string[];
  newIsOpenStatus?: boolean; // For 'change_status'
}



export type positionLevel = string;

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  image?: string;
  dataAiHint?: string;
  personalColor?: string;
  authenticationMethods?: string[];
  forcePasswordChange?: boolean;
  emailVerified?: Date;
  createdAt: Date;
  updatedAt: Date;
  azure_oid?: string;
  department?: string | null;
  phoneNumber?: string | null;
  officeLocation?: string | null;
  positionTitle?: string | null;
  employeeId?: string | null;
  companyName?: string | null;
  employeeType?: string | null;
  hireDate?: Date | null;
  manager?: string | null;
  managerEmail?: string | null;
  samAccountName?: string | null;
  contactInfo?: any; // To store full contact details JSON
}

export interface ApplicantFilterValues {
  name?: string;
  nameOperator?: 'contains' | 'is' | 'startsWith' | 'endsWith';
  email?: string;
  emailOperator?: 'contains' | 'is' | 'startsWith' | 'endsWith';
  phone?: string;
  phoneOperator?: 'contains' | 'is' | 'startsWith' | 'endsWith';
  selectedPositionIds?: string[];
  selectedStatuses?: string[];
  selectedRecruiterIds?: string[]; // Added
  selectedSourceIds?: string[];
  education?: string; // Education Keywords
  skills?: string; // Skills Keywords
  location?: string; // Location
  locationOperator?: 'contains' | 'is' | 'startsWith' | 'endsWith' | 'other'; // Added
  cvLanguage?: string; // CV Language
  jobSuitableCareer?: string; // Job Suitable Career
  jobSuitableLevel?: string; // Job Suitable Level
  jobSuitablePosition?: string; // Job Suitable Position
  minExperienceYears?: number; // Minimum Experience Years
  maxExperienceYears?: number; // Maximum Experience Years
  minAppliedJobFitScore?: number; // Min fit score for applied job
  maxAppliedJobFitScore?: number; // Max fit score for applied job
  minMatchingJobFitScore?: number; // Min fit score for matching job
  maxMatchingJobFitScore?: number; // Max fit score for matching job
  applicationDateStart?: Date;
  applicationDateEnd?: Date;
  includeNoScoreInApplied?: boolean;
  includeNoScoreInMatching?: boolean;
  
  // AI Search fields
  aiSearchQuery?: string;
  aiSearchType?: 'semantic' | 'exact' | 'hybrid';
  aiSearchFilters?: Record<string, any>;
  
  // Custom fields
  customFieldFilters?: Record<string, any>;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  role: string;
  password?: string;
  groupIds?: string[];
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: string;
  password?: string;
  groupIds?: string[];
}

// Headcount types
export type HeadcountType = 'promote' | 'new' | 'replace';
export type HeadcountStatus = 'vacant' | 'filled';

export interface Headcount {
  id: string;
  positionId: string;
  type: HeadcountType;
  status: HeadcountStatus;
  applicantId?: string | null;
  onboardingDate?: string | null;
  requestDate?: string | null;
  notes?: string | null;
  memoId?: string | null;
  customFields?: Record<string, any>;
  employeeId?: string | null;
  createdAt: string;
  updatedAt: string;
  position?: Position;
  applicant?: Applicant;
  attachments?: Attachment[];
}

export interface CreateHeadcountRequest {
  positionId: string;
  type: HeadcountType;
  status?: HeadcountStatus;
  applicantId?: string | null;
  onboardingDate?: string | null;
  requestDate?: string | null;
  notes?: string | null;
  memoId?: string | null;
  customFields?: Record<string, any>;
  employeeId?: string | null;
}

export interface UpdateHeadcountRequest {
  type?: HeadcountType;
  status?: HeadcountStatus;
  applicantId?: string | null;
  onboardingDate?: string | null;
  requestDate?: string | null;
  notes?: string | null;
  memoId?: string | null;
  customFields?: Record<string, any>;
  employeeId?: string | null;
}

export interface Attachment {
  id: string;
  applicantId?: string | null;
  headcountId?: string | null;
  uploadedById: string;
  filePath: string;
  fileName: string;
  label: string;
  isPrimary: boolean;
  uploadedAt: string;
  updatedAt: string;
  uploadedBy?: User;
}

// Enhanced pagination types
export interface PaginationInfo {
  page: number;
  limit: number;
  offset: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface UploadQueueSummary {
  total: number;
  queued: number;
  inprocess: number;
  success: number;
  error: number;
}

export interface UploadQueueJob {
  id: string;
  file_name: string;
  file_size: number;
  status: string;
  error?: string | null;
  error_details?: string | null;
  source?: string | null;
  upload_date: string;
  completed_date?: string | null;
  upload_id?: string | null;
  created_by?: string | null;
  updated_at: string;
  file_path: string;
  webhook_payload?: any;
  position_id?: string | null;
  process_date?: string | null;
  position_title?: string | null;
  url?: string | null;
}

export interface UploadQueueResponse {
  data: UploadQueueJob[];
  total: number;
  summary: UploadQueueSummary;
  pagination: PaginationInfo;
}

export interface UploadQueueCountResponse {
  count: number;
}

export interface UploadQueuePendingCountResponse {
  count: number;
}

