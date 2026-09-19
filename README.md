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
