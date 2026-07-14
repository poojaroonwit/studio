"use client";

import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import {
  DEFAULT_PWA_BACKGROUND_COLOR,
  DEFAULT_PWA_DESCRIPTION,
  DEFAULT_PWA_NAME,
  DEFAULT_PWA_SHORT_NAME,
  DEFAULT_PWA_STATUS_BAR_STYLE,
  DEFAULT_PWA_THEME_COLOR,
} from './system-settings-page-constants';
import type { EmailEditorMode, SystemSettingsViewState } from './system-settings-page-model';

type SystemSettingsFormValues = SystemSettingsViewState & {
  emailEditorMode: EmailEditorMode;
  showAzureSecret: boolean;
  showSmtpPassword: boolean;
  showWebhookToken: boolean;
  testingAzureRooms: boolean;
  testingEmail: boolean;
};

type SystemSettingsFieldSetter<Key extends keyof SystemSettingsFormValues> = Dispatch<
  SetStateAction<SystemSettingsFormValues[Key]>
>;

type SystemSettingsFormSetters = {
  [Key in keyof SystemSettingsFormValues as `set${Capitalize<string & Key>}`]: SystemSettingsFieldSetter<Key>;
};

const DEFAULT_SYSTEM_SETTINGS_FORM_VALUES: SystemSettingsFormValues = {
  applicantEvaluationCriteriaPrompt: '',
  azureAdClientId: '',
  azureAdClientSecret: '',
  azureAdTenantId: '',
  azureMeetingRoomsEnabled: false,
  builtInApplicantMappingPrompt: 'Create or update an applicant profile from the extracted resume data. Preserve source evidence and leave unknown fields blank.',
  builtInJobMatchingPrompt: 'Match the applicant against available positions using skills, experience, education, and configured match criteria. Return fit score and concise reasons.',
  builtInProcessorNodeName: 'Default built-in processor',
  builtInResumeExtractionPrompt: 'Extract structured candidate data from the uploaded resume, including contact details, work history, education, skills, languages, and certifications.',
  defaultMatchCriteria: '',
  emailEditorMode: 'wysiwyg',
  emailFromAddress: '',
  emailFromName: '',
  emailServiceEnabled: false,
  emailSmtpHost: '',
  emailSmtpPassword: '',
  emailSmtpPort: 587,
  emailSmtpSecure: false,
  emailSmtpUser: '',
  emailTemplateInterviewInvitation: '',
  emailTemplateInterviewInvitationEditorMode: 'wysiwyg',
  emailTemplateInterviewInvitationSubject: '',
  exportImportFeatureEnabled: true,
  globalTwoFactorEnabled: true,
  hiringManagerRestrictToAssignedPositions: true,
  icsDescriptionTemplate: '',
  interviewInvitationFeatureEnabled: true,
  jobDescriptionSystemPrompt: '',
  jobMatchFeatureEnabled: true,
  lockoutAlertEmails: [],
  lockoutWebhookUrl: '',
  loginPageDevToolsProtectionEnabled: true,
  maxConcurrentProcessors: 5,
  organizationAddress: '',
  organizationContact: '',
  organizationLogoPreviewUrl: null,
  organizationName: '',
  processQueueEnabled: true,
  processorConnectionTimeoutMs: 30000,
  processorIntervalMs: 2000,
  processorQuietMode: false,
  processorRequestTimeoutMs: 1800000,
  pwaAppleMobileWebAppStatusBarStyle: DEFAULT_PWA_STATUS_BAR_STYLE,
  pwaAppleMobileWebAppTitle: DEFAULT_PWA_SHORT_NAME,
  pwaBackgroundColor: DEFAULT_PWA_BACKGROUND_COLOR,
  pwaDescription: DEFAULT_PWA_DESCRIPTION,
  pwaEnabled: false,
  pwaName: DEFAULT_PWA_NAME,
  pwaShortName: DEFAULT_PWA_SHORT_NAME,
  pwaThemeColor: DEFAULT_PWA_THEME_COLOR,
  resumeProcessingMode: 'built-in',
  resumeProcessingWebhookResponseMode: 'blocking',
  resumeProcessingWebhookTimeout: 1800,
  resumeProcessingWebhookToken: '',
  resumeProcessingWebhookUrl: '',
  rightClickProtectionEnabled: false,
  savedOrganizationLogoUrl: null,
  screenCaptureProtectionEnabled: false,
  showAzureSecret: false,
  showLogoOnly: false,
  showSmtpPassword: false,
  showWebhookToken: false,
  testingAzureRooms: false,
  testingEmail: false,
};

