# 淡江課表 v17 — PWA + 剪貼簿同步

手機最簡單的同步方式：

1. 開啟淡江 iLife API：`https://ilifeapp.az.tku.edu.tw/api/stu/course`
2. 登入後看到純 JSON 頁面（通常是 `<pre>`）。
3. 在 JSON 頁面使用瀏覽器的「全選」→「複製」。
4. 回到淡江課表，設定 →「📋 從剪貼簿讀取 TKU JSON」。
5. 網站會直接解析 JSON 並自動更新課表。

這個流程是使用者主動複製後，由 HTTPS PWA 透過 Clipboard API 讀取文字；不需要 bookmarklet，也不需要把帳號、密碼、Cookie 或 Token 提供給課表網站。Clipboard `readText()` 需要安全來源（HTTPS），且瀏覽器可能要求額外的使用者授權／貼上確認。

也保留 JSON 文字框、JSON 檔案匯入、PWA 安裝與舊的 Share Target / postMessage 備援。


本版 v17：修正初始化事件綁定錯誤，加入安全事件綁定；新增淺色／深色模式，設定會保存在本機。
