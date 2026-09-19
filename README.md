# 淡江課表 Clean v3

這一版以 Clean v1/v2 的穩定 GitHub Pages 介面為基礎，正式把 **TKU iLife API JSON** 當作課表資料來源。

## 主要流程
1. 在「設定 → 從淡江 iLife API 取得課表」建立「抓取 TKU JSON」書籤。
2. 按「開啟淡江 iLife API」，在淡江網域完成登入。
3. API 顯示 JSON 陣列後，執行書籤。
4. JSON 會回到本網站並自動解析、保存。

## API 欄位
- weekno：星期 1–7
- sessno：節次 1–14
- seatno：課程固定座號
- ch_cos_name：中文課名
- teach_name：老師
- room：教室
- sesstime：起始時間

## 同步行為
- 新 API 資料優先。
- 原本的自訂課名、備註、記事會依課程鍵保留。
- 同一門課的不同時間會合併。
- 課表只保存在使用者裝置的 localStorage。

## GitHub Pages
只需要上傳靜態檔：index.html、app.js、style.css、manifest.json、service-worker.js、capture.html、sample-tku-api.json。

GitHub Pages 不能讓前端直接繞過 TKU API 的 CORS，因此本專案不在 GitHub 頁面直接 fetch TKU API。
