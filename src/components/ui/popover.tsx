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
}

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  PopoverContentProps
>(({ className, align = "center", sideOffset = 4, popoverId, zIndexType = 'overlay', style, ...props }, ref) => {
  const { contentZIndex } = useDynamicZIndex(popoverId || 'default-popover', zIndexType);
  
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "w-72 rounded-lg border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        style={{ zIndex: contentZIndex, ...style }}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
})
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
