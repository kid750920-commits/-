import { expect, test } from '@playwright/test';
import {
  adminAccount,
  adminPassword,
  createCase,
  downloadFromClick,
  goSection,
  login,
  requireAdmin
} from './helpers.js';

test.describe('管理者流程', () => {
  test.beforeEach(() => {
    requireAdmin();
  });

  test('登入後儀表板顯示今日五大模組統計', async ({ page }) => {
    await login(page, adminAccount, adminPassword);
    await expect(page.locator('#dashboardCards')).toContainText('今日順豐送修');
    await expect(page.locator('#dashboardCards')).toContainText('今日貨櫃送修');
    await expect(page.locator('#dashboardCards')).toContainText('今日維修料品申請');
    await expect(page.locator('#dashboardCards')).toContainText('今日液晶面板申請');
    await expect(page.locator('#dashboardCards')).toContainText('今日程式BUG回報');
    await expect(page.locator('#dashboardCards')).toContainText('今日補料');
  });

  test('建立案件後可在案件總表找到', async ({ page }) => {
    await login(page, adminAccount, adminPassword);
    const title = `PW-程式BUG回報-${Date.now()}`;
    await createCase(page, '程式BUG回報', title);
  });

  test('通知中心可標記已讀或保持空狀態', async ({ page }) => {
    await login(page, adminAccount, adminPassword);
    await goSection(page, 'notifications');
    await expect(page.locator('#notificationList')).toBeVisible();

    const readButton = page.getByRole('button', { name: '標記已讀/知悉' }).first();
    if(await readButton.count()){
      await readButton.click();
      await expect(page.locator('#notificationList')).toBeVisible();
    }else{
      await expect(page.locator('#notificationList')).toContainText(/目前沒有通知|未讀|通知/);
    }
  });

  test('案件 Excel 可以匯出下載', async ({ page }) => {
    await login(page, adminAccount, adminPassword);
    await goSection(page, 'importExport');
    const download = await downloadFromClick(page, () => page.locator('#exportExcelBtn').click());
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
  });
});
