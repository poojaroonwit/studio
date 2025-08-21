// This declares the shape of the user object returned by the session callback
// and available in useSession() or getServerSession()
// It needs to be augmented if you add custom properties to the session token
import type { DefaultUser } from 'next-auth';

// Define platform module IDs with categories
export const PLATFORM_MODULE_CATEGORIES = {
  CANDIDATE_MANAGEMENT: "Candidate Management",
  POSITION_MANAGEMENT: "Position Management",
  USER_ACCESS_CONTROL: "User Access Control",
  SYSTEM_CONFIGURATION: "System Configuration",
  LOGGING_AUDIT: "Logging & Audit",
  DEPARTMENT_MANAGEMENT: "Department Management",
} as const;

export type PlatformModuleCategory = typeof PLATFORM_MODULE_CATEGORIES[keyof typeof PLATFORM_MODULE_CATEGORIES];

export interface PlatformModule {
  id: string;
  label: string;
  category: PlatformModuleCategory;
  description: string;
}

export const PLATFORM_MODULES: PlatformModule[] = [
  // Candidate Management
  { id: 'CANDIDATES_VIEW', label: 'View Candidates', category: PLATFORM_MODULE_CATEGORIES.CANDIDATE_MANAGEMENT, description: "Allows viewing candidate profiles and lists." },
  { id: 'CANDIDATES_MANAGE', label: 'Manage Candidates', category: PLATFORM_MODULE_CATEGORIES.CANDIDATE_MANAGEMENT, description: "Allows adding, editing, and deleting candidate profiles." },
  { id: 'CANDIDATES_IMPORT', label: 'Import Candidates', category: PLATFORM_MODULE_CATEGORIES.CANDIDATE_MANAGEMENT, description: "Allows bulk importing of candidate data." },
  { id: 'CANDIDATES_EXPORT', label: 'Export Candidates', category: PLATFORM_MODULE_CATEGORIES.CANDIDATE_MANAGEMENT, description: "Allows bulk exporting of candidate data." },
  { id: 'CANDIDATES_COMMENTS', label: 'Manage Candidate Comments', category: PLATFORM_MODULE_CATEGORIES.CANDIDATE_MANAGEMENT, description: "Allows adding, editing, and deleting candidate comments and attachments." },
  { id: 'CANDIDATES_RESUMES', label: 'Manage Candidate Resumes', category: PLATFORM_MODULE_CATEGORIES.CANDIDATE_MANAGEMENT, description: "Allows uploading and managing candidate resumes and attachments." },
  { id: 'CANDIDATES_TRANSITIONS', label: 'Manage Candidate Transitions', category: PLATFORM_MODULE_CATEGORIES.CANDIDATE_MANAGEMENT, description: "Allows changing candidate status and managing recruitment pipeline transitions." },
  { id: 'CANDIDATES_RECRUITER_ASSIGN', label: 'Assign Recruiters', category: PLATFORM_MODULE_CATEGORIES.CANDIDATE_MANAGEMENT, description: "Allows assigning candidates to recruiters." },
  { id: 'TASK_BOARD_VIEW', label: 'View Task Board', category: PLATFORM_MODULE_CATEGORIES.CANDIDATE_MANAGEMENT, description: "Allows viewing the task board for managing candidate tasks and workflow." },
  { id: 'TASK_BOARD_MANAGE_ALL', label: 'Manage All Tasks', category: PLATFORM_MODULE_CATEGORIES.CANDIDATE_MANAGEMENT, description: "Allows viewing and managing tasks for all recruiters (Admin functionality)." },
  
  // Position Management
  { id: 'POSITIONS_VIEW', label: 'View Positions', category: PLATFORM_MODULE_CATEGORIES.POSITION_MANAGEMENT, description: "Allows viewing job position details and lists." },
  { id: 'POSITIONS_MANAGE', label: 'Manage Positions', category: PLATFORM_MODULE_CATEGORIES.POSITION_MANAGEMENT, description: "Allows adding, editing, and deleting job positions." },
  { id: 'POSITIONS_IMPORT', label: 'Import Positions', category: PLATFORM_MODULE_CATEGORIES.POSITION_MANAGEMENT, description: "Allows bulk importing of position data." },
  { id: 'POSITIONS_EXPORT', label: 'Export Positions', category: PLATFORM_MODULE_CATEGORIES.POSITION_MANAGEMENT, description: "Allows bulk exporting of position data." },
  
  // User Access Control
  { id: 'USERS_MANAGE', label: 'Manage Users', category: PLATFORM_MODULE_CATEGORIES.USER_ACCESS_CONTROL, description: "Allows managing user accounts and their direct permissions (typically Admin only)." },
  { id: 'USER_GROUPS_MANAGE', label: 'Manage Roles (Groups)', category: PLATFORM_MODULE_CATEGORIES.USER_ACCESS_CONTROL, description: "Allows managing user groups (roles) and their assigned permissions." },

  
  // System Configuration
  { id: 'SYSTEM_SETTINGS_MANAGE', label: 'Manage System Preferences', category: PLATFORM_MODULE_CATEGORIES.SYSTEM_CONFIGURATION, description: "Allows managing global system settings like App Name, Logo." },
  { id: 'USER_PREFERENCES_MANAGE', label: 'Manage Own UI Preferences', category: PLATFORM_MODULE_CATEGORIES.SYSTEM_CONFIGURATION, description: "Allows users to manage their own UI display preferences for data models." },
  { id: 'RECRUITMENT_STAGES_MANAGE', label: 'Manage Recruitment Stages', category: PLATFORM_MODULE_CATEGORIES.SYSTEM_CONFIGURATION, description: "Allows managing the stages in the recruitment pipeline." },
  { id: 'CUSTOM_FIELDS_MANAGE', label: 'Manage Custom Fields', category: PLATFORM_MODULE_CATEGORIES.SYSTEM_CONFIGURATION, description: "Allows defining custom data fields for candidates and positions." },
  { id: 'WEBHOOK_MAPPING_MANAGE', label: 'Manage Webhooks', category: PLATFORM_MODULE_CATEGORIES.SYSTEM_CONFIGURATION, description: "Allows creating and managing webhook integrations for automation." },
  { id: 'AI_INTEGRATION_MANAGE', label: 'Manage AI Integration', category: PLATFORM_MODULE_CATEGORIES.SYSTEM_CONFIGURATION, description: "Allows configuring AI services like Gemini for candidate analysis." },
  
  // Upload & Automation
  { id: 'UPLOAD_QUEUE_MANAGE', label: 'Manage Upload Queue', category: PLATFORM_MODULE_CATEGORIES.SYSTEM_CONFIGURATION, description: "Allows managing the file upload queue and automation processing." },
  { id: 'AUTOMATION_UPLOAD', label: 'Automation Upload', category: PLATFORM_MODULE_CATEGORIES.SYSTEM_CONFIGURATION, description: "Allows using automation features for bulk candidate uploads." },
  { id: 'BULK_UPLOAD', label: 'Bulk Upload', category: PLATFORM_MODULE_CATEGORIES.CANDIDATE_MANAGEMENT, description: "Allows bulk uploading of candidate resumes and files." },
  
  // Logging & Audit
  { id: 'LOGS_VIEW', label: 'View Application Logs', category: PLATFORM_MODULE_CATEGORIES.LOGGING_AUDIT, description: "Allows viewing system and audit logs." },
  { id: 'AUDIT_LOGS_VIEW', label: 'View Audit Logs', category: PLATFORM_MODULE_CATEGORIES.LOGGING_AUDIT, description: "Allows viewing detailed audit logs of system activities." },
  { id: 'WEBHOOK_LOGS_VIEW', label: 'View Webhook Logs', category: PLATFORM_MODULE_CATEGORIES.LOGGING_AUDIT, description: "Allows viewing webhook delivery logs and analytics." },
  
  // Analytics & Reporting
  { id: 'DASHBOARD_VIEW', label: 'View Dashboard', category: PLATFORM_MODULE_CATEGORIES.LOGGING_AUDIT, description: "Allows viewing the main dashboard with analytics and metrics." },
  { id: 'ANALYTICS_VIEW', label: 'View Analytics', category: PLATFORM_MODULE_CATEGORIES.LOGGING_AUDIT, description: "Allows viewing detailed analytics and reports." },
  { id: 'WEBHOOK_ANALYTICS_VIEW', label: 'View Webhook Analytics', category: PLATFORM_MODULE_CATEGORIES.LOGGING_AUDIT, description: "Allows viewing webhook performance analytics." },
  
  // Department Management
  { id: 'HR_DEPARTMENT_MANAGE', label: 'Manage HR Department', category: PLATFORM_MODULE_CATEGORIES.DEPARTMENT_MANAGEMENT, description: "Allows full management of HR department including users, records, and settings." },
  { id: 'IT_DEPARTMENT_MANAGE', label: 'Manage IT Department', category: PLATFORM_MODULE_CATEGORIES.DEPARTMENT_MANAGEMENT, description: "Allows full management of IT department including users, records, and settings." },
  { id: 'FINANCE_DEPARTMENT_MANAGE', label: 'Manage Finance Department', category: PLATFORM_MODULE_CATEGORIES.DEPARTMENT_MANAGEMENT, description: "Allows full management of Finance department including users, records, and settings." },
  { id: 'MARKETING_DEPARTMENT_MANAGE', label: 'Manage Marketing Department', category: PLATFORM_MODULE_CATEGORIES.DEPARTMENT_MANAGEMENT, description: "Allows full management of Marketing department including users, records, and settings." },
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
    } & DefaultUser; // DefaultUser includes name, email, image
  }

  interface User extends DefaultUser { // NextAuth User object
    id: string;
    role?: UserProfile['role'];
    modulePermissions?: PlatformModuleId[];
    avatarUrl?: string | null;
    personalColor?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: UserProfile['role'];
    modulePermissions?: PlatformModuleId[];
  }
}

