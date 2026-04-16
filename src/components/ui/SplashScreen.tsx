"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useGlobalSettings } from '@/contexts/GlobalSettingsContext';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function SplashScreen({ persistent = false }: { persistent?: boolean }) {
  const { settings } = useGlobalSettings();
  const [isVisible, setIsVisible] = useState(true);

  // Configuration from settings
  const backgroundColor = settings.splashBackgroundColor || '#ffffff';
  const logoUrl = settings.splashLogoDataUrl || settings.appLogoDataUrl;
  const animationType = settings.splashAnimationType || 'spinner';

  useEffect(() => {
    // If persistent, we keep it visible regardless of sessionStorage or timers
    if (persistent) {
      setIsVisible(true);
      return;
    }

    // Determine initial visibility only on client
    const hasInitialized = sessionStorage.getItem('splashInitialized');
    if (hasInitialized) {
      setIsVisible(false);
      return;
    }

    // Mark that we've initialized (for client-side navigation detection)
    sessionStorage.setItem('splashInitialized', 'true');
    
    // Clear the flag when page unloads (so splash shows on next refresh/redirect)
    const handleBeforeUnload = () => {
      sessionStorage.removeItem('splashInitialized');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Hide after allowing content to fully load
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 4000); // 4s maximum splash duration

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isVisible, persistent]);
  // Listen for manual triggers (e.g., from login flow)
  useEffect(() => {
    const handleShow = () => setIsVisible(true);
    const handleHide = () => setIsVisible(false);

    window.addEventListener('showSplashScreen', handleShow);
    window.addEventListener('hideSplashScreen', handleHide);

    return () => {
      window.removeEventListener('showSplashScreen', handleShow);
      window.removeEventListener('hideSplashScreen', handleHide);
    };
  }, []);

  // Removed early return - show splash screen immediately with defaults while settings load
  // The splash screen will update when settings are fetched

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center pointer-events-none"
          style={{ backgroundColor }}
        >
          <div className="flex flex-col items-center gap-8 p-4">
            {/* Logo */}
            {logoUrl && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="relative w-48 h-24 md:w-64 md:h-32"
              >
                <Image
                  src={logoUrl}
                  alt="App Logo"
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 192px, 256px"
                  className="object-contain"
                />
              </motion.div>
            )}

            {/* Animation */}
            <div className="flex items-center justify-center">
              {animationType === 'spinner' && (
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
              )}
              
              {animationType === 'pulse' && (
                <div className="relative flex items-center justify-center w-12 h-12">
                   <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-20 animate-ping"></span>
                   <span className="relative inline-flex rounded-full h-6 w-6 bg-primary"></span>
                </div>
              )}

              {animationType === 'bar' && (
                <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-primary"
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  />
                </div>
              )}

              {animationType === 'dots' && (
                 <div className="flex space-x-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-3 h-3 bg-primary rounded-full"
                        animate={{ y: [0, -10, 0] }}
                        transition={{ 
                          duration: 0.6, 
                          repeat: Infinity, 
                          delay: i * 0.2 
                        }}
                      />
                    ))}
                 </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
