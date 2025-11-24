"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Smartphone } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useDevicePlatform, isMobileDevice } from '@/hooks/use-device-platform';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [pwaEnabled, setPwaEnabled] = useState(false);
  const devicePlatform = useDevicePlatform();

  // Check if PWA is enabled
  useEffect(() => {
    const checkPWAEnabled = async () => {
      try {
        const response = await fetch('/api/settings/system-settings');
        if (response.ok) {
          const data = await response.json();
          const settings = Array.isArray(data.settings) 
            ? Object.fromEntries(data.settings.map((s: any) => [s.key, s.value]))
            : data;
          const enabled = settings.pwaEnabled === 'true';
          console.log('PWA Install Prompt: PWA enabled status:', enabled, 'Settings:', settings);
          setPwaEnabled(enabled);
          
          // Only proceed if PWA is enabled
          if (!enabled) {
            console.log('PWA Install Prompt: PWA is disabled in system settings');
            return;
          }
        } else {
          console.error('PWA Install Prompt: Failed to fetch system settings:', response.status);
        }
      } catch (error) {
        console.error('PWA Install Prompt: Failed to check PWA setting:', error);
        return;
      }
    };

    checkPWAEnabled();
  }, []);

  // Check if already installed and set up delayed prompt
  useEffect(() => {
    if (!pwaEnabled) return;

    // Check if running as standalone (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
      setShowPrompt(false);
      return;
    }

    // Check if already installed by looking at localStorage
    const installDismissed = localStorage.getItem('pwa-install-dismissed');
    const installAccepted = localStorage.getItem('pwa-install-accepted');
    
    if (installAccepted === 'true') {
      setIsInstalled(true);
      setShowPrompt(false);
      return;
    }

    // For Android devices (including tablets), show prompt after a delay if not dismissed
    // This ensures the prompt shows even if beforeinstallprompt event doesn't fire
    if (installDismissed !== 'true') {
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      const isAndroidDevice = devicePlatform === 'android' || 
        /android/i.test(userAgent);
      
      // Show prompt after a delay - shorter for Android to ensure it appears
      const delay = isAndroidDevice ? 2000 : 3000;
      const timer = setTimeout(() => {
        // Double-check we're still not installed
        const stillStandalone = window.matchMedia('(display-mode: standalone)').matches ||
          (window.navigator as any).standalone === true ||
          document.referrer.includes('android-app://');
        
        const stillDismissed = localStorage.getItem('pwa-install-dismissed') === 'true';
        const stillAccepted = localStorage.getItem('pwa-install-accepted') === 'true';
        
        if (!stillStandalone && !stillAccepted && !stillDismissed) {
          console.log('PWA Install Prompt: Showing prompt after delay');
          setShowPrompt(true);
        }
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [pwaEnabled, devicePlatform]);

  // Listen for beforeinstallprompt event
  useEffect(() => {
    if (!pwaEnabled || isInstalled) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      // Show prompt immediately when beforeinstallprompt fires
      console.log('PWA Install Prompt: beforeinstallprompt event fired');
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [pwaEnabled, isInstalled]);

  // Detect if app is installed
  useEffect(() => {
    if (!pwaEnabled) return;

    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      
      if (isStandalone) {
        setIsInstalled(true);
        setShowPrompt(false);
      }
    };

    checkInstalled();
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      localStorage.setItem('pwa-install-accepted', 'true');
      toast.success('App installed successfully!');
    });

    return () => {
      window.removeEventListener('appinstalled', checkInstalled);
    };
  }, [pwaEnabled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Platform-specific installation instructions
      if (devicePlatform === 'ios') {
        toast('To install: Tap the share button and select "Add to Home Screen"', {
          duration: 5000,
          icon: '📱',
        });
      } else if (devicePlatform === 'android') {
        toast('To install: Tap the menu (⋮) and select "Install app" or "Add to Home screen"', {
          duration: 5000,
          icon: '📱',
        });
      } else {
        toast('To install: Use your browser\'s install option in the address bar', {
          duration: 5000,
          icon: '📱',
        });
      }
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        localStorage.setItem('pwa-install-accepted', 'true');
        toast.success('App installation started!');
      } else {
        localStorage.setItem('pwa-install-dismissed', 'true');
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Error during installation:', error);
      toast.error('Failed to install app');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't show if PWA is disabled, already installed, or prompt shouldn't be shown
  if (!pwaEnabled || isInstalled || !showPrompt) {
    if (!pwaEnabled) {
      console.log('PWA Install Prompt: Not showing - PWA disabled');
    } else if (isInstalled) {
      console.log('PWA Install Prompt: Not showing - Already installed');
    } else if (!showPrompt) {
      console.log('PWA Install Prompt: Not showing - showPrompt is false');
    }
    return null;
  }

  // Check if on mobile or tablet
  // For Android tablets, we need to check both device type and screen size
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
  const isAndroidTablet = /android/i.test(userAgent) && !/mobile/i.test(userAgent);
  const isMobileOrTablet = isMobileDevice() || isAndroidTablet || window.innerWidth <= 1024;

  if (!isMobileOrTablet) {
    console.log('PWA Install Prompt: Not showing - Not mobile/tablet device. Platform:', devicePlatform, 'Width:', window.innerWidth);
    return null;
  }

  console.log('PWA Install Prompt: Rendering prompt. Platform:', devicePlatform, 'Has deferred prompt:', !!deferredPrompt);

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 animate-in slide-in-from-bottom-5">
      <div className="bg-background border border-border rounded-lg shadow-lg p-4 flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <Smartphone className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm mb-1">Install App</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Add this app to your home screen for quick access and a better experience.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleInstallClick}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Install
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="px-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

