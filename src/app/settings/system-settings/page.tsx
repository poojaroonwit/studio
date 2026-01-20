"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { Save, Zap, BrainCircuit, Loader2, ServerCrash, Settings, RefreshCw, Database, Webhook, CheckCircle, Bug, Search, Mail, Palette, Building, ImageUp, X, UploadCloud, Smartphone, HardDrive, ShieldAlert, FileText, Key, Activity } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'react-hot-toast';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TiptapEditor } from '@/components/ui/wysiwyg-editors';
import { ColorPicker } from '@/components/ui/color-picker';
import { cn } from '@/lib/utils';
import AutoCloseTab from '@/components/settings/AutoCloseTab';
import AIPowerSearchTab from '@/components/settings/AIPowerSearchTab';
import AiApiKeysTab from '@/components/settings/AiApiKeysTab';
import { EmailChipInput } from '@/components/ui/email-chip-input';
import { MailWarning, BellRing, Link } from 'lucide-react';

const menuItems = [
  {
    group: 'General',
    items: [
      { id: 'organize', label: 'Organization', icon: Building },
      { id: 'features', label: 'Feature Flags', icon: Settings },
    ]
  },
  {
    group: 'Communication',
    items: [
      { id: 'email-server', label: 'Email Server', icon: Mail },
      { id: 'email-templates', label: 'Email Templates', icon: FileText },
    ]
  },
  {
    group: 'Security & Protection',
    items: [
      { id: 'security', label: 'Security Controls', icon: ShieldAlert },
    ]
  },
  {
    group: 'App Config',
    items: [
      { id: 'processing', label: 'Processing', icon: Database },
      { id: 'match-criteria', label: 'Match Criteria', icon: BrainCircuit },
      { id: 'pwa', label: 'PWA Settings', icon: Smartphone },
      { id: 'auto-close', label: 'Auto-Close', icon: CheckCircle },
    ]
  },

  {
    group: 'AI & Intelligence',
    items: [
      { id: 'ai-search', label: 'AI Search', icon: Search },
      { id: 'ai-api-keys', label: 'AI API Keys', icon: Key },
    ]
  },
  {
    group: 'Monitoring',
    items: [
      { id: 'monitoring', label: 'Monitoring', icon: Activity },
    ]
  },
  {
    group: 'System',
    items: [
      { id: 'azure', label: 'Azure Integration', icon: UploadCloud },

    ]
  }
];

