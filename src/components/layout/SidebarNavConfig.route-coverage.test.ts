import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildMobileNavItems } from './MobileBottomNav';
import { sidebarConfigData } from './SidebarNavConfig';

function hrefToAppPagePath(href: string) {
  const pathname = href.split(/[?#]/, 1)[0] || '/';
  const segments = pathname.split('/').filter(Boolean);
  return resolve(process.cwd(), 'src', 'app', ...segments, 'page.tsx');
}

function missingPageRoutes(hrefs: string[]) {
  return hrefs
    .filter(href => href.startsWith('/'))
    .filter(href => !existsSync(hrefToAppPagePath(href)));
}

describe('navigation route coverage', () => {
  it('points every sidebar navigation item at an implemented Next.js page', () => {
    const hrefs = sidebarConfigData.flatMap(group => group.items.map(item => item.href));
    const missingRoutes = missingPageRoutes(hrefs);

    expect(missingRoutes, `Missing sidebar pages: ${missingRoutes.join(', ')}`).toEqual([]);
  });

  it('points every mobile navigation item at an implemented Next.js page', () => {
    const hrefs = buildMobileNavItems({ role: 'admin' }).map(item => item.href);
    const missingRoutes = missingPageRoutes(hrefs);

    expect(missingRoutes, `Missing mobile pages: ${missingRoutes.join(', ')}`).toEqual([]);
  });

  it('keeps Hiring reachable for users who can view candidates', () => {
    const items = buildMobileNavItems({
      role: 'user',
      modulePermissions: ['CANDIDATES_VIEW'],
    });

    expect(items.some(item => item.href === '/applicants')).toBe(true);
  });
});
