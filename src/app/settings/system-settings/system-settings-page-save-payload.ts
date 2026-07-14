import {
  DEFAULT_PWA_BACKGROUND_COLOR,
  DEFAULT_PWA_DESCRIPTION,
  DEFAULT_PWA_NAME,
  DEFAULT_PWA_SHORT_NAME,
  DEFAULT_PWA_STATUS_BAR_STYLE,
  DEFAULT_PWA_THEME_COLOR,
  ORGANIZATION_ADDRESS_KEY,
  ORGANIZATION_CONTACT_KEY,
  ORGANIZATION_LOGO_DATA_URL_KEY,
  ORGANIZATION_NAME_KEY,
} from './system-settings-page-constants';
import type { SystemSettingsSavePayload, SystemSettingsSaveState } from './system-settings-page-types';

type SystemSettingsPayloadField = {
  key: string;
  value: (state: SystemSettingsSaveState) => string;
};

const SYSTEM_SETTINGS_PAYLOAD_FIELDS: SystemSettingsPayloadField[] = [
  { key: 'resumeProcessingMode', value: state => stringSetting(state.resumeProcessingMode, 'built-in') },
  { key: 'builtInProcessorNodeName', value: state => stringSetting(state.builtInProcessorNodeName, 'Default built-in processor') },
  { key: 'builtInResumeExtractionPrompt', value: state => stringSetting(state.builtInResumeExtractionPrompt) },
  { key: 'builtInApplicantMappingPrompt', value: state => stringSetting(state.builtInApplicantMappingPrompt) },
  { key: 'builtInJobMatchingPrompt', value: state => stringSetting(state.builtInJobMatchingPrompt) },
  { key: 'maxConcurrentProcessors', value: state => stringifySetting(state.maxConcurrentProcessors) },
  { key: 'resumeProcessingWebhookUrl', value: state => stringSetting(state.resumeProcessingWebhookUrl) },
  { key: 'resumeProcessingWebhookToken', value: state => stringSetting(state.resumeProcessingWebhookToken) },
  { key: 'resumeProcessingWebhookResponseMode', value: state => stringSetting(state.resumeProcessingWebhookResponseMode, 'blocking') },
  { key: 'resumeProcessingWebhookTimeout', value: state => stringifySetting(state.resumeProcessingWebhookTimeout) },
  { key: 'defaultMatchCriteria', value: state => stringSetting(state.defaultMatchCriteria) },
  { key: 'jobMatchFeatureEnabled', value: state => stringifySetting(state.jobMatchFeatureEnabled) },
  { key: 'processQueueEnabled', value: state => stringifySetting(state.processQueueEnabled) },
  { key: 'pwaEnabled', value: state => stringifySetting(state.pwaEnabled) },
  { key: 'pwaName', value: state => stringSetting(state.pwaName, DEFAULT_PWA_NAME) },
  { key: 'pwaShortName', value: state => stringSetting(state.pwaShortName, DEFAULT_PWA_SHORT_NAME) },
  { key: 'pwaDescription', value: state => stringSetting(state.pwaDescription, DEFAULT_PWA_DESCRIPTION) },
  { key: 'pwaThemeColor', value: state => stringSetting(state.pwaThemeColor, DEFAULT_PWA_THEME_COLOR) },
  { key: 'pwaBackgroundColor', value: state => stringSetting(state.pwaBackgroundColor, DEFAULT_PWA_BACKGROUND_COLOR) },
  { key: 'pwaAppleMobileWebAppTitle', value: state => stringSetting(state.pwaAppleMobileWebAppTitle, DEFAULT_PWA_SHORT_NAME) },
  { key: 'pwaAppleMobileWebAppStatusBarStyle', value: state => stringSetting(state.pwaAppleMobileWebAppStatusBarStyle, DEFAULT_PWA_STATUS_BAR_STYLE) },
  { key: 'exportImportFeatureEnabled', value: state => stringifySetting(state.exportImportFeatureEnabled) },
  { key: 'hiringManagerRestrictToAssignedPositions', value: state => stringifySetting(state.hiringManagerRestrictToAssignedPositions) },
  { key: 'processorIntervalMs', value: state => stringifySetting(state.processorIntervalMs) },
  { key: 'processorQuietMode', value: state => stringifySetting(state.processorQuietMode) },
  { key: 'processorConnectionTimeoutMs', value: state => stringifySetting(state.processorConnectionTimeoutMs) },
  { key: 'processorRequestTimeoutMs', value: state => stringifySetting(state.processorRequestTimeoutMs) },
  { key: 'emailServiceEnabled', value: state => stringifySetting(state.emailServiceEnabled) },
  { key: 'emailSmtpHost', value: state => stringSetting(state.emailSmtpHost) },
  { key: 'emailSmtpPort', value: state => stringifySetting(state.emailSmtpPort) },
  { key: 'emailSmtpSecure', value: state => stringifySetting(state.emailSmtpSecure) },
  { key: 'emailSmtpUser', value: state => stringSetting(state.emailSmtpUser) },
  { key: 'emailSmtpPassword', value: state => stringSetting(state.emailSmtpPassword) },
  { key: 'emailFromAddress', value: state => stringSetting(state.emailFromAddress) },
  { key: 'emailFromName', value: state => stringSetting(state.emailFromName) },
  { key: 'emailTemplateInterviewInvitation', value: state => stringSetting(state.emailTemplateInterviewInvitation) },
  { key: 'emailTemplateInterviewInvitationSubject', value: state => stringSetting(state.emailTemplateInterviewInvitationSubject) },
  { key: 'emailTemplateInterviewInvitationEditorMode', value: state => state.emailTemplateInterviewInvitationEditorMode },
  { key: 'icsDescriptionTemplate', value: state => stringSetting(state.icsDescriptionTemplate) },
  { key: ORGANIZATION_NAME_KEY, value: state => stringSetting(state.organizationName) },
  { key: ORGANIZATION_ADDRESS_KEY, value: state => stringSetting(state.organizationAddress) },
  { key: ORGANIZATION_CONTACT_KEY, value: state => stringSetting(state.organizationContact) },
  { key: ORGANIZATION_LOGO_DATA_URL_KEY, value: state => stringSetting(state.organizationLogoPreviewUrl) },
  { key: 'screenCaptureProtectionEnabled', value: state => stringifySetting(state.screenCaptureProtectionEnabled) },
  { key: 'rightClickProtectionEnabled', value: state => stringifySetting(state.rightClickProtectionEnabled) },
  { key: 'loginPageDevToolsProtectionEnabled', value: state => stringifySetting(state.loginPageDevToolsProtectionEnabled) },
  { key: 'globalTwoFactorEnabled', value: state => stringifySetting(state.globalTwoFactorEnabled) },
  { key: 'azureAdClientId', value: state => stringSetting(state.azureAdClientId) },
  { key: 'azureAdClientSecret', value: state => stringSetting(state.azureAdClientSecret) },
  { key: 'azureAdTenantId', value: state => stringSetting(state.azureAdTenantId) },
  { key: 'lockoutAlertEmails', value: state => JSON.stringify(state.lockoutAlertEmails) },
  { key: 'lockoutWebhookUrl', value: state => stringSetting(state.lockoutWebhookUrl) },
  { key: 'jobDescriptionSystemPrompt', value: state => stringSetting(state.jobDescriptionSystemPrompt) },
  { key: 'applicantEvaluationCriteriaPrompt', value: state => stringSetting(state.applicantEvaluationCriteriaPrompt) },
];

export function buildSystemSettingsSavePayload(state: SystemSettingsSaveState): SystemSettingsSavePayload {
  return SYSTEM_SETTINGS_PAYLOAD_FIELDS.map(({ key, value }) => ({ key, value: value(state) }));
}

function stringSetting(value: string | null | undefined, fallback = '') {
  return value || fallback;
}

function stringifySetting(value: { toString(): string }) {
  return value.toString();
}
