# 淡江課表 GitHub Pages — Clean Rebuild v1

這個版本從零建立，不沿用先前 v8～v20 的 UI / JS。目標是先把前端資料模型、課表顯示、編輯、匯入、匯出與離線行為做穩定，再另外接後端。

## GitHub Pages 部署

1. 把 `web/` 裡的檔案放到 repository 根目錄。
2. GitHub → Settings → Pages。
3. Build and deployment → Deploy from a branch。
4. Branch 選 `main`，Folder 選 `/ (root)`。
5. 儲存，等待 Pages 完成部署。

本專案只有靜態 HTML/CSS/JS，沒有 Node/PHP/Python 伺服器。

## 功能

- 手機優先課表
- 星期一～日開關；預設隱藏六、日
- 第 1～14 節開關；預設顯示 1～10
- 座號／教室／老師顯示開關
- 課程詳細頁
- 自訂課名
- 我的備註
- 我的記事
- 多上課時段
- 同一門課共用固定座號
- 週次上一週／下一週／回本週
- iLife JSON 匯入
- 一般 courses JSON 匯入
- JSON 檔案匯入／匯出
- 範例課表
- 本機 localStorage 儲存
- Service Worker 離線快取

## TKU API 注意

GitHub Pages 是靜態網站，不能執行伺服器端程式。瀏覽器從 GitHub Pages 直接 fetch 需要登入的 TKU API 時，會受到 TKU 端的 CORS 與登入 Cookie 限制。因此這個 v1 不會把「直接同步 TKU API」寫成看似成功但實際拿不到資料的假流程。

真正自動同步需要另外的後端／Worker，且還要處理 TKU 的登入授權流程。這部分應與穩定的前端分開開發。

## 本機資料

課表與備註只保存在瀏覽器 localStorage。不要把帳號密碼、Cookie、Token 放進 GitHub repository。
