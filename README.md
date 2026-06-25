# 新管理系統

正式網址：
https://xin-guan-li-xi-tong.vercel.app

## 同步方式

- 程式碼以 GitHub repository 為主。
- 正式網站由 Vercel 部署。
- 使用資料、帳號、附件紀錄放在 Supabase。
- 不同電腦操作 Codex 前，先同步 GitHub 最新版本，避免檔案不一致。

## 專案結構

- `index.html`：主要 HTML 畫面。
- `js/main.js`：前端 ES module 入口。
- `js/app.js`：主要業務邏輯，後續會逐步拆分。
- `js/modules/`：共用常數、state 初始化、DOM helper、日期工具、帳號轉換、HTML escape、資料寫入、自動檢查、雲端資料讀取、Realtime 同步等模組。
- `styles.css`：畫面樣式。
- `config.js`：讀取 Vercel 注入的 Supabase Project URL / anon key。
- `api/env.js`：Vercel runtime 注入環境變數。
- `database/patches/`：Supabase SQL patch。
- `vercel.json`：Vercel 部署設定。
- `.vercelignore`：Vercel 部署排除設定。

## 本機測試

前端已改用 ES module。正式 Vercel 網址可直接使用；本機測試請用 HTTP server 開啟，不建議直接用 `file://` 開啟，部分瀏覽器會阻擋 module import。

可使用：

```powershell
python -m http.server 4177 --bind 127.0.0.1
```

若系統沒有 Python，可使用 Codex bundled Python 或直接測試正式網址。

同步流程詳見 `SYNC_WORKFLOW.md`。