export default function SystemSettingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [showLogoOnly, setShowLogoOnly] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('organize');

  // System/Integration settings state
  const [maxConcurrentProcessors, setMaxConcurrentProcessors] = useState(5);
  const [resumeProcessingWebhookUrl, setResumeProcessingWebhookUrl] = useState('');
  const [resumeProcessingWebhookToken, setResumeProcessingWebhookToken] = useState('');
  const [resumeProcessingWebhookResponseMode, setResumeProcessingWebhookResponseMode] = useState('blocking');
  const [resumeProcessingWebhookTimeout, setResumeProcessingWebhookTimeout] = useState(1800);

  // Upload Queue Processor settings
  const [processQueueEnabled, setProcessQueueEnabled] = useState(true);
  const [processorIntervalMs, setProcessorIntervalMs] = useState(2000);
  const [processorQuietMode, setProcessorQuietMode] = useState(false);
  const [processorConnectionTimeoutMs, setProcessorConnectionTimeoutMs] = useState(30000);
  const [processorRequestTimeoutMs, setProcessorRequestTimeoutMs] = useState(1800000);





  // Add state for default match criteria
  const [defaultMatchCriteria, setDefaultMatchCriteria] = useState('');
  const [isEditorReady, setIsEditorReady] = useState(false);
  // Add state for job match feature toggle
  const [jobMatchFeatureEnabled, setJobMatchFeatureEnabled] = useState(true);
  // Add state for warning criteria toggle
  const [warningCriteriaEnabled, setWarningCriteriaEnabled] = useState(true);
  // Add state for process queue toggle (already declared above in Upload Queue Processor settings)
  // Add state for PWA toggle
  const [pwaEnabled, setPwaEnabled] = useState(false);
  // PWA Metadata state
  const [pwaName, setPwaName] = useState('FitScan - AI-Powered Recruitment Platform');
  const [pwaShortName, setPwaShortName] = useState('FitScan');
  const [pwaDescription, setPwaDescription] = useState('Advanced AI-powered recruitment and candidate management platform');
  const [pwaThemeColor, setPwaThemeColor] = useState('#000000');
  const [pwaBackgroundColor, setPwaBackgroundColor] = useState('#171a26');
  const [pwaAppleMobileWebAppTitle, setPwaAppleMobileWebAppTitle] = useState('FitScan');
  const [pwaAppleMobileWebAppStatusBarStyle, setPwaAppleMobileWebAppStatusBarStyle] = useState('default');
  // Add state for export/import feature toggle
  const [exportImportFeatureEnabled, setExportImportFeatureEnabled] = useState(true);
  // Add state for hiring manager access control
  const [hiringManagerRestrictToAssignedPositions, setHiringManagerRestrictToAssignedPositions] = useState(true);

  // Sentry Configuration State
  const [sentryClientDsn, setSentryClientDsn] = useState('');
  const [sentryServerDsn, setSentryServerDsn] = useState('');
  const [sentryEnabled, setSentryEnabled] = useState(false);

  // Elasticsearch Configuration State
  const [elasticsearchUrl, setElasticsearchUrl] = useState('');
  const [elasticsearchIndex, setElasticsearchIndex] = useState('logs');
  const [elasticsearchAuth, setElasticsearchAuth] = useState(false);
  const [elasticsearchUsername, setElasticsearchUsername] = useState('');
  const [elasticsearchPassword, setElasticsearchPassword] = useState('');
  const [elasticsearchSslVerify, setElasticsearchSslVerify] = useState(true);
  const [elasticsearchTimeout, setElasticsearchTimeout] = useState(30000);
  const [elasticsearchEnabled, setElasticsearchEnabled] = useState(false);

  // Security & Protection
  const [screenCaptureProtectionEnabled, setScreenCaptureProtectionEnabled] = useState(false);
  const [rightClickProtectionEnabled, setRightClickProtectionEnabled] = useState(false);
  const [lockoutAlertEmails, setLockoutAlertEmails] = useState<string[]>([]);
  const [lockoutWebhookUrl, setLockoutWebhookUrl] = useState('');

  // SigNoz Configuration State
  const [signozEnabled, setSignozEnabled] = useState(false);
  const [signozOtlpEndpoint, setSignozOtlpEndpoint] = useState('');
  const [signozServiceName, setSignozServiceName] = useState('fitscan');
  const [signozOtlpHeaders, setSignozOtlpHeaders] = useState('');
  const [signozStatus, setSignozStatus] = useState<{
    enabled: boolean;
    configured: boolean;
    loggerProviderReady: boolean;
    loggerReady: boolean;
    endpoint: string;
    serviceName: string;
    errors: string[];
  } | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Email Service Configuration State
  const [emailServiceEnabled, setEmailServiceEnabled] = useState(false);
  const [emailSmtpHost, setEmailSmtpHost] = useState('');
  const [emailSmtpPort, setEmailSmtpPort] = useState(587);
  const [emailSmtpSecure, setEmailSmtpSecure] = useState(false);
  const [emailSmtpUser, setEmailSmtpUser] = useState('');
  const [emailSmtpPassword, setEmailSmtpPassword] = useState('');
  const [emailFromAddress, setEmailFromAddress] = useState('');
  const [emailFromName, setEmailFromName] = useState('');

  useEffect(() => {
    setIsEditorReady(true);
  }, []);
  const [testingEmail, setTestingEmail] = useState(false);

  // Email Template State
  const [emailTemplateInterviewInvitation, setEmailTemplateInterviewInvitation] = useState('');
  const [emailTemplateInterviewInvitationSubject, setEmailTemplateInterviewInvitationSubject] = useState('');
  const [icsDescriptionTemplate, setIcsDescriptionTemplate] = useState('');
  const [emailEditorMode, setEmailEditorMode] = useState<'wysiwyg' | 'html'>('wysiwyg');
  const [emailTemplateInterviewInvitationEditorMode, setEmailTemplateInterviewInvitationEditorMode] = useState<'wysiwyg' | 'html'>('wysiwyg');
  const [interviewInvitationFeatureEnabled, setInterviewInvitationFeatureEnabled] = useState(true);

  // Azure Meeting Rooms Integration State
  const [azureMeetingRoomsEnabled, setAzureMeetingRoomsEnabled] = useState(false);
  const [testingAzureRooms, setTestingAzureRooms] = useState(false);

  // Organization Information State (Moved from system-preferences)
  const [organizationName, setOrganizationName] = useState('');
  const [organizationAddress, setOrganizationAddress] = useState('');
  const [organizationContact, setOrganizationContact] = useState('');
  const [organizationLogoPreviewUrl, setOrganizationLogoPreviewUrl] = useState<string | null>(null);
  const [savedOrganizationLogoUrl, setSavedOrganizationLogoUrl] = useState<string | null>(null);

  const ORGANIZATION_LOGO_DATA_URL_KEY = 'organizationLogoDataUrl';
  const ORGANIZATION_NAME_KEY = 'organizationName';
  const ORGANIZATION_ADDRESS_KEY = 'organizationAddress';
  const ORGANIZATION_CONTACT_KEY = 'organizationContact';

  const handleOrganizationLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) {
        toast.error('Logo file size exceeds 500KB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setOrganizationLogoPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchSystemSettings = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await fetch('/api/settings/system-settings');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to load system settings' }));
        throw new Error(errorData.message);
      }
      const responseData = await response.json();

      // Handle both response formats (GET returns {settings: [...], isAzureAdConfigured: boolean})
      let settings: any = {};
      if (responseData.settings && Array.isArray(responseData.settings)) {
        // Convert array format to object format
        settings = Object.fromEntries(responseData.settings.map((setting: any) => [setting.key, setting.value]));
      } else {
        // Already in object format
        settings = responseData;
      }

      setMaxConcurrentProcessors(parseInt(settings.maxConcurrentProcessors || '5', 10));
      setResumeProcessingWebhookUrl(settings.resumeProcessingWebhookUrl || '');
      setResumeProcessingWebhookToken(settings.resumeProcessingWebhookToken || '');
      setResumeProcessingWebhookResponseMode(settings.resumeProcessingWebhookResponseMode || 'blocking');
      setResumeProcessingWebhookTimeout(parseInt(settings.resumeProcessingWebhookTimeout || '1800', 10));

      // Load upload queue processor settings
      setProcessQueueEnabled(settings.processQueueEnabled !== 'false'); // Default to true if not set
      setProcessorIntervalMs(parseInt(settings.processorIntervalMs || '2000', 10));
      setProcessorQuietMode(settings.processorQuietMode === 'true');
      setProcessorConnectionTimeoutMs(parseInt(settings.processorConnectionTimeoutMs || '30000', 10));
      setProcessorRequestTimeoutMs(parseInt(settings.processorRequestTimeoutMs || '1800000', 10));

      // Load Sentry settings (from database only - env vars are server-side only)
      setSentryClientDsn(settings.sentryClientDsn || '');
      setSentryServerDsn(settings.sentryServerDsn || '');
      setSentryEnabled(settings.sentryEnabled === 'true');

      // Load Elasticsearch settings (from database only - env vars are server-side only)
      setElasticsearchUrl(settings.elasticsearchUrl || '');
      setElasticsearchIndex(settings.elasticsearchIndex || 'logs');
      setElasticsearchAuth(settings.elasticsearchAuth === 'true');
      setElasticsearchUsername(settings.elasticsearchUsername || '');
      setElasticsearchPassword(settings.elasticsearchPassword || '');
      setElasticsearchSslVerify(settings.elasticsearchSslVerify !== 'false');
      setElasticsearchTimeout(parseInt(settings.elasticsearchTimeout || '30000', 10));
      setElasticsearchEnabled(settings.elasticsearchEnabled === 'true');

      // Load SigNoz settings
      setSignozEnabled(settings.signozEnabled === 'true');
      setSignozOtlpEndpoint(settings.signozOtlpEndpoint || '');
      setSignozServiceName(settings.signozServiceName || 'fitscan');
      // Extract API key from JSON format or use as-is if plain text
      const headersValue = settings.signozOtlpHeaders || '';
      let apiKey = '';
      if (headersValue) {
        try {
          const parsed = JSON.parse(headersValue);
          apiKey = parsed['x-api-key'] || headersValue;
        } catch {
          // If not JSON, use as-is (might be plain API key)
          apiKey = headersValue;
        }
      }
      setSignozOtlpHeaders(apiKey);

      // Load email service settings
      setEmailServiceEnabled(settings.emailServiceEnabled === 'true');
      setEmailSmtpHost(settings.emailSmtpHost || '');
      setEmailSmtpPort(parseInt(settings.emailSmtpPort || '587', 10));
      setEmailSmtpSecure(settings.emailSmtpSecure === 'true');
      setEmailSmtpUser(settings.emailSmtpUser || '');
      setEmailSmtpPassword(settings.emailSmtpPassword || '');
      setEmailFromAddress(settings.emailFromAddress || '');
      setEmailFromName(settings.emailFromName || '');

      // Load email templates
      setEmailTemplateInterviewInvitation(settings.emailTemplateInterviewInvitation || '');
      setEmailTemplateInterviewInvitationSubject(settings.emailTemplateInterviewInvitationSubject || '');
      setIcsDescriptionTemplate(settings.icsDescriptionTemplate || 'Interview with {{candidateName}} for position {{positionTitle}}.\n\nLocation: {{interviewLocation}}\nInterviewer: {{interviewerName}}');
      setEmailTemplateInterviewInvitationEditorMode(settings.emailTemplateInterviewInvitationEditorMode || 'wysiwyg');

      // Load organization information (Moved from system-preferences)
      setOrganizationName(settings[ORGANIZATION_NAME_KEY] || '');
      setOrganizationAddress(settings[ORGANIZATION_ADDRESS_KEY] || '');
      setOrganizationContact(settings[ORGANIZATION_CONTACT_KEY] || '');
      setOrganizationLogoPreviewUrl(settings[ORGANIZATION_LOGO_DATA_URL_KEY] || null);
      setSavedOrganizationLogoUrl(settings[ORGANIZATION_LOGO_DATA_URL_KEY] || null);

      // Load feature toggles
      setInterviewInvitationFeatureEnabled(settings.interviewInvitationFeatureEnabled !== 'false');
      setAzureMeetingRoomsEnabled(settings.azureMeetingRoomsEnabled === 'true');

      // Load default match criteria
      setDefaultMatchCriteria(settings.defaultMatchCriteria || '');

      // Load showLogoOnly setting
      setShowLogoOnly(settings.showLogoOnly === 'true' || settings.showLogoOnly === true);

      // Load job match feature setting
      setJobMatchFeatureEnabled(settings.jobMatchFeatureEnabled !== 'false');

      // Load warning criteria enabled setting
      setWarningCriteriaEnabled(settings.warningCriteriaEnabled !== 'false');

      // Load process queue enabled setting
      setProcessQueueEnabled(settings.processQueueEnabled !== 'false');

      // Load PWA enabled setting
      setPwaEnabled(settings.pwaEnabled === 'true');

      // Load PWA metadata settings
      setPwaName(settings.pwaName || 'FitScan - AI-Powered Recruitment Platform');
      setPwaShortName(settings.pwaShortName || 'FitScan');
      setPwaDescription(settings.pwaDescription || 'Advanced AI-powered recruitment and candidate management platform');
      setPwaThemeColor(settings.pwaThemeColor || '#000000');
      setPwaBackgroundColor(settings.pwaBackgroundColor || '#171a26');
      setPwaAppleMobileWebAppTitle(settings.pwaAppleMobileWebAppTitle || 'FitScan');
      setPwaAppleMobileWebAppTitle(settings.pwaAppleMobileWebAppTitle || 'FitScan');
      setPwaAppleMobileWebAppStatusBarStyle(settings.pwaAppleMobileWebAppStatusBarStyle || 'default');


      // Load export/import feature setting

      // Load export/import feature setting
      setExportImportFeatureEnabled(settings.exportImportFeatureEnabled !== 'false');

      // Load hiring manager access control setting (default to true - restrict to assigned positions)
      setHiringManagerRestrictToAssignedPositions(settings.hiringManagerRestrictToAssignedPositions !== 'false');

      // Load Security & Protection settings
      setScreenCaptureProtectionEnabled(settings.screenCaptureProtectionEnabled === 'true');
      setRightClickProtectionEnabled(settings.rightClickProtectionEnabled === 'true');

      // Load Account Lockout settings
      try {
        const emailList = settings.lockoutAlertEmails ? JSON.parse(settings.lockoutAlertEmails) : [];
        setLockoutAlertEmails(Array.isArray(emailList) ? emailList : []);
      } catch (e) {
        setLockoutAlertEmails(settings.lockoutAlertEmails ? settings.lockoutAlertEmails.split(',') : []);
      }
      setLockoutWebhookUrl(settings.lockoutWebhookUrl || '');
    } catch (error) {
      setFetchError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      signIn(undefined, { callbackUrl: pathname });
    } else if (sessionStatus === 'authenticated') {
      fetchSystemSettings();
    }
  }, [sessionStatus, pathname, fetchSystemSettings]);

  // Set editor as ready after component mounts and data is loaded
  useEffect(() => {
    if (!isLoading && !fetchError) {
      // Small delay to ensure proper initialization
      const timer = setTimeout(() => {
        setIsEditorReady(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading, fetchError]);

  const handleSave = async () => {
    setIsSaving(true);
    const settingsToSave = [
      { key: 'maxConcurrentProcessors', value: maxConcurrentProcessors.toString() },
      { key: 'resumeProcessingWebhookUrl', value: resumeProcessingWebhookUrl || '' },
      { key: 'resumeProcessingWebhookToken', value: resumeProcessingWebhookToken || '' },
      { key: 'resumeProcessingWebhookResponseMode', value: resumeProcessingWebhookResponseMode || 'blocking' },
      { key: 'resumeProcessingWebhookTimeout', value: resumeProcessingWebhookTimeout.toString() },
      { key: 'defaultMatchCriteria', value: defaultMatchCriteria || '' },
      { key: 'jobMatchFeatureEnabled', value: jobMatchFeatureEnabled.toString() },
      { key: 'warningCriteriaEnabled', value: warningCriteriaEnabled.toString() },
      { key: 'processQueueEnabled', value: processQueueEnabled.toString() },
      { key: 'pwaEnabled', value: pwaEnabled.toString() },
      { key: 'pwaName', value: pwaName || 'FitScan - AI-Powered Recruitment Platform' },
      { key: 'pwaShortName', value: pwaShortName || 'FitScan' },
      { key: 'pwaDescription', value: pwaDescription || 'Advanced AI-powered recruitment and candidate management platform' },
      { key: 'pwaThemeColor', value: pwaThemeColor || '#000000' },
      { key: 'pwaBackgroundColor', value: pwaBackgroundColor || '#171a26' },
      { key: 'pwaAppleMobileWebAppTitle', value: pwaAppleMobileWebAppTitle || 'FitScan' },
      { key: 'pwaAppleMobileWebAppStatusBarStyle', value: pwaAppleMobileWebAppStatusBarStyle || 'default' },
      { key: 'exportImportFeatureEnabled', value: exportImportFeatureEnabled.toString() },
      // Hiring Manager Access Control
      { key: 'hiringManagerRestrictToAssignedPositions', value: hiringManagerRestrictToAssignedPositions.toString() },
      // Upload Queue Processor settings
      { key: 'processorIntervalMs', value: processorIntervalMs.toString() },
      { key: 'processorQuietMode', value: processorQuietMode.toString() },
      { key: 'processorConnectionTimeoutMs', value: processorConnectionTimeoutMs.toString() },
      { key: 'processorRequestTimeoutMs', value: processorRequestTimeoutMs.toString() },
      // Sentry settings
      { key: 'sentryClientDsn', value: sentryClientDsn || '' },
      { key: 'sentryServerDsn', value: sentryServerDsn || '' },
      { key: 'sentryEnabled', value: sentryEnabled.toString() },
      // Elasticsearch settings
      { key: 'elasticsearchUrl', value: elasticsearchUrl || '' },
      { key: 'elasticsearchIndex', value: elasticsearchIndex || 'logs' },
      { key: 'elasticsearchAuth', value: elasticsearchAuth.toString() },
      { key: 'elasticsearchUsername', value: elasticsearchUsername || '' },
      { key: 'elasticsearchPassword', value: elasticsearchPassword || '' },
      { key: 'elasticsearchSslVerify', value: elasticsearchSslVerify.toString() },
      { key: 'elasticsearchTimeout', value: elasticsearchTimeout.toString() },
      { key: 'elasticsearchEnabled', value: elasticsearchEnabled.toString() },
      // SigNoz settings
      { key: 'signozEnabled', value: signozEnabled.toString() },
      { key: 'signozOtlpEndpoint', value: signozOtlpEndpoint || '' },
      { key: 'signozServiceName', value: signozServiceName || 'fitscan' },
      // Format API key as JSON if provided
      { key: 'signozOtlpHeaders', value: signozOtlpHeaders ? JSON.stringify({ 'x-api-key': signozOtlpHeaders }) : '' },
      // Email service settings
      { key: 'emailServiceEnabled', value: emailServiceEnabled.toString() },
      { key: 'emailSmtpHost', value: emailSmtpHost || '' },
      { key: 'emailSmtpPort', value: emailSmtpPort.toString() },
      { key: 'emailSmtpSecure', value: emailSmtpSecure.toString() },
      { key: 'emailSmtpUser', value: emailSmtpUser || '' },
      { key: 'emailSmtpPassword', value: emailSmtpPassword || '' },
      { key: 'emailFromAddress', value: emailFromAddress || '' },
      { key: 'emailFromName', value: emailFromName || '' },
      // Email templates
      { key: 'emailTemplateInterviewInvitation', value: emailTemplateInterviewInvitation || '' },
      { key: 'emailTemplateInterviewInvitationSubject', value: emailTemplateInterviewInvitationSubject || '' },
      { key: 'emailTemplateInterviewInvitationEditorMode', value: emailTemplateInterviewInvitationEditorMode },
      { key: 'icsDescriptionTemplate', value: icsDescriptionTemplate || '' },
      // Organization Information
      { key: ORGANIZATION_NAME_KEY, value: organizationName || '' },
      { key: ORGANIZATION_ADDRESS_KEY, value: organizationAddress || '' },
      { key: ORGANIZATION_CONTACT_KEY, value: organizationContact || '' },
      { key: ORGANIZATION_LOGO_DATA_URL_KEY, value: organizationLogoPreviewUrl || '' },
      // Security & Protection
      { key: 'screenCaptureProtectionEnabled', value: screenCaptureProtectionEnabled.toString() },
      { key: 'rightClickProtectionEnabled', value: rightClickProtectionEnabled.toString() },
      { key: 'lockoutAlertEmails', value: JSON.stringify(lockoutAlertEmails) },
      { key: 'lockoutWebhookUrl', value: lockoutWebhookUrl || '' },
    ];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('/api/settings/system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToSave),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to save settings' }));
        console.error('Save settings error:', errorData);
        // Log detailed validation errors for debugging
        if (errorData.errors) {
          console.error('Validation errors:', errorData.errors);
        }
        if (errorData.data) {
          console.error('Data that failed validation:', errorData.data);
        }
        throw new Error(errorData.message || 'Failed to save settings');
      }
      toast.success('Settings Saved');
      // Find appName and appLogoDataUrl in settingsToSave
      const appNameSetting = settingsToSave.find(s => s.key === 'appName');
      const appLogoSetting = settingsToSave.find(s => s.key === 'appLogoDataUrl');
      let changed = false;
      let appName = null;
      let appLogoUrl = null;
      if (appNameSetting && appNameSetting.value) {
        localStorage.setItem('appConfigAppName', appNameSetting.value);
        appName = appNameSetting.value;
        changed = true;
      }
      if (appLogoSetting && appLogoSetting.value) {
        localStorage.setItem('appLogoDataUrl', appLogoSetting.value);
        appLogoUrl = appLogoSetting.value;
        changed = true;
      }
      if (changed) {
        window.dispatchEvent(new CustomEvent('appConfigChanged', { detail: { appName, logoUrl: appLogoUrl } }));
      }
      fetchSystemSettings();
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          toast.error('Request timed out. Please try again.');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error('An unexpected error occurred');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (sessionStatus === 'loading' || (isLoading && !fetchError)) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }
  if (fetchError && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <ServerCrash className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Access Denied or Error</h2>
        <p className="text-muted-foreground mb-4 max-w-md">{fetchError}</p>
        <Button onClick={() => router.push('/')} className="btn-hover-primary-gradient">Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          {!showLogoOnly && (
            <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
          )}
          <p className="text-muted-foreground">Configure system integrations, AI services, and automation workflows</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchSystemSettings}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            variant="default"
            className="flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="flex h-full border rounded-lg overflow-hidden bg-background">
            {/* Sidebar Menu */}
            <div className="w-64 border-r bg-muted/10 flex-col hidden md:flex">
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                  {menuItems.map((group) => (
                    <div key={group.group}>
                      <h4 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {group.group}
                      </h4>
                      <div className="space-y-1">
                        {group.items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                              activeTab === item.id
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="flex-1 overflow-hidden">
              {/* Processing Configuration */}
              {activeTab === 'processing' && (
                <ScrollArea className="h-full">
                  <Accordion type="multiple" defaultValue={['processing-config', 'webhook']} className="w-full">
                    {/* System Configuration */}
                    <AccordionItem value="processing-config" className="border-b">
                      <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Database className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <div className="font-semibold">Processing Configuration</div>
                            <div className="text-xs text-muted-foreground font-normal">Configure system performance and processing settings</div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4 pt-2">
                        <div className="space-y-2">
                          <Label htmlFor="max-concurrent-processors">Max Concurrent Processors</Label>
                          <Input
                            id="max-concurrent-processors"
                            type="number"
                            min={1}
                            max={100}
                            value={maxConcurrentProcessors}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxConcurrentProcessors(Number(e.target.value))}
                            className="w-32"
                            disabled={isSaving}
                          />
                          <p className="text-xs text-muted-foreground">
                            Maximum number of concurrent resume processing jobs
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Resume Processing Webhook */}
                    <AccordionItem value="webhook" className="border-b">
                      <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Zap className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <div className="font-semibold">PDF Processing Webhook</div>
                            <div className="text-xs text-muted-foreground font-normal">Configure webhook for all PDF processing including resume uploads and automated candidate creation</div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4 pt-2">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="resume-processing-webhook">Webhook URL</Label>
                            <div className="flex gap-2">
                              <Input
                                id="resume-processing-webhook"
                                type="url"
                                placeholder="https://your-webhook-endpoint/receive-resume"
                                value={resumeProcessingWebhookUrl}
                                onChange={(e) => setResumeProcessingWebhookUrl(e.target.value)}
                                className="flex-1"
                                disabled={isSaving}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  if (!resumeProcessingWebhookUrl) {
                                    toast.error('Please enter a webhook URL first');
                                    return;
                                  }
                                  try {
                                    const response = await fetch('/api/settings/webhook-test', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        webhookUrl: resumeProcessingWebhookUrl,
                                        webhookToken: resumeProcessingWebhookToken
                                      })
                                    });
                                    const result = await response.json();
                                    if (result.success) {
                                      toast.success(`Webhook test successful! Response time: ${result.responseTime}`);
                                    } else {
                                      toast.error(`Webhook test failed: ${result.error}`);
                                    }
                                  } catch (error) {
                                    toast.error('Failed to test webhook');
                                    console.error('Webhook test error:', error);
                                  }
                                }}
                                disabled={isSaving || !resumeProcessingWebhookUrl}
                              >
                                Test
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              This URL will receive a POST request with the uploaded resume file (as FormData). You can use any compatible webhook service (Zapier, Make, custom API, etc.). This webhook is used for all PDF processing including resume uploads and the "Create via Resume (Automated)" feature.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="resume-processing-webhook-token">Authentication Token (Optional)</Label>
                            <Input
                              id="resume-processing-webhook-token"
                              type="password"
                              placeholder="Bearer token for webhook authentication"
                              value={resumeProcessingWebhookToken}
                              onChange={(e) => setResumeProcessingWebhookToken(e.target.value)}
                              disabled={isSaving}
                            />
                            <p className="text-xs text-muted-foreground">
                              Optional Bearer token for webhook authentication. Leave empty if no authentication is required.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="resume-processing-webhook-response-mode">Response Mode</Label>
                            <Select value={resumeProcessingWebhookResponseMode} onValueChange={(value) => setResumeProcessingWebhookResponseMode(value)} disabled={isSaving}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select response mode" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="blocking">Blocking (waits for completion, max 100s)</SelectItem>
                                <SelectItem value="streaming">Streaming (real-time updates)</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Blocking mode waits for the workflow to complete before returning. Streaming mode provides real-time updates. Note: Cloudflare has a 100-second timeout limit for blocking requests.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="resume-processing-webhook-timeout">Webhook Timeout (seconds)</Label>
                            <Input
                              id="resume-processing-webhook-timeout"
                              type="number"
                              placeholder="1800"
                              value={resumeProcessingWebhookTimeout}
                              onChange={(e) => setResumeProcessingWebhookTimeout(parseInt(e.target.value) || 1800)}
                              disabled={isSaving}
                              min="30"
                              max="36000"
                            />
                            <p className="text-xs text-muted-foreground">
                              Timeout for webhook requests in seconds. Default is 1800 seconds (30 minutes). Minimum 30 seconds, maximum 36000 seconds (10 hours).
                            </p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </ScrollArea>
              )}

              {/* Security & Protection */}
              {activeTab === 'security' && (
                <ScrollArea className="h-full">
                  <Accordion type="multiple" defaultValue={['security-controls']} className="w-full">
                    <AccordionItem value="security-controls" className="border-b">
                      <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <div className="font-semibold">Security Controls</div>
                            <div className="text-xs text-muted-foreground font-normal">Configure application security and content protection settings</div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4 pt-2">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                            <div className="space-y-1">
                              <Label htmlFor="screen-capture-protection" className="text-base font-medium">
                                Screen Capture Protection
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Enable watermark overlay and screenshot attempt logging. <br />
                                <span className="text-xs italic">Note: Browser-based protection is limited. This adds a visual watermark and logs "PrintScreen" key events.</span>
                              </p>
                            </div>
                            <Switch
                              id="screen-capture-protection"
                              checked={screenCaptureProtectionEnabled}
                              onCheckedChange={setScreenCaptureProtectionEnabled}
                              disabled={isSaving}
                            />
                          </div>

                          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                            <div className="space-y-1">
                              <Label htmlFor="right-click-protection" className="text-base font-medium">
                                Right Click Protection
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Disable right-click context menu to prevent content copying.
                              </p>
                            </div>
                            <Switch
                              id="right-click-protection"
                              checked={rightClickProtectionEnabled}
                              onCheckedChange={setRightClickProtectionEnabled}
                              disabled={isSaving}
                            />
                          </div>

                          <div className="pt-4 border-t">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                              <BellRing className="h-5 w-5 text-primary" />
                              Account Lockout Alerts
                            </h3>
                            <div className="space-y-6">
                              <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                  <MailWarning className="h-4 w-4 text-muted-foreground" />
                                  Alert Emails
                                </Label>
                                <p className="text-sm text-muted-foreground mb-2">
                                  Administrators will be notified at these addresses when a user account is locked.
                                </p>
                                <EmailChipInput
                                  value={lockoutAlertEmails}
                                  onChange={setLockoutAlertEmails}
                                  placeholder="Add administrator email..."
                                />
                                <p className="text-xs text-muted-foreground italic">
                                  Type an email and press Enter, comma, or space to add.
                                </p>
                              </div>

                              <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                  <Link className="h-4 w-4 text-muted-foreground" />
                                  Alert Webhook URL (Optional)
                                </Label>
                                <p className="text-sm text-muted-foreground mb-2">
                                  Send a POST request to this URL when a lockout occurs.
                                </p>
                                <Input
                                  value={lockoutWebhookUrl}
                                  onChange={(e) => setLockoutWebhookUrl(e.target.value)}
                                  placeholder="https://your-server.com/api/webhooks/lockout"
                                  className="font-mono text-sm"
                                  disabled={isSaving}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </ScrollArea>
              )}

              {/* Email Server Configuration */}
              {activeTab === 'email-server' && (
                <ScrollArea className="h-full">
                  <Accordion type="multiple" defaultValue={['email-service']} className="w-full">
                    <AccordionItem value="email-service" className="border-b">
                      <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Mail className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <div className="font-semibold">Email Service</div>
                            <div className="text-xs text-muted-foreground font-normal">Configure SMTP settings for sending email notifications and calendar invitations.</div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4 pt-2">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                            <div className="space-y-1">
                              <Label htmlFor="email-service-enabled" className="text-base font-medium">
                                Enable Email Service
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Enable or disable email sending functionality. When enabled, the system can send interview invitations and notifications.
                              </p>
                            </div>
                            <Switch
                              id="email-service-enabled"
                              checked={emailServiceEnabled}
                              onCheckedChange={setEmailServiceEnabled}
                              disabled={isSaving}
                            />
                          </div>

                          {emailServiceEnabled && (
                            <>
                              <div className="space-y-2">
                                <Label htmlFor="email-smtp-host">SMTP Host</Label>
                                <Input
                                  id="email-smtp-host"
                                  type="text"
                                  placeholder="smtp.gmail.com"
                                  value={emailSmtpHost}
                                  onChange={(e) => setEmailSmtpHost(e.target.value)}
                                  disabled={isSaving}
                                />
                                <p className="text-xs text-muted-foreground">
                                  SMTP server hostname (e.g., smtp.gmail.com, smtp.office365.com)
                                </p>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="email-smtp-port">SMTP Port</Label>
                                <Input
                                  id="email-smtp-port"
                                  type="number"
                                  min="1"
                                  max="65535"
                                  placeholder="587"
                                  value={emailSmtpPort}
                                  onChange={(e) => setEmailSmtpPort(parseInt(e.target.value) || 587)}
                                  disabled={isSaving}
                                />
                                <p className="text-xs text-muted-foreground">
                                  SMTP server port (587 for TLS, 465 for SSL, 25 for unencrypted)
                                </p>
                              </div>

                              <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-1">
                                  <Label htmlFor="email-smtp-secure" className="text-base font-medium">
                                    Use Secure Connection (TLS/SSL)
                                  </Label>
                                  <p className="text-sm text-muted-foreground">
                                    Enable for TLS/SSL encrypted connections (recommended)
                                  </p>
                                </div>
                                <Switch
                                  id="email-smtp-secure"
                                  checked={emailSmtpSecure}
                                  onCheckedChange={setEmailSmtpSecure}
                                  disabled={isSaving}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="email-smtp-user">SMTP Username</Label>
                                <Input
                                  id="email-smtp-user"
                                  type="text"
                                  placeholder="your-email@example.com"
                                  value={emailSmtpUser}
                                  onChange={(e) => setEmailSmtpUser(e.target.value)}
                                  disabled={isSaving}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Username for SMTP authentication (usually your email address)
                                </p>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="email-smtp-password">SMTP Password</Label>
                                <Input
                                  id="email-smtp-password"
                                  type="password"
                                  placeholder="your-password"
                                  value={emailSmtpPassword}
                                  onChange={(e) => setEmailSmtpPassword(e.target.value)}
                                  disabled={isSaving}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Password or app-specific password for SMTP authentication
                                </p>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="email-from-address">From Email Address</Label>
                                <Input
                                  id="email-from-address"
                                  type="email"
                                  placeholder="noreply@example.com"
                                  value={emailFromAddress}
                                  onChange={(e) => setEmailFromAddress(e.target.value)}
                                  disabled={isSaving}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Email address that will appear as the sender
                                </p>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="email-from-name">From Name</Label>
                                <Input
                                  id="email-from-name"
                                  type="text"
                                  placeholder="Recruitment System"
                                  value={emailFromName}
                                  onChange={(e) => setEmailFromName(e.target.value)}
                                  disabled={isSaving}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Display name for the sender (optional)
                                </p>
                              </div>

                              <div className="flex items-center gap-2 pt-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={async () => {
                                    setTestingEmail(true);
                                    try {
                                      const response = await fetch('/api/settings/test-email', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          host: emailSmtpHost,
                                          port: emailSmtpPort,
                                          secure: emailSmtpSecure,
                                          user: emailSmtpUser,
                                          password: emailSmtpPassword,
                                        }),
                                      });
                                      const data = await response.json();
                                      if (data.success) {
                                        toast.success('Email connection test successful!');
                                      } else {
                                        toast.error(data.error || 'Connection test failed');
                                      }
                                    } catch (error: any) {
                                      toast.error(error.message || 'Connection test failed');
                                    } finally {
                                      setTestingEmail(false);
                                    }
                                  }}
                                  disabled={isSaving || testingEmail || !emailSmtpHost || !emailSmtpUser}
                                >
                                  {testingEmail ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Testing...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Test Connection
                                    </>
                                  )}
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </ScrollArea>
              )}

              {/* Email Templates */}
              {activeTab === 'email-templates' && (
                <ScrollArea className="h-full">
                  <Accordion type="multiple" defaultValue={['email-templates']} className="w-full">
                    <AccordionItem value="email-templates" className="border-b">
                      <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Mail className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <div className="font-semibold">Email Templates</div>
                            <div className="text-xs text-muted-foreground font-normal">Configure email templates for interview invitations. Use template variables: {'{'}candidateName{'}'}, {'{'}positionTitle{'}'}, {'{'}interviewDate{'}'}, {'{'}interviewTime{'}'}, {'{'}interviewLocation{'}'}, {'{'}evaluationLink{'}'}, {'{'}interviewerName{'}'}</div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4 pt-2">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="email-template-subject">Email Subject</Label>
                            <Input
                              id="email-template-subject"
                              type="text"
                              placeholder="Interview Invitation: {{candidateName}} - {{positionTitle}}"
                              value={emailTemplateInterviewInvitationSubject}
                              onChange={(e) => setEmailTemplateInterviewInvitationSubject(e.target.value)}
                              disabled={isSaving}
                            />
                            <p className="text-xs text-muted-foreground">
                              Subject line for interview invitation emails. Use template variables as needed.
                            </p>
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="email-template-body">Email Body</Label>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant={emailEditorMode === 'wysiwyg' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setEmailEditorMode('wysiwyg')}
                                disabled={isSaving}
                              >
                                WYSIWYG
                              </Button>
                              <Button
                                type="button"
                                variant={emailEditorMode === 'html' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setEmailEditorMode('html')}
                                disabled={isSaving}
                              >
                                HTML
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const defaultTemplate = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #333; margin-bottom: 20px;">Interview Invitation</h2>
  
  <p>Dear {{interviewerName}},</p>
  
  <p>You have been assigned to conduct an interview with <strong>{{candidateName}}</strong> for the <strong>{{positionTitle}}</strong> position.</p>
  
  <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 5px 0;"><strong>Date:</strong> {{interviewDate}}</p>
    <p style="margin: 5px 0;"><strong>Time:</strong> {{interviewTime}}</p>
    <p style="margin: 5px 0;"><strong>Location:</strong> {{interviewLocation}}</p>
  </div>
  
  <p>Please review the candidate's profile and prepare your evaluation questions accordingly.</p>
  
  <!-- Evaluation Access Section -->
  <div style="margin: 30px 0; padding: 20px; background: #f5f5f5; border-radius: 8px; text-align: center;">
    <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">Evaluation Access</h3>
    
    <!-- Button -->
    <a href="{{evaluationLink}}" style="display: inline-block; padding: 14px 32px; background: #0066cc; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin-bottom: 20px;">
      Open Evaluation Form
    </a>
    
    <p style="margin: 15px 0 10px 0; color: #666; font-size: 14px;">Or scan this QR code with your mobile device:</p>
    
    <!-- QR Code -->
    {{evaluationQrcodeImage}}
  </div>
  
  <p style="margin-top: 30px;">Best regards,<br/>Recruitment Team</p>
</div>`;
                                  setEmailTemplateInterviewInvitation(defaultTemplate);
                                  setEmailTemplateInterviewInvitationSubject('Interview Invitation: {{candidateName}} - {{positionTitle}}');
                                }}
                                disabled={isSaving}
                              >
                                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                                Reset to Default
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2 mb-4">
                            <Label htmlFor="default-editor-mode">Default Editor Mode for Interview Session</Label>
                            <Select
                              value={emailTemplateInterviewInvitationEditorMode}
                              onValueChange={(value: 'wysiwyg' | 'html') => setEmailTemplateInterviewInvitationEditorMode(value)}
                              disabled={isSaving}
                            >
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select mode" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="wysiwyg">WYSIWYG (Visual)</SelectItem>
                                <SelectItem value="html">HTML (Read-Only Preview)</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Select the default editor mode when creating a new interview session. "HTML" mode shows a read-only preview of the template.
                            </p>
                          </div>

                          {emailEditorMode === 'wysiwyg' ? (
                            isEditorReady ? (
                              <TiptapEditor
                                value={emailTemplateInterviewInvitation}
                                onChange={setEmailTemplateInterviewInvitation}
                                placeholder="Enter email template HTML here..."
                                className="min-h-[300px]"
                              />
                            ) : (
                              <div className="min-h-[300px] border rounded-md p-4 flex items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                              </div>
                            )
                          ) : (
                            <textarea
                              className="w-full min-h-[400px] p-3 border rounded-md font-mono text-sm bg-background"
                              value={emailTemplateInterviewInvitation}
                              onChange={(e) => setEmailTemplateInterviewInvitation(e.target.value)}
                              placeholder="Enter full HTML email template here..."
                              disabled={isSaving}
                            />
                          )}
                          <p className="text-xs text-muted-foreground">
                            {emailEditorMode === 'html' ? 'Full HTML email template. ' : 'HTML email template. '}Available variables: {'{'}candidateName{'}'}, {'{'}positionTitle{'}'}, {'{'}interviewDate{'}'}, {'{'}interviewTime{'}'}, {'{'}interviewLocation{'}'}, {'{'}evaluationLink{'}'}, {'{'}interviewerName{'}'}
                          </p>

                          <div className="space-y-2">
                            <Label htmlFor="ics-description-template">ICS Calendar Description Template</Label>
                            <textarea
                              id="ics-description-template"
                              className="w-full min-h-[120px] p-3 border rounded-md font-mono text-sm bg-background"
                              value={icsDescriptionTemplate}
                              onChange={(e) => setIcsDescriptionTemplate(e.target.value)}
                              placeholder="Interview with {{candidateName}} for position {{positionTitle}}.&#10;&#10;Location: {{interviewLocation}}&#10;Interviewer: {{interviewerName}}"
                              disabled={isSaving}
                            />
                            <p className="text-xs text-muted-foreground">
                              Template for the ICS calendar file description. Available variables: {'{'}candidateName{'}'}, {'{'}positionTitle{'}'}, {'{'}interviewDate{'}'}, {'{'}interviewTime{'}'}, {'{'}interviewLocation{'}'}, {'{'}evaluationLink{'}'}, {'{'}interviewerName{'}'}. Use \n for line breaks.
                            </p>
                          </div>

                          <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                            <p className="text-xs text-blue-900 dark:text-blue-100">
                              <strong>Template Variables:</strong>
                              <br />
                              • {'{'}candidateName{'}'} - Candidate's full name
                              <br />
                              • {'{'}positionTitle{'}'} - Job position title
                              <br />
                              • {'{'}interviewDate{'}'} - Formatted interview date
                              <br />
                              • {'{'}interviewTime{'}'} - Formatted interview time
                              <br />
                              • {'{'}interviewLocation{'}'} - Interview location
                              <br />
                              • {'{'}evaluationLink{'}'} - Link to candidate evaluation
                              <br />
                              • {'{'}interviewerName{'}'} - Interviewer's name
                            </p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </ScrollArea>
              )}

              {/* PWA Settings */}
              {activeTab === 'pwa' && (
                <ScrollArea className="h-full">
                  <Accordion type="multiple" defaultValue={['pwa']} className="w-full">
                    <AccordionItem value="pwa" className="border-b">
                      <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <div className="font-semibold">Progressive Web App (PWA)</div>
                            <div className="text-xs text-muted-foreground font-normal">Enable or disable Progressive Web App functionality. When enabled, users can install the app on mobile devices and tablets.</div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4 pt-2">
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="pwa-enabled">Enable PWA</Label>
                              <p className="text-sm text-muted-foreground">
                                When enabled, the app will show install prompts on mobile devices and tablets, allowing users to add it to their home screen.
                              </p>
                            </div>
                            <Switch
                              id="pwa-enabled"
                              checked={pwaEnabled}
                              onCheckedChange={setPwaEnabled}
                              disabled={isSaving}
                            />
                          </div>

                          {pwaEnabled && (
                            <>
                              <Separator />
                              <div className="space-y-4">
                                <h4 className="text-sm font-semibold">PWA Metadata</h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="pwa-name">PWA Name</Label>
                                    <Input
                                      id="pwa-name"
                                      value={pwaName}
                                      onChange={(e) => setPwaName(e.target.value)}
                                      placeholder="FitScan - AI-Powered Recruitment Platform"
                                      disabled={isSaving}
                                    />
                                    <p className="text-xs text-muted-foreground">Full name displayed when installing the app</p>
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="pwa-short-name">PWA Short Name</Label>
                                    <Input
                                      id="pwa-short-name"
                                      value={pwaShortName}
                                      onChange={(e) => setPwaShortName(e.target.value)}
                                      placeholder="FitScan"
                                      disabled={isSaving}
                                      maxLength={12}
                                    />
                                    <p className="text-xs text-muted-foreground">Short name for home screen (max 12 characters)</p>
                                  </div>

                                  <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="pwa-description">PWA Description</Label>
                                    <Input
                                      id="pwa-description"
                                      value={pwaDescription}
                                      onChange={(e) => setPwaDescription(e.target.value)}
                                      placeholder="Advanced AI-powered recruitment and candidate management platform"
                                      disabled={isSaving}
                                    />
                                    <p className="text-xs text-muted-foreground">Description of your PWA</p>
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="pwa-theme-color">Theme Color</Label>
                                    <div className="flex gap-2">
                                      <ColorPicker
                                        value={pwaThemeColor}
                                        onChange={setPwaThemeColor}
                                        disabled={isSaving}
                                      />
                                      <Input
                                        id="pwa-theme-color"
                                        value={pwaThemeColor}
                                        onChange={(e) => setPwaThemeColor(e.target.value)}
                                        placeholder="#000000"
                                        disabled={isSaving}
                                        className="flex-1"
                                      />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Color for browser UI elements</p>
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="pwa-background-color">Background Color</Label>
                                    <div className="flex gap-2">
                                      <ColorPicker
                                        value={pwaBackgroundColor}
                                        onChange={setPwaBackgroundColor}
                                        disabled={isSaving}
                                      />
                                      <Input
                                        id="pwa-background-color"
                                        value={pwaBackgroundColor}
                                        onChange={(e) => setPwaBackgroundColor(e.target.value)}
                                        placeholder="#171a26"
                                        disabled={isSaving}
                                        className="flex-1"
                                      />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Splash screen background color</p>
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="pwa-apple-title">Apple Mobile Web App Title</Label>
                                    <Input
                                      id="pwa-apple-title"
                                      value={pwaAppleMobileWebAppTitle}
                                      onChange={(e) => setPwaAppleMobileWebAppTitle(e.target.value)}
                                      placeholder="FitScan"
                                      disabled={isSaving}
                                    />
                                    <p className="text-xs text-muted-foreground">Title for iOS home screen</p>
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="pwa-apple-status-bar">Apple Status Bar Style</Label>
                                    <Select
                                      value={pwaAppleMobileWebAppStatusBarStyle}
                                      onValueChange={setPwaAppleMobileWebAppStatusBarStyle}
                                      disabled={isSaving}
                                    >
                                      <SelectTrigger id="pwa-apple-status-bar">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="default">Default</SelectItem>
                                        <SelectItem value="black">Black</SelectItem>
                                        <SelectItem value="black-translucent">Black Translucent</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">iOS status bar appearance</p>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </ScrollArea>
              )}

              {/* Match Criteria */}
              {activeTab === 'match-criteria' && (
                <ScrollArea className="h-full">
                  <Accordion type="multiple" defaultValue={['match-criteria']} className="w-full">
                    <AccordionItem value="match-criteria" className="border-b">
                      <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <BrainCircuit className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <div className="font-semibold">Match Criteria</div>
                            <div className="text-xs text-muted-foreground font-normal">Configure the default match criteria template for new positions. This will be used when creating new positions if no specific criteria are provided.</div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4 pt-2">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="default-match-criteria">Default Match Criteria Template</Label>
                            <div className="min-h-[200px] border rounded-md">
                              {!isEditorReady ? (
                                <div className="min-h-[200px] flex items-center justify-center text-muted-foreground">
                                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                  Loading editor...
                                </div>
                              ) : (
                                <div className={`relative ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}>
                                  <TiptapEditor
                                    key={`default-match-criteria-editor-${isEditorReady}`}
                                    value={defaultMatchCriteria}
                                    onChange={setDefaultMatchCriteria}
                                    placeholder="Enter default match criteria template for new positions..."
                                    className="min-h-[200px]"
                                    isOpen={isEditorReady}
                                  />
                                  {isSaving && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md">
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Saving...
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              This template will be used as the default match criteria when creating new positions. You can include requirements, skills, experience levels, and other criteria.
                            </p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </ScrollArea>
              )}



              {/* Feature Flags */}
              {activeTab === 'features' && (
                <ScrollArea className="h-full">
                  <Accordion type="multiple" defaultValue={['features']} className="w-full">
                    <AccordionItem value="features" className="border-b">
                      <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Settings className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <div className="font-semibold">Feature Configuration</div>
                            <div className="text-xs text-muted-foreground font-normal">Enable or disable system features</div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4 pt-2">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="job-match-feature">Job Match Feature</Label>
                              <p className="text-sm text-muted-foreground">
                                Enable or disable the job match functionality. When disabled, all job match related UI components will be hidden.
                              </p>
                            </div>
                            <Switch
                              id="job-match-feature"
                              checked={jobMatchFeatureEnabled}
                              onCheckedChange={setJobMatchFeatureEnabled}
                              disabled={isSaving}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="warning-criteria-enabled">Warning Criteria Checks</Label>
                              <p className="text-sm text-muted-foreground">
                                Enable or disable background warning criteria checks.
                              </p>
                            </div>
                            <Switch
                              id="warning-criteria-enabled"
                              checked={warningCriteriaEnabled}
                              onCheckedChange={setWarningCriteriaEnabled}
                              disabled={isSaving}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="export-import-feature">Export/Import Feature</Label>
                              <p className="text-sm text-muted-foreground">
                                Enable or disable the export and import functionality. When disabled, all export and import buttons will be hidden.
                              </p>
                            </div>
                            <Switch
                              id="export-import-feature"
                              checked={exportImportFeatureEnabled}
                              onCheckedChange={setExportImportFeatureEnabled}
                              disabled={isSaving}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="hiring-manager-restrict">Hiring Manager Access Control</Label>
                              <p className="text-sm text-muted-foreground">
                                When enabled, hiring managers can only see positions and candidates for positions where they are assigned as interviewers. When disabled, hiring managers can see all positions and candidates.
                              </p>
                            </div>
                            <Switch
                              id="hiring-manager-restrict"
                              checked={hiringManagerRestrictToAssignedPositions}
                              onCheckedChange={setHiringManagerRestrictToAssignedPositions}
                              disabled={isSaving}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="interview-invitation-feature">Interview Invitation Feature</Label>
                              <p className="text-sm text-muted-foreground">
                                Enable or disable the interview invitation feature. When disabled, the "Send Interviewer Invitation" button will be hidden.
                              </p>
                            </div>
                            <Switch
                              id="interview-invitation-feature"
                              checked={interviewInvitationFeatureEnabled}
                              onCheckedChange={setInterviewInvitationFeatureEnabled}
                              disabled={isSaving}
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </ScrollArea>
              )}

              {/* Azure Configuration */}
              {/* Azure Configuration */}
              {activeTab === 'azure' && (
                <ScrollArea className="h-full">
                  <Accordion type="multiple" defaultValue={['azure']} className="w-full">
                    <AccordionItem value="azure" className="border-b">
                      <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <UploadCloud className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <div className="font-semibold">Azure Integration</div>
                            <div className="text-xs text-muted-foreground font-normal">Configure Azure AD integration settings</div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4 pt-2">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="azure-meeting-rooms">Azure AD Meeting Rooms</Label>
                              <p className="text-sm text-muted-foreground">
                                Fetch interview locations from Microsoft 365 meeting rooms. Requires Places.Read.All permission in Azure AD.
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!azureMeetingRoomsEnabled || testingAzureRooms || isSaving}
                                onClick={async () => {
                                  setTestingAzureRooms(true);
                                  try {
                                    const response = await fetch('/api/azure/meeting-rooms?test=true');
                                    const result = await response.json();
                                    if (result.success) {
                                      toast.success(`Connection successful! Found ${result.roomCount} meeting rooms.`);
                                    } else {
                                      toast.error(result.error || 'Connection test failed');
                                    }
                                  } catch (error) {
                                    toast.error('Failed to test Azure connection');
                                  } finally {
                                    setTestingAzureRooms(false);
                                  }
                                }}
                              >
                                {testingAzureRooms ? (
                                  <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Testing...</>
                                ) : 'Test'}
                              </Button>
                              <Switch
                                id="azure-meeting-rooms"
                                checked={azureMeetingRoomsEnabled}
                                onCheckedChange={setAzureMeetingRoomsEnabled}
                                disabled={isSaving}
                              />
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </ScrollArea>
              )}







              {activeTab === 'auto-close' && (
                <ScrollArea className="h-full">
                  <AutoCloseTab />
                </ScrollArea>
              )}

              {activeTab === 'ai-search' && (
                <ScrollArea className="h-full">
                  <AIPowerSearchTab />
                </ScrollArea>
              )}

              {activeTab === 'ai-api-keys' && (
                <ScrollArea className="h-full">
                  <AiApiKeysTab />
                </ScrollArea>
              )}

              {activeTab === 'monitoring' && (
                <ScrollArea className="h-full">
                  <Accordion type="multiple" defaultValue={['sentry', 'elasticsearch', 'signoz']} className="w-full">
                    {/* Sentry Configuration */}
                    <AccordionItem value="sentry" className="border-b">
                      <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Bug className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <div className="font-semibold">Sentry Error Tracking</div>
                            <div className="text-xs text-muted-foreground font-normal">Configure Sentry for error tracking and monitoring. Settings are stored in the database and should also be set in environment variables for the application to use them.</div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4 pt-2">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                            <div className="space-y-1">
                              <Label htmlFor="sentry-enabled" className="text-base font-medium">
                                Enable Sentry
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Enable or disable Sentry error tracking. When enabled, errors will be sent to your Sentry project.
                              </p>
                            </div>
                            <Switch
                              id="sentry-enabled"
                              checked={sentryEnabled}
                              onCheckedChange={setSentryEnabled}
                              disabled={isSaving}
                            />
                          </div>

                          {sentryEnabled && (
                            <>
                              <div className="space-y-2">
                                <Label htmlFor="sentry-client-dsn">Client DSN (NEXT_PUBLIC_SENTRY_DSN)</Label>
                                <Input
                                  id="sentry-client-dsn"
                                  type="text"
                                  placeholder="https://your-key@o0.ingest.sentry.io/your-project-id"
                                  value={sentryClientDsn}
                                  onChange={(e) => setSentryClientDsn(e.target.value)}
                                  disabled={isSaving}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Client-side DSN for browser error tracking. Get this from your Sentry project settings.
                                </p>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="sentry-server-dsn">Server DSN (SENTRY_DSN)</Label>
                                <Input
                                  id="sentry-server-dsn"
                                  type="text"
                                  placeholder="https://your-key@o0.ingest.sentry.io/your-project-id"
                                  value={sentryServerDsn}
                                  onChange={(e) => setSentryServerDsn(e.target.value)}
                                  disabled={isSaving}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Server-side DSN for server error tracking. Can be the same as client DSN.
                                </p>
                              </div>

                              <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                                <p className="text-xs text-blue-900 dark:text-blue-100">
                                  <strong>Note:</strong> These settings are stored in the database. For the application to use Sentry, you also need to set the environment variables <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">NEXT_PUBLIC_SENTRY_DSN</code> and <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">SENTRY_DSN</code> in your <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">.env</code> file or deployment configuration.
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Elasticsearch Configuration */}
                    <AccordionItem value="elasticsearch" className="border-b">
                      <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Search className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <div className="font-semibold">Elasticsearch Log Search</div>
                            <div className="text-xs text-muted-foreground font-normal">Configure Elasticsearch for advanced log search and indexing. Settings are stored in the database and should also be set in environment variables for the application to use them.</div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4 pt-2">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                            <div className="space-y-1">
                              <Label htmlFor="elasticsearch-enabled" className="text-base font-medium">
                                Enable Elasticsearch
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                Enable or disable Elasticsearch log indexing. When enabled, logs will be indexed to Elasticsearch for advanced search.
                              </p>
                            </div>
                            <Switch
                              id="elasticsearch-enabled"
                              checked={elasticsearchEnabled}
                              onCheckedChange={setElasticsearchEnabled}
                              disabled={isSaving}
                            />
                          </div>

                          {elasticsearchEnabled && (
                            <>
                              <div className="space-y-2">
                                <Label htmlFor="elasticsearch-url">Elasticsearch URL (ELASTICSEARCH_URL)</Label>
                                <Input
                                  id="elasticsearch-url"
                                  type="url"
                                  placeholder="http://localhost:9200"
                                  value={elasticsearchUrl}
                                  onChange={(e) => setElasticsearchUrl(e.target.value)}
                                  disabled={isSaving}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Full URL to your Elasticsearch server (e.g., http://localhost:9200 or https://elasticsearch.example.com:9200)
                                </p>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="elasticsearch-index">Index Name (ELASTICSEARCH_INDEX)</Label>
                                <Input
                                  id="elasticsearch-index"
                                  type="text"
                                  placeholder="logs"
                                  value={elasticsearchIndex}
                                  onChange={(e) => setElasticsearchIndex(e.target.value)}
                                  disabled={isSaving}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Name of the Elasticsearch index where logs will be stored. Default is "logs".
                                </p>
                              </div>

                              <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-1">
                                  <Label htmlFor="elasticsearch-auth" className="text-base font-medium">
                                    Enable Authentication
                                  </Label>
                                  <p className="text-sm text-muted-foreground">
                                    Enable if your Elasticsearch cluster requires authentication
                                  </p>
                                </div>
                                <Switch
                                  id="elasticsearch-auth"
                                  checked={elasticsearchAuth}
                                  onCheckedChange={setElasticsearchAuth}
                                  disabled={isSaving}
                                />
                              </div>

                              {elasticsearchAuth && (
                                <>
                                  <div className="space-y-2">
                                    <Label htmlFor="elasticsearch-username">Username (ELASTICSEARCH_USERNAME)</Label>
                                    <Input
                                      id="elasticsearch-username"
                                      type="text"
                                      placeholder="elastic"
                                      value={elasticsearchUsername}
                                      onChange={(e) => setElasticsearchUsername(e.target.value)}
                                      disabled={isSaving}
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="elasticsearch-password">Password (ELASTICSEARCH_PASSWORD)</Label>
                                    <Input
                                      id="elasticsearch-password"
                                      type="password"
                                      placeholder="your-password"
                                      value={elasticsearchPassword}
                                      onChange={(e) => setElasticsearchPassword(e.target.value)}
                                      disabled={isSaving}
                                    />
                                  </div>
                                </>
                              )}

                              <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-1">
                                  <Label htmlFor="elasticsearch-ssl-verify" className="text-base font-medium">
                                    Verify SSL Certificates
                                  </Label>
                                  <p className="text-sm text-muted-foreground">
                                    Enable SSL certificate verification. Disable for self-signed certificates.
                                  </p>
                                </div>
                                <Switch
                                  id="elasticsearch-ssl-verify"
                                  checked={elasticsearchSslVerify}
                                  onCheckedChange={setElasticsearchSslVerify}
                                  disabled={isSaving}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="elasticsearch-timeout">Request Timeout (ms) (ELASTICSEARCH_TIMEOUT)</Label>
                                <Input
                                  id="elasticsearch-timeout"
                                  type="number"
                                  min={5000}
                                  max={300000}
                                  value={elasticsearchTimeout}
                                  onChange={(e) => setElasticsearchTimeout(Number(e.target.value))}
                                  disabled={isSaving}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Request timeout in milliseconds. Default is 30000ms (30 seconds).
                                </p>
                              </div>

                              <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                                <p className="text-xs text-blue-900 dark:text-blue-100">
                                  <strong>Note:</strong> These settings are stored in the database. For the application to use Elasticsearch, you also need to set the environment variable <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">ELASTICSEARCH_URL</code> and related variables in your <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">.env</code> file or deployment configuration.
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* SigNoz Configuration */}
                    <AccordionItem value="signoz" className="border-b">
                      <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Search className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <div className="font-semibold">SigNoz Observability</div>
                            <div className="text-xs text-muted-foreground font-normal">Configure SigNoz for unified observability (logs, metrics, and traces). Settings are stored in the database and take effect immediately.</div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4 pt-2">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="signoz-enabled">Enable SigNoz</Label>
                              <p className="text-xs text-muted-foreground">
                                Enable or disable SigNoz observability. When enabled, logs, metrics, and traces will be sent to SigNoz.
                              </p>
                            </div>
                            <Switch
                              id="signoz-enabled"
                              checked={signozEnabled}
                              onCheckedChange={setSignozEnabled}
                              disabled={isSaving}
                            />
                          </div>

                          {signozEnabled && (
                            <>
                              <div className="space-y-2">
                                <Label htmlFor="signoz-endpoint">OTLP Endpoint (OTEL_EXPORTER_OTLP_ENDPOINT)</Label>
                                <Input
                                  id="signoz-endpoint"
                                  type="url"
                                  placeholder="http://your-signoz-server:4318"
                                  value={signozOtlpEndpoint}
                                  onChange={(e) => setSignozOtlpEndpoint(e.target.value)}
                                  disabled={isSaving}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Full URL to your SigNoz OTLP collector endpoint. Examples:
                                  <br />• Remote server: <code className="text-xs">http://signoz.example.com:4318</code> or <code className="text-xs">http://192.168.1.100:4318</code>
                                  <br />• Docker network: <code className="text-xs">http://signoz:4318</code>
                                  <br />• Localhost: <code className="text-xs">http://localhost:4318</code>
                                  <br />• Use port 4318 for HTTP or 4317 for gRPC
                                </p>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="signoz-service-name">Service Name (OTEL_SERVICE_NAME)</Label>
                                <Input
                                  id="signoz-service-name"
                                  type="text"
                                  placeholder="fitscan"
                                  value={signozServiceName}
                                  onChange={(e) => setSignozServiceName(e.target.value)}
                                  disabled={isSaving}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Service name that will appear in SigNoz UI. Default is "fitscan".
                                </p>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="signoz-otlp-headers">OTLP Headers (OTEL_EXPORTER_OTLP_HEADERS)</Label>
                                <Input
                                  id="signoz-otlp-headers"
                                  type="text"
                                  placeholder="your-signoz-api-key"
                                  value={signozOtlpHeaders}
                                  onChange={(e) => setSignozOtlpHeaders(e.target.value)}
                                  disabled={isSaving}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Enter only your SigNoz API key. It will be automatically formatted as JSON.
                                </p>
                              </div>

                              <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                                <p className="text-xs text-blue-800 dark:text-blue-200 font-medium mb-1">Remote Server Configuration:</p>
                                <ul className="text-xs text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1">
                                  <li>Ensure your application server can reach the SigNoz server (check firewall rules)</li>
                                  <li>Verify network connectivity: <code className="text-xs bg-blue-100 dark:bg-blue-900 px-1 rounded">telnet your-signoz-server 4318</code></li>
                                  <li>For HTTPS endpoints, ensure SSL certificates are valid</li>
                                  <li>Logs are batched and sent every 5 seconds for better performance</li>
                                </ul>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      setIsCheckingStatus(true);
                                      try {
                                        const response = await fetch('/api/settings/signoz-status');
                                        if (response.ok) {
                                          const status = await response.json();
                                          setSignozStatus(status);
                                          if (status.loggerReady && status.configured) {
                                            toast.success('SigNoz is configured and ready! Logs will appear automatically.');
                                          } else if (status.errors.length > 0) {
                                            toast.error(`SigNoz configuration issues: ${status.errors.join(', ')}`);
                                          } else {
                                            toast('SigNoz is enabled but not fully initialized yet. Check application logs.');
                                          }
                                        } else {
                                          toast.error('Failed to check SigNoz status');
                                        }
                                      } catch (error) {
                                        toast.error('Error checking SigNoz status');
                                        console.error('Status check error:', error);
                                      } finally {
                                        setIsCheckingStatus(false);
                                      }
                                    }}
                                    disabled={isCheckingStatus || isSaving}
                                    className="h-8"
                                  >
                                    <RefreshCw className={`h-4 w-4 mr-2 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                                    {isCheckingStatus ? 'Checking...' : 'Check Status'}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      setIsCheckingStatus(true);
                                      try {
                                        const response = await fetch('/api/settings/signoz-test', {
                                          method: 'POST',
                                        });
                                        const result = await response.json();
                                        if (response.ok && result.success) {
                                          toast.success('Test log sent! Check SigNoz UI in 5-10 seconds.');
                                        } else {
                                          toast.error(result.message || 'Failed to send test log');
                                          console.error('Test log error:', result);
                                        }
                                      } catch (error) {
                                        toast.error('Error sending test log');
                                        console.error('Test log error:', error);
                                      } finally {
                                        setIsCheckingStatus(false);
                                      }
                                    }}
                                    disabled={isCheckingStatus || isSaving}
                                    className="h-8"
                                  >
                                    <Zap className="h-4 w-4 mr-2" />
                                    Send Test Log
                                  </Button>
                                  <p className="text-xs text-yellow-900 dark:text-yellow-100 flex-1">
                                    <strong>After enabling:</strong> Click "Check Status" to verify configuration, then "Send Test Log" to test. Logs will appear automatically in SigNoz when you perform actions.
                                  </p>
                                </div>
                              </div>

                              {signozStatus && (
                                <div className={`p-3 border rounded-md ${signozStatus.loggerReady && signozStatus.configured
                                  ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                                  : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                                  }`}>
                                  <p className={`text-xs font-medium mb-2 ${signozStatus.loggerReady && signozStatus.configured
                                    ? 'text-green-900 dark:text-green-100'
                                    : 'text-red-900 dark:text-red-100'
                                    }`}>
                                    Status: {signozStatus.loggerReady && signozStatus.configured ? '✓ Ready' : '✗ Not Ready'}
                                  </p>
                                  <div className="text-xs space-y-1">
                                    <p className={signozStatus.enabled ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                                      • Enabled: {signozStatus.enabled ? 'Yes' : 'No'}
                                    </p>
                                    <p className={signozStatus.configured ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                                      • Configured: {signozStatus.configured ? 'Yes' : 'No'}
                                    </p>
                                    <p className={signozStatus.loggerProviderReady ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                                      • Logger Provider: {signozStatus.loggerProviderReady ? 'Ready' : 'Not Ready'}
                                    </p>
                                    <p className={signozStatus.loggerReady ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                                      • Logger: {signozStatus.loggerReady ? 'Ready' : 'Not Ready'}
                                    </p>
                                    {signozStatus.endpoint && (
                                      <p className="text-gray-700 dark:text-gray-300">
                                        • Endpoint: {signozStatus.endpoint}
                                      </p>
                                    )}
                                    {signozStatus.serviceName && (
                                      <p className="text-gray-700 dark:text-gray-300">
                                        • Service: {signozStatus.serviceName}
                                      </p>
                                    )}
                                    {signozStatus.errors.length > 0 && (
                                      <div className="mt-2">
                                        <p className="font-medium text-red-700 dark:text-red-300">Errors:</p>
                                        <ul className="list-disc list-inside space-y-1">
                                          {signozStatus.errors.map((error, idx) => (
                                            <li key={idx} className="text-red-600 dark:text-red-400">{error}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                                <p className="text-xs text-green-900 dark:text-green-100">
                                  <strong>Note:</strong> These settings are stored in the database and take effect immediately. No environment variables or application restart required. Both SigNoz and Elasticsearch can be enabled simultaneously.
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </ScrollArea>
              )}

              {activeTab === 'organize' && (
                <ScrollArea className="h-full">
                  <Accordion type="multiple" defaultValue={['organization']} className="w-full">
                    {/* Organization Information (Moved from system-preferences) */}
                    <AccordionItem value="organization" className="border-b">
                      <AccordionTrigger className="px-6 py-4 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Building className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <div className="font-semibold">Organization Information</div>
                            <div className="text-xs text-muted-foreground font-normal">Configure organization details that appear on evaluation reports and documents</div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4 pt-2">
                        <div className="space-y-6">
                          {/* Organization Logo */}
                          <div className="space-y-4">
                            <Label>Organization Logo</Label>
                            <div className="flex items-center gap-4">
                              {organizationLogoPreviewUrl && (
                                <div className="relative">
                                  <img
                                    src={organizationLogoPreviewUrl}
                                    alt="Organization logo preview"
                                    className="h-20 w-auto object-contain rounded-md border p-2"
                                  />
                                  <Button
                                    size="icon"
                                    variant="destructive"
                                    className="absolute -top-2 -right-2 h-6 w-6"
                                    onClick={() => {
                                      setOrganizationLogoPreviewUrl(null);
                                      setSavedOrganizationLogoUrl(null);
                                    }}
                                    disabled={isSaving}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                              <div className="flex-1">
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleOrganizationLogoChange}
                                  disabled={isSaving}
                                  className="hidden"
                                  id="organization-logo-upload"
                                />
                                <Label
                                  htmlFor="organization-logo-upload"
                                  className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                                >
                                  <ImageUp className="mr-2 h-4 w-4" />
                                  {organizationLogoPreviewUrl ? 'Replace Logo' : 'Upload Logo'}
                                </Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Recommended: PNG or SVG, max 500KB.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="organization-name">Organization Name</Label>
                            <Input
                              id="organization-name"
                              value={organizationName}
                              onChange={(e) => setOrganizationName(e.target.value)}
                              placeholder="Enter organization name"
                              disabled={isSaving}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="organization-address">Organization Address</Label>
                            <Input
                              id="organization-address"
                              value={organizationAddress}
                              onChange={(e) => setOrganizationAddress(e.target.value)}
                              placeholder="Enter organization address"
                              disabled={isSaving}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="organization-contact">Contact Information</Label>
                            <Input
                              id="organization-contact"
                              value={organizationContact}
                              onChange={(e) => setOrganizationContact(e.target.value)}
                              placeholder="Enter contact information"
                              disabled={isSaving}
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </ScrollArea>
              )}






            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 