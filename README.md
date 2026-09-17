# 淡江課表 Web v9（GitHub Pages 純前端版）

這是目前可以直接放到 GitHub Pages 使用的完整版本。它延續 v8 已完成的課表 UI、PWA、離線與資料管理功能，並保留 TKU SSO／iLife API 的測試入口。

## 已完成

- 手機／電腦課表
- 星期一～日顯示開關
- 第 1～14 節顯示開關
- 預設隱藏星期六、日與第 11～14 節
- 課程固定座號
- 同一課程可有多個時間、老師、教室
- 自訂課名
- 我的備註
- 我的記事
- 課程詳細資料
- JSON 匯入／匯出
- PWA 離線使用
- 範例課表
- 清除課表
- 清除全部本機資料
- TKU SSO 入口
- iLife API 測試／同步入口
- 支援你之前提供的 `weekno`、`sessno`、`seatno`、`ch_cos_name`、`teach_name`、`room` 格式

## GitHub Pages 能不能只靠上傳程式碼完成後端？

不能。GitHub Pages 只能執行瀏覽器端的 HTML/CSS/JavaScript。

例如把 `server.js`、`server.py` 或其他程式碼上傳到 repository，GitHub Pages 不會替你啟動它們。

因此：

```text
GitHub Pages
    ↓
瀏覽器 JavaScript
    ↓
TKU API
```

仍然會受到瀏覽器 CORS 與跨網站 Cookie／Session 規則限制。

## 目前的 SSO／API 實作

本版保留你前面測試過的：

- SSO：`https://sso.tku.edu.tw/ilife/CoWork/AndroidSsoLogin.cshtml`
- 課表 API：`https://ilifeapp.az.tku.edu.tw/api/stu/course`
- 學生版 APK 曾出現的另一組 iLife API：`https://ilifeapi.az.tku.edu.tw/api/ilifeStuClassApi`

注意：學生版 APK 是第三方學生作品，不是淡江官方 App，因此 APK 中的 API、Token、callback 或加密程式不能直接當成淡江官方 Web SSO 規格。

另外，你之前已經實測 GitHub Pages 直接 `fetch` TKU API 會遭瀏覽器 CORS 阻擋，所以「只靠 GitHub Pages 自動登入並取得課表」目前不能視為已完成。

## 純 GitHub Pages 可以怎麼用？

目前可以：

1. 使用範例課表。
2. 使用 JSON 匯入課表。
3. 使用本機課表與所有自訂功能。
4. PWA 安裝到手機。
5. 從設定前往 TKU SSO。
6. 嘗試目前瀏覽器 Session／API；若瀏覽器回報 CORS，這不是前端程式碼可以繞過的。

## 如果之後要自動同步

最小改動方式是保留這個 GitHub Pages 前端，只新增一個可以執行伺服器程式的 serverless backend。屆時網頁只需要呼叫自己的 `/api/schedule`，其餘 TKU SSO／API 處理由後端完成。

## 安裝 GitHub Pages

將 ZIP 裡的檔案直接放到 repository 根目錄：

- `index.html`
- `style.css`
- `app.js`
- `manifest.json`
- `service-worker.js`

GitHub Pages：`main / (root)`
