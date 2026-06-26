import { expect, test } from '@playwright/test';
import {
  goSection,
  login,
  openFirstCase,
  requireVendor,
  vendorAccount,
  vendorPassword
} from './helpers.js';

test.describe('廠商流程', () => {
  test.beforeEach(() => {
    requireVendor();
  });

  test('廠商可進入工作台並回覆案件', async ({ page }) => {
    await login(page, vendorAccount, vendorPassword);
    await goSection(page, 'vendorPortal');
    await expect(page.locator('#vendorPortalList')).toBeVisible();

    const opened = await openFirstCase(page, 'replies');
    test.skip(!opened, '目前廠商帳戶沒有可測案件');

    const message = `Playwright 廠商回覆 ${Date.now()}`;
    await page.locator('#replyMessage').fill(message);
    await page.locator('#addReplyBtn').click();
    await expect(page.locator('#modalContent')).toContainText(message, { timeout: 30_000 });
  });
});
