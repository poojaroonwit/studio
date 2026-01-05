'use client';

import { useEffect, useState } from 'react';

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
  const [protectionEnabled, setProtectionEnabled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    // Fetch the system setting
    async function fetchSetting() {
      try {
        const res = await fetch('/api/settings/system-settings');
        if (res.ok) {
          const data = await res.json();
          
          // Handle both response formats
          let settingValue = 'false';
          if (data.settings && Array.isArray(data.settings)) {
            const setting = data.settings.find((s: any) => s.key === 'appScreenCaptureProtectionEnabled');
            settingValue = setting?.value ?? 'false';
          } else if (data.appScreenCaptureProtectionEnabled) {
            settingValue = data.appScreenCaptureProtectionEnabled;
          }
          
          setProtectionEnabled(settingValue === 'true');
        }
      } catch (e) {
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
      setIsHidden(document.hidden);
    };

    // Block PrintScreen key
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        // Show a brief overlay or message
        showProtectionOverlay();
        return false;
      }
      // Windows Snipping Tool (Win+Shift+S)
      if (e.metaKey && e.shiftKey && e.key === 's') {
        e.preventDefault();
        showProtectionOverlay();
        return false;
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
