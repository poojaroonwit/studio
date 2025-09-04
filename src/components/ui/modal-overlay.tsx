"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useModalManager } from "@/lib/modal-manager"

interface ModalOverlayProps {
  id: string;
  type: 'dialog' | 'alert-dialog' | 'sheet' | 'custom';
  className?: string;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * Custom overlay component that integrates with the modal manager
 * Prevents overlay stacking issues by using a single global overlay
 */
export const ModalOverlay = React.forwardRef<HTMLDivElement, ModalOverlayProps>(
  ({ id, type, className, children, onClick, ...props }, ref) => {
    const { zIndex, overlayZIndex } = useModalManager(id, type);

    const handleClick = (e: React.MouseEvent) => {
      // Only handle clicks on the overlay itself, not children
      if (e.target === e.currentTarget) {
        onClick?.(e);
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          "fixed inset-0 bg-black/20 backdrop-blur-sm",
          className
        )}
        style={{ zIndex: overlayZIndex }}
        onClick={handleClick}
        data-modal-overlay={id}
        data-modal-type={type}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ModalOverlay.displayName = "ModalOverlay"

/**
 * Modal content wrapper that uses the modal manager for z-index
 */
interface ModalContentProps {
  id: string;
  type: 'dialog' | 'alert-dialog' | 'sheet' | 'custom';
  className?: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}

export const ModalContent = React.forwardRef<HTMLDivElement, ModalContentProps>(
  ({ id, type, className, children, onClick, ...props }, ref) => {
    const { zIndex } = useModalManager(id, type);

    const handleClick = (e: React.MouseEvent) => {
      // Prevent clicks from bubbling to overlay
      e.stopPropagation();
      onClick?.(e);
    };

    return (
      <div
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-background text-foreground p-6 shadow-lg sm:rounded-xl",
          className
        )}
        style={{ zIndex }}
        onClick={handleClick}
        data-modal-content={id}
        data-modal-type={type}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ModalContent.displayName = "ModalContent"