// Core system statuses - these might still be useful for specific logic,
// but the full list of available stages will come from the RecruitmentStage table.
export type CoreCandidateStatus =
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
export type CandidateStatus = string;

export interface RecruitmentStage {
  id: string;
  name: string;
  description?: string | null;
  is_system: boolean;
  sort_order?: number | null;
  createdAt?: string;
  updatedAt?: string;
  color_complete?: string | null; // Custom color for completed stage node
  color_badge?: string | null; // Custom color for badge on candidate list
}

export interface TransitionRecord {
  id: string;
  candidateId?: string;
  date: string;
  stage: CandidateStatus; // Now a string to accommodate custom stages
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

export interface JobSuitableEntry {
  suitable_career?: string;
  suitable_job_position?: string;
  suitable_job_level?: string;
  suitable_salary_bath_month?: string;
}

export interface AutomationJobMatch {
  jobId?: string;
  jobTitle?: string | null;
  fitScore: number;
  matchReasons?: string[];
  matchReasons_string?: string | null;
  is_applied_job?: boolean;
}

export interface CandidateDetails {
  cv_language?: string;
  personal_info: PersonalInfo;
  contact_info: ContactInfo;
  education?: EducationEntry[];
  experience?: ExperienceEntry[];
  skills?: SkillEntry[];
  job_suitable?: JobSuitableEntry[];
  associatedMatchDetails?: {
    jobTitle: string;
    fitScore: number;
    reasons: string[];
    automationJobId?: string;
  };
  job_matches?: AutomationJobMatch[];
}

export interface AutomationCandidateWebhookEntry {
  candidate_info: CandidateDetails;
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

export type AutomationWebhookPayload = AutomationCandidateWebhookEntry;

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
  hiringDate?: string | null;
  recruiterId?: string | null;
  recruiterName?: string | null;
  customAttributes?: Record<string, any> | null;
  createdAt?: string;
  updatedAt?: string;
  candidates?: Candidate[];
  webhook_payload?: any;
  upload_id?: string;
  candidateStats?: {
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
  is_default?: boolean;
  is_system_role?: boolean;
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

export interface CandidateSource {
  id: string;
  name: string;
  description?: string | null;
  logo?: string | null;
  allowSubSource: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null; // For candidate profile image
  dataAiHint?: string | null; // For candidate profile image
  resumePath?: string | null; // Current/primary resume
  parsedData: CandidateDetails | OldParsedResumeData | null;
  positionId: string | null;
  position?: Position | null;
  fitScore: number;
  status: CandidateStatus;
  applicationDate: string;
  recruiterId?: string | null;
  recruiter?: Pick<UserProfile, 'id' | 'name' | 'email'> | null;
  sourceId?: string | null;
  source?: CandidateSource | null;
  subSource?: string | null;
  customAttributes?: Record<string, any> | null;
  assignmentJustification?: string | null;
  createdAt?: string;
  updatedAt?: string;
  transitionHistory: TransitionRecord[];
  educationData?: StructuredEducationEntry[];
  experienceData?: StructuredExperienceEntry[];
  jobMatches?: JobMatch[]; // Job matches from the JobMatch table
  associationType?: 'applied' | 'matched' | 'applied_and_matched'; // For position-specific candidate lists
}

export interface ResumeHistoryEntry {
  id: string;
  candidateId: string;
  filePath: string;
  originalFileName: string;
  uploadedAt: string;
  uploadedByUserId?: string | null;
  uploadedByUserName?: string | null; // For display
}

// Database model for JobMatch (matches Prisma schema)
export interface JobMatch {
  id: string;
  candidateId: string;
  jobId?: string | null;
  jobTitle?: string | null;
  fitScore: number;
  matchReasons?: string[] | null;
  jobDescriptionSummary?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Database model for ResumeHistory (matches Prisma schema)
export interface ResumeHistory {
  id: string;
  candidateId: string;
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
  authenticationMethod?: 'basic' | 'azure';
  teams?: UserTeam[]; // User can belong to multiple teams
  createdAt?: string;
  updatedAt?: string;
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
  model_name: 'Candidate' | 'Position' | 'User' | 'Headcount';
  field_key: string;
  field_code: string;
  label: string;
  field_type: CustomFieldType;
  options?: CustomFieldOption[] | null;
  is_required?: boolean;
  sort_order?: number;
  
  // Enhanced custom attribute fields
  attributeCode?: string;
  attributeLabel?: string;
  
  // Role permissions - using role IDs (UUIDs)
  viewRoles?: string[];
  editRoles?: string[];
  
  // Visibility settings
  showInFilter?: boolean;
  showInCandidateDetail?: boolean;
  showInFullCandidateDetail?: boolean;
  showInTaskBoardFilter?: boolean;
  showInPositionSettings?: boolean;
  showInHeadcountDetail?: boolean;
  
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
  | 'primaryGradientStart'
  | 'primaryGradientEnd'
  | 'resumeProcessingWebhookUrl'
  | 'resumeProcessingWebhookToken'
  | 'resumeProcessingWebhookResponseMode'
  | 'resumeProcessingWebhookTimeout'

  | 'preventDuplicateWebhookProcessing'
  | 'geminiApiKey'
  | 'loginPageBackgroundType'
  | 'loginPageBackgroundImageUrl'
  | 'loginPageBackgroundColor1'
  | 'loginPageBackgroundColor2'
  | 'loginPageLayoutType'
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
  | 'aiPowerSearchSystemPrompt';


export interface SystemSetting {
    key: SystemSettingKey;
    value: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export type LoginPageBackgroundType = "default" | "image" | "color" | "gradient";
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
  label: string; // e.g., "Candidate Name", "Location (Resume)"
  type: 'string' | 'number' | 'date' | 'boolean' | 'array_string'; // To guide potential future UI or backend logic
}

// For Bulk Actions
export type CandidateBulkAction = 'delete' | 'change_status' | 'assign_recruiter';
export type PositionBulkAction = 'delete' | 'change_status'; // Added 'change_status'

export interface CandidateBulkActionPayload {
  action: CandidateBulkAction;
  candidateIds: string[];
  newStatus?: CandidateStatus; // For 'change_status'
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
  authenticationMethod?: string;
  forcePasswordChange?: boolean;
  emailVerified?: Date;
  createdAt: Date;
  updatedAt: Date;
  azure_oid?: string;
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
  candidateId?: string | null;
  onboardingDate?: string | null;
  notes?: string | null;
  memoId?: string | null;
  customFields?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  position?: Position;
  candidate?: Candidate;
  attachments?: Attachment[];
}

export interface CreateHeadcountRequest {
  positionId: string;
  type: HeadcountType;
  status?: HeadcountStatus;
  candidateId?: string | null;
  onboardingDate?: string | null;
  notes?: string | null;
  memoId?: string | null;
  customFields?: Record<string, any>;
}

export interface UpdateHeadcountRequest {
  type?: HeadcountType;
  status?: HeadcountStatus;
  candidateId?: string | null;
  onboardingDate?: string | null;
  notes?: string | null;
  memoId?: string | null;
  customFields?: Record<string, any>;
}

export interface Attachment {
  id: string;
  candidateId?: string | null;
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
