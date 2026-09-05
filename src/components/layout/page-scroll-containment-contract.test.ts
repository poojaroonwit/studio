import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const APP_ROOT = path.join(process.cwd(), 'src/app');
const COMPONENTS_ROOT = path.join(process.cwd(), 'src/components');
const ROOTS = [APP_ROOT, COMPONENTS_ROOT];

function tsxFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const absolute = path.join(root, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) return tsxFiles(absolute);
    return entry.endsWith('.tsx') ? [absolute] : [];
  });
}

function staticClassNames(source: string): string[] {
  const classes: string[] = [];
  const patterns = [
    /className\s*=\s*"([^"]+)"/g,
    /className\s*=\s*'([^']+)'/g,
    /className\s*=\s*\{cn\(\s*"([^"]+)"/g,
    /className\s*=\s*\{cn\(\s*'([^']+)'/g,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      classes.push(match[1]);
    }
  }

  return classes;
}

function staticScrollAreaClassNames(source: string): string[] {
  const classes: string[] = [];
  const patterns = [
    /<ScrollArea[^>]*className\s*=\s*"([^"]+)"/g,
    /<ScrollArea[^>]*className\s*=\s*'([^']+)'/g,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      classes.push(match[1]);
    }
  }

  return classes;
}

describe('page scroll containment contract', () => {
  it('keeps full-height app flex columns shrinkable', () => {
    const offenders: string[] = [];

    for (const absolute of tsxFiles(APP_ROOT)) {
      const source = readFileSync(absolute, 'utf8');
      const relative = path.relative(process.cwd(), absolute);

      for (const className of staticClassNames(source)) {
        const tokens = new Set(className.split(/\s+/));
        const fullHeightColumn = (
          tokens.has('h-full')
          && tokens.has('flex')
          && tokens.has('flex-col')
        );

        if (fullHeightColumn && !tokens.has('min-h-0')) {
          offenders.push(`${relative}: ${className}`);
        }
      }
    }

    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('keeps flex scroll and clipping children shrinkable', () => {
    const offenders: string[] = [];

    for (const absolute of ROOTS.flatMap(tsxFiles)) {
      const source = readFileSync(absolute, 'utf8');
      const relative = path.relative(process.cwd(), absolute);

      for (const className of staticClassNames(source)) {
        const tokens = new Set(className.split(/\s+/));
        const flexScrollChild = (
          tokens.has('flex-1')
          && (
            tokens.has('overflow-hidden')
            || tokens.has('overflow-auto')
            || tokens.has('overflow-y-auto')
          )
        );

        if (flexScrollChild && !tokens.has('min-h-0')) {
          offenders.push(`${relative}: ${className}`);
        }
      }
    }

    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('keeps flex ScrollArea children shrinkable inside pages and page-supporting components', () => {
    const offenders: string[] = [];

    for (const absolute of ROOTS.flatMap(tsxFiles)) {
      const source = readFileSync(absolute, 'utf8');
      const relative = path.relative(process.cwd(), absolute);

      for (const className of staticScrollAreaClassNames(source)) {
        const tokens = new Set(className.split(/\s+/));
        if (tokens.has('flex-1') && !tokens.has('min-h-0')) {
          offenders.push(`${relative}: ${className}`);
        }
      }
    }

    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('keeps the authenticated and settings shell scroll rails shrink-safe', () => {
    const appShell = readFileSync(
      path.join(process.cwd(), 'src/components/layout/AppLayoutShell.tsx'),
      'utf8',
    );
    const settingsShell = readFileSync(
      path.join(process.cwd(), 'src/app/settings/SettingsClientLayout.tsx'),
      'utf8',
    );

    expect(appShell).toContain('min-h-0 flex-1 overflow-y-auto');
    expect(settingsShell).toContain('min-h-0 flex-1 overflow-y-auto');
  });
});
