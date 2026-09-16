# 淡江課表 Web v7

這個版本是 GitHub Pages / PWA 前端。

## 目前完成

- 固定「星期 × 節次」Grid，不讓課程內容改變表格結構
- 手機橫向滑動查看課表
- 電腦版也使用固定格子
- 星期一～日可開關
- 第 1～14 節可開關
- 預設隱藏星期六、日與第 11～14 節
- 課程固定座號
- 同一課程可以有多個時間、老師、教室
- 自訂課名、備註、記事
- JSON 匯入／匯出
- PWA 離線快取
- 範例課表
- 預留 iCampusPass APK 所看到的淡江 SSO / iLife API 流程

## 重要限制

你提供的 iCampusPass APK 顯示：

- SSO 入口：`https://sso.tku.edu.tw/ilife/CoWork/AndroidSsoLogin.cshtml`
- 學生課表 API：`https://ilifeapi.az.tku.edu.tw/api/ilifeStuClassApi`
- APK 對 API 使用 `?q=...` 形式的參數
- Android 端有自己的 WebView callback / token 處理

但是 APK 沒有提供一個「瀏覽器 GitHub Pages callback URL」的公開規格，所以這個 Web 版不會假裝 Token 一定可以直接取得。

`app.js` 已經支援：

- URL query 的 `token`
- `access_token`
- `ssoToken`
- `sso_token`
- `q`
- `login_token`

如果淡江 SSO 實際導回本頁並帶其中一種參數，程式會自動保存並嘗試呼叫 iLife API。

如果瀏覽器報 CORS，則需要一個後端代理；GitHub Pages 本身無法把這個後端也一起托管。

## GitHub Pages

把以下檔案放在 repository 根目錄：

- `index.html`
- `style.css`
- `app.js`
- `manifest.json`
- `service-worker.js`

GitHub Pages 設為：

`main / (root)`

## 測試

第一次進站後：

設定 → 載入範例課表

可以先驗證課表 UI。



## v8 的 SSO 測試流程

這版不再要求 SSO 自動回 GitHub Pages。

1. 在設定按「開啟淡江登入」
2. 淡江登入會在新視窗開啟
3. 完成登入，看到淡江顯示登入成功
4. 關閉淡江登入視窗
5. 回到課表網站，按「測試目前淡江登入 Session」

這個測試不要求你把帳號、密碼、Cookie 或 Token 貼給任何人。

測試可能出現：

- 成功取得課表：代表瀏覽器的淡江登入 Session 可以直接被 iLife API 使用；接下來就只要把資料解析固定即可。
- HTTP 401/403：表示 API 需要額外的 token／登入資訊。
- `Failed to fetch`：瀏覽器很可能被 CORS 擋住，需要後端代理。
- JSON 但沒有課程：代表 API 有回應，需要依實際 JSON 結構調整 parser。


## v9 變更

- 淡江登入視窗關閉後，網站會自動測試目前瀏覽器的淡江登入 Session。
- 若沒有 Token，首頁上的「同步」也會直接先測試瀏覽器 Session。
- 不會讀取或要求使用者提供密碼、Cookie、Token。


## v10

修正 v9 的前端檔案不同步問題：

- `index.html` 補上 `testSessionButton`
- `app.js` 對可選按鈕使用 optional chaining，單一按鈕缺失不會讓整個程式停止
- 加入全域 JavaScript error / unhandled rejection 顯示
- Service Worker cache 更新為 v10
