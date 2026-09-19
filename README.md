# 淡江課表 PWA

GitHub Pages：`https://stevedrfake.github.io/TKUTimeTable/`

## 一鍵同步 TKU iLife

1. 開啟 PWA → 設定 → **開啟一鍵抓取工具**。
2. 第一次只需把「抓取淡江課表」建立成瀏覽器書籤。
3. 之後開啟 `https://ilifeapp.az.tku.edu.tw/api/stu/course`，完成 TKU 登入，直到畫面顯示 JSON 陣列。
4. 按一次「抓取淡江課表」書籤。
5. 程式會把目前頁面的 JSON 封裝後送到 `capture.html`，再由 PWA 自己的 parser 匯入。

### 為什麼不用 PWA Share Target 當主要同步
部分手機瀏覽器分享網頁時只會送 URL／標題，不會送出目前頁面顯示的 JSON 本文；因此 Share Target 保留作為檔案／文字分享的備援，而一鍵書籤工具負責主要同步流程。

### 隱私
工具只讀取目前 TKU API 頁面可見的 JSON，不會要求或保存帳號密碼、Cookie、Token。課表資料預設只存在你的瀏覽器本機儲存。


## v15：PWA ↔ TKU 頁面 postMessage

主要同步方式改為：從本 PWA 按「開啟淡江 iLife API」開出的 TKU 分頁，使用已安裝的「抓取淡江課表」bookmarklet。bookmarklet 直接讀取目前 TKU 頁面的 JSON，再透過 `window.opener.postMessage()` 傳回本 PWA；PWA 收到後立即解析、儲存並更新課表。

若瀏覽器沒有保留 `window.opener`，bookmarklet 會退回 `capture.html#data=...` 的備援方式。

不會要求使用者把密碼、Cookie 或 Token 貼給課表網站。


## v15：PWA ↔ TKU 頁面 postMessage

從「淡江課表」本頁按「開啟淡江 iLife API」後，TKU 分頁由本 PWA 建立 opener 關係。bookmarklet 在 TKU 頁面直接讀取 JSON，透過 `window.opener.postMessage()` 傳回 PWA。PWA 匯入後會回傳 ACK；若 1.4 秒內沒有 ACK，bookmarklet 自動退回 `capture.html#data=...` 備援流程。
