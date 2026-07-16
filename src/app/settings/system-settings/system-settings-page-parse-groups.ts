import {
  DEFAULT_ICS_DESCRIPTION,
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
} from "./system-settings-page-constants";
import type { EmailEditorMode, ResumeProcessingMode } from "./system-settings-page-types";
import type { SystemSettingsRecord } from "./system-settings-utils";
import {
  isNotFalseSetting,
  isTrueSetting,
  numberSetting,
  parseLockoutAlertEmails,
  stringSetting,
} from "./system-settings-page-parse-utils";

export function parseProcessingSettings(settings: SystemSettingsRecord) {
  const resumeProcessingMode: ResumeProcessingMode =
    stringSetting(settings, "resumeProcessingMode", "built-in") === "external" ? "external" : "built-in";

  return {
    resumeProcessingMode,
    builtInProcessorNodeName: stringSetting(settings, "builtInProcessorNodeName", "Default built-in processor"),
    builtInResumeExtractionPrompt: stringSetting(
      settings,
      "builtInResumeExtractionPrompt",
      "Extract structured candidate data from the uploaded resume, including contact details, work history, education, skills, languages, and certifications.",
    ),
    builtInApplicantMappingPrompt: stringSetting(
      settings,
      "builtInApplicantMappingPrompt",
      "Create or update an applicant profile from the extracted resume data. Preserve source evidence and leave unknown fields blank.",
    ),
    builtInJobMatchingPrompt: stringSetting(
      settings,
      "builtInJobMatchingPrompt",
      "Match the applicant against available positions using skills, experience, education, and configured match criteria. Return fit score and concise reasons.",
    ),
    maxConcurrentProcessors: numberSetting(settings, "maxConcurrentProcessors", "5"),
    resumeProcessingWebhookUrl: stringSetting(settings, "resumeProcessingWebhookUrl"),
    resumeProcessingWebhookToken: stringSetting(settings, "resumeProcessingWebhookToken"),
    resumeProcessingWebhookResponseMode: stringSetting(settings, "resumeProcessingWebhookResponseMode", "blocking"),
    resumeProcessingWebhookTimeout: numberSetting(settings, "resumeProcessingWebhookTimeout", "1800"),
    processQueueEnabled: isNotFalseSetting(settings, "processQueueEnabled"),
    processorIntervalMs: numberSetting(settings, "processorIntervalMs", "2000"),
    processorQuietMode: isTrueSetting(settings, "processorQuietMode"),
    processorConnectionTimeoutMs: numberSetting(settings, "processorConnectionTimeoutMs", "30000"),
    processorRequestTimeoutMs: numberSetting(settings, "processorRequestTimeoutMs", "1800000"),
  };
}

export function parseEmailSettings(settings: SystemSettingsRecord) {
  return {
    emailServiceEnabled: isTrueSetting(settings, "emailServiceEnabled"),
    emailSmtpHost: stringSetting(settings, "emailSmtpHost"),
    emailSmtpPort: numberSetting(settings, "emailSmtpPort", "587"),
    emailSmtpSecure: isTrueSetting(settings, "emailSmtpSecure"),
    emailSmtpUser: stringSetting(settings, "emailSmtpUser"),
    emailSmtpPassword: stringSetting(settings, "emailSmtpPassword"),
    emailFromAddress: stringSetting(settings, "emailFromAddress"),
    emailFromName: stringSetting(settings, "emailFromName"),
    emailTemplateInterviewInvitation: stringSetting(settings, "emailTemplateInterviewInvitation"),
    emailTemplateInterviewInvitationSubject: stringSetting(settings, "emailTemplateInterviewInvitationSubject"),
    emailTemplateInterviewInvitationEditorMode: stringSetting(
      settings,
      "emailTemplateInterviewInvitationEditorMode",
      "wysiwyg",
    ) as EmailEditorMode,
    icsDescriptionTemplate: stringSetting(settings, "icsDescriptionTemplate", DEFAULT_ICS_DESCRIPTION),
  };
}

