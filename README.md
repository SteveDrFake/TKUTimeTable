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

