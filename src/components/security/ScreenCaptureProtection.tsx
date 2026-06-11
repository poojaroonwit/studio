'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  applyProtectedContentVisibility,
  fetchSystemProtectionEnabled,
  isMacScreenshotShortcut,
  isOverlayScreenshotShortcut,
} from './security-protection-utils';

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
    async function fetchSetting() {
      try {
        setProtectionEnabled(await fetchSystemProtectionEnabled('screenCaptureProtectionEnabled'));
      } catch (e) {
        console.error('[ScreenCaptureProtection] Error fetching settings:', e);
        setProtectionEnabled(false);
      }
    }

    fetchSetting();
  }, []);

  useEffect(() => {
    if (!protectionEnabled) return;

    const handleVisibilityChange = () => {
      setIsHidden(document.hidden);
    };

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

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOverlayScreenshotShortcut(e)) {
        showProtectionOverlay();
        logScreenshotAttempt();
        return false;
      }

      if (isMacScreenshotShortcut(e)) {
        logScreenshotAttempt();
      }
    };

    const showProtectionOverlay = () => {
      const overlay = document.getElementById('screen-capture-protection-overlay');
      if (overlay) {
        overlay.classList.add('active');
        setTimeout(() => {
          overlay.classList.remove('active');
        }, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [protectionEnabled, session?.user]);

  useEffect(() => {
    if (!protectionEnabled) return;

    const rootElement = document.getElementById('screen-capture-protected-content');
    applyProtectedContentVisibility(rootElement, isHidden);
  }, [protectionEnabled, isHidden]);

  if (!protectionEnabled) return null;

  return (
    <>
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

      {protectionEnabled && session?.user && (
        <div
          className="pointer-events-none fixed inset-0 z-[99999] overflow-hidden flex flex-wrap content-start items-start justify-center p-10 opacity-[0.03] select-none"
          aria-hidden="true"
          style={{ mixBlendMode: 'difference' }}
        >
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="transform -rotate-45 p-16 text-xl font-bold whitespace-nowrap">
              {session.user?.email || session.user?.name || 'Protected Content'} <br />
              {new Date().toISOString().split('T')[0]} <br />
              ID: {session.user?.id?.substring(0, 8)}
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
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
