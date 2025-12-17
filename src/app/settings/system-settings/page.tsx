"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { Save, Zap, BrainCircuit, Loader2, ServerCrash, Settings, RefreshCw, Database, Webhook, CheckCircle, Bug, Search, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'react-hot-toast';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { TiptapEditor } from '@/components/ui/wysiwyg-editors';
import { ColorPicker } from '@/components/ui/color-picker';
import { cn } from '@/lib/utils';
import AutoCloseTab from '@/components/settings/AutoCloseTab';
import AIPowerSearchTab from '@/components/settings/AIPowerSearchTab';
import AiApiKeysTab from '@/components/settings/AiApiKeysTab';

export default function SystemSettingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [showLogoOnly, setShowLogoOnly] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('automation');

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
  const [testingEmail, setTestingEmail] = useState(false);
  
  // Email Template State
  const [emailTemplateInterviewInvitation, setEmailTemplateInterviewInvitation] = useState('');
  const [emailTemplateInterviewInvitationSubject, setEmailTemplateInterviewInvitationSubject] = useState('');
  const [interviewInvitationFeatureEnabled, setInterviewInvitationFeatureEnabled] = useState(true);
  
  // Azure Meeting Rooms Integration State
  const [azureMeetingRoomsEnabled, setAzureMeetingRoomsEnabled] = useState(false);
  const [testingAzureRooms, setTestingAzureRooms] = useState(false);

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
      
      // Load feature toggles
      setInterviewInvitationFeatureEnabled(settings.interviewInvitationFeatureEnabled !== 'false');
      setAzureMeetingRoomsEnabled(settings.azureMeetingRoomsEnabled === 'true');

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
      setPwaDescription(settings.pwaDescription || 'Advanced AI-powered recruitment and candidate management platform');
      setPwaThemeColor(settings.pwaThemeColor || '#000000');
      setPwaBackgroundColor(settings.pwaBackgroundColor || '#171a26');
      setPwaAppleMobileWebAppTitle(settings.pwaAppleMobileWebAppTitle || 'FitScan');
      setPwaAppleMobileWebAppStatusBarStyle(settings.pwaAppleMobileWebAppStatusBarStyle || 'default');
      
      // Load export/import feature setting
      setExportImportFeatureEnabled(settings.exportImportFeatureEnabled !== 'false');
      
      // Load hiring manager access control setting (default to true - restrict to assigned positions)
      setHiringManagerRestrictToAssignedPositions(settings.hiringManagerRestrictToAssignedPositions !== 'false');
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
      // Feature toggles
      { key: 'interviewInvitationFeatureEnabled', value: interviewInvitationFeatureEnabled.toString() },
      { key: 'azureMeetingRoomsEnabled', value: azureMeetingRoomsEnabled.toString() },
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
          <div className="flex w-full border-b border-border/50 mb-6">

            <div
              onClick={() => setActiveTab('automation')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                activeTab === 'automation'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <Webhook className="h-4 w-4" />
              Automation
            </div>
            <div
              onClick={() => setActiveTab('system')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                activeTab === 'system'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <Database className="h-4 w-4" />
              System
            </div>
            <div
              onClick={() => setActiveTab('auto-close')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                activeTab === 'auto-close'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <CheckCircle className="h-4 w-4" />
              Auto-Close
            </div>
            <div
              onClick={() => setActiveTab('ai-power-search')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                activeTab === 'ai-power-search'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <BrainCircuit className="h-4 w-4" />
              AI Power Search
            </div>
            <div
              onClick={() => setActiveTab('ai-api-keys')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                activeTab === 'ai-api-keys'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <BrainCircuit className="h-4 w-4" />
              AI API Keys
            </div>
            <div
              onClick={() => setActiveTab('monitoring')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                activeTab === 'monitoring'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <Bug className="h-4 w-4" />
              Monitoring & Logging
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {activeTab === 'automation' && (
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6">
                  {/* System Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-primary" />
                        Processing Configuration
                      </CardTitle>
                      <CardDescription>
                        Configure system performance and processing settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                    </CardContent>
                  </Card>

                  {/* Resume Processing Webhook */}
                  <Card>
                    <CardHeader>
                                             <CardTitle className="flex items-center gap-2">
                         <Zap className="h-5 w-5 text-primary" />
                         PDF Processing Webhook
                       </CardTitle>
                       <CardDescription>
                         Configure webhook for all PDF processing including resume uploads and automated candidate creation
                       </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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


                    </CardContent>
                  </Card>

                  {/* Upload Queue Processor Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" />
                        Upload Queue Processor
                      </CardTitle>
                      <CardDescription>
                        Configure the upload queue processor behavior and performance
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Process Queue Toggle */}
                      <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                        <div className="space-y-1">
                          <Label htmlFor="process-queue-enabled" className="text-base font-medium">
                            Enable Process Queue
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Turn the upload queue processor on or off. When disabled, the queue will not process new jobs.
                          </p>
                        </div>
                        <Switch
                          id="process-queue-enabled"
                          checked={processQueueEnabled}
                          onCheckedChange={setProcessQueueEnabled}
                          disabled={isSaving}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="processor-interval">Processing Interval (ms)</Label>
                          <Input
                            id="processor-interval"
                            type="number"
                            min={1000}
                            max={60000}
                            value={processorIntervalMs}
                            onChange={(e) => setProcessorIntervalMs(Number(e.target.value))}
                            disabled={isSaving}
                          />
                          <p className="text-xs text-muted-foreground">
                            How often the processor checks for new jobs (1000-60000ms)
                          </p>
                        </div>


                        <div className="space-y-2">
                          <Label htmlFor="processor-connection-timeout">Connection Timeout (ms)</Label>
                          <Input
                            id="processor-connection-timeout"
                            type="number"
                            min={5000}
                            max={120000}
                            value={processorConnectionTimeoutMs}
                            onChange={(e) => setProcessorConnectionTimeoutMs(Number(e.target.value))}
                            disabled={isSaving}
                          />
                          <p className="text-xs text-muted-foreground">
                            Network connection timeout (5000-120000ms)
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="processor-request-timeout">Request Timeout (ms)</Label>
                          <Input
                            id="processor-request-timeout"
                            type="number"
                            min={60000}
                            max={3600000}
                            value={processorRequestTimeoutMs}
                            onChange={(e) => setProcessorRequestTimeoutMs(Number(e.target.value))}
                            disabled={isSaving}
                          />
                          <p className="text-xs text-muted-foreground">
                            Total request timeout - must match webhook timeout (60000-3600000ms)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="processor-quiet-mode">Quiet Mode</Label>
                          <p className="text-sm text-muted-foreground">
                            Reduce console output for cleaner logs
                          </p>
                        </div>
                        <Switch
                          id="processor-quiet-mode"
                          checked={processorQuietMode}
                          onCheckedChange={setProcessorQuietMode}
                          disabled={isSaving}
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                </div>
              </ScrollArea>
            )}



            {activeTab === 'system' && (
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6">
                  {/* Feature Toggles */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" />
                        Feature Configuration
                      </CardTitle>
                      <CardDescription>
                        Enable or disable system features
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                      <Separator className="my-4" />
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
                    </CardContent>
                  </Card>

                  {/* PWA Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" />
                        Progressive Web App (PWA)
                      </CardTitle>
                      <CardDescription>
                        Enable or disable Progressive Web App functionality. When enabled, users can install the app on mobile devices and tablets.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
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
                    </CardContent>
                  </Card>

                  {/* Match Criteria */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BrainCircuit className="h-5 w-5 text-primary" />
                        Match Criteria
                      </CardTitle>
                      <CardDescription>
                        Configure the default match criteria template for new positions. This will be used when creating new positions if no specific criteria are provided.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            )}

            {activeTab === 'auto-close' && (
              <ScrollArea className="h-full pr-4">
                <AutoCloseTab />
              </ScrollArea>
            )}

            {activeTab === 'ai-power-search' && (
              <ScrollArea className="h-full pr-4">
                <AIPowerSearchTab />
              </ScrollArea>
            )}

            {activeTab === 'ai-api-keys' && (
              <ScrollArea className="h-full pr-4">
                <AiApiKeysTab />
              </ScrollArea>
            )}

            {activeTab === 'monitoring' && (
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6">
                  {/* Sentry Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bug className="h-5 w-5 text-primary" />
                        Sentry Error Tracking
                      </CardTitle>
                      <CardDescription>
                        Configure Sentry for error tracking and monitoring. Settings are stored in the database and should also be set in environment variables for the application to use them.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                    </CardContent>
                  </Card>

                  {/* Elasticsearch Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5 text-primary" />
                        Elasticsearch Log Search
                      </CardTitle>
                      <CardDescription>
                        Configure Elasticsearch for advanced log search and indexing. Settings are stored in the database and should also be set in environment variables for the application to use them.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                    </CardContent>
                  </Card>

                  {/* SigNoz Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5 text-primary" />
                        SigNoz Observability
                      </CardTitle>
                      <CardDescription>
                        Configure SigNoz for unified observability (logs, metrics, and traces). Settings are stored in the database and take effect immediately.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                            <div className={`p-3 border rounded-md ${
                              signozStatus.loggerReady && signozStatus.configured
                                ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                                : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                            }`}>
                              <p className={`text-xs font-medium mb-2 ${
                                signozStatus.loggerReady && signozStatus.configured
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
                    </CardContent>
                  </Card>

                  {/* Interview Invitation Feature Toggle */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-primary" />
                        Interview Invitation Feature
                      </CardTitle>
                      <CardDescription>
                        Enable or disable the interview invitation feature. When disabled, the "Send Interviewer Invitation" button will be hidden.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                        <div className="space-y-1">
                          <Label htmlFor="interview-invitation-feature-enabled" className="text-base font-medium">
                            Enable Interview Invitation Feature
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Enable or disable the ability to send calendar invitations to interviewers from candidate detail pages.
                          </p>
                        </div>
                        <Switch
                          id="interview-invitation-feature-enabled"
                          checked={interviewInvitationFeatureEnabled}
                          onCheckedChange={setInterviewInvitationFeatureEnabled}
                          disabled={isSaving}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Email Service Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-primary" />
                        Email Service
                      </CardTitle>
                      <CardDescription>
                        Configure SMTP settings for sending email notifications and calendar invitations.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                    </CardContent>
                  </Card>

                  {/* Email Templates */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-primary" />
                        Email Templates
                      </CardTitle>
                      <CardDescription>
                        Configure email templates for interview invitations. Use template variables: {'{'}candidateName{'}'}, {'{'}positionTitle{'}'}, {'{'}interviewDate{'}'}, {'{'}interviewTime{'}'}, {'{'}interviewLocation{'}'}, {'{'}evaluationLink{'}'}, {'{'}interviewerName{'}'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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

                      <div className="space-y-2">
                        <Label htmlFor="email-template-body">Email Body (HTML)</Label>
                        {isEditorReady ? (
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
                        )}
                        <p className="text-xs text-muted-foreground">
                          HTML email template. Available variables: {'{'}candidateName{'}'}, {'{'}positionTitle{'}'}, {'{'}interviewDate{'}'}, {'{'}interviewTime{'}'}, {'{'}interviewLocation{'}'}, {'{'}evaluationLink{'}'}, {'{'}interviewerName{'}'}
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
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 