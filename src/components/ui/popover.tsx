"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"
import { logIfInvalidSingleChild } from "./utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>>(
  function PopoverTriggerWithDebug(props, ref) {
    logIfInvalidSingleChild(props.children, "PopoverTrigger");
    return (
      <PopoverPrimitive.Trigger {...props} ref={ref}>
        {props.children}
      </PopoverPrimitive.Trigger>
    );
  }
);

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => {
  const [zoom, setZoom] = React.useState(1);
  
  React.useEffect(() => {
    // Get current zoom level from document
    const getCurrentZoom = () => {
      if (window.getZoom) {
        return window.getZoom();
      }
      const savedZoom = localStorage.getItem('app-zoom-level');
      return savedZoom ? parseFloat(savedZoom) : 1;
    };
    
    const updateZoom = () => {
      setZoom(getCurrentZoom());
    };
    
    // Set initial zoom
    updateZoom();
    
    // Listen for zoom changes
    const handleZoomChange = (event: CustomEvent) => {
      if (event.detail && event.detail.zoom) {
        setZoom(event.detail.zoom);
      }
    };
    
    window.addEventListener('zoomChanged', handleZoomChange as EventListener);
    
    return () => {
      window.removeEventListener('zoomChanged', handleZoomChange as EventListener);
    };
  }, []);

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        style={{ 
          transform: `scale(${zoom})`,
          transformOrigin: 'top left'
        }}
        className={cn(
          "z-[50] w-72 rounded-lg border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
})
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
