"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { Save, Zap, BrainCircuit, Loader2, ServerCrash, Settings, RefreshCw, Database, Webhook, CheckCircle } from 'lucide-react';
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

      // Load default match criteria
      setDefaultMatchCriteria(settings.defaultMatchCriteria || '');
      
      // Load showLogoOnly setting
      setShowLogoOnly(settings.showLogoOnly === 'true' || settings.showLogoOnly === true);
      
      // Load job match feature setting
      setJobMatchFeatureEnabled(settings.jobMatchFeatureEnabled !== 'false');
      
      // Load process queue enabled setting
      setProcessQueueEnabled(settings.processQueueEnabled !== 'false');
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
      // Upload Queue Processor settings
      { key: 'processorIntervalMs', value: processorIntervalMs.toString() },
      { key: 'processorQuietMode', value: processorQuietMode.toString() },
      { key: 'processorConnectionTimeoutMs', value: processorConnectionTimeoutMs.toString() },
      { key: 'processorRequestTimeoutMs', value: processorRequestTimeoutMs.toString() },
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
          </div>
        </div>
      </div>
    </div>
  );
} 