export function parseOrganizationSettings(settings: SystemSettingsRecord) {
  const organizationLogoUrl = stringSetting(settings, ORGANIZATION_LOGO_DATA_URL_KEY, null);

  return {
    organizationName: stringSetting(settings, ORGANIZATION_NAME_KEY),
    organizationAddress: stringSetting(settings, ORGANIZATION_ADDRESS_KEY),
    organizationContact: stringSetting(settings, ORGANIZATION_CONTACT_KEY),
    organizationLogoPreviewUrl: organizationLogoUrl,
    savedOrganizationLogoUrl: organizationLogoUrl,
  };
}

export function parseIntegrationSettings(settings: SystemSettingsRecord) {
  return {
    interviewInvitationFeatureEnabled: isNotFalseSetting(settings, "interviewInvitationFeatureEnabled"),
    azureMeetingRoomsEnabled: isTrueSetting(settings, "azureMeetingRoomsEnabled"),
    azureAdClientId: stringSetting(settings, "azureAdClientId"),
    azureAdClientSecret: stringSetting(settings, "azureAdClientSecret"),
    azureAdTenantId: stringSetting(settings, "azureAdTenantId"),
    jobDescriptionSystemPrompt: stringSetting(settings, "jobDescriptionSystemPrompt"),
    applicantEvaluationCriteriaPrompt: stringSetting(settings, "applicantEvaluationCriteriaPrompt"),
    defaultMatchCriteria: stringSetting(settings, "defaultMatchCriteria"),
    showLogoOnly: settings.showLogoOnly === "true" || settings.showLogoOnly === true,
    jobMatchFeatureEnabled: isNotFalseSetting(settings, "jobMatchFeatureEnabled"),
    publicApplicationsEnabled: isNotFalseSetting(settings, "publicApplicationsEnabled"),
    publicApplicationsRequireCaptcha: isTrueSetting(settings, "publicApplicationsRequireCaptcha"),
    publicApplicationsSendApplicantConfirmation: isNotFalseSetting(settings, "publicApplicationsSendApplicantConfirmation"),
    publicApplicationsNotifyRecruiter: isNotFalseSetting(settings, "publicApplicationsNotifyRecruiter"),
  };
}

export function parsePwaSettings(settings: SystemSettingsRecord) {
  return {
    pwaEnabled: isTrueSetting(settings, "pwaEnabled"),
    pwaName: stringSetting(settings, "pwaName", DEFAULT_PWA_NAME),
    pwaShortName: stringSetting(settings, "pwaShortName", DEFAULT_PWA_SHORT_NAME),
    pwaDescription: stringSetting(settings, "pwaDescription", DEFAULT_PWA_DESCRIPTION),
    pwaThemeColor: stringSetting(settings, "pwaThemeColor", DEFAULT_PWA_THEME_COLOR),
    pwaBackgroundColor: stringSetting(settings, "pwaBackgroundColor", DEFAULT_PWA_BACKGROUND_COLOR),
    pwaAppleMobileWebAppTitle: stringSetting(settings, "pwaAppleMobileWebAppTitle", DEFAULT_PWA_SHORT_NAME),
    pwaAppleMobileWebAppStatusBarStyle: stringSetting(
      settings,
      "pwaAppleMobileWebAppStatusBarStyle",
      DEFAULT_PWA_STATUS_BAR_STYLE,
    ),
  };
}

export function parseFeatureSettings(settings: SystemSettingsRecord) {
  return {
    exportImportFeatureEnabled: isNotFalseSetting(settings, "exportImportFeatureEnabled"),
    hiringManagerRestrictToAssignedPositions: isNotFalseSetting(settings, "hiringManagerRestrictToAssignedPositions"),
    screenCaptureProtectionEnabled: isTrueSetting(settings, "screenCaptureProtectionEnabled"),
    rightClickProtectionEnabled: isTrueSetting(settings, "rightClickProtectionEnabled"),
    loginPageDevToolsProtectionEnabled: isNotFalseSetting(settings, "loginPageDevToolsProtectionEnabled"),
    globalTwoFactorEnabled: isTrueSetting(settings, "globalTwoFactorEnabled"),
    lockoutAlertEmails: parseLockoutAlertEmails(settings.lockoutAlertEmails),
    lockoutWebhookUrl: stringSetting(settings, "lockoutWebhookUrl"),
  };
}
