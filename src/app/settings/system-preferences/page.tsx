"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Palette, ImageUp, Sun, Moon, RotateCcw, Settings2, Lock, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ui/image-upload";
import Image from "next/image";
import { cn } from "@/lib/utils";

const DEFAULT_APP_NAME = "FitScan";
const DEFAULT_THEME = "system";

type ThemePreference = "light" | "dark" | "system";

export default function SystemPreferencesPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [showLogoOnly, setShowLogoOnly] = useState<boolean>(false);
  
  // Basic Settings State
  const [currentAppName, setCurrentAppName] = useState(DEFAULT_APP_NAME);
  const [themePreference, setThemePreference] = useState<ThemePreference>(DEFAULT_THEME);
  
  // Logo Settings State
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);
  const [appFaviconUrl, setAppFaviconUrl] = useState<string | null>(null);
  const [sidebarLogoSize, setSidebarLogoSize] = useState<number>(48);

  // Stable reference to prevent infinite loops
  const showErrorRef = useRef(showError);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  useEffect(() => {
    showErrorRef.current = showError;
  }, [showError]);

  // Load current settings - FIX: Remove showError from dependencies to prevent infinite loops
  useEffect(() => {
    let mounted = true;
    
    if (sessionStatus === 'authenticated') {
      const loadSettings = async () => {
        try {
          // Only set loading if component is still mounted
          if (!mounted) return;
          setIsLoading(true);
          
          // Clean up any existing request
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
          
          const controller = new AbortController();
          abortControllerRef.current = controller;
          const timeoutId = setTimeout(() => {
            if (mounted) {
              controller.abort();
            }
          }, 10000);
          
          const res = await fetch('/api/settings/system-settings', {
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          // Check if component is still mounted before processing response
          if (!mounted) return;
          
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

          // Only update state if component is still mounted
          if (mounted) {
            setCurrentAppName(prefs.appName || DEFAULT_APP_NAME);
            setAppLogoUrl(prefs.appLogoDataUrl || null);
            setAppFaviconUrl(prefs.appFaviconDataUrl || null);
            setThemePreference(prefs.appThemePreference || DEFAULT_THEME);
            setShowLogoOnly(prefs.showLogoOnly === 'true' || prefs.showLogoOnly === true);
            setSidebarLogoSize(prefs.sidebarLogoSize ? parseInt(prefs.sidebarLogoSize) : 48);
          }
        } catch (error) {
          // Only show error if component is still mounted and error is not from abort
          if (mounted && error instanceof Error && error.name !== 'AbortError') {
            console.error('Error loading settings:', error);
            if (error.name === 'AbortError') {
              showErrorRef.current("Request timed out. Please try again.");
            } else {
              showErrorRef.current("Failed to load system settings");
            }
          }
        } finally {
          if (mounted) {
            setIsLoading(false);
            abortControllerRef.current = null;
          }
        }
      };

      loadSettings();
    }
    
    // Cleanup function to prevent resource leaks
    return () => {
      mounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [sessionStatus]); // FIXED: Only depend on sessionStatus, not showError

  const handleSave = useCallback(async () => {
    // Prevent multiple concurrent saves
    if (isSaving) return;
    
    let controller: AbortController | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    
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

      controller = new AbortController();
      timeoutId = setTimeout(() => {
        if (controller) {
          controller.abort();
        }
      }, 15000);
      
      const res = await fetch('/api/settings/system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToSave),
        signal: controller.signal
      });
      
      // Clear timeout as soon as response is received
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to save settings' }));
        console.error('Save settings error:', errorData);
        throw new Error(errorData.message || 'Failed to save settings');
      }

      showSuccess("System preferences saved successfully");

      // Trigger favicon update event
      window.dispatchEvent(new CustomEvent('faviconUpdated', {
        detail: { faviconDataUrl: appFaviconUrl }
      }));

      // Trigger app config change event
      window.dispatchEvent(new CustomEvent('appConfigChanged', {
        detail: {
          appName: currentAppName,
          logoUrl: appLogoUrl,
          themePreference: themePreference,
        }
      }));
    } catch (error) {
      console.error('Error saving settings:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        showError("Request timed out. Please try again.");
      } else {
        showError("Failed to save system preferences");
      }
    } finally {
      // Ensure cleanup happens even if there's an error
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      controller = null;
      setIsSaving(false);
    }
  }, [
    isSaving, 
    currentAppName, 
    appLogoUrl, 
    appFaviconUrl, 
    themePreference, 
    showLogoOnly, 
    sidebarLogoSize, 
    showSuccess, 
    showError
  ]);

  // Global cleanup effect to prevent resource leaks on unmount
  useEffect(() => {
    return () => {
      // Cleanup any remaining abort controllers
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  if (sessionStatus === 'loading' || isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // Check if user has permission to access system settings
  if (sessionStatus === 'unauthenticated') {
  return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
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

  if (session?.user?.role !== 'Admin' && !session?.user?.modulePermissions?.includes('SYSTEM_SETTINGS_MANAGE')) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
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
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          {!showLogoOnly && (
            <h1 className="text-2xl font-bold text-foreground">System Preferences</h1>
          )}
          <p className="text-muted-foreground">Configure application settings and appearance</p>
        </div>
                  <Button 
            onClick={handleSave} 
            disabled={isSaving}
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
                Save Preferences
              </>
            )}
          </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Horizontal Tabs */}
          <div className="flex w-full border-b border-border/50 mb-6">
            <div
              onClick={() => setActiveTab('basic')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                activeTab === 'basic'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <Settings2 className="h-4 w-4" />
              Basic Settings
            </div>
            <div
              onClick={() => setActiveTab('branding')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer",
                activeTab === 'branding'
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <ImageUp className="h-4 w-4" />
              Branding & Logo
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'basic' && (
              <div className="space-y-6">
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
                        disabled={isSaving}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Theme Preference</Label>
                      <RadioGroup
                        value={themePreference}
                        onValueChange={(value: ThemePreference) => setThemePreference(value)}
                        className="flex space-x-4"
                        disabled={isSaving}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="light" id="light" disabled={isSaving} />
                          <Label htmlFor="light" className="flex items-center gap-2">
                            <Sun className="h-4 w-4" />
                            Light
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="dark" id="dark" disabled={isSaving} />
                          <Label htmlFor="dark" className="flex items-center gap-2">
                            <Moon className="h-4 w-4" />
                            Dark
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="system" id="system" disabled={isSaving} />
                          <Label htmlFor="system" className="flex items-center gap-2">
                            <RotateCcw className="h-4 w-4" />
                            System
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'branding' && (
              <div className="space-y-6">
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
                      <ImageUpload
                        value={appLogoUrl || ''}
                        onChange={setAppLogoUrl}
                        label="Application Logo"
                        placeholder="Upload application logo"
                        accept="image/*"
                        maxSize={5 * 1024 * 1024} // 5MB limit
                        showPreview={true}
                        previewSize="md"
                        allowUrl={false}
                        allowFile={true}
                        disabled={isSaving}
                      />
                      <p className="text-xs text-muted-foreground">
                        Recommended: 200x80px, max 5MB • PNG, JPG, or SVG format
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sidebarLogoSize">Sidebar Logo Size</Label>
                      <Select
                        value={sidebarLogoSize.toString()}
                        onValueChange={(value) => setSidebarLogoSize(parseInt(value))}
                        disabled={isSaving}
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

                    <div className="space-y-2">
                      <ImageUpload
                        value={appFaviconUrl || ''}
                        onChange={setAppFaviconUrl}
                        label="Favicon"
                        placeholder="Upload favicon"
                        accept="image/*"
                        maxSize={1 * 1024 * 1024} // 1MB limit for favicon
                        showPreview={true}
                        previewSize="sm"
                        allowUrl={false}
                        allowFile={true}
                        disabled={isSaving}
                      />
                      <p className="text-xs text-muted-foreground">
                        Recommended: 32x32px or 16x16px, max 1MB • PNG, ICO, or SVG format
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="showLogoOnly"
                        checked={showLogoOnly}
                        onChange={(e) => setShowLogoOnly(e.target.checked)}
                        className="rounded"
                        disabled={isSaving}
                      />
                      <Label htmlFor="showLogoOnly">Show logo only (hide app name)</Label>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
