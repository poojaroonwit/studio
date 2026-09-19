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
    <div className={cn('mx-auto w-full max-w-[1440px] px-3 sm:px-5 lg:px-7', className)} {...props}>
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
    <h1 className={cn('text-[clamp(1.35rem,2vw,1.75rem)] font-semibold tracking-tight text-foreground', className)} {...props}>
      {children}
    </h1>
  );
}


interface AppPageIntroProps extends ComponentPropsWithoutRef<'div'> {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

/** Shared page-level hierarchy for list, detail and self-service routes. */
export function AppPageIntro({
  eyebrow,
  title,
  description,
  actions,
  className,
  ...props
}: AppPageIntroProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 pb-1 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
      {...props}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>
        ) : null}
        <h1 className="mt-1 text-[clamp(1.35rem,2vw,1.75rem)] font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

interface AppPageSectionProps extends ComponentPropsWithoutRef<'section'> {
  children: ReactNode;
}

/** Shared grouped surface used across dashboard, ESS and administration pages. */
export function AppPageSection({ children, className, ...props }: AppPageSectionProps) {
  return (
    <section
      className={cn('rounded-2xl border border-border bg-card text-card-foreground', className)}
      {...props}
    >
      {children}
    </section>
  );
}
