# Playwright 自動化測試

## 本機執行

先安裝依賴與瀏覽器：

```powershell
npm install
npx playwright install chromium
```

只跑登入頁與模組載入檢查：

```powershell
npm run test:smoke
```

跑完整 E2E：

```powershell
$env:E2E_BASE_URL="https://xin-guan-li-xi-tong.vercel.app"
$env:E2E_ADMIN_ACCOUNT="管理者帳號"
$env:E2E_ADMIN_PASSWORD="管理者密碼"
$env:E2E_VENDOR_ACCOUNT="廠商帳號"
$env:E2E_VENDOR_PASSWORD="廠商密碼"
npm run test:e2e
```

## GitHub Actions

已新增 `.github/workflows/playwright.yml`。

請到 GitHub repo 設定：

- `Settings -> Secrets and variables -> Actions -> Secrets`
- 新增：
  - `E2E_ADMIN_ACCOUNT`
  - `E2E_ADMIN_PASSWORD`
  - `E2E_VENDOR_ACCOUNT`
  - `E2E_VENDOR_PASSWORD`

可選：

- `Settings -> Secrets and variables -> Actions -> Variables`
- 新增：
  - `E2E_BASE_URL`

沒有帳密時，登入頁 smoke test 仍會跑；需要登入的測試會自動略過。

## 目前覆蓋項目

- 登入頁與 JS 模組載入
- 管理者登入
- 管理者儀表板今日統計
- 建立案件
- 通知未讀 / 已讀操作
- 廠商工作台回覆案件
- 液晶面板申請補料登記
- 案件 Excel 匯出下載
