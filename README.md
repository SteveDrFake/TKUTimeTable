# TKUTimeTable Clean v2 — TKU SSO callback test

以 Clean v1 為基礎，不改課表資料模型與主要 UI，只增加 Worker 測試區塊。

## GitHub Pages
把本資料夾中的以下檔案放到 GitHub repository 根目錄：
- index.html
- app.js
- style.css
- manifest.json
- service-worker.js

## Cloudflare Worker
把 `worker.js` 的完整內容貼到目前的 `tku-timetable-api` Worker，然後 Deploy。

## 測試
網站 → 設定 → TKU 自動同步（測試）
1. Worker URL 填 `https://tku-timetable-api.ccg38093.workers.dev`
2. 按「測試後端」確認 Worker 正常。
3. 按「使用 TKU SSO 登入測試」。
4. 完成 TKU 登入後看「SSO 測試結果」。

這個版本只會回傳「回呼參數名稱」，不回傳或保存帳號密碼、Cookie、Token。

TKU 官方 SSO 頁面目前明確要求瀏覽器接受 Cookies，並提供單一登入機制。參考：https://sso.tku.edu.tw/NEAI/loginrwd.jsp

真正自動取得課表仍取決於 TKU 登入完成後是否把可用的授權結果交給應用程式；目前先用 Worker 確認官方 SSO 的實際回呼形式，不猜測 token。
