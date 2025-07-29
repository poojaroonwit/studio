"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { Save, Mail, Zap, BrainCircuit, Loader2, ServerCrash, Settings, RefreshCw, FileText, Database, Webhook } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'react-hot-toast';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { EditorJSEditor } from '@/components/ui/wysiwyg-editors';

export default function SystemSettingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // System/Integration settings state
  const [maxConcurrentProcessors, setMaxConcurrentProcessors] = useState(5);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [smtpFromEmail, setSmtpFromEmail] = useState('');
  const [resumeProcessingWebhookUrl, setResumeProcessingWebhookUrl] = useState('');
  const [resumeProcessingWebhookToken, setResumeProcessingWebhookToken] = useState('');
  const [resumeProcessingWebhookResponseMode, setResumeProcessingWebhookResponseMode] = useState('blocking');
  const [generalPdfWebhookUrl, setGeneralPdfWebhookUrl] = useState('');
  const [generalPdfWebhookToken, setGeneralPdfWebhookToken] = useState('');
  const [generalPdfWebhookResponseMode, setGeneralPdfWebhookResponseMode] = useState('blocking');
  const [geminiApiKey, setGeminiApiKey] = useState('');

  // Add state for manual link and type
  const [manualLink, setManualLink] = useState('');
  const [manualType, setManualType] = useState('external');

  // Add state for default match criteria
  const [defaultMatchCriteria, setDefaultMatchCriteria] = useState('');
  const [isEditorReady, setIsEditorReady] = useState(false);

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
      setSmtpHost(settings.smtpHost || '');
      setSmtpPort(settings.smtpPort || '');
      setSmtpUser(settings.smtpUser || '');
      setSmtpSecure(settings.smtpSecure === 'true');
      setSmtpFromEmail(settings.smtpFromEmail || '');
      setResumeProcessingWebhookUrl(settings.resumeProcessingWebhookUrl || '');
      setResumeProcessingWebhookToken(settings.resumeProcessingWebhookToken || '');
      setResumeProcessingWebhookResponseMode(settings.resumeProcessingWebhookResponseMode || 'blocking');
      setGeneralPdfWebhookUrl(settings.generalPdfWebhookUrl || '');
      setGeneralPdfWebhookToken(settings.generalPdfWebhookToken || '');
      setGeneralPdfWebhookResponseMode(settings.generalPdfWebhookResponseMode || 'blocking');
      setGeminiApiKey(settings.geminiApiKey || '');
      // In fetchSystemSettings, load manualLink and manualType
      setManualLink(settings.manualLink || '');
      setManualType(settings.manualType || 'external');
      // Load default match criteria
      setDefaultMatchCriteria(settings.defaultMatchCriteria || '');
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
      { key: 'smtpHost', value: smtpHost },
      { key: 'smtpPort', value: smtpPort },
      { key: 'smtpUser', value: smtpUser },
      { key: 'smtpPassword', value: smtpPassword },
      { key: 'smtpSecure', value: smtpSecure.toString() },
      { key: 'smtpFromEmail', value: smtpFromEmail },
      { key: 'resumeProcessingWebhookUrl', value: resumeProcessingWebhookUrl },
      { key: 'resumeProcessingWebhookToken', value: resumeProcessingWebhookToken },
      { key: 'resumeProcessingWebhookResponseMode', value: resumeProcessingWebhookResponseMode },
      { key: 'generalPdfWebhookUrl', value: generalPdfWebhookUrl },
      { key: 'generalPdfWebhookToken', value: generalPdfWebhookToken },
      { key: 'generalPdfWebhookResponseMode', value: generalPdfWebhookResponseMode },
      { key: 'geminiApiKey', value: geminiApiKey },
      { key: 'manualLink', value: manualLink },
      { key: 'manualType', value: manualType },
      { key: 'defaultMatchCriteria', value: defaultMatchCriteria },
    ];
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
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
          <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
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
        <Tabs defaultValue="ai" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4" />
              AI Services
            </TabsTrigger>
            <TabsTrigger value="automation" className="flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              Automation
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              System
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="ai" className="h-full">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6">
                  {/* AI Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BrainCircuit className="h-5 w-5 text-primary" />
                        Gemini AI Configuration
                      </CardTitle>
                      <CardDescription>
                        Configure Google Gemini AI for advanced candidate analysis and processing
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="gemini-api-key">Gemini API Key</Label>
                        <Input 
                          id="gemini-api-key" 
                          type="password" 
                          placeholder="Enter your Gemini API Key" 
                          value={geminiApiKey} 
                          onChange={(e) => setGeminiApiKey(e.target.value)} 
                          disabled={isSaving}
                        />
                        <p className="text-xs text-muted-foreground">
                          This key is stored securely on the server. For Genkit to use this, ensure it&apos;s also available as the GOOGLE_API_KEY environment variable where your Next.js server runs, or ensure your Genkit flows dynamically fetch it.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="automation" className="h-full">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6">
                  {/* Resume Processing Webhook */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        Resume Processing Webhook
                      </CardTitle>
                      <CardDescription>
                        Configure webhook for automated resume processing and candidate creation
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
                          This URL will receive a POST request with the uploaded resume file (as FormData). You can use any compatible webhook service (Zapier, Make, custom API, etc.).
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
                    </CardContent>
                  </Card>

                  {/* General PDF Webhook */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        General PDF Webhook
                      </CardTitle>
                      <CardDescription>
                        Configure webhook for general PDF processing and candidate creation
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="general-pdf-webhook">Webhook URL</Label>
                        <div className="flex gap-2">
                          <Input 
                            id="general-pdf-webhook" 
                            type="url" 
                            placeholder="https://your-webhook-endpoint/receive-pdf" 
                            value={generalPdfWebhookUrl} 
                            onChange={(e) => setGeneralPdfWebhookUrl(e.target.value)} 
                            className="flex-1" 
                            disabled={isSaving}
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={async () => {
                              if (!generalPdfWebhookUrl) {
                                toast.error('Please enter a webhook URL first');
                                return;
                              }
                              try {
                                const response = await fetch('/api/settings/webhook-test', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    webhookUrl: generalPdfWebhookUrl,
                                    webhookToken: generalPdfWebhookToken
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
                            disabled={isSaving || !generalPdfWebhookUrl}
                          >
                            Test
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Used by the "Create via Resume (Automated)" feature. The application sends the PDF file (as FormData) and optional target position info to this endpoint.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="general-pdf-webhook-token">Authentication Token (Optional)</Label>
                        <Input 
                          id="general-pdf-webhook-token" 
                          type="password" 
                          placeholder="Bearer token for webhook authentication" 
                          value={generalPdfWebhookToken} 
                          onChange={(e) => setGeneralPdfWebhookToken(e.target.value)} 
                          disabled={isSaving}
                        />
                        <p className="text-xs text-muted-foreground">
                          Optional Bearer token for webhook authentication. Leave empty if no authentication is required.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="general-pdf-webhook-response-mode">Response Mode</Label>
                        <Select value={generalPdfWebhookResponseMode} onValueChange={(value) => setGeneralPdfWebhookResponseMode(value)} disabled={isSaving}>
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
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="email" className="h-full">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6">
                  {/* SMTP Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-primary" />
                        SMTP Configuration
                      </CardTitle>
                      <CardDescription>
                        Configure email server settings for sending notifications and communications
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="smtp-host">SMTP Host</Label>
                          <Input 
                            id="smtp-host" 
                            type="text" 
                            placeholder="smtp.example.com" 
                            value={smtpHost} 
                            onChange={(e) => setSmtpHost(e.target.value)} 
                            disabled={isSaving}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="smtp-port">SMTP Port</Label>
                          <Input 
                            id="smtp-port" 
                            type="text" 
                            placeholder="587" 
                            value={smtpPort} 
                            onChange={(e) => setSmtpPort(e.target.value)} 
                            disabled={isSaving}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="smtp-user">SMTP User</Label>
                        <Input 
                          id="smtp-user" 
                          type="text" 
                          placeholder="user@example.com" 
                          value={smtpUser} 
                          onChange={(e) => setSmtpUser(e.target.value)} 
                          disabled={isSaving}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="smtp-password">SMTP Password</Label>
                        <Input 
                          id="smtp-password" 
                          type="password" 
                          placeholder="Set via environment variable" 
                          value={smtpPassword} 
                          onChange={(e) => setSmtpPassword(e.target.value)} 
                          disabled 
                          readOnly
                        />
                        <p className="text-xs text-muted-foreground">
                          Password must be set as an environment variable on the server.
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="smtp-secure"
                          checked={smtpSecure}
                          onCheckedChange={setSmtpSecure}
                          disabled={isSaving}
                        />
                        <Label htmlFor="smtp-secure">Use TLS/SSL</Label>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="smtp-from-email">From Email</Label>
                        <Input 
                          id="smtp-from-email" 
                          type="email" 
                          placeholder="noreply@example.com" 
                          value={smtpFromEmail} 
                          onChange={(e) => setSmtpFromEmail(e.target.value)} 
                          disabled={isSaving}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="system" className="h-full">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-6">
                  {/* System Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-primary" />
                        System Configuration
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

                  {/* Manual Link Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Manual Link Settings
                      </CardTitle>
                      <CardDescription>
                        Configure manual documentation and help links
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="manual-link">Manual Link (URL)</Label>
                        <Input 
                          id="manual-link" 
                          type="url" 
                          placeholder="https://your-manual-page.com" 
                          value={manualLink} 
                          onChange={e => setManualLink(e.target.value)} 
                          disabled={isSaving} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="manual-type">Manual Type</Label>
                        <Select value={manualType} onValueChange={setManualType} disabled={isSaving}>
                          <SelectTrigger id="manual-type" className="w-48">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="external">External Link (new tab)</SelectItem>
                            <SelectItem value="iframe">Iframe (in-app page)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Set the manual link to an external URL or display it in-app using an iframe.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Default Match Criteria */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BrainCircuit className="h-5 w-5 text-primary" />
                        Default Match Criteria
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
                              <EditorJSEditor
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
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
} 