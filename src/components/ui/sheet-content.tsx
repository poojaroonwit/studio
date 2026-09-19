"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { cva, type VariantProps } from "class-variance-authority";

import { useDynamicZIndex, useLayerInstanceId } from "@/contexts/ZIndexContext";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { useDrawerStyle } from "@/hooks/use-drawer-style";
import { cn } from "@/lib/utils";
import {
  hasLayerA11yChild,
  LAYER_CLOSE_BUTTON_CLASS_NAME,
  LAYER_OVERLAY_CLASS_NAME,
} from "./layered-ui";
import { SheetPortal } from "./sheet-root";
import { SheetDescription, SheetTitle } from "./sheet-sections";

const sheetVariants = cva(
  "fixed gap-4 bg-background p-6 shadow-xl transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
        right:
          "inset-x-0 bottom-0 h-[min(88dvh,48rem)] w-full rounded-t-[24px] border-t max-sm:data-[state=closed]:slide-out-to-bottom max-sm:data-[state=open]:slide-in-from-bottom sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:w-3/4 sm:rounded-none sm:border-l sm:border-t-0 sm:data-[state=closed]:slide-out-to-right sm:data-[state=open]:slide-in-from-right",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

interface SheetOverlayProps extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay> {
  sheetId?: string;
  forceZIndex?: number;
}

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  SheetOverlayProps
>(({ className, sheetId, forceZIndex, ...props }, ref) => {
  const { overlayZIndex: contextOverlayZIndex } = useDynamicZIndex(sheetId || "default-sheet", "drawer");
  const overlayZIndex = forceZIndex !== undefined ? forceZIndex : contextOverlayZIndex;

  return (
    <SheetPrimitive.Overlay
      className={cn(LAYER_OVERLAY_CLASS_NAME, className)}
      style={{ zIndex: overlayZIndex }}
      {...props}
      ref={ref}
    />
  );
});
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
  VariantProps<typeof sheetVariants> {
  sheetId?: string;
  hideCloseButton?: boolean;
  forceZIndex?: number;
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, sheetId, style, hideCloseButton = false, forceZIndex, ...props }, ref) => {
  const effectiveSheetId = useLayerInstanceId(sheetId, "sheet");
  const { contentZIndex: contextContentZIndex } = useDynamicZIndex(effectiveSheetId, "drawer");
  const drawerStyle = useDrawerStyle();
  const contentZIndex = forceZIndex !== undefined ? forceZIndex : contextContentZIndex;
  const insetStyleClasses = getSheetInsetStyleClasses({
    className,
    isModern: drawerStyle === "modern",
    side,
  });
  const hasVisibleTitle = hasLayerA11yChild(children, SheetPrimitive.Title.displayName);
  const hasVisibleDescription = hasLayerA11yChild(children, SheetPrimitive.Description.displayName);
  const needsFallbackTitle = !hasVisibleTitle && !props["aria-label"] && !props["aria-labelledby"];
  const needsFallbackDescription = !hasVisibleDescription && props["aria-describedby"] === undefined;

  return (
    <SheetPortal>
      <SheetOverlay sheetId={effectiveSheetId} forceZIndex={forceZIndex !== undefined ? forceZIndex - 1 : undefined} />
      <SheetPrimitive.Content
        ref={ref}
        className={cn(
          sheetVariants({ side }),
          insetStyleClasses,
          className,
        )}
        style={{ zIndex: contentZIndex, ...style }}
        {...props}
      >
        {needsFallbackTitle && (
          <VisuallyHidden>
            <SheetTitle>Sheet</SheetTitle>
          </VisuallyHidden>
        )}
        {needsFallbackDescription && (
          <VisuallyHidden>
            <SheetDescription>Sheet content</SheetDescription>
          </VisuallyHidden>
        )}
        {children}
        {!hideCloseButton && (
          <SheetPrimitive.Close
            className={cn("absolute right-4 top-4", LAYER_CLOSE_BUTTON_CLASS_NAME)}
          >
            <XMarkIcon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
});
SheetContent.displayName = SheetPrimitive.Content.displayName;

function getSheetInsetStyleClasses({
  className,
  isModern,
  side,
}: {
  className?: string;
  isModern: boolean;
  side: "top" | "bottom" | "left" | "right" | null | undefined;
}) {
  if (side !== "right") {
    return "";
  }

  const hasCustomWidth = Boolean(className && /w-\[|w-1\/|w-2\/|w-3\/|w-4\/|w-5\/|max-w-\[/.test(className));
  const mobilePresentation = "max-sm:!inset-x-0 max-sm:!bottom-0 max-sm:!top-auto max-sm:!h-[min(88dvh,48rem)] max-sm:!w-full max-sm:!max-w-none max-sm:!rounded-t-[24px] max-sm:!rounded-b-none";
  const desktopInset = "sm:!top-4 sm:!bottom-4 sm:!right-4 sm:!left-auto sm:!h-[calc(100dvh-2rem)] sm:rounded-[20px]";

  if (isModern && !hasCustomWidth) {
    return `${mobilePresentation} ${desktopInset} sm:!w-96 sm:!max-w-md`;
  }

  return `${mobilePresentation} ${desktopInset}`;
}

export {
  SheetContent,
  SheetOverlay,
};
