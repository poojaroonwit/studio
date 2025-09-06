"use client"

import * as React from "react"
import { createPortal } from "react-dom"

interface ZoomAwarePortalProps {
  children: React.ReactNode
  container?: Element | null
}

/**
 * A portal component that applies the current zoom level to its content
 * to ensure dropdowns and other portal-rendered components scale correctly
 * with the document zoom level.
 */
export function ZoomAwarePortal({ children, container }: ZoomAwarePortalProps) {
  const [zoomLevel, setZoomLevel] = React.useState(1)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    
    // Get initial zoom level
    const getCurrentZoom = () => {
      if (typeof window !== 'undefined' && window.getZoom) {
        return window.getZoom()
      }
      const savedZoom = localStorage.getItem('app-zoom-level')
      return savedZoom ? parseFloat(savedZoom) : 0.9
    }
    
    setZoomLevel(getCurrentZoom())
    
    // Listen for zoom changes
    const handleZoomChange = (event: CustomEvent) => {
      if (event.detail && event.detail.zoom) {
        setZoomLevel(event.detail.zoom)
      }
    }
    
    window.addEventListener('zoomChanged', handleZoomChange as EventListener)
    
    return () => {
      window.removeEventListener('zoomChanged', handleZoomChange as EventListener)
    }
  }, [])

  if (!mounted) {
    return null
  }

  const portalContainer = container || (typeof document !== 'undefined' ? document.body : null)
  
  if (!portalContainer) {
    return null
  }

  return createPortal(
    <div 
      style={{ 
        // Apply the same zoom level as the document to ensure consistency
        transform: `scale(${zoomLevel})`,
        transformOrigin: 'top left'
      }}
    >
      {children}
    </div>,
    portalContainer
  )
}
