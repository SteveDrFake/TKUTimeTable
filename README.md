# TKU Course Web v19

本版保留原本 v8 的網頁介面與設定視窗，只加入 Cloudflare Worker 後端。

## GitHub Pages
將 `web/` 內的檔案放到 GitHub repository 根目錄。

## Cloudflare Worker
將 `worker/src/index.js` 部署到 Cloudflare Workers。預設 Worker：
`https://tku-timetable-api.ccg38093.workers.dev`

## 真正同步流程
1. 在課表網頁的「設定」中確認 Worker 網址。
2. 透過原本的「前往淡江登入」取得登入後 q/token。
3. 按「用目前登入狀態同步」。
4. 網頁將 token 用 POST 傳給 Worker。
5. Worker 以 `?q=token` 呼叫 TKU iLife API。

注意：Worker 不會取得你的瀏覽器 Cookie；它依賴登入流程回傳給網頁的 q/token。如果 TKU API 還要求其他授權，Worker 會回傳實際錯誤，不會偽造成功。


## v20 SSO callback diagnostics
This version keeps the v8 UI and adds only SSO callback diagnostics. It records only callback parameter names in the UI and never displays token values. If the TKU SSO flow redirects back to this site, the app will detect the callback and try the existing Worker sync path when a token-like parameter is present.
