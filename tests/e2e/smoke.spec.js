import { expect, test } from '@playwright/test';
import { collectPageErrors } from './helpers.js';

test('登入頁與主要模組檔案可正常載入', async ({ page }) => {
  const errors = await collectPageErrors(page);
  await page.goto('/');
  await expect(page).toHaveTitle(/協作追蹤系統/);
  await expect(page.locator('#loginBtn')).toBeVisible();

  const moduleChecks = await page.evaluate(async () => {
    const paths = [
      '/js/app.js',
      '/js/modules/dashboard-render.js',
      '/js/modules/notification-center.js',
      '/js/modules/case-export.js',
      '/js/modules/workflow-render.js'
    ];
    const results = [];
    for(const path of paths){
      const res = await fetch(path);
      results.push({ path, ok: res.ok, status: res.status });
    }
    return results;
  });

  expect(moduleChecks.every(item => item.ok)).toBeTruthy();
  expect(errors).toEqual([]);
});