const SETTER_KEYS = [
  'applicantEvaluationCriteriaPrompt',
  'azureAdClientId',
  'azureAdClientSecret',
  'azureAdTenantId',
  'azureMeetingRoomsEnabled',
  'builtInApplicantMappingPrompt',
  'builtInJobMatchingPrompt',
  'builtInProcessorNodeName',
  'builtInResumeExtractionPrompt',
  'defaultMatchCriteria',
  'emailEditorMode',
  'emailFromAddress',
  'emailFromName',
  'emailServiceEnabled',
  'emailSmtpHost',
  'emailSmtpPassword',
  'emailSmtpPort',
  'emailSmtpSecure',
  'emailSmtpUser',
  'emailTemplateInterviewInvitation',
  'emailTemplateInterviewInvitationEditorMode',
  'emailTemplateInterviewInvitationSubject',
  'exportImportFeatureEnabled',
  'globalTwoFactorEnabled',
  'hiringManagerRestrictToAssignedPositions',
  'icsDescriptionTemplate',
  'interviewInvitationFeatureEnabled',
  'jobDescriptionSystemPrompt',
  'jobMatchFeatureEnabled',
  'lockoutAlertEmails',
  'lockoutWebhookUrl',
  'loginPageDevToolsProtectionEnabled',
  'maxConcurrentProcessors',
  'organizationAddress',
  'organizationContact',
  'organizationLogoPreviewUrl',
  'organizationName',
  'pwaAppleMobileWebAppStatusBarStyle',
  'pwaAppleMobileWebAppTitle',
  'pwaBackgroundColor',
  'pwaDescription',
  'pwaEnabled',
  'pwaName',
  'pwaShortName',
  'pwaThemeColor',
  'resumeProcessingMode',
  'resumeProcessingWebhookResponseMode',
  'resumeProcessingWebhookTimeout',
  'resumeProcessingWebhookToken',
  'resumeProcessingWebhookUrl',
  'rightClickProtectionEnabled',
  'savedOrganizationLogoUrl',
  'screenCaptureProtectionEnabled',
  'showAzureSecret',
  'showSmtpPassword',
  'showWebhookToken',
  'testingAzureRooms',
  'testingEmail',
] as const;

export function useSystemSettingsFormState() {
  const [state, setState] = useState<SystemSettingsFormValues>(DEFAULT_SYSTEM_SETTINGS_FORM_VALUES);

  const setField = useCallback(<Key extends keyof SystemSettingsFormValues>(
    key: Key,
    value: SetStateAction<SystemSettingsFormValues[Key]>
  ) => {
    setState((currentState) => ({
      ...currentState,
      [key]: typeof value === 'function'
        ? (value as (previousValue: SystemSettingsFormValues[Key]) => SystemSettingsFormValues[Key])(currentState[key])
        : value,
    }));
  }, []);

  const setters = useMemo(() => (
    SETTER_KEYS.reduce((fieldSetters, key) => {
      const setterName = `set${capitalizeFieldName(key)}` as keyof SystemSettingsFormSetters;
      return {
        ...fieldSetters,
        [setterName]: (value: SetStateAction<SystemSettingsFormValues[typeof key]>) => setField(key, value),
      };
    }, {} as SystemSettingsFormSetters)
  ), [setField]);

  const applySystemSettingsViewState = useCallback((viewState: SystemSettingsViewState) => {
    setState((currentState) => ({
      ...currentState,
      ...viewState,
    }));
  }, []);

  return {
    ...state,
    ...setters,
    applySystemSettingsViewState,
  };
}

function capitalizeFieldName<Key extends string>(fieldName: Key): Capitalize<Key> {
  return `${fieldName.charAt(0).toUpperCase()}${fieldName.slice(1)}` as Capitalize<Key>;
}
