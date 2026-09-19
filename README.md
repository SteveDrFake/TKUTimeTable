# 淡江課表 v18 — PWA + TKU iLife API 同步

## Android 使用方式

1. 在課表 PWA 的「設定」開啟「一鍵同步工具」。
2. 點「複製『抓取淡江課表』書籤」。
3. 在 Chrome Android 建立一個普通書籤，把網址替換成複製的 `javascript:` 程式碼。第一次設定只需要做一次。
4. 回到課表 PWA 按「同步」。
5. 在淡江 iLife 完成登入後，點「抓取淡江課表」書籤。
6. 書籤程式會在 `ilifeapp.az.tku.edu.tw` 頁面同源執行 `fetch("/api/stu/course", {credentials:"include"})`，直接取得課表 JSON，再送回 PWA。

不需要進入 020/090，也不需要全選、複製 JSON；PWA 不會取得或保存淡江密碼。若 Android 瀏覽器沒有保留 `window.opener`，工具會改用 `capture.html` 的備援接收流程。

## 資料格式

支援 TKU iLife `/api/stu/course` 回傳的陣列，欄位包括 `weekno`, `sessno`, `week`, `sesstime`, `seatno`, `ch_cos_name`, `en_cos_name`, `teach_name`, `teach_name_en`, `note`, `room`。每一個星期／節次為一筆，PWA 會依「課名 + 座號」等資料把同一門課的多個時段合併。

## v18

- 深色模式保留
- 修正事件綁定安全處理
- 改用 TKU iLife `/api/stu/course` 作主要同步來源
- bookmarklet 改成在 iLife 頁面同源 fetch，不再讀取頁面顯示文字
- 保留 JSON 匯入、剪貼簿、Share Target 等備援
