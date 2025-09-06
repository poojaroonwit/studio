"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface ZoomContextType {
  zoom: number
  setZoom: (zoom: number) => void
  resetZoom: () => void
  minZoom: number
  maxZoom: number
}

const ZoomContext = createContext<ZoomContextType | undefined>(undefined)

interface ZoomProviderProps {
  children: ReactNode
  defaultZoom?: number
  minZoom?: number
  maxZoom?: number
}

export function ZoomProvider({ 
  children, 
  defaultZoom = 0.9, 
  minZoom = 0.5, 
  maxZoom = 1.5 
}: ZoomProviderProps) {
  const [zoom, setZoomState] = useState(defaultZoom)

  // Apply zoom to the entire application using CSS transform
  const applyZoom = (zoomLevel: number) => {
    // Apply transform to body to affect all content including portals
    document.body.style.transform = `scale(${zoomLevel})`
    document.body.style.transformOrigin = 'top left'
    
    // Set CSS custom property for zoom level
    document.documentElement.style.setProperty('--zoom-level', zoomLevel.toString())
    
    // Adjust viewport to prevent scrollbars
    const scale = zoomLevel
    document.body.style.width = `${100 / scale}vw`
    document.body.style.height = `${100 / scale}vh`
    
    // Store in localStorage
    localStorage.setItem('app-zoom-level', zoomLevel.toString())
    
    // Dispatch custom event for other components to listen to
    window.dispatchEvent(new CustomEvent('zoomChanged', { detail: { zoom: zoomLevel } }))
  }

  const setZoom = (newZoom: number) => {
    if (newZoom >= minZoom && newZoom <= maxZoom) {
      setZoomState(newZoom)
      applyZoom(newZoom)
    }
  }

  const resetZoom = () => {
    setZoom(1.0)
  }

  // Initialize zoom on mount
  useEffect(() => {
    const savedZoom = localStorage.getItem('app-zoom-level')
    const initialZoom = savedZoom ? parseFloat(savedZoom) : defaultZoom
    
    // Ensure zoom is within bounds
    const clampedZoom = Math.max(minZoom, Math.min(maxZoom, initialZoom))
    setZoomState(clampedZoom)
    applyZoom(clampedZoom)
  }, [defaultZoom, minZoom, maxZoom])

  // Listen for keyboard zoom shortcuts and global zoom events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === '=') {
        event.preventDefault()
        setZoom(Math.min(maxZoom, zoom + 0.1))
      } else if ((event.ctrlKey || event.metaKey) && event.key === '-') {
        event.preventDefault()
        setZoom(Math.max(minZoom, zoom - 0.1))
      } else if ((event.ctrlKey || event.metaKey) && event.key === '0') {
        event.preventDefault()
        resetZoom()
      }
    }

    const handleGlobalZoom = (event: CustomEvent) => {
      if (event.detail && event.detail.zoom) {
        setZoom(event.detail.zoom)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('setGlobalZoom', handleGlobalZoom as EventListener)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('setGlobalZoom', handleGlobalZoom as EventListener)
    }
  }, [zoom, minZoom, maxZoom])

  const value: ZoomContextType = {
    zoom,
    setZoom,
    resetZoom,
    minZoom,
    maxZoom
  }

  return (
    <ZoomContext.Provider value={value}>
      {children}
    </ZoomContext.Provider>
  )
}

export function useZoom(): ZoomContextType {
  const context = useContext(ZoomContext)
  if (context === undefined) {
    throw new Error('useZoom must be used within a ZoomProvider')
  }
  return context
}

// Global zoom functions for backward compatibility
declare global {
  interface Window {
    setZoom: (zoom: number) => void
    getZoom: () => number
  }
}

// Initialize global functions
if (typeof window !== 'undefined') {
  window.setZoom = (zoom: number) => {
    const event = new CustomEvent('setGlobalZoom', { detail: { zoom } })
    window.dispatchEvent(event)
  }
  
  window.getZoom = () => {
    const savedZoom = localStorage.getItem('app-zoom-level')
    return savedZoom ? parseFloat(savedZoom) : 0.9
  }
}
