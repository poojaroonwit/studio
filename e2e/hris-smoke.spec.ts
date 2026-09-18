import { expect, test, type Response } from '@playwright/test';

function expectApplicationRoute(response: Response | null) {
  expect(response).not.toBeNull();
  expect(response?.status()).not.toBe(404);
  expect(response?.status()).toBeLessThan(500);
}

test.describe('HRIS protected surfaces', () => {
  for (const [path, label] of [
    ['/people/movements', 'employee movements'],
    ['/people/talent', 'talent and mobility'],
    ['/workforce/planning', 'workforce planning'],
    ['/workforce/performance?tab=appraisal', 'appraisal'],
    ['/ess/opportunities', 'internal opportunities'],
  ] as const) {
    test(`${label} is a valid application route`, async ({ page }) => {
      const response = await page.goto(path);

      expectApplicationRoute(response);
      await expect(page.locator('body')).toBeVisible();
    });
  }

  test('engagement workspace is a valid application route', async ({ page }) => {
    const response = await page.goto('/workforce/engagement');

    expectApplicationRoute(response);
    await expect(page.locator('body')).toBeVisible();
  });

  test('career explorer is a valid Learning route', async ({ page }) => {
    const response = await page.goto('/learning/career-explorer');

    expectApplicationRoute(response);
    await expect(page.locator('body')).toBeVisible();
  });

  test('trusted certificates is a valid Learning route', async ({ page }) => {
    const response = await page.goto('/learning/trusted-certificates');

    expectApplicationRoute(response);
    await expect(page.locator('body')).toBeVisible();
  });

  test('achievements is a valid dedicated Learning route', async ({ page }) => {
    const response = await page.goto('/learning/achievements');

    expectApplicationRoute(response);
    await expect(page.locator('body')).toBeVisible();
  });

  test('internal mobility API requires an authenticated session', async ({ request }) => {
    const response = await request.get('/api/ess/internal-opportunities');

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'UNAUTHORIZED',
      },
    });
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

  test('headcount bulk actions require an authenticated session', async ({ request }) => {
    const response = await request.post('/api/hiring/headcount-requests/bulk-action', {
      data: {
        ids: ['00000000-0000-0000-0000-000000000000'],
        action: 'approve',
      },
    });

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ message: 'Unauthorized' });
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
