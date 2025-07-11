"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { Save, Mail, Zap, BrainCircuit, Loader2, ServerCrash, Settings, RefreshCw, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'react-hot-toast';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

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

  const fetchSystemSettings = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await fetch('/api/settings/system-settings');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to load system settings' }));
        throw new Error(errorData.message);
      }
      const settings = await response.json();
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
    ];
    try {
      const response = await fetch('/api/settings/system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToSave),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to save settings' }));
        throw new Error(errorData.message);
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
      toast.error((error as Error).message);
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
    <div className="space-y-6 pb-32 p-6">
      {/* AI Configuration (Gemini) */}
  
        <div className="flex items-center text-2xl gap-2">
          <BrainCircuit className="h-7 w-7 text-primary" />
          AI Configuration (Gemini)
        </div>
        <div className="space-y-4 pt-6">
     
        <Label htmlFor="gemini-api-key">Gemini API Key</Label>
        <Input id="gemini-api-key" type="password" placeholder="Enter your Gemini API Key" value={geminiApiKey} onChange={(e) => setGeminiApiKey(e.target.value)} className="mt-1" disabled={isSaving}/>
        <p className="text-xs text-muted-foreground">This key is stored securely on the server. For Genkit to use this, ensure it&apos;s also available as the GOOGLE_API_KEY environment variable where your Next.js server runs, or ensure your Genkit flows dynamically fetch it.</p>
  
        </div>
   
      {/* Webhook Automation + Max Concurrent Processors */}
  
        <div className="flex items-center text-2xl gap-2">
          <Zap className="h-7 w-7 text-primary" />
          Workflow Automation
        </div>
    
  
            <Label htmlFor="resume-processing-webhook">Resume Processing Webhook URL (Any Service)</Label>
            <div className="flex gap-2">
              <Input id="resume-processing-webhook" type="url" placeholder="https://your-webhook-endpoint/receive-resume" value={resumeProcessingWebhookUrl} onChange={(e) => setResumeProcessingWebhookUrl(e.target.value)} className="mt-1 flex-1" disabled={isSaving}/>
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
                    console.log('Webhook test result:', result);
                  } catch (error) {
                    toast.error('Failed to test webhook');
                    console.error('Webhook test error:', error);
                  }
                }}
                disabled={isSaving || !resumeProcessingWebhookUrl}
                className="mt-1"
              >
                Test
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">This URL will receive a POST request with the uploaded resume file (as FormData). You can use any compatible webhook service (Zapier, Make, custom API, etc.).</p>
      
            <Label htmlFor="resume-processing-webhook-token">Resume Processing Webhook Authentication Token (Optional)</Label>
            <Input id="resume-processing-webhook-token" type="password" placeholder="Bearer token for webhook authentication" value={resumeProcessingWebhookToken} onChange={(e) => setResumeProcessingWebhookToken(e.target.value)} className="mt-1" disabled={isSaving}/>
            <p className="text-xs text-muted-foreground">Optional Bearer token for webhook authentication. Leave empty if no authentication is required.</p>
      
            <Label htmlFor="resume-processing-webhook-response-mode">Resume Processing Webhook Response Mode</Label>
            <Select value={resumeProcessingWebhookResponseMode} onValueChange={(value) => setResumeProcessingWebhookResponseMode(value)} disabled={isSaving}>
              <SelectTrigger>
                <SelectValue placeholder="Select response mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blocking">Blocking (waits for completion, max 100s)</SelectItem>
                <SelectItem value="streaming">Streaming (real-time updates)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Blocking mode waits for the workflow to complete before returning. Streaming mode provides real-time updates. Note: Cloudflare has a 100-second timeout limit for blocking requests.</p>
      
          <Separator />
   
            <Label htmlFor="general-pdf-webhook">New Candidate PDF Webhook URL</Label>
            <div className="flex gap-2">
              <Input id="general-pdf-webhook" type="url" placeholder="https://your-webhook-endpoint/receive-pdf" value={generalPdfWebhookUrl} onChange={(e) => setGeneralPdfWebhookUrl(e.target.value)} className="mt-1 flex-1" disabled={isSaving}/>
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
                    console.log('Webhook test result:', result);
                  } catch (error) {
                    toast.error('Failed to test webhook');
                    console.error('Webhook test error:', error);
                  }
                }}
                disabled={isSaving || !generalPdfWebhookUrl}
                className="mt-1"
              >
                Test
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Used by the "Create via Resume (Automated)" feature. The application sends the PDF file (as FormData) and optional target position info to this endpoint. You can use any compatible webhook service (Zapier, Make, custom API, etc.).</p>
         
            <Label htmlFor="general-pdf-webhook-token">General PDF Webhook Authentication Token (Optional)</Label>
            <Input id="general-pdf-webhook-token" type="password" placeholder="Bearer token for webhook authentication" value={generalPdfWebhookToken} onChange={(e) => setGeneralPdfWebhookToken(e.target.value)} className="mt-1" disabled={isSaving}/>
            <p className="text-xs text-muted-foreground">Optional Bearer token for webhook authentication. Leave empty if no authentication is required.</p>
         
            <Label htmlFor="general-pdf-webhook-response-mode">General PDF Webhook Response Mode</Label>
            <Select value={generalPdfWebhookResponseMode} onValueChange={(value) => setGeneralPdfWebhookResponseMode(value)} disabled={isSaving}>
              <SelectTrigger>
                <SelectValue placeholder="Select response mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blocking">Blocking (waits for completion, max 100s)</SelectItem>
                <SelectItem value="streaming">Streaming (real-time updates)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Blocking mode waits for the workflow to complete before returning. Streaming mode provides real-time updates. Note: Cloudflare has a 100-second timeout limit for blocking requests.</p>
         
          <Separator />
     
            <Label style={{ marginTop: 16, display: 'block' }} mb-2>Max Concurrent Processors</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={maxConcurrentProcessors}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxConcurrentProcessors(Number(e.target.value))}
              style={{ marginBottom: 16, width: 80 }}
          />
  
        

      {/* SMTP Configuration */}
     
        <div className="flex items-center text-2xl gap-2">
          <Mail className="h-7 w-7 text-primary" />
          SMTP Configuration
        </div>
          
            <Label htmlFor="smtp-host">SMTP Host</Label>
            <Input id="smtp-host" type="text" placeholder="smtp.example.com" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} className="mt-1" disabled={isSaving}/>
          
          
            <Label htmlFor="smtp-port">SMTP Port</Label>
            <Input id="smtp-port" type="text" placeholder="587" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} className="mt-1" disabled={isSaving}/>
          
          
            <Label htmlFor="smtp-user">SMTP User</Label>
            <Input id="smtp-user" type="text" placeholder="user@example.com" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} className="mt-1" disabled={isSaving}/>
          
          
            <Label htmlFor="smtp-password">SMTP Password (set via env)</Label>
            <Input id="smtp-password" type="password" placeholder="Set via environment variable" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} className="mt-1" disabled readOnly/>
            <p className="text-xs text-muted-foreground">Password must be set as an environment variable on the server.</p>
          
          
            <Label htmlFor="smtp-secure">SMTP Secure</Label>
            <input id="smtp-secure" type="checkbox" checked={smtpSecure} onChange={(e) => setSmtpSecure(e.target.checked)} disabled={isSaving}/>
            <span className="ml-2 text-sm">Use TLS/SSL</span>
        
          
            <Label htmlFor="smtp-from-email">From Email</Label>
            <Input id="smtp-from-email" type="email" placeholder="noreply@example.com" value={smtpFromEmail} onChange={(e) => setSmtpFromEmail(e.target.value)} className="mt-1" disabled={isSaving}/>
          
     
      

      {/* Manual Link Settings */}
      <Separator className="my-6" />
      <div className="flex items-center text-2xl gap-2">
        <FileText className="h-7 w-7 text-primary" />
        Manual Link Settings
      </div>
      <div className="space-y-4 pt-6">
        <Label htmlFor="manual-link">Manual Link (URL)</Label>
        <Input id="manual-link" type="url" placeholder="https://your-manual-page.com" value={manualLink} onChange={e => setManualLink(e.target.value)} className="mt-1" disabled={isSaving} />
        <Label htmlFor="manual-type">Manual Type</Label>
        <Select value={manualType} onValueChange={setManualType}>
          <SelectTrigger id="manual-type" className="w-48 mt-1" disabled={isSaving}>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="external">External Link (new tab)</SelectItem>
            <SelectItem value="iframe">Iframe (in-app page)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Set the manual link to an external URL or display it in-app using an iframe.</p>
      </div>

      {/* Floating Save/Reset Bar */}
      <div className="fixed bottom-6 right-6 z-30 bg-background/95 border shadow-lg rounded-xl flex flex-row gap-4 py-3 px-6" style={{boxShadow: '0 2px 16px 0 rgba(0,0,0,0.10)'}}>
        <Button onClick={handleSave} disabled={isSaving} className="btn-primary-gradient flex items-center gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save All
        </Button>
        <Button variant="outline" onClick={fetchSystemSettings} disabled={isSaving} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Reset
        </Button>
      </div>
    </div>
  );
} 