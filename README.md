# TKU Course Web v12

這版先嘗試純 GitHub Pages 直接讀取：
`https://ilifeapp.az.tku.edu.tw/api/stu/course`

流程：
1. 設定 → 淡江登入
2. 在淡江學生課表完成登入
3. 回到 GitHub Pages
4. 按「同步課表」或「直接測試淡江 /api/stu/course」

使用 `fetch(..., credentials: "include")`。如果瀏覽器仍回 CORS，就代表淡江伺服器沒有允許 GitHub Pages 讀取，前端程式無法繞過這項瀏覽器安全限制。
