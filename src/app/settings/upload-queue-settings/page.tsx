'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Settings, Database, Clock, Zap, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { hasAnyPermission } from '@/lib/permissions';

interface UploadQueueSettings {
  maxConcurrentProcessors: number;
  processorIntervalMs: number;
  processorBatchLimit: number;
  processorQuietMode: boolean;
  processorConnectionTimeoutMs: number;
  processorRequestTimeoutMs: number;
}

export default function UploadQueueSettingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<UploadQueueSettings>({
    maxConcurrentProcessors: 1,
    processorIntervalMs: 30000,
    processorBatchLimit: 1,
    processorQuietMode: false,
    processorConnectionTimeoutMs: 60000,
    processorRequestTimeoutMs: 180000
  });

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await fetch('/api/settings/system-settings');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to load system settings' }));
        throw new Error(errorData.message);
      }
      const responseData = await response.json();
      
      // Handle both response formats
      let systemSettings: any = {};
      if (responseData.settings && Array.isArray(responseData.settings)) {
        systemSettings = Object.fromEntries(responseData.settings.map((setting: any) => [setting.key, setting.value]));
      } else {
        systemSettings = responseData;
      }
      
      // Extract upload queue related settings
      setSettings({
        maxConcurrentProcessors: parseInt(systemSettings.maxConcurrentProcessors || '1', 10),
        processorIntervalMs: parseInt(systemSettings.processorIntervalMs || '30000', 10),
        processorBatchLimit: parseInt(systemSettings.processorBatchLimit || '1', 10),
        processorQuietMode: systemSettings.processorQuietMode === 'true',
        processorConnectionTimeoutMs: parseInt(systemSettings.processorConnectionTimeoutMs || '60000', 10),
        processorRequestTimeoutMs: parseInt(systemSettings.processorRequestTimeoutMs || '180000', 10)
      });
      
    } catch (error) {
      setFetchError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      return;
    }
    
    if (sessionStatus === 'authenticated' && hasAnyPermission(session?.user, ['UPLOAD_QUEUE_MANAGE'])) {
      fetchSettings();
    }
  }, [sessionStatus, session?.user?.role, fetchSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    
    try {
      const settingsToSave = [
        { key: 'maxConcurrentProcessors', value: settings.maxConcurrentProcessors.toString() },
        { key: 'processorIntervalMs', value: settings.processorIntervalMs.toString() },
        { key: 'processorBatchLimit', value: settings.processorBatchLimit.toString() },
        { key: 'processorQuietMode', value: settings.processorQuietMode.toString() },
        { key: 'processorConnectionTimeoutMs', value: settings.processorConnectionTimeoutMs.toString() },
        { key: 'processorRequestTimeoutMs', value: settings.processorRequestTimeoutMs.toString() }
      ];

      const response = await fetch('/api/settings/system-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsToSave),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to save settings' }));
        throw new Error(errorData.message);
      }

      toast({
        title: "Settings saved",
        description: "Upload queue settings have been updated successfully.",
      });
      
    } catch (error) {
      setSaveError((error as Error).message);
      toast({
        title: "Error saving settings",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({
      maxConcurrentProcessors: 1,
      processorIntervalMs: 30000,
      processorBatchLimit: 1,
      processorQuietMode: false,
      processorConnectionTimeoutMs: 60000,
      processorRequestTimeoutMs: 180000
    });
  };

  if (sessionStatus === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (sessionStatus === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground">Please sign in to access this page.</p>
        </div>
      </div>
    );
  }

  if (!hasAnyPermission(session?.user, ['UPLOAD_QUEUE_MANAGE'])) {
    setFetchError("You do not have permission to manage upload queue settings.");
    setIsLoading(false);
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Upload Queue Settings</h1>
          <p className="text-muted-foreground">
            Configure upload queue processing behavior and performance settings.
          </p>
        </div>
      </div>

      {fetchError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load settings: {fetchError}
            <Button variant="link" className="p-0 h-auto ml-2" onClick={fetchSettings}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {saveError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to save settings: {saveError}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {/* Concurrent Processing Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Concurrent Processing
            </CardTitle>
            <CardDescription>
              Control how many upload queue jobs can be processed simultaneously.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxConcurrentProcessors">
                  Max Concurrent Processors
                </Label>
                <Input
                  id="maxConcurrentProcessors"
                  type="number"
                  min="1"
                  max="10"
                  value={settings.maxConcurrentProcessors}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    maxConcurrentProcessors: parseInt(e.target.value) || 1
                  }))}
                  placeholder="1"
                />
                <p className="text-sm text-muted-foreground">
                  Maximum number of concurrent processors (1-10). Higher values increase throughput but may use more database connections.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="processorBatchLimit">
                  Batch Size
                </Label>
                <Input
                  id="processorBatchLimit"
                  type="number"
                  min="1"
                  max="20"
                  value={settings.processorBatchLimit}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processorBatchLimit: parseInt(e.target.value) || 1
                  }))}
                  placeholder="1"
                />
                <p className="text-sm text-muted-foreground">
                  Number of jobs to process in each batch. Automatically adjusted based on concurrent processors.
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="processorQuietMode"
                checked={settings.processorQuietMode}
                onCheckedChange={(checked) => setSettings(prev => ({
                  ...prev,
                  processorQuietMode: checked
                }))}
              />
              <Label htmlFor="processorQuietMode">Quiet Mode</Label>
              <p className="text-sm text-muted-foreground ml-2">
                Reduce console output for production environments
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Timing Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-4" />
              Timing Configuration
            </CardTitle>
            <CardDescription>
              Configure processing intervals and timeout values.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="processorIntervalMs">
                  Processing Interval (ms)
                </Label>
                <Input
                  id="processorIntervalMs"
                  type="number"
                  min="5000"
                  max="300000"
                  step="5000"
                  value={settings.processorIntervalMs}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processorIntervalMs: parseInt(e.target.value) || 30000
                  }))}
                  placeholder="30000"
                />
                <p className="text-sm text-muted-foreground">
                  How often to check for new jobs (5s - 5m)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="processorConnectionTimeoutMs">
                  Connection Timeout (ms)
                </Label>
                <Input
                  id="processorConnectionTimeoutMs"
                  type="number"
                  min="10000"
                  max="300000"
                  step="10000"
                  value={settings.processorConnectionTimeoutMs}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processorConnectionTimeoutMs: parseInt(e.target.value) || 60000
                  }))}
                  placeholder="60000"
                />
                <p className="text-sm text-muted-foreground">
                  Database connection timeout (10s - 5m)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="processorRequestTimeoutMs">
                  Request Timeout (ms)
                </Label>
                <Input
                  id="processorRequestTimeoutMs"
                  type="number"
                  min="30000"
                  max="600000"
                  step="30000"
                  value={settings.processorRequestTimeoutMs}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    processorRequestTimeoutMs: parseInt(e.target.value) || 180000
                  }))}
                  placeholder="180000"
                />
                <p className="text-sm text-muted-foreground">
                  API request timeout (30s - 10m)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Configuration Display */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Current Configuration
            </CardTitle>
            <CardDescription>
              Summary of current upload queue processor settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {settings.maxConcurrentProcessors}
                </div>
                <div className="text-sm text-muted-foreground">Concurrent Processors</div>
              </div>
              
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {Math.round(settings.processorIntervalMs / 1000)}s
                </div>
                <div className="text-sm text-muted-foreground">Processing Interval</div>
              </div>
              
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {settings.processorBatchLimit}
                </div>
                <div className="text-sm text-muted-foreground">Batch Size</div>
              </div>
              
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {settings.processorQuietMode ? 'On' : 'Off'}
                </div>
                <div className="text-sm text-muted-foreground">Quiet Mode</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Impact Warning */}
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Performance Considerations
            </CardTitle>
          </CardHeader>
          <CardContent className="text-amber-700">
            <div className="space-y-2">
              <p className="text-sm">
                <strong>Higher concurrent processors</strong> will increase upload processing throughput but may use more database connections.
              </p>
              <p className="text-sm">
                <strong>Lower processing intervals</strong> will make the system more responsive but may increase system load.
              </p>
              <p className="text-sm">
                <strong>Monitor database connections</strong> to ensure you don't exceed your connection pool limits.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleReset} disabled={isLoading || isSaving}>
          Reset to Defaults
        </Button>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchSettings} disabled={isLoading || isSaving}>
            Refresh
          </Button>
          <Button onClick={handleSave} disabled={isLoading || isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
