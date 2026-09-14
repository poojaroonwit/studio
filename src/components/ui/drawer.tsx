"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"
import { XMarkIcon } from "@heroicons/react/24/outline"
import { useDynamicZIndex, useLayerInstanceId } from "@/contexts/ZIndexContext"
import { VisuallyHidden } from "@/components/ui/visually-hidden"

import { cn } from "@/lib/utils"
import {
  hasLayerA11yChild,
  LAYER_CLOSE_BUTTON_CLASS_NAME,
  LAYER_DESCRIPTION_CLASS_NAME,
  LAYER_OVERLAY_CLASS_NAME,
  LAYER_TITLE_CLASS_NAME,
} from "./layered-ui"

const Drawer = ({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root
    shouldScaleBackground={shouldScaleBackground}
    {...props}
  />
)
Drawer.displayName = "Drawer"

const DrawerTrigger = DrawerPrimitive.Trigger

const DrawerPortal = DrawerPrimitive.Portal

const DrawerClose = DrawerPrimitive.Close

interface DrawerOverlayProps extends React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay> {
  drawerId?: string;
}

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  DrawerOverlayProps
>(({ className, drawerId, ...props }, ref) => {
  const { overlayZIndex } = useDynamicZIndex(drawerId || 'default-drawer', 'drawer');

  return (
    <DrawerPrimitive.Overlay
      ref={ref}
      className={cn(LAYER_OVERLAY_CLASS_NAME, className)}
      style={{ zIndex: overlayZIndex }}
      {...props}
    />
  );
})
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName

interface DrawerContentProps extends React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> {
  drawerId?: string;
  hideCloseButton?: boolean;
}

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  DrawerContentProps
>(({ className, children, drawerId, hideCloseButton = false, style, ...props }, ref) => {
  const effectiveDrawerId = useLayerInstanceId(drawerId, "drawer");
  const { contentZIndex } = useDynamicZIndex(effectiveDrawerId, 'drawer');
  const hasVisibleTitle = hasLayerA11yChild(children, DrawerPrimitive.Title.displayName);
  const hasVisibleDescription = hasLayerA11yChild(children, DrawerPrimitive.Description.displayName);
  const needsFallbackTitle = !hasVisibleTitle && !props['aria-label'] && !props['aria-labelledby'];
  const needsFallbackDescription = !hasVisibleDescription && props['aria-describedby'] === undefined;

  return (
    <DrawerPortal>
      <DrawerOverlay drawerId={effectiveDrawerId} />
      <DrawerPrimitive.Content
        ref={ref}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-xl border bg-background shadow-xl",
          className
        )}
        style={{ zIndex: contentZIndex, ...style }}
        {...props}
      >
        {needsFallbackTitle && (
          <VisuallyHidden>
            <DrawerTitle>Drawer</DrawerTitle>
          </VisuallyHidden>
        )}
        {needsFallbackDescription && (
          <VisuallyHidden>
            <DrawerDescription>Drawer content</DrawerDescription>
          </VisuallyHidden>
        )}
        <div className="mx-auto mt-4 h-1.5 w-16 rounded-full bg-muted" aria-hidden="true" />
        {children}
        {!hideCloseButton && !hasDrawerClose(children) && (
          <DrawerPrimitive.Close
            className={cn("absolute right-4 top-4 z-[1]", LAYER_CLOSE_BUTTON_CLASS_NAME)}
          >
            <XMarkIcon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DrawerPrimitive.Close>
        )}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
})
DrawerContent.displayName = "DrawerContent"

function hasDrawerClose(children: React.ReactNode): boolean {
  return React.Children.toArray(children).some((child) => {
    if (!React.isValidElement(child)) return false;
    const childType = child.type as React.ComponentType & { displayName?: string };
    if (childType.displayName === DrawerPrimitive.Close.displayName) return true;
    return hasDrawerClose((child.props as { children?: React.ReactNode }).children);
  });
}

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("grid gap-1.5 border-b border-border/60 p-4 pr-14 text-left", className)}
    {...props}
  />
)
DrawerHeader.displayName = "DrawerHeader"

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("mt-auto flex flex-col gap-2 p-4", className)}
    {...props}
  />
)
DrawerFooter.displayName = "DrawerFooter"

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn(LAYER_TITLE_CLASS_NAME, className)}
    {...props}
  />
))
DrawerTitle.displayName = DrawerPrimitive.Title.displayName

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn(LAYER_DESCRIPTION_CLASS_NAME, className)}
    {...props}
  />
))
DrawerDescription.displayName = DrawerPrimitive.Description.displayName

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
