# 多電腦同步流程

這個專案採用：

- 程式碼用 GitHub 同步
- 正式網站由 Vercel 部署
- 使用資料全部放 Supabase

## 第一次在新電腦開始

1. 從 GitHub clone 專案。

```powershell
git clone <GitHub repository URL>
cd <repository folder>
```

2. 確認 `config.js` 指向正式 Supabase 專案。

目前正式 Supabase URL：

```text
https://agowadunriupsakziwmr.supabase.co
```

3. 確認 Vercel 專案連接同一個 GitHub repository。

正式網址：

```text
https://xin-guan-li-xi-tong.vercel.app
```

## 每次開始修改前

```powershell
git pull
```

先更新，避免用舊版本修改。

## 修改完成後

```powershell
git status
git add .
git commit -m "說明這次修改"
git push
```

推送到 GitHub 後，Vercel 會依專案設定自動部署。

## 重要規則

- 不要用 zip 或手動複製資料夾當作正式同步方式。
- 不要把 `.vercel`、`.netlify`、舊部署包、備份 HTML 推上 GitHub。
- 不要在瀏覽器 localStorage 存正式案件資料；正式資料要寫入 Supabase。
- 不要建立第二個 Vercel 正式專案來部署同一套系統，避免使用者進錯網址。
- 如果不同電腦同時修改同一個檔案，先 `git pull` 並解決衝突，再 `git push`。

## 當 Vercel 沒自動更新時

1. 到 Vercel 專案確認是否連到正確 GitHub repository。
2. 檢查最新 commit 是否已推送到 GitHub。
3. 到 Vercel Deployments 查看部署錯誤。
4. 不要直接改線上檔案，應該先修本機程式碼，再推送 GitHub。
