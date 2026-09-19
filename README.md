# TKUTimeTable Clean v2 — 淡江課表頁抓取版

這個版本以 Clean v1 的穩定 GitHub Pages 前端為基礎，只增加「從淡江課表頁抓取」功能。

## GitHub Pages
把以下檔案放到 repository 根目錄：

- index.html
- app.js
- style.css
- manifest.json
- service-worker.js
- sample-tku-api.json
- .nojekyll（可選）

## 從淡江課表頁抓取
1. 開啟網站 → 設定。
2. 找到「從淡江課表頁抓取」。
3. 按「複製『抓取淡江課表』書籤」，建立一個瀏覽器書籤，網址貼上複製內容。
4. 回網站按「📚 開啟淡江課表」。
5. 在淡江頁面完成登入並進入有「開課序號、科目名稱、授課時間、座號」的課表。
6. 點剛建立的「抓取淡江課表」書籤。
7. 資料會用 postMessage 傳回原本的課表網站，網站自動解析並保存。

這種方式不要求 GitHub Pages 直接 fetch 淡江 API，因此不會遇到原本的跨來源 CORS fetch。

## 支援的 TKU 表格
優先解析 `#DataGrid1`，也會找包含「開課序號」「科目名稱」「授課時間」的表格。

資料模型：一門課一個 course，同一門課的多個 times 共用固定 seatNumber。

## 注意
- 這個版本不會要求你把帳號、密碼、Cookie、Token 貼到網站。
- 第一版先處理你提供的 `TMWC020.aspx / DataGrid1` 這類課表。
- 如果瀏覽器阻擋新視窗，請允許本網站開啟新視窗。
