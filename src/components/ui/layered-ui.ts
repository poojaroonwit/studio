import * as React from "react";

/** Shared visual and accessibility contracts for modal and drawer-style layers. */
export const LAYER_OVERLAY_CLASS_NAME =
  "fixed inset-0 bg-black/45 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 dark:bg-black/60";

export const LAYER_CLOSE_BUTTON_CLASS_NAME =
  "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/90 text-muted-foreground shadow-sm ring-offset-background transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none";

export const LAYER_TITLE_CLASS_NAME =
  "text-base font-semibold leading-tight tracking-[-0.01em] text-foreground";

export const LAYER_DESCRIPTION_CLASS_NAME =
  "text-sm leading-5 text-muted-foreground";

export function hasLayerA11yChild(
  children: React.ReactNode,
  displayName?: string,
): boolean {
  if (!displayName) return false;

  return React.Children.toArray(children).some((child) => {
    if (!React.isValidElement(child)) return false;

    const childType = child.type as React.ComponentType & { displayName?: string };
    if (childType.displayName === displayName) return true;

    return hasLayerA11yChild(
      (child.props as { children?: React.ReactNode }).children,
      displayName,
    );
  });
}
