import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function source(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('Hrive web workspace visual alignment', () => {
  it('keeps Settings on shared semantic surfaces instead of fixed light/dark palettes', () => {
    const view = source('src/app/settings/SettingsPageView.tsx');
    const css = source('src/app/settings/settings.css');

    expect(view).toContain('text-foreground');
    expect(view).toContain('bg-background');
    expect(view).toContain('border-border/60');
    expect(view).toContain('bg-muted/20');
    expect(view).not.toContain('bg-white dark:bg-zinc-900');
    expect(view).not.toContain('bg-[#f5f6f9]');
    expect(view).not.toContain('text-[#20242c]');
    expect(css).toContain('background: hsl(var(--background));');
    expect(css).not.toContain('#f5f6f9');
    expect(css).not.toContain('#09090b');
    it('keeps Payroll and Dashboard inside the shared body canvas', () => {
    const payroll = source('src/components/payroll/PayrollWorkspace.tsx');
    const dashboard = source('src/app/dashboard/dashboard.css');

    expect(payroll).toContain('min-h-full bg-background text-foreground');
    expect(payroll).toContain('border-b border-border/60 bg-muted/20');
    expect(payroll).not.toContain('min-h-full bg-[#f7f8fa]');
    expect(dashboard).toContain('min-height: 100%;');
    expect(dashboard).toContain('background: var(--dashboard-bg);');
    expect(dashboard).not.toContain('linear-gradient(180deg, #eef3f9');
    expect(dashboard).not.toContain('linear-gradient(180deg, #111b2a');
  });
});

  it('keeps Positions chrome on the same semantic palette and page surface as the shell', () => {
    const main = source('src/components/positions/PositionsPageMainContent.tsx');
    const toolbar = source('src/components/positions/PositionsDesktopToolbar.tsx');

    expect(main).toContain('positions-content-area h-full min-w-0 flex-1 bg-background');
    expect(main).not.toContain('border-y border-slate-200');
    expect(main).not.toContain('dark:bg-zinc-950');
    expect(toolbar).toContain('border-b border-border/60 bg-background');
    expect(toolbar).toContain('text-foreground');
    expect(toolbar).toContain('text-muted-foreground');
    expect(toolbar).not.toContain('border-slate-100 bg-white');
    expect(toolbar).not.toContain('text-slate-950 dark:text-zinc-50');
  });
});
