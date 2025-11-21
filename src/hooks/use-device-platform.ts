import * as React from "react"

export type DevicePlatform = 'android' | 'ios' | 'desktop' | 'unknown'

export function useDevicePlatform() {
  const [platform, setPlatform] = React.useState<DevicePlatform>('unknown')

  React.useEffect(() => {
    // Ensure we're in a browser environment
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return
    }

    const userAgent = navigator.userAgent.toLowerCase()
    
    // Detect iOS (iPhone, iPad, iPod)
    const isIOS = /iphone|ipad|ipod/.test(userAgent) || 
      // Also check for iOS in standalone mode
      ((window.navigator as any).standalone === true)
    
    // Detect Android
    const isAndroid = /android/.test(userAgent) ||
      // Also check for Android app referrer
      document.referrer.includes('android-app://')
    
    // Detect if it's a mobile device
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
    
    if (isIOS) {
      setPlatform('ios')
    } else if (isAndroid) {
      setPlatform('android')
    } else if (!isMobile) {
      setPlatform('desktop')
    } else {
      setPlatform('unknown')
    }
  }, [])

  return platform
}

/**
 * Utility function to detect if the device is Android
 */
export function isAndroid(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false
  }
  
  const userAgent = navigator.userAgent.toLowerCase()
  return /android/.test(userAgent) || document.referrer.includes('android-app://')
}

/**
 * Utility function to detect if the device is iOS
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false
  }
  
  const userAgent = navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(userAgent) || 
    ((window.navigator as any).standalone === true)
}

/**
 * Utility function to detect if the device is mobile (Android or iOS)
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false
  }
  
  return isAndroid() || isIOS()
}

