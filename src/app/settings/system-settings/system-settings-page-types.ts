export type EmailEditorMode = 'wysiwyg' | 'html';

export interface SystemSettingsViewState {
  maxConcurrentProcessors: number;
  resumeProcessingWebhookUrl: string;
  resumeProcessingWebhookToken: string;
  resumeProcessingWebhookResponseMode: string;
  resumeProcessingWebhookTimeout: number;
  processQueueEnabled: boolean;
  processorIntervalMs: number;
  processorQuietMode: boolean;
  processorConnectionTimeoutMs: number;
  processorRequestTimeoutMs: number;
  emailServiceEnabled: boolean;
  emailSmtpHost: string;
  emailSmtpPort: number;
  emailSmtpSecure: boolean;
  emailSmtpUser: string;
  emailSmtpPassword: string;
  emailFromAddress: string;
  emailFromName: string;
  emailTemplateInterviewInvitation: string;
  emailTemplateInterviewInvitationSubject: string;
  emailTemplateInterviewInvitationEditorMode: EmailEditorMode;
  icsDescriptionTemplate: string;
  organizationName: string;
  organizationAddress: string;
  organizationContact: string;
  organizationLogoPreviewUrl: string | null;
  savedOrganizationLogoUrl: string | null;
  interviewInvitationFeatureEnabled: boolean;
  azureMeetingRoomsEnabled: boolean;
  azureAdClientId: string;
  azureAdClientSecret: string;
  azureAdTenantId: string;
  jobDescriptionSystemPrompt: string;
  applicantEvaluationCriteriaPrompt: string;
  defaultMatchCriteria: string;
  showLogoOnly: boolean;
  jobMatchFeatureEnabled: boolean;
  pwaEnabled: boolean;
  pwaName: string;
  pwaShortName: string;
  pwaDescription: string;
  pwaThemeColor: string;
  pwaBackgroundColor: string;
  pwaAppleMobileWebAppTitle: string;
  pwaAppleMobileWebAppStatusBarStyle: string;
  exportImportFeatureEnabled: boolean;
  hiringManagerRestrictToAssignedPositions: boolean;
  screenCaptureProtectionEnabled: boolean;
  rightClickProtectionEnabled: boolean;
  loginPageDevToolsProtectionEnabled: boolean;
  globalTwoFactorEnabled: boolean;
  lockoutAlertEmails: string[];
  lockoutWebhookUrl: string;
}

export type SystemSettingsSavePayload = Array<{ key: string; value: string }>;

export type SystemSettingsSaveState = Pick<
  SystemSettingsViewState,
  | 'maxConcurrentProcessors'
  | 'resumeProcessingWebhookUrl'
  | 'resumeProcessingWebhookToken'
  | 'resumeProcessingWebhookResponseMode'
  | 'resumeProcessingWebhookTimeout'
  | 'defaultMatchCriteria'
  | 'jobMatchFeatureEnabled'
  | 'processQueueEnabled'
  | 'pwaEnabled'
  | 'pwaName'
  | 'pwaShortName'
  | 'pwaDescription'
  | 'pwaThemeColor'
  | 'pwaBackgroundColor'
  | 'pwaAppleMobileWebAppTitle'
  | 'pwaAppleMobileWebAppStatusBarStyle'
  | 'exportImportFeatureEnabled'
  | 'hiringManagerRestrictToAssignedPositions'
  | 'processorIntervalMs'
  | 'processorQuietMode'
  | 'processorConnectionTimeoutMs'
  | 'processorRequestTimeoutMs'
  | 'emailServiceEnabled'
  | 'emailSmtpHost'
  | 'emailSmtpPort'
  | 'emailSmtpSecure'
  | 'emailSmtpUser'
  | 'emailSmtpPassword'
  | 'emailFromAddress'
  | 'emailFromName'
  | 'emailTemplateInterviewInvitation'
  | 'emailTemplateInterviewInvitationSubject'
  | 'emailTemplateInterviewInvitationEditorMode'
  | 'icsDescriptionTemplate'
  | 'organizationName'
  | 'organizationAddress'
  | 'organizationContact'
  | 'organizationLogoPreviewUrl'
  | 'screenCaptureProtectionEnabled'
  | 'rightClickProtectionEnabled'
  | 'loginPageDevToolsProtectionEnabled'
  | 'globalTwoFactorEnabled'
  | 'azureAdClientId'
  | 'azureAdClientSecret'
  | 'azureAdTenantId'
  | 'lockoutAlertEmails'
  | 'lockoutWebhookUrl'
  | 'jobDescriptionSystemPrompt'
  | 'applicantEvaluationCriteriaPrompt'
>;
