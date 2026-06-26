import { expect, test } from '@playwright/test';
import {
  adminAccount,
  adminPassword,
  goSection,
  login,
  requireAdmin,
  selectFirstRealOption
} from './helpers.js';

test.describe('液晶面板補料流程', () => {
  test.beforeEach(() => {
    requireAdmin();
  });

  test('建立液晶申請後可登記補料', async ({ page }) => {
    await login(page, adminAccount, adminPassword);
    const stamp = Date.now();
    const title = `PW-液晶面板補料-${stamp}`;
    const sn = `PW-SN-${stamp}`;

    await goSection(page, 'newCase');
    await page.locator('#caseType').selectOption({ label: '液晶面板申請(保固內)' });
    await page.locator('#caseTitle').fill(title);
    await selectFirstRealOption(page.locator('#locationId'));
    await selectFirstRealOption(page.locator('#vendorId'));
    await page.locator('#description').fill('Playwright 液晶面板補料流程測試');

    await page.locator('.item-editor').first().locator('[data-field="item_name"]').fill('液晶面板');
    await page.locator('.item-editor').first().locator('[data-field="spec"]').fill('測試設備資訊');
    await page.locator('.item-editor').first().locator('[data-field="sn"]').fill(sn);
    await page.locator('.item-editor').first().locator('[data-field="qty"]').fill('1');
    await page.locator('.item-editor').first().locator('[data-field="problem_desc"]').fill('測試問題確認');

    await page.locator('#caseForm button[type="submit"]').click();
    await expect(page.locator('#caseList.section.active')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(title)).toBeVisible();
    await page.getByText(title).click();

    const rowButton = page.locator('tr', { hasText: title }).getByRole('button', { name: /查看|編輯/ }).first();
    if(await rowButton.count()) await rowButton.click();
    else await page.getByRole('button', { name: /查看|編輯/ }).first().click();

    await expect(page.locator('#caseModal:not(.hidden)')).toBeVisible();
    await page.locator('[data-modal-tab="items"]').click();
    await expect(page.locator('.lcd-restock-check').first()).toBeVisible({ timeout: 30_000 });
    await page.locator('.lcd-restock-check').first().check();
    await page.locator('#lcdRestockBatch').fill(`PW-BATCH-${stamp}`);
    await page.locator('#lcdRestockContainer').fill(`PW-CONT-${stamp}`);
    await page.locator('#saveLcdRestockBtn').click();
    await expect(page.locator('#modalContent')).toContainText(`PW-CONT-${stamp}`, { timeout: 30_000 });
  });
});
