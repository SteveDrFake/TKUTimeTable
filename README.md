# 淡江課表 Clean v6：手機分享同步

本版本保留原本可正常運作的課表頁面與 TKU iLife JSON 解析，新增 PWA Web Share Target 接收功能。

## 使用

1. 把 web 內檔案放到 GitHub Pages 根目錄。
2. 在支援 PWA 分享目標的 Android 瀏覽器中安裝網站到主畫面。
3. 開啟 TKU iLife API：`https://ilifeapp.az.tku.edu.tw/api/stu/course`
4. 登入後，使用手機系統分享，把 API JSON 文字或 `.json` 檔案分享給「淡江課表」。
5. PWA 會接收資料、解析並回到課表。

## 限制

Web Share Target 是瀏覽器支援度有限的功能，而且 PWA 必須先安裝才能出現在系統分享目標中。分享整個網頁時，瀏覽器通常只會提供網址；本功能因此最可靠的輸入是「分享 JSON 文字」或分享已儲存的 `.json` 檔案。

此版本沒有直接從 GitHub Pages `fetch()` TKU API，因此不會碰到之前的 CORS。


## v7 install fix
Added 192x192 and 512x512 PWA icons and an in-page install button for supported browsers.


## v9 share fix
Fixed the Share Target inbox cache-key mismatch. The Service Worker and share.html now use the same absolute inbox key.


## v10 share final
Aligned share.html cache name with the Service Worker (`tku-timetable-share-v9`) and fixed literal `\\n` display in status messages.


### 手機分享同步注意事項

PWA 的 Share Target 可以收到系統分享過來的文字或檔案，但瀏覽器不一定會把目前網頁顯示的 JSON 本文放進分享資料；有些情況只會傳頁面標題與網址。純 GitHub Pages 無法因此繞過淡江 API 的跨來源限制讀取登入後內容。

目前版本另外支援直接分享 `.json` / `.txt` 檔案。部署新版本後，建議移除舊版「淡江課表」PWA，再重新安裝一次，讓手機重新註冊 Share Target。
