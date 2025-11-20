"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Smartphone } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [pwaEnabled, setPwaEnabled] = useState(false);

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
          setPwaEnabled(enabled);
          
          // Only proceed if PWA is enabled
          if (!enabled) {
            return;
          }
        }
      } catch (error) {
        console.error('Failed to check PWA setting:', error);
        return;
      }
    };

    checkPWAEnabled();
  }, []);

  // Check if already installed
  useEffect(() => {
    if (!pwaEnabled) return;

    // Check if running as standalone (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if already installed by looking at localStorage
    const installDismissed = localStorage.getItem('pwa-install-dismissed');
    const installAccepted = localStorage.getItem('pwa-install-accepted');
    
    if (installAccepted === 'true') {
      setIsInstalled(true);
      return;
    }

    // Show prompt after a delay if not dismissed
    if (installDismissed !== 'true') {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000); // Show after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [pwaEnabled]);

  // Listen for beforeinstallprompt event
  useEffect(() => {
    if (!pwaEnabled || isInstalled) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
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
      // Fallback for iOS Safari
      toast('To install: Tap the share button and select "Add to Home Screen"', {
        duration: 5000,
        icon: '📱',
      });
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
    return null;
  }

  // Check if on mobile or tablet
  const isMobileOrTablet = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth <= 768;

  if (!isMobileOrTablet) {
    return null;
  }

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

