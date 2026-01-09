'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

/**
 * ScreenCaptureProtection
 * 
 * A client component that provides protection against screen capture and video recording.
 * When enabled, it:
 * 1. Blurs the entire page content when the tab loses visibility (Page Visibility API)
 * 2. Blocks PrintScreen key
 * 3. Disables text selection (optional)
 * 
 * Note: Browser-based protection is limited and can be bypassed by determined users.
 * This provides a deterrent, not absolute protection.
 * 
 * Default: Protection is DISABLED (value is 'false' or not set)
 */
export function ScreenCaptureProtection() {
  const { data: session } = useSession();
  const [protectionEnabled, setProtectionEnabled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    // Fetch the system setting
    async function fetchSetting() {
      console.log('[ScreenCaptureProtection] Fetching system settings...');
      try {
        const res = await fetch('/api/settings/system-settings');
        if (res.ok) {
          const data = await res.json();
          console.log('[ScreenCaptureProtection] Settings received:', data);

          // Handle both response formats
          let settingValue = 'false';
          if (data.settings && Array.isArray(data.settings)) {
            const setting = data.settings.find((s: any) => s.key === 'screenCaptureProtectionEnabled');
            settingValue = setting?.value ?? 'false';
          } else if (data.hasOwnProperty('screenCaptureProtectionEnabled')) {
            settingValue = String(data.screenCaptureProtectionEnabled);
          }

          const enabled = settingValue === 'true';
          console.log(`[ScreenCaptureProtection] Feature status: ${enabled ? 'ENABLED' : 'DISABLED'}`);
          setProtectionEnabled(enabled);
        } else {
          console.error('[ScreenCaptureProtection] Failed to fetch settings:', res.statusText);
        }
      } catch (e) {
        console.error('[ScreenCaptureProtection] Error fetching settings:', e);
        // Default to disabled on error
        setProtectionEnabled(false);
      }
    }

    fetchSetting();
  }, []);

  useEffect(() => {
    if (!protectionEnabled) return;

    // Handle visibility change - blur content when tab is hidden
    const handleVisibilityChange = () => {
      console.log(`[ScreenCaptureProtection] Visibility changed: ${document.hidden ? 'HIDDEN (Blurring)' : 'VISIBLE (Unblurring)'}`);
      setIsHidden(document.hidden);
    };

    // Log screenshot attempt
    const logScreenshotAttempt = async () => {
      if (!session?.user) return;

      try {
        await fetch('/api/protection/log-screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: window.location.href,
            userAgent: navigator.userAgent
          })
        });
      } catch (error) {
        console.error('Failed to log screenshot attempt', error);
      }
    };

    // Block PrintScreen key
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === 'PrintScreen') {
        console.log('[ScreenCaptureProtection] PrintScreen key detected');
        // e.preventDefault(); // PrintScreen often cannot be prevented
        // Show a brief overlay or message
        showProtectionOverlay();
        logScreenshotAttempt();
        return false;
      }
      // Windows Snipping Tool (Win+Shift+S) - Try our best
      if (e.key === 'S' && e.shiftKey && (e.metaKey || e.getModifierState('OS') || e.getModifierState('Win'))) {
        console.log('[ScreenCaptureProtection] Snipping Tool shortcut (Win+Shift+S) detected');
        // e.preventDefault();
        showProtectionOverlay();
        logScreenshotAttempt();
        return false;
      }
      // Mac Screenshot shortcuts
      if (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) {
        console.log(`[ScreenCaptureProtection] Mac Screenshot shortcut (Cmd+Shift+${e.key}) detected`);
        logScreenshotAttempt();
      }
    };

    // Show protection overlay briefly
    const showProtectionOverlay = () => {
      const overlay = document.getElementById('screen-capture-protection-overlay');
      if (overlay) {
        overlay.classList.add('active');
        setTimeout(() => {
          overlay.classList.remove('active');
        }, 500);
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [protectionEnabled]);

  // Apply blur effect when protection is enabled and page is hidden
  useEffect(() => {
    if (!protectionEnabled) return;

    const rootElement = document.getElementById('screen-capture-protected-content');
    if (rootElement) {
      if (isHidden) {
        rootElement.style.filter = 'blur(20px)';
        rootElement.style.pointerEvents = 'none';
        rootElement.style.userSelect = 'none';
      } else {
        rootElement.style.filter = '';
        rootElement.style.pointerEvents = '';
        rootElement.style.userSelect = '';
      }
    }
  }, [protectionEnabled, isHidden]);

  if (!protectionEnabled) return null;

  return (
    <>
      {/* Invisible overlay that activates briefly on screenshot attempt */}
      <div
        id="screen-capture-protection-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'black',
          zIndex: 999999,
          pointerEvents: 'none',
          opacity: 0,
          transition: 'opacity 0.1s ease-in-out',
        }}
        className="[&.active]:opacity-100"
      />

      {/* Blur overlay when page loses visibility */}
      {isHidden && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(30px)',
            zIndex: 999998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.5rem',
            fontWeight: 600,
          }}
        >
          Content protected
        </div>
      )}

      {/* Watermark Overlay */}
      {protectionEnabled && session?.user && (
        <div
          className="pointer-events-none fixed inset-0 z-[99999] overflow-hidden flex flex-wrap content-start items-start justify-center p-10 opacity-[0.03] select-none"
          aria-hidden="true"
          style={{ mixBlendMode: 'difference' }}
        >
          {/* Watermark grid */}
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="transform -rotate-45 p-16 text-xl font-bold whitespace-nowrap">
              {session.user?.email || session.user?.name || 'Protected Content'} <br />
              {new Date().toISOString().split('T')[0]} <br />
              ID: {session.user?.id?.substring(0, 8)}
            </div>
          ))}
        </div>
      )}

      {/* CSS to add extra protection */}
      <style jsx global>{`
        /* Prevent text selection when protection active and hidden */
        ${isHidden ? `
          body {
            user-select: none !important;
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
          }
        ` : ''}
      `}</style>
    </>
  );
}
