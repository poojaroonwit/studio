import { expect, test, type Page } from '@playwright/test';

async function expectValidApplicationRoute(page: Page, path: string) {
  const response = await page.goto(path);

  expect(response, `${path} should return a browser response`).not.toBeNull();
  expect(response!.status(), `${path} should not resolve to an error or missing page`).toBeLessThan(400);
  await expect(page.locator('body')).toBeVisible();
}

test.describe('HRIS protected surfaces', () => {
  test('operations workspace is a valid application route', async ({ page }) => {
    await expectValidApplicationRoute(page, '/people/hris-operations');
  });

  test('engagement workspace is a valid application route', async ({ page }) => {
    await expectValidApplicationRoute(page, '/workforce/engagement');
  });

  test('sign-in surface fits the configured viewport', async ({ page }) => {
    await expectValidApplicationRoute(page, '/auth/signin');

    const viewport = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth + 1);
  });

  test('HR API requires an authenticated session', async ({ request }) => {
    const response = await request.get('/api/hr/v1/assignments?pageSize=1');

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'UNAUTHORIZED',
      },
    });
  });

  test('payroll preview requires an authenticated session', async ({ request }) => {
    const response = await request.post('/api/payroll/v1/calculate-preview', {
      data: {
        employeeId: '00000000-0000-0000-0000-000000000000',
        periodStart: '2026-07-01',
        periodEnd: '2026-07-31',
        baseSalary: 50_000,
      },
    });

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'UNAUTHORIZED',
      },
    });
  });
});
