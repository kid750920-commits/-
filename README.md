# 管理系統

正式線上版本：

https://xin-guan-li-xi-tong.vercel.app

## 主版本規則

- 程式碼：以 GitHub repository 為唯一主版本。
- 正式部署：由 Vercel 連接 GitHub 自動部署。
- 使用資料：案件、帳號、液晶申請、附件與照片都存放在 Supabase。
- 本機資料夾只作為開發工作區，不再用手動複製資料夾當作版本同步方式。

## 主要檔案

- `index.html`：系統頁面結構。
- `app.js`：主要功能與 Supabase 資料操作。
- `styles.css`：畫面樣式。
- `config.js`：Supabase Project URL 與 publishable key。
- `vercel.json`：Vercel 靜態網站部署設定。
- `.vercelignore`：Vercel 部署排除檔案。

## 開發原則

每次在不同電腦修改前，先從 GitHub 更新最新版本。修改完成後，提交並推送到 GitHub，再讓 Vercel 自動部署。

詳細流程請看 `SYNC_WORKFLOW.md`。
