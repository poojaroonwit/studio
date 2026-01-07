'use client';

import { useEffect, useState } from 'react';

/**
 * RightClickProtection
 * 
 * A client component that disables right-click context menu across the entire application
 * when the 'appRightClickProtectionEnabled' system setting is set to 'true'.
 * 
 * Default: Protection is DISABLED (value is 'false' or not set)
 */
export function RightClickProtection() {
  const [protectionEnabled, setProtectionEnabled] = useState(false);

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
            const setting = data.settings.find((s: any) => s.key === 'rightClickProtectionEnabled');
            settingValue = setting?.value ?? 'false';
          } else if (data.rightClickProtectionEnabled) {
            settingValue = data.rightClickProtectionEnabled;
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

    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Add event listener
    document.addEventListener('contextmenu', handleContextMenu);

    // Cleanup on unmount or when protection is disabled
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [protectionEnabled]);

  // This component doesn't render anything
  return null;
}
