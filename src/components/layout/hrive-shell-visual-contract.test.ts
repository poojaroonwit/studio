import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function source(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('Hrive desktop shell visual contract', () => {
  it('renders the desktop primary navigation on a light header with dark controls', () => {
    const header = source('src/components/layout/Header.tsx');
    const primaryItem = source('src/components/layout/HeaderMegaMenuCategory.tsx');

    expect(header).toContain('bg-white/95');
    expect(header).toContain('border-slate-200/80');
    expect(header).not.toContain('bg-[#111827]');
    expect(primaryItem).toContain('text-slate-600');
    expect(primaryItem).toContain('after:bg-blue-600');
  });

  it('renders the secondary navigation as a light tab row', () => {
    const secondary = source('src/components/layout/HeaderSecondaryNavigation.tsx');

    expect(secondary).toContain('bg-white/90');
    expect(secondary).toContain('border-slate-200/80');
    expect(secondary).toContain('text-slate-600');
    expect(secondary).toContain('after:bg-blue-600');
    expect(secondary).not.toContain('bg-[#182235]');
  });

  it('places page content in a rounded white canvas over a soft cool gradient', () => {
    const shell = source('src/components/layout/AppLayoutShell.tsx');

    expect(shell).toContain('bg-[radial-gradient(');
    expect(shell).toContain('lg:rounded-[24px]');
    expect(shell).toContain('lg:border-slate-200/80');
    expect(shell).toContain('lg:shadow-[0_18px_48px_rgba(15,23,42,0.08)]');
  });

  it('uses light utility controls for search, HR help, and the desktop user trigger', () => {
    const search = source('src/components/layout/HeaderExpandableSearch.tsx');
    const help = source('src/components/privacy-support/HrHelpWidget.tsx');
    const userMenu = source('src/components/layout/HeaderDesktopUserMenuAccount.tsx');
    const actions = source('src/components/layout/HeaderActionsSection.tsx');

    expect(search).toContain('text-slate-500');
    expect(search).toContain('bg-white');
    expect(help).toContain('text-slate-600');
    expect(userMenu).toContain('text-slate-700');
    expect(actions).toContain('bg-slate-200');
  });
});
