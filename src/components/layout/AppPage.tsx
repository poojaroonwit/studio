import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AppPageProps extends ComponentPropsWithoutRef<'div'> {
  children: ReactNode;
}

/**
 * Shared route surface. Keeps page background, foreground and minimum height
 * aligned with the currently selected application theme.
 */
export function AppPage({ children, className, ...props }: AppPageProps) {
  return (
    <div
      className={cn('min-h-full bg-[hsl(var(--app-page-background,var(--background)))] text-foreground', className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface AppPageHeaderProps extends ComponentPropsWithoutRef<'header'> {
  children: ReactNode;
  contained?: boolean;
}

/** Shared semantic page header using the active card/border theme tokens. */
export function AppPageHeader({
  children,
  className,
  contained = true,
  ...props
}: AppPageHeaderProps) {
  return (
    <header className={cn('border-b border-border bg-card text-card-foreground', className)} {...props}>
      {contained ? <AppPageContainer className="py-6">{children}</AppPageContainer> : children}
    </header>
  );
}

interface AppPageContainerProps extends ComponentPropsWithoutRef<'div'> {
  children: ReactNode;
}

/** Shared responsive page width and horizontal gutters. */
export function AppPageContainer({ children, className, ...props }: AppPageContainerProps) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)} {...props}>
      {children}
    </div>
  );
}

interface AppPageTitleProps extends ComponentPropsWithoutRef<'h1'> {
  children: ReactNode;
}

/** Shared page title typography that always inherits the application font. */
export function AppPageTitle({ children, className, ...props }: AppPageTitleProps) {
  return (
    <h1 className={cn('text-3xl font-bold text-foreground', className)} {...props}>
      {children}
    </h1>
  );
}
