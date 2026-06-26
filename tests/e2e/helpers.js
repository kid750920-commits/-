import { expect, test } from '@playwright/test';

export const adminAccount = process.env.E2E_ADMIN_ACCOUNT || '';
export const adminPassword = process.env.E2E_ADMIN_PASSWORD || '';
export const vendorAccount = process.env.E2E_VENDOR_ACCOUNT || '';
export const vendorPassword = process.env.E2E_VENDOR_PASSWORD || '';

export function requireAdmin(){
  test.skip(!adminAccount || !adminPassword, '需要設定 E2E_ADMIN_ACCOUNT / E2E_ADMIN_PASSWORD');
}

export function requireVendor(){
  test.skip(!vendorAccount || !vendorPassword, '需要設定 E2E_VENDOR_ACCOUNT / E2E_VENDOR_PASSWORD');
}

export async function collectPageErrors(page){
  const errors = [];
  page.on('pageerror', err => errors.push(`pageerror: ${err.message}`));
  page.on('console', msg => {
    if(msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  return errors;
}

export async function login(page, account, password){
  await page.goto('/');
  await page.locator('#loginPage').waitFor({ state: 'visible' });
  await page.locator('#email').fill(account);
  await page.locator('#password').fill(password);
  await page.locator('#loginBtn').click();
  await expect(page.locator('#app')).toBeVisible();
  await expect(page.locator('#dashboard.section.active')).toBeVisible();
}

export async function goSection(page, section){
  await page.locator(`[data-section="${section}"]`).click();
  await expect(page.locator(`#${section}.section.active`)).toBeVisible();
}

export async function selectFirstRealOption(locator){
  const values = await locator.locator('option').evaluateAll(options =>
    options.map(option => option.value).filter(Boolean)
  );
  if(values.length) await locator.selectOption(values[0]);
  return values[0] || '';
}

export async function openFirstCase(page, tab='basic'){
  const target = tab === 'replies' ? '回覆進度' : '查看案件';
  const button = page.getByRole('button', { name: target }).first();
  if(!(await button.count())) return false;
  await button.click();
  await expect(page.locator('#caseModal:not(.hidden)')).toBeVisible();
  if(tab !== 'basic'){
    await page.locator(`[data-modal-tab="${tab}"]`).click();
    await expect(page.locator(`[data-modal-tab="${tab}"]`)).toHaveClass(/active/);
  }
  return true;
}

export async function createCase(page, type, title){
  await goSection(page, 'newCase');
  await page.locator('#caseType').selectOption({ label: type });
  await page.locator('#caseTitle').fill(title);
  await selectFirstRealOption(page.locator('#locationId'));
  await selectFirstRealOption(page.locator('#vendorId'));
  await page.locator('#description').fill(`Playwright 自動測試建立：${title}`);
  await page.locator('#caseForm button[type="submit"]').click();
  await expect(page.locator('#caseList.section.active')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(title)).toBeVisible();
}

export async function downloadFromClick(page, clickAction){
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    clickAction()
  ]);
  return download;
}
