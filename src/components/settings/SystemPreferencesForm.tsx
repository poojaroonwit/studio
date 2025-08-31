"use client";

import React, { useEffect, useState, type ChangeEvent } from "react";
import { Loader2, Save, X, Palette, ImageUp, Trash2, XCircle, PenSquare, Sun, Moon, RotateCcw, Sidebar as SidebarIcon, LogIn, Settings2, Lock } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { setThemeAndColors, applySidebarStyles, getSidebarActiveStyle, setSidebarActiveStyle, type SidebarActiveStyle, applySidebarBackgroundSettings } from "@/lib/themeUtils";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { useClickProtection } from '@/hooks/use-click-protection';

const DEFAULT_APP_NAME = "FitScan";
const DEFAULT_THEME: ThemePreference = "system";

type ThemePreference = "light" | "dark" | "system";
type LoginBackgroundType = 'image' | 'gradient' | 'solid';
type SidebarBackgroundType = 'gradient' | 'solid' | 'image';
type SidebarImageFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
type SidebarImagePosition = 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface SystemPreferencesFormProps {
  onSave?: () => void;
  onCancel?: () => void;
}

export function SystemPreferencesForm({ onSave, onCancel }: SystemPreferencesFormProps) {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  const { isActioning, handleProtectedAsyncClick } = useClickProtection({
    actionName: 'save settings',
    debounceMs: 200,
    timeoutMs: 500
  });
  const [currentAppName, setCurrentAppName] = useState(DEFAULT_APP_NAME);
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);
  const [appFaviconUrl, setAppFaviconUrl] = useState<string | null>(null);
  const [themePreference, setThemePreference] = useState<ThemePreference>(DEFAULT_THEME);
  const [showLogoOnly, setShowLogoOnly] = useState<boolean>(false);
  const [sidebarLogoSize, setSidebarLogoSize] = useState<number>(48);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load current settings
  useEffect(() => {
    if (sessionStatus === 'authenticated' && isClient) {
      const loadSettings = async () => {
        try {
          setIsLoading(true);
          
          // Add timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          const res = await fetch('/api/settings/system-settings', {
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          
          const data = await res.json();

          let prefs: any = {};
          if (data.settings && Array.isArray(data.settings)) {
            prefs = Object.fromEntries(data.settings.map((setting: any) => [setting.key, setting.value]));
          } else {
            prefs = data;
          }

          setCurrentAppName(prefs.appName || DEFAULT_APP_NAME);
          setAppLogoUrl(prefs.appLogoDataUrl || null);
          setAppFaviconUrl(prefs.appFaviconDataUrl || null);
          setThemePreference(prefs.appThemePreference || DEFAULT_THEME);
          setShowLogoOnly(prefs.showLogoOnly === 'true' || prefs.showLogoOnly === true);
          setSidebarLogoSize(prefs.sidebarLogoSize ? parseInt(prefs.sidebarLogoSize) : 48);
        } catch (error) {
          console.error('Error loading settings:', error);
          if (error instanceof Error && error.name === 'AbortError') {
            showError("Request timed out. Please try again.");
          } else {
            showError("Failed to load system settings");
          }
        } finally {
          setIsLoading(false);
        }
      };

      loadSettings();
    }
  }, [sessionStatus, isClient]); // Wait for session to be authenticated and client to be ready

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const settingsToSave = [
        { key: 'appName', value: currentAppName },
        { key: 'appLogoDataUrl', value: appLogoUrl || '' },
        { key: 'appFaviconDataUrl', value: appFaviconUrl || '' },
        { key: 'appThemePreference', value: themePreference },
        { key: 'showLogoOnly', value: showLogoOnly.toString() },
        { key: 'sidebarLogoSize', value: sidebarLogoSize.toString() },
      ];

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const res = await fetch('/api/settings/system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToSave),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to save settings' }));
        console.error('Save settings error:', errorData);
        throw new Error(errorData.message || 'Failed to save settings');
      }

      showSuccess("System settings saved successfully");

      // Trigger app config change event
      window.dispatchEvent(new CustomEvent('appConfigChanged', {
        detail: {
          appName: currentAppName,
          logoUrl: appLogoUrl,
          themePreference: themePreference,
        }
      }));

      onSave?.();
    } catch (error) {
      console.error('Error saving settings:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        showError("Request timed out. Please try again.");
      } else {
        showError("Failed to save system settings");
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (sessionStatus === 'loading' || !isClient || isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">
          {sessionStatus === 'loading' ? 'Loading session...' : 
           !isClient ? 'Initializing...' : 'Loading settings...'}
        </span>
      </div>
    );
  }

  // Check if user has permission to access system settings
  if (sessionStatus === 'unauthenticated') {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="p-4 rounded-full bg-muted/50 mb-4">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
        <p className="text-muted-foreground max-w-md">
          You need to be logged in to access system preferences.
        </p>
      </div>
    );
  }

  if (session?.user?.role !== 'Admin' &&  !(session?.user?.modulePermissions || []).includes('SYSTEM_SETTINGS_MANAGE')) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="p-4 rounded-full bg-muted/50 mb-4">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Insufficient Permissions</h3>
        <p className="text-muted-foreground max-w-md">
          You don't have permission to access system preferences. Contact your administrator for access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Basic Settings
          </CardTitle>
          <CardDescription>
            Configure basic application settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="appName">Application Name</Label>
            <Input
              id="appName"
              value={currentAppName}
              onChange={(e) => setCurrentAppName(e.target.value)}
              placeholder="Enter application name"
            />
          </div>

          <div className="space-y-2">
            <Label>Theme Preference</Label>
            <RadioGroup
              value={themePreference}
              onValueChange={(value: ThemePreference) => setThemePreference(value)}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="light" id="light" />
                <Label htmlFor="light" className="flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  Light
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="dark" />
                <Label htmlFor="dark" className="flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  Dark
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="system" id="system" />
                <Label htmlFor="system" className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  System
                </Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Logo Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageUp className="h-5 w-5" />
            Logo Settings
          </CardTitle>
          <CardDescription>
            Configure application logo and branding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Application Logo</Label>
            <div className="flex items-center gap-4">
              {appLogoUrl && (
                <div className="relative">
                  <Image
                    src={appLogoUrl}
                    alt="App Logo"
                    width={64}
                    height={64}
                    className="rounded border"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 p-0"
                    onClick={() => setAppLogoUrl(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <Button variant="outline" size="sm">
                <ImageUp className="h-4 w-4 mr-2" />
                Upload Logo
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sidebarLogoSize">Sidebar Logo Size</Label>
            <Select
              value={sidebarLogoSize.toString()}
              onValueChange={(value) => setSidebarLogoSize(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="32">Small (32px)</SelectItem>
                <SelectItem value="48">Medium (48px)</SelectItem>
                <SelectItem value="64">Large (64px)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showLogoOnly"
              checked={showLogoOnly}
              onChange={(e) => setShowLogoOnly(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="showLogoOnly">Show logo only (hide app name)</Label>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={() => handleProtectedAsyncClick(handleSave)} disabled={isSaving || isActioning}>
          {(isSaving || isActioning) ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
