"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"
import { logIfInvalidSingleChild } from "./utils"
import { useDynamicZIndex } from "@/contexts/ZIndexContext"

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

interface PopoverContentProps extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> {
  popoverId?: string;
  zIndexType?: 'modal' | 'drawer' | 'overlay' | 'dropdown';
  container?: HTMLElement;
}

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  PopoverContentProps
>(({ className, align = "center", sideOffset = 4, popoverId, zIndexType = 'overlay', style, container, ...props }, ref) => {
  const { contentZIndex } = useDynamicZIndex(popoverId || 'default-popover', zIndexType);
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Check if this is a dropdown-like popover (has specific width classes or is used for selection)
  // Most dropdown popovers have width based on trigger or specific widths, not the default w-72
  const isDropdownLike = className && (
    className.includes('w-[280px]') || 
    className.includes('w-[300px]') || 
    className.includes('w-[320px]') ||
    className.includes('w-full') ||
    className.includes('w-[var(--radix-popover-trigger-width)]') ||
    className.includes('max-h-') ||
    className.includes('overflow-y-auto') ||
    (className.includes('w-') && !className.includes('w-72') && !className.includes('w-auto'))
  );
  
  return (
    <PopoverPrimitive.Portal container={container}>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          isMobile && isDropdownLike
            ? "fixed left-0 right-0 bottom-0 top-auto max-h-[85vh] !rounded-t-2xl !rounded-b-none border-t border-l border-r bg-popover p-4 text-popover-foreground shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom pointer-events-auto"
            : "w-72 rounded-lg border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 pointer-events-auto",
          className
        )}
        style={{ 
          zIndex: contentZIndex, 
          ...style,
          ...(isMobile && isDropdownLike ? { 
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            top: 'auto'
          } : {})
        }}
        side={isMobile && isDropdownLike ? "bottom" : undefined}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
})
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
