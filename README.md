# TKU Course Web v12

這版仍是 GitHub Pages 靜態網站，但新增一個可實際測試的 TKU iLife API 抓取流程。

## 真實抓課表測試
1. 開啟網站 → 設定 → 「📥 開啟 TKU 課表 API」。
2. 若 TKU 要求登入，直接完成學校登入。
3. 登入完成後，API 頁面若顯示 JSON 陣列，切回這個視窗不必關閉 API 視窗。
4. 第一次先建立「TKU 抓課表」書籤：複製書籤程式 → Ctrl+D 新增書籤 → 網址貼上。
5. 回到 API JSON 頁面，點一次該書籤。API JSON 會透過 postMessage 傳回課表頁面，網頁會自動解析課程。

## 為什麼要這樣做
TKU API 對 GitHub Pages 的一般 fetch 目前會遇到瀏覽器同源/CORS 限制。這版不是把 CORS 假裝修好，而是讓「使用者已經在 TKU 網域的頁面上取得 API JSON」後，由該頁面主動把資料傳回本 App。

## 注意
不要把 TKU 帳號、密碼、Cookie、Token 貼到聊天或公開頁面。


## v12 重要變更
- 不再從 GitHub Pages 直接 `fetch()` TKU iLife API。
- 這是因為 `ilifeapi.az.tku.edu.tw` 沒有提供允許 `stevedrfake.github.io` 的 CORS header，瀏覽器會阻擋回應。
- 真實抓課表流程：課表頁 → 開啟 TKU API → 完成 TKU 登入 → API 頁面顯示 JSON → 在 API 頁面執行「TKU 抓課表」bookmarklet → `postMessage` 回課表頁 → 自動解析與儲存。
- 不需要把帳號密碼、Cookie、Token 貼到課表網站。
