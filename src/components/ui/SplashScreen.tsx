"use client";

import React, { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useGlobalSettings } from '@/contexts/GlobalSettingsContext';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function SplashScreen() {
  const pathname = usePathname();
  constsearchParams = useSearchParams();
  const { settings, isLoading: isSettingsLoading } = useGlobalSettings();
  const [isVisible, setIsVisible] = useState(false);
  const [isMounting, setIsMounting] = useState(true);

  // Configuration from settings
  const backgroundColor = settings.splashBackgroundColor || '#ffffff';
  const logoUrl = settings.splashLogoDataUrl || settings.appLogoDataUrl;
  const animationType = settings.splashAnimationType || 'spinner';

  useEffect(() => {
    // Show splash screen on mount (initial load)
    setIsVisible(true);
    
    // Hide after a brief delay to allow content to settle
    const timer = setTimeout(() => {
      setIsVisible(false);
      setIsMounting(false);
    }, 1500); // 1.5s splash duration for initial load

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isMounting) return;

    // Show splash on navigation
    setIsVisible(true);
    
    // Hide after delay. In a real app with Next.js App Router, 
    // we might want to hook into router events more deeply, 
    // but a timeout provides a consistent "loading" feel.
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 800); // 0.8s splash duration for navigation

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  // Don't render until we have settings (or use defaults)
  if (isSettingsLoading && isMounting) {
    return null; // Or a hardcoded minimal loader
  }

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
                <img 
                  src={logoUrl} 
                  alt="App Logo" 
                  className="w-full h-full object-contain"
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
