"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Save, BrainCircuit, Loader2, ServerCrash, Settings, RefreshCw, Database, CheckCircle, Search, Mail, Building, UploadCloud, Smartphone, ShieldAlert, FileText, Key, Activity } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'react-hot-toast';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import AutoCloseTab from '@/components/settings/AutoCloseTab';
import AIPowerSearchTab from '@/components/settings/AIPowerSearchTab';
import AiApiKeysTab from '@/components/settings/AiApiKeysTab';
import SystemApiKeysTab from '@/components/settings/SystemApiKeysTab';
import { EmailChipInput } from '@/components/ui/email-chip-input';

import OrganizationTab from '@/components/settings/system-settings-tabs/OrganizationTab';
import FeatureFlagsTab from '@/components/settings/system-settings-tabs/FeatureFlagsTab';
import EmailServerTab from '@/components/settings/system-settings-tabs/EmailServerTab';
import EmailTemplatesTab from '@/components/settings/system-settings-tabs/EmailTemplatesTab';
import SecurityControlsTab from '@/components/settings/system-settings-tabs/SecurityControlsTab';
import ProcessingTab from '@/components/settings/system-settings-tabs/ProcessingTab';
import MatchCriteriaTab from '@/components/settings/system-settings-tabs/MatchCriteriaTab';
import PwaTab from '@/components/settings/system-settings-tabs/PwaTab';
import AzureIntegrationTab from '@/components/settings/system-settings-tabs/AzureIntegrationTab';
import MonitoringTab from '@/components/settings/system-settings-tabs/MonitoringTab';
import AiPromptsTab from '@/components/settings/system-settings-tabs/AiPromptsTab';

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
      { id: 'system-api-keys', label: 'API Keys', icon: Key },
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
      { id: 'ai-prompts', label: 'AI Prompts', icon: BrainCircuit },
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
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/settings/system-settings';
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
  // Add state for process queue toggle (already declared above in Upload Queue Processor settings)
  // Add state for PWA toggle
  const [pwaEnabled, setPwaEnabled] = useState(false);
  // PWA Metadata state
  const [pwaName, setPwaName] = useState('FitScan - AI-Powered Recruitment Platform');
  const [pwaShortName, setPwaShortName] = useState('FitScan');
  const [pwaDescription, setPwaDescription] = useState('Advanced AI-powered recruitment and Applicant management platform');
  const [pwaThemeColor, setPwaThemeColor] = useState('#000000');
  const [pwaBackgroundColor, setPwaBackgroundColor] = useState('#171a26');
  const [pwaAppleMobileWebAppTitle, setPwaAppleMobileWebAppTitle] = useState('FitScan');
  const [pwaAppleMobileWebAppStatusBarStyle, setPwaAppleMobileWebAppStatusBarStyle] = useState('default');
  // Add state for export/import feature toggle
  const [exportImportFeatureEnabled, setExportImportFeatureEnabled] = useState(true);
  // Add state for hiring manager access control
  const [hiringManagerRestrictToAssignedPositions, setHiringManagerRestrictToAssignedPositions] = useState(true);


  // Security & Protection
  const [screenCaptureProtectionEnabled, setScreenCaptureProtectionEnabled] = useState(false);
  const [rightClickProtectionEnabled, setRightClickProtectionEnabled] = useState(false);
  const [loginPageDevToolsProtectionEnabled, setLoginPageDevToolsProtectionEnabled] = useState(true);
  const [globalTwoFactorEnabled, setGlobalTwoFactorEnabled] = useState(true);
  const [lockoutAlertEmails, setLockoutAlertEmails] = useState<string[]>([]);
  const [lockoutWebhookUrl, setLockoutWebhookUrl] = useState('');



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

  // Azure AD Configuration State
  const [azureAdClientId, setAzureAdClientId] = useState('');
  const [azureAdClientSecret, setAzureAdClientSecret] = useState('');
  const [azureAdTenantId, setAzureAdTenantId] = useState('');

  // Visibility State for Sensative Fields
  const [showWebhookToken, setShowWebhookToken] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [showAzureSecret, setShowAzureSecret] = useState(false);
  
  // AI Prompts State
  const [jobDescriptionSystemPrompt, setJobDescriptionSystemPrompt] = useState('');

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
      setIcsDescriptionTemplate(settings.icsDescriptionTemplate || 'Interview with {{ApplicantName}} for position {{positionTitle}}.\n\nLocation: {{interviewLocation}}\nInterviewer: {{interviewerName}}');
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

      // Load Azure AD settings
      setAzureAdClientId(settings.azureAdClientId || '');
      setAzureAdClientSecret(settings.azureAdClientSecret || '');
      setAzureAdTenantId(settings.azureAdTenantId || '');
      
      // Load AI Prompts
      setJobDescriptionSystemPrompt(settings.jobDescriptionSystemPrompt || '');

      // Load default match criteria
      setDefaultMatchCriteria(settings.defaultMatchCriteria || '');

      // Load showLogoOnly setting
      setShowLogoOnly(settings.showLogoOnly === 'true' || settings.showLogoOnly === true);

      // Load job match feature setting
      setJobMatchFeatureEnabled(settings.jobMatchFeatureEnabled !== 'false');



      // Load process queue enabled setting
      setProcessQueueEnabled(settings.processQueueEnabled !== 'false');

      // Load PWA enabled setting
      setPwaEnabled(settings.pwaEnabled === 'true');

      // Load PWA metadata settings
      setPwaName(settings.pwaName || 'FitScan - AI-Powered Recruitment Platform');
      setPwaShortName(settings.pwaShortName || 'FitScan');
      setPwaDescription(settings.pwaDescription || 'Advanced AI-powered recruitment and Applicant management platform');
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
      setLoginPageDevToolsProtectionEnabled(settings.loginPageDevToolsProtectionEnabled !== 'false'); // Default to true
      setGlobalTwoFactorEnabled(settings.globalTwoFactorEnabled === 'true');

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
      signIn(undefined, { callbackUrl: currentPath });
    } else if (sessionStatus === 'authenticated') {
      fetchSystemSettings();
    }
  }, [sessionStatus, currentPath, fetchSystemSettings]);

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
      { key: 'processQueueEnabled', value: processQueueEnabled.toString() },
      { key: 'pwaEnabled', value: pwaEnabled.toString() },
      { key: 'pwaName', value: pwaName || 'FitScan - AI-Powered Recruitment Platform' },
      { key: 'pwaShortName', value: pwaShortName || 'FitScan' },
      { key: 'pwaDescription', value: pwaDescription || 'Advanced AI-powered recruitment and Applicant management platform' },
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
      { key: 'loginPageDevToolsProtectionEnabled', value: loginPageDevToolsProtectionEnabled.toString() },
      { key: 'globalTwoFactorEnabled', value: globalTwoFactorEnabled.toString() },
      // Azure AD Settings
      { key: 'azureAdClientId', value: azureAdClientId || '' },
      { key: 'azureAdClientSecret', value: azureAdClientSecret || '' },
      { key: 'azureAdTenantId', value: azureAdTenantId || '' },
      { key: 'lockoutAlertEmails', value: JSON.stringify(lockoutAlertEmails) },
      { key: 'lockoutWebhookUrl', value: lockoutWebhookUrl || '' },
      
      // AI Prompts
      { key: 'jobDescriptionSystemPrompt', value: jobDescriptionSystemPrompt || '' },
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
          {/* Mobile Navigation Selector */}
          <div className="block md:hidden mb-4 p-4 border-b bg-muted/20">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <SelectValue placeholder="Select Settings Tab" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {menuItems.map((group) => (
                  <React.Fragment key={group.group}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/30">
                      {group.group}
                    </div>
                    {group.items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        <div className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </React.Fragment>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                <ProcessingTab
                  maxConcurrentProcessors={maxConcurrentProcessors}
                  setMaxConcurrentProcessors={setMaxConcurrentProcessors}
                  resumeProcessingWebhookUrl={resumeProcessingWebhookUrl}
                  setResumeProcessingWebhookUrl={setResumeProcessingWebhookUrl}
                  resumeProcessingWebhookToken={resumeProcessingWebhookToken}
                  setResumeProcessingWebhookToken={setResumeProcessingWebhookToken}
                  resumeProcessingWebhookResponseMode={resumeProcessingWebhookResponseMode}
                  setResumeProcessingWebhookResponseMode={setResumeProcessingWebhookResponseMode}
                  resumeProcessingWebhookTimeout={resumeProcessingWebhookTimeout}
                  setResumeProcessingWebhookTimeout={setResumeProcessingWebhookTimeout}
                  showWebhookToken={showWebhookToken}
                  setShowWebhookToken={setShowWebhookToken}
                  isSaving={isSaving}
                />
              )}

              {activeTab === 'security' && (
                <SecurityControlsTab
                  screenCaptureProtectionEnabled={screenCaptureProtectionEnabled}
                  setScreenCaptureProtectionEnabled={setScreenCaptureProtectionEnabled}
                  rightClickProtectionEnabled={rightClickProtectionEnabled}
                  setRightClickProtectionEnabled={setRightClickProtectionEnabled}
                  loginPageDevToolsProtectionEnabled={loginPageDevToolsProtectionEnabled}
                  setLoginPageDevToolsProtectionEnabled={setLoginPageDevToolsProtectionEnabled}
                  globalTwoFactorEnabled={globalTwoFactorEnabled}
                  setGlobalTwoFactorEnabled={setGlobalTwoFactorEnabled}
                  lockoutAlertEmails={lockoutAlertEmails}
                  setLockoutAlertEmails={setLockoutAlertEmails}
                  lockoutWebhookUrl={lockoutWebhookUrl}
                  setLockoutWebhookUrl={setLockoutWebhookUrl}
                  isSaving={isSaving}
                />
              )}

              {activeTab === 'email-server' && (
                <EmailServerTab
                  emailServiceEnabled={emailServiceEnabled}
                  setEmailServiceEnabled={setEmailServiceEnabled}
                  emailSmtpHost={emailSmtpHost}
                  setEmailSmtpHost={setEmailSmtpHost}
                  emailSmtpPort={emailSmtpPort}
                  setEmailSmtpPort={setEmailSmtpPort}
                  emailSmtpSecure={emailSmtpSecure}
                  setEmailSmtpSecure={setEmailSmtpSecure}
                  emailSmtpUser={emailSmtpUser}
                  setEmailSmtpUser={setEmailSmtpUser}
                  emailSmtpPassword={emailSmtpPassword}
                  setEmailSmtpPassword={setEmailSmtpPassword}
                  emailFromAddress={emailFromAddress}
                  setEmailFromAddress={setEmailFromAddress}
                  emailFromName={emailFromName}
                  setEmailFromName={setEmailFromName}
                  showSmtpPassword={showSmtpPassword}
                  setShowSmtpPassword={setShowSmtpPassword}
                  isSaving={isSaving}
                  testingEmail={testingEmail}
                  setTestingEmail={setTestingEmail}
                />
              )}

              {activeTab === 'email-templates' && (
                <EmailTemplatesTab
                  emailTemplateInterviewInvitationSubject={emailTemplateInterviewInvitationSubject}
                  setEmailTemplateInterviewInvitationSubject={setEmailTemplateInterviewInvitationSubject}
                  emailTemplateInterviewInvitation={emailTemplateInterviewInvitation}
                  setEmailTemplateInterviewInvitation={setEmailTemplateInterviewInvitation}
                  emailTemplateInterviewInvitationEditorMode={emailTemplateInterviewInvitationEditorMode}
                  setEmailTemplateInterviewInvitationEditorMode={setEmailTemplateInterviewInvitationEditorMode}
                  icsDescriptionTemplate={icsDescriptionTemplate}
                  setIcsDescriptionTemplate={setIcsDescriptionTemplate}
                  emailEditorMode={emailEditorMode}
                  setEmailEditorMode={setEmailEditorMode}
                  isSaving={isSaving}
                  isEditorReady={isEditorReady}
                />
              )}

              {activeTab === 'pwa' && (
                <PwaTab
                  pwaEnabled={pwaEnabled}
                  setPwaEnabled={setPwaEnabled}
                  pwaName={pwaName}
                  setPwaName={setPwaName}
                  pwaShortName={pwaShortName}
                  setPwaShortName={setPwaShortName}
                  pwaDescription={pwaDescription}
                  setPwaDescription={setPwaDescription}
                  pwaThemeColor={pwaThemeColor}
                  setPwaThemeColor={setPwaThemeColor}
                  pwaBackgroundColor={pwaBackgroundColor}
                  setPwaBackgroundColor={setPwaBackgroundColor}
                  pwaAppleMobileWebAppTitle={pwaAppleMobileWebAppTitle}
                  setPwaAppleMobileWebAppTitle={setPwaAppleMobileWebAppTitle}
                  pwaAppleMobileWebAppStatusBarStyle={pwaAppleMobileWebAppStatusBarStyle}
                  setPwaAppleMobileWebAppStatusBarStyle={setPwaAppleMobileWebAppStatusBarStyle}
                  isSaving={isSaving}
                />
              )}

              {activeTab === 'match-criteria' && (
                <MatchCriteriaTab
                  defaultMatchCriteria={defaultMatchCriteria}
                  setDefaultMatchCriteria={setDefaultMatchCriteria}
                  isSaving={isSaving}
                  isEditorReady={isEditorReady}
                />
              )}



              {activeTab === 'features' && (
                <FeatureFlagsTab
                  jobMatchFeatureEnabled={jobMatchFeatureEnabled}
                  setJobMatchFeatureEnabled={setJobMatchFeatureEnabled}
                  exportImportFeatureEnabled={exportImportFeatureEnabled}
                  setExportImportFeatureEnabled={setExportImportFeatureEnabled}
                  hiringManagerRestrictToAssignedPositions={hiringManagerRestrictToAssignedPositions}
                  setHiringManagerRestrictToAssignedPositions={setHiringManagerRestrictToAssignedPositions}
                  interviewInvitationFeatureEnabled={interviewInvitationFeatureEnabled}
                  setInterviewInvitationFeatureEnabled={setInterviewInvitationFeatureEnabled}
                  isSaving={isSaving}
                />
              )}

              {activeTab === 'azure' && (
                <AzureIntegrationTab
                  azureAdClientId={azureAdClientId}
                  setAzureAdClientId={setAzureAdClientId}
                  azureAdClientSecret={azureAdClientSecret}
                  setAzureAdClientSecret={setAzureAdClientSecret}
                  azureAdTenantId={azureAdTenantId}
                  setAzureAdTenantId={setAzureAdTenantId}
                  azureMeetingRoomsEnabled={azureMeetingRoomsEnabled}
                  setAzureMeetingRoomsEnabled={setAzureMeetingRoomsEnabled}
                  showAzureSecret={showAzureSecret}
                  setShowAzureSecret={setShowAzureSecret}
                  testingAzureRooms={testingAzureRooms}
                  setTestingAzureRooms={setTestingAzureRooms}
                  isSaving={isSaving}
                />
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
              
              {activeTab === 'ai-prompts' && (
                <AiPromptsTab 
                  jobDescriptionSystemPrompt={jobDescriptionSystemPrompt}
                  setJobDescriptionSystemPrompt={setJobDescriptionSystemPrompt}
                  isSaving={isSaving}
                />
              )}

              {activeTab === 'system-api-keys' && (
                <ScrollArea className="h-full">
                  <SystemApiKeysTab />
                </ScrollArea>
              )}

              {activeTab === 'monitoring' && (
                <MonitoringTab />
              )}

              {activeTab === 'organize' && (
                <OrganizationTab
                  organizationName={organizationName}
                  setOrganizationName={setOrganizationName}
                  organizationAddress={organizationAddress}
                  setOrganizationAddress={setOrganizationAddress}
                  organizationContact={organizationContact}
                  setOrganizationContact={setOrganizationContact}
                  organizationLogoPreviewUrl={organizationLogoPreviewUrl}
                  setOrganizationLogoPreviewUrl={setOrganizationLogoPreviewUrl}
                  setSavedOrganizationLogoUrl={setSavedOrganizationLogoUrl}
                  isSaving={isSaving}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
