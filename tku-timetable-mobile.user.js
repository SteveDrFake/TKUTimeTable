// ==UserScript==
// @name         TKU 課表一鍵同步（手機）
// @namespace    https://stevedrfake.github.io/TKUTimeTable/
// @version      2.0.0
// @description  在 Firefox Android + Violentmonkey 上，使用者按一次「同步課表」後，自動前往 TKU iLife API；登入後自動讀取 JSON、返回課表並匯入。
// @author       TKUTimeTable
// @match        https://stevedrfake.github.io/TKUTimeTable/*
// @match        https://ilifeapp.az.tku.edu.tw/api/stu/course*
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.deleteValue
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @run-at       document-start
// @noframes
// ==/UserScript==

(function () {
  "use strict";

  const APP_ORIGIN = "https://stevedrfake.github.io";
  const APP_PATH = "/TKUTimeTable/";
  const API_URL = "https://ilifeapp.az.tku.edu.tw/api/stu/course";

  const RETURN_KEY = "tku_sync_return_url_v2";
  const DATA_KEY = "tku_sync_rows_v2";
  const STATUS_KEY = "tku_sync_status_v2";

  function isAppPage() {
    return location.origin === APP_ORIGIN && location.pathname.startsWith(APP_PATH);
  }

  function isApiPage() {
    return location.origin === "https://ilifeapp.az.tku.edu.tw" &&
      location.pathname.startsWith("/api/stu/course");
  }

  async function gmGet(key, fallback = null) {
    try {
      if (typeof GM !== "undefined" && typeof GM.getValue === "function") {
        return await GM.getValue(key, fallback);
      }
    } catch (_) {}
    try {
      if (typeof GM_getValue === "function") return await GM_getValue(key, fallback);
    } catch (_) {}
    return fallback;
  }

  async function gmSet(key, value) {
    try {
      if (typeof GM !== "undefined" && typeof GM.setValue === "function") {
        await GM.setValue(key, value);
        return;
      }
    } catch (_) {}
    try {
      if (typeof GM_setValue === "function") GM_setValue(key, value);
    } catch (_) {}
  }

  async function gmDelete(key) {
    try {
      if (typeof GM !== "undefined" && typeof GM.deleteValue === "function") {
        await GM.deleteValue(key);
        return;
      }
    } catch (_) {}
    try {
      if (typeof GM_deleteValue === "function") GM_deleteValue(key);
    } catch (_) {}
  }

  function rowsFromJson(value) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") return null;
    for (const key of ["data", "rows", "items", "result", "courses", "list"]) {
      if (Array.isArray(value[key])) return value[key];
    }
    return null;
  }

  function looksLikeTkuCourseRows(rows) {
    return Array.isArray(rows) && rows.length > 0 && rows.some((row) => {
      if (!row || typeof row !== "object") return false;
      return row.weekno != null && row.sessno != null &&
        (row.ch_cos_name || row.courseName || row.name);
    });
  }

  function getPageText() {
    return String(document.body?.innerText || document.documentElement?.innerText || "").trim();
  }

  function showBanner(message, success = false) {
    const old = document.getElementById("tku-userscript-banner");
    if (old) old.remove();

    const box = document.createElement("div");
    box.id = "tku-userscript-banner";
    box.textContent = message;
    box.style.cssText = [
      "position:fixed",
      "left:12px",
      "right:12px",
      "bottom:16px",
      "z-index:2147483647",
      `background:${success ? "#166534" : "#7c2d12"}`,
      "color:#fff",
      "padding:12px 14px",
      "border-radius:12px",
      "font:14px/1.45 system-ui,-apple-system,sans-serif",
      "box-shadow:0 8px 24px rgba(0,0,0,.2)"
    ].join(";");

    (document.body || document.documentElement).appendChild(box);
    setTimeout(() => box.remove(), 5500);
  }

  async function captureApiPage() {
    if (!isApiPage()) return;

    let lastText = "";
    const startedAt = Date.now();

    while (Date.now() - startedAt < 45000) {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const text = getPageText();
      if (!text || text === lastText) continue;
      lastText = text;

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (_) {
        continue;
      }

      const rows = rowsFromJson(parsed);
      if (!looksLikeTkuCourseRows(rows)) continue;

      const returnUrl = await gmGet(RETURN_KEY, APP_ORIGIN + APP_PATH);
      await gmSet(DATA_KEY, {
        rows,
        capturedAt: new Date().toISOString()
      });
      await gmSet(STATUS_KEY, "captured");

      showBanner(`已取得 ${rows.length} 筆 TKU 課表資料，正在返回課表網站…`, true);

      setTimeout(() => {
        location.replace(returnUrl || (APP_ORIGIN + APP_PATH));
      }, 500);
      return;
    }

    if (getPageText() === "ERROR!") {
      await gmSet(STATUS_KEY, "api_error");
      showBanner("TKU API 沒有回傳課表資料，請確認已完成 TKU 登入。", false);
    } else {
      await gmSet(STATUS_KEY, "timeout");
      showBanner("等待 TKU 課表 JSON 逾時。", false);
    }
  }

  async function interceptSyncButton() {
    if (!isAppPage()) return;

    document.documentElement.dataset.tkuUserscriptReady = "1";

    const bind = async () => {
      const button = document.getElementById("syncButton");
      if (!button || button.dataset.tkuUserscriptBound === "1") return;

      button.dataset.tkuUserscriptBound = "1";
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();

        await gmSet(RETURN_KEY, location.href.split("#")[0]);
        await gmSet(STATUS_KEY, "opening_api");
        await gmDelete(DATA_KEY);

        location.href = API_URL;
      }, true);
    };

    await bind();

    const observer = new MutationObserver(() => {
      bind();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    setTimeout(() => observer.disconnect(), 15000);
  }

  async function deliverCapturedData() {
    if (!isAppPage()) return;

    const pending = await gmGet(DATA_KEY, null);
    if (!pending || !Array.isArray(pending.rows) || pending.rows.length === 0) return;

    const send = () => {
      window.postMessage({
        type: "TKU_TIMETABLE_USERSCRIPT_IMPORT",
        rawRows: pending.rows,
        capturedAt: pending.capturedAt || new Date().toISOString()
      }, APP_ORIGIN);
    };

    window.addEventListener("message", async (event) => {
      if (event.source !== window) return;
      if (event.origin !== APP_ORIGIN) return;
      if (event.data?.type !== "TKU_TIMETABLE_USERSCRIPT_IMPORT_ACK") return;
      if (!event.data.success) return;

      await gmDelete(DATA_KEY);
      await gmDelete(RETURN_KEY);
      await gmDelete(STATUS_KEY);
    });

    for (const delay of [700, 1400, 2500, 4000]) {
      setTimeout(send, delay);
    }
  }

  if (isApiPage()) {
    captureApiPage();
  }

  if (isAppPage()) {
    interceptSyncButton();
    deliverCapturedData();
  }
})();
