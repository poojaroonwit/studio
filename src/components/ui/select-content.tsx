"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { ChevronDownIcon, ChevronUpIcon, XMarkIcon } from "@heroicons/react/24/outline"

import { useDynamicZIndex } from "@/contexts/ZIndexContext"
import { cn } from "@/lib/utils"
import { useSelectIsMobile } from "./select-mobile"

interface SelectContentProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> {
  selectId?: string
}

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronUpIcon className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronDownIcon className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  SelectContentProps
>(({ className, children, position = "popper", selectId, ...props }, ref) => {
  const { contentZIndex } = useDynamicZIndex(selectId || "default-select", "dropdown")
  const isMobile = useSelectIsMobile()

  if (isMobile) {
    return (
      <MobileSelectContent
        ref={ref}
        className={className}
        contentZIndex={contentZIndex}
        {...props}
      >
        {children}
      </MobileSelectContent>
    )
  }

  return (
    <DesktopSelectContent
      ref={ref}
      className={className}
      contentZIndex={contentZIndex}
      position={position}
      {...props}
    >
      {children}
    </DesktopSelectContent>
  )
})
SelectContent.displayName = SelectPrimitive.Content.displayName

const MobileSelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> & { contentZIndex: number }
>(({ children, className, contentZIndex, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-0 top-0 bottom-0 left-0 right-0 !rounded-none border-0 bg-background text-foreground shadow-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      style={{ zIndex: contentZIndex + 100 }}
      position="popper"
      side="bottom"
      align="start"
      sideOffset={0}
      {...props}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0 bg-background">
          <h3 className="text-lg font-semibold">Select Option</h3>
          <button
            type="button"
            className="p-2 rounded-full hover:bg-accent transition-colors"
            onClick={closeSelectWithEscape}
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <SelectPrimitive.Viewport className="p-0">{children}</SelectPrimitive.Viewport>
        </div>
      </div>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
MobileSelectContent.displayName = "MobileSelectContent"

const DesktopSelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> & { contentZIndex: number }
>(({ children, className, contentZIndex, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative max-h-96 min-w-[8rem] overflow-hidden !rounded-lg border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      style={{ zIndex: contentZIndex }}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
DesktopSelectContent.displayName = "DesktopSelectContent"

function closeSelectWithEscape(event: React.MouseEvent<HTMLButtonElement>) {
  event.preventDefault()
  event.stopPropagation()
  document.dispatchEvent(new KeyboardEvent("keydown", {
    key: "Escape",
    code: "Escape",
    keyCode: 27,
    bubbles: true,
    cancelable: true,
  }))
}

export { SelectContent, SelectScrollDownButton, SelectScrollUpButton }
