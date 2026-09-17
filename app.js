const STORAGE_KEY = "tku_timetable_v10";
const TOKEN_KEY = "tku_sso_token_v10";
const API_KEY = "tku_ilife_api_v11";
const DIRECT_BROWSER_API = "https://ilifeapp.az.tku.edu.tw/api/stu/course";
const DEFAULT_API = "https://ilifeapi.az.tku.edu.tw/api/ilifeStuClassApi";
const SSO_URL = "https://sso.tku.edu.tw/ilife/CoWork/AndroidSsoLogin.cshtml";

const DAYS = [
  {key:1,name:"一"},{key:2,name:"二"},{key:3,name:"三"},
  {key:4,name:"四"},{key:5,name:"五"},{key:6,name:"六"},{key:7,name:"日"}
];
const PERIODS = [
  [1,"08:10–09:00"],[2,"09:10–10:00"],[3,"10:10–11:00"],[4,"11:10–12:00"],
  [5,"12:10–13:00"],[6,"13:10–14:00"],[7,"14:10–15:00"],[8,"15:10–16:00"],
  [9,"16:10–17:00"],[10,"17:10–18:00"],[11,"18:10–19:00"],[12,"19:10–20:00"],
  [13,"20:10–21:00"],[14,"21:10–22:00"]
].map(([number,time])=>({number,time}));

const DEFAULT_DISPLAY = {
  days:{1:true,2:true,3:true,4:true,5:true,6:false,7:false},
  periods:{1:true,2:true,3:true,4:true,5:true,6:true,7:true,8:true,9:true,10:true,11:false,12:false,13:false,14:false},
  showSeat:true
};

const DEMO = {
  version:10,
  semester:"115-1 範例",
  student:{name:"範例學生",studentId:"DEMO0000"},
  display:JSON.parse(JSON.stringify(DEFAULT_DISPLAY)),
  courses:[
    {id:"2952",name:"高等微積分",customName:"",department:"TSNXB",grade:"2",className:"",credits:"3",seatNumber:"033",
      pdf:"http://ap09.emis.tku.edu.tw/115_1/115_1_2952.PDF",description:"同一門課的多個上課時段共用同一座號。",
      times:[
        {day:1,periods:[1,2],room:"S 420",teacher:"余"},
        {day:3,periods:[1],room:"S 420",teacher:"余"},
        {day:3,periods:[2],room:"S 420",teacher:"助教"}
      ],note:"",journal:[]},
    {id:"2951",name:"代數學（一）",customName:"",department:"TSNXB",grade:"2",className:"",credits:"3",seatNumber:"040",
      pdf:"http://ap09.emis.tku.edu.tw/115_1/115_1_2951.PDF",description:"",
      times:[
        {day:2,periods:[8,9],room:"S 420",teacher:"王"},
        {day:5,periods:[3],room:"S 420",teacher:"王"},
        {day:5,periods:[7],room:"S 420",teacher:"助教"}
      ],note:"",journal:[]},
    {id:"2954",name:"機率論",customName:"",department:"TSNXB",grade:"2",className:"",credits:"3",seatNumber:"044",
      pdf:"http://ap09.emis.tku.edu.tw/115_1/115_1_2954.PDF",description:"",
      times:[
        {day:4,periods:[5,6],room:"C 013",teacher:"黃"},
        {day:5,periods:[4],room:"C 013",teacher:"黃"},
        {day:5,periods:[6],room:"C 002",teacher:"助教"}
      ],note:"",journal:[]},
    {id:"1458",name:"哲學專題",customName:"",department:"TGCHB",grade:"0",className:"B",credits:"2",seatNumber:"016",
      pdf:"",description:"",
      times:[{day:4,periods:[9,10],room:"E 414",teacher:"林"}],note:"",journal:[]}
  ]
};

let state = loadState();
let currentWeekOffset = 0;
let currentCourseId = null;

function normalise(data){
  const x = data && typeof data==="object" ? data : {};
  x.version = 11;
  x.semester = x.semester || "";
  x.student = x.student || {name:"",studentId:""};
  x.display = {
    ...structuredClone(DEFAULT_DISPLAY),
    ...(x.display||{}),
    days:{...DEFAULT_DISPLAY.days,...(x.display?.days||{})},
    periods:{...DEFAULT_DISPLAY.periods,...(x.display?.periods||{})}
  };
  x.courses = Array.isArray(x.courses) ? x.courses : [];
  return x;
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalise(JSON.parse(raw)) : normalise({student:{},courses:[]});
  }catch{
    return normalise({student:{},courses:[]});
  }
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function getApiBase(){ return localStorage.getItem(API_KEY) || DEFAULT_API; }
function getToken(){ return localStorage.getItem(TOKEN_KEY) || ""; }
function setToken(v){ if(v) localStorage.setItem(TOKEN_KEY,v); else localStorage.removeItem(TOKEN_KEY); }
function clone(v){ return JSON.parse(JSON.stringify(v)); }
function esc(v){ return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
function uid(){ return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`; }

function getMonday(offset=0){
  const d = new Date();
  const day = d.getDay();
  const diff = day===0 ? -6 : 1-day;
  d.setHours(0,0,0,0);
  d.setDate(d.getDate()+diff+offset*7);
  return d;
}
function dateText(d){ return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`; }
function visibleDays(){ return DAYS.filter(d=>state.display.days[d.key]); }
function visiblePeriods(){ return PERIODS.filter(p=>state.display.periods[p.number]); }
function displayName(c){ return c.customName?.trim() || c.name || "未命名課程"; }
function getCourse(id){ return state.courses.find(c=>String(c.id)===String(id)); }

function renderHeader(){
  document.getElementById("semesterText").textContent = state.semester ? `學期：${state.semester}` : "本機課表";
  document.getElementById("studentName").textContent = state.student?.name || "尚未登入";
  document.getElementById("studentInfo").textContent = state.student?.studentId ? `學號：${state.student.studentId}` : "可先使用範例資料測試課表";
  document.getElementById("settingStudentName").textContent = state.student?.name || "尚未取得";
  document.getElementById("settingStudentId").textContent = state.student?.studentId || "尚未取得";
  document.getElementById("tokenStatus").textContent = getToken() ? "已保存本機 Token" : "未取得";
  document.getElementById("apiBaseInput").value = getApiBase();
  const bookmarklet = makeCaptureBookmarklet();
  const bookmarkInput = document.getElementById("captureBookmarkletInput");
  if(bookmarkInput) bookmarkInput.value = bookmarklet;

  const mon = getMonday(currentWeekOffset);
  const sun = new Date(mon); sun.setDate(sun.getDate()+6);
  document.getElementById("weekText").textContent = `${dateText(mon)} ～ ${dateText(sun)}`;
}

function coursesForCell(day, period){
  const found = [];
  for(const c of state.courses){
    for(const t of c.times || []){
      if(Number(t.day)!==day) continue;
      if(!(t.periods||[]).map(Number).includes(period)) continue;
      found.push({course:c,time:t});
    }
  }
  return found;
}

function renderSchedule(){
  const root = document.getElementById("schedule");
  root.innerHTML = "";

  const days = visibleDays();
  const periods = visiblePeriods();
  root.style.setProperty("--day-count", String(days.length));

  if(!days.length || !periods.length){
    root.innerHTML = `<div style="grid-column:1/-1;padding:30px;text-align:center;color:#6b7280">請在設定中至少開啟一個星期與一個節次。</div>`;
    return;
  }

  const monday = getMonday(currentWeekOffset);

  const corner = document.createElement("div");
  corner.className = "corner-cell";
  root.appendChild(corner);

  for(const day of days){
    const date = new Date(monday); date.setDate(monday.getDate()+day.key-1);
    const head = document.createElement("div");
    head.className = "day-head";
    head.innerHTML = `<strong>星期${day.name}</strong><small>${esc(dateText(date))}</small>`;
    root.appendChild(head);
  }

  for(const period of periods){
    const label = document.createElement("div");
    label.className = "period-label";
    label.innerHTML = `<strong>第${period.number}節</strong><span>${esc(period.time)}</span>`;
    root.appendChild(label);

    for(const day of days){
      const cell = document.createElement("div");
      cell.className = "course-cell";
      const items = coursesForCell(day.key, period.number);

      if(!items.length){
        cell.innerHTML = `<div class="empty-cell">—</div>`;
      }else{
        for(const item of items){
          const c = item.course, t = item.time;
          const b = document.createElement("button");
          b.type = "button";
          b.className = "course-card";
          b.innerHTML =
            `<div class="course-name">${esc(displayName(c))}</div>` +
            `<div class="course-meta">${esc(t.teacher||"")}${t.room ? `　${esc(t.room)}` : ""}</div>` +
            `${state.display.showSeat && c.seatNumber ? `<div class="course-seat">座號 ${esc(c.seatNumber)}</div>` : ""}`;
          b.addEventListener("click", ()=>openCourse(c.id));
          cell.appendChild(b);
        }
      }
      root.appendChild(cell);
    }
  }
}

function renderSettings(){
  const dc = document.getElementById("dayChecks");
  dc.innerHTML = "";
  for(const d of DAYS){
    const label = document.createElement("label");
    label.className = "toggle-item";
    label.innerHTML = `<span>星期${d.name}</span><input type="checkbox" ${state.display.days[d.key]?"checked":""}>`;
    label.querySelector("input").addEventListener("change", e=>{
      state.display.days[d.key] = e.target.checked;
      saveState(); renderSchedule();
    });
    dc.appendChild(label);
  }

  const pc = document.getElementById("periodChecks");
  pc.innerHTML = "";
  for(const p of PERIODS){
    const label = document.createElement("label");
    label.className = "toggle-item";
    label.innerHTML = `<span>第${p.number}節<small>${esc(p.time)}</small></span><input type="checkbox" ${state.display.periods[p.number]?"checked":""}>`;
    label.querySelector("input").addEventListener("change", e=>{
      state.display.periods[p.number] = e.target.checked;
      saveState(); renderSchedule();
    });
    pc.appendChild(label);
  }

  document.getElementById("showSeat").checked = !!state.display.showSeat;
}

function showSheet(id){
  document.getElementById("overlay").classList.remove("hidden");
  document.getElementById(id).classList.remove("hidden");
  document.body.style.overflow = "hidden";
}
function hideSheets(){
  document.getElementById("overlay").classList.add("hidden");
  document.getElementById("coursePanel").classList.add("hidden");
  document.getElementById("settingsPanel").classList.add("hidden");
  document.body.style.overflow = "";
  currentCourseId = null;
}

function openCourse(id){
  const c = getCourse(id);
  if(!c) return;
  currentCourseId = String(id);

  document.getElementById("courseTitle").textContent = displayName(c);
  document.getElementById("courseSubtitle").textContent = [c.department,c.className].filter(Boolean).join(" · ");
  document.getElementById("customName").value = c.customName || "";
  document.getElementById("schoolName").textContent = c.name || "—";
  document.getElementById("courseIdText").textContent = c.id || "—";
  document.getElementById("seatNumber").textContent = c.seatNumber || "—";
  document.getElementById("credits").textContent = c.credits || "—";
  document.getElementById("department").textContent = c.department || "—";
  document.getElementById("gradeClass").textContent = [c.grade,c.className].filter(Boolean).join(" / ") || "—";
  document.getElementById("description").value = c.description || "";
  document.getElementById("note").value = c.note || "";

  const times = document.getElementById("timesList");
  times.innerHTML = "";
  for(const t of c.times || []){
    const day = DAYS.find(d=>d.key===Number(t.day));
    const el = document.createElement("div");
    el.className = "time-item";
    el.innerHTML = `<div class="time-title">星期${esc(day?.name || t.day)} · 第${esc((t.periods||[]).join("、"))}節</div>` +
                   `<div class="time-sub">教室：${esc(t.room||"—")}</div>` +
                   `<div class="time-teacher">授課：${esc(t.teacher||"—")}</div>`;
    times.appendChild(el);
  }

  const links = document.getElementById("courseLinks");
  links.innerHTML = c.pdf ? `<a href="${esc(c.pdf)}" target="_blank" rel="noopener">查看課程資料 ↗</a>` : "";
  renderJournal(c);
  showSheet("coursePanel");
}

function renderJournal(c){
  const list = document.getElementById("journalList");
  list.innerHTML = "";
  if(!c.journal?.length){ list.innerHTML = `<div class="hint">尚無記事。</div>`; return; }
  for(const j of c.journal){
    const el = document.createElement("div");
    el.className = "journal-item";
    el.innerHTML = `<strong>${esc(j.date)}</strong><div>${esc(j.text)}</div>`;
    list.appendChild(el);
  }
}

function saveCourse(){
  const c = getCourse(currentCourseId);
  if(!c) return;
  c.customName = document.getElementById("customName").value.trim();
  c.note = document.getElementById("note").value;
  saveState(); hideSheets(); renderAll();
}

function addJournal(){
  const c = getCourse(currentCourseId);
  if(!c) return;
  const text = prompt("輸入記事內容：");
  if(!text?.trim()) return;
  c.journal = Array.isArray(c.journal) ? c.journal : [];
  c.journal.unshift({
    id:uid(),
    date:new Date().toLocaleString("zh-TW",{hour12:false}),
    text:text.trim()
  });
  saveState();
  renderJournal(c);
}

function clearCourses(){
  if(!confirm("確定清除課表嗎？自訂課名、備註、記事與顯示設定會保留。")) return;
  state.courses = [];
  state.semester = "";
  saveState(); hideSheets(); renderAll();
}

function logoutApp(){
  if(!confirm("確定清除本機所有資料與登入 Token 嗎？")) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(API_KEY);
  state = normalise({student:{},courses:[]});
  hideSheets(); renderAll();
}

function loadDemo(){
  if(!confirm("載入範例課表，會取代目前本機課表。")) return;
  state = clone(DEMO);
  saveState(); hideSheets(); renderAll();
}

function exportJSON(){
  const blob = new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "tku-timetable.json";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),500);
}

async function importJSON(file){
  try{
    state = normalise(JSON.parse(await file.text()));
    saveState(); renderAll(); alert("匯入成功。");
  }catch(e){
    alert(`匯入失敗：${e.message}`);
  }
}

let ssoWindow = null;
let ssoTimer = null;

function makeCaptureBookmarklet(){
  const appUrl = new URL(location.href);
  appUrl.search = "";
  appUrl.hash = "";
  const appTarget = appUrl.toString();
  const code = `(async()=>{try{const t=document.body?document.body.innerText:"";if(!t){alert("找不到 API 回應內容");return;}if(window.opener&&!window.opener.closed){window.opener.postMessage({type:"TKU_ILIFE_API_TEXT",text:t},"*");alert("已把課表資料送回課表網頁");try{window.close()}catch{}}else{location.href=${JSON.stringify(appTarget+"#tku_api=")}+encodeURIComponent(t)}}catch(e){alert("抓取失敗："+(e&&e.message||e))}})()`;
  return "javascript:" + code;
}

function openILifeApiPopup(){
  const w=window.open(DIRECT_BROWSER_API,"tku_ilife_api","popup,width=1100,height=850,resizable=yes,scrollbars=yes");
  if(!w){
    alert("瀏覽器阻擋了 API 視窗。請允許這個網站開啟彈出視窗。");
    return;
  }
  showMessage("API 視窗已開啟。若要求登入，先完成淡江登入；等畫面變成 JSON 後，在該視窗執行「TKU 抓課表」書籤，即可把真實課表送回本頁。");
}

function importBrowserApiText(text, source="browser"){
  try{
    const clean=String(text||"").trim().replace(/^\uFEFF/,"");
    if(!clean) throw new Error("沒有收到資料");
    let payload;
    try{payload=JSON.parse(clean)}catch{
      const a=clean.indexOf("[");
      const b=clean.lastIndexOf("]");
      if(a>=0&&b>a) payload=JSON.parse(clean.slice(a,b+1));
      else throw new Error("收到的內容不是 JSON");
    }
    const normalized=normalizeILifeResponse(payload);
    if(!normalized.courses.length) throw new Error("API 回應中沒有辨識到課程時段");
    mergeImportedCourses(normalized);
    saveState();
    renderAll();
    showMessage(`成功從 TKU API 取得 ${normalized.courses.length} 門課程。`);
    return true;
  }catch(e){
    console.error("importBrowserApiText:",e);
    showMessage(`API 資料匯入失敗：${e.message}`);
    return false;
  }
}

function handleBrowserApiHash(){
  const h=new URL(location.href);
  const raw=h.hash.startsWith("#tku_api=") ? decodeURIComponent(h.hash.slice("#tku_api=".length)) : "";
  if(!raw) return false;
  const ok=importBrowserApiText(raw,"hash");
  h.hash="";
  history.replaceState({},document.title,h.pathname+h.search);
  return ok;
}

function openTKUSSO(){
  ssoWindow = window.open(
    SSO_URL,
    "tku_sso_login",
    "popup,width=520,height=760,resizable=yes,scrollbars=yes"
  );

  if(!ssoWindow){
    alert("瀏覽器阻擋了登入視窗。請允許這個網站開啟彈出視窗。");
    return;
  }

  showMessage("請在淡江登入視窗完成登入。看到「登入成功」後，關閉登入視窗，再回本頁按「測試目前淡江登入 Session」。");

  clearInterval(ssoTimer);
  ssoTimer = setInterval(()=>{
    if(!ssoWindow || ssoWindow.closed){
      clearInterval(ssoTimer);
      ssoWindow = null;
      showMessage("淡江登入視窗已關閉。現在可以測試登入 Session。");
    }
  }, 700);
}

function readCallbackValues(){
  const out = {};
  const url = new URL(location.href);
  for(const [k,v] of url.searchParams.entries()) out[k.toLowerCase()] = v;
  if(location.hash.includes("=")){
    const hash = new URLSearchParams(location.hash.replace(/^#/,""));
    for(const [k,v] of hash.entries()) out[k.toLowerCase()] = v;
  }
  return out;
}

async function handleSSOCallback(){
  const p = readCallbackValues();
  const token = p.token || p.access_token || p.ssotoken || p.sso_token || p.q || p.login_token;
  const studentId = p.studentid || p.student_id || p.tia_student_id_no || p.idno;
  const name = p.name || p.studentname;

  if(!token && !studentId && !name) return false;

  if(token) setToken(token);
  if(studentId) state.student.studentId = studentId;
  if(name) state.student.name = decodeURIComponentSafe(name);
  saveState();

  const clean = new URL(location.href);
  ["token","access_token","ssotoken","sso_token","q","login_token","studentid","student_id","tia_student_id_no","idno","name","studentname"].forEach(k=>{
    clean.searchParams.delete(k);
  });
  clean.hash = "";
  history.replaceState({},document.title,clean.pathname+clean.search);

  if(token){
    await syncFromILife(token);
  }else{
    renderAll();
  }
  return true;
}

function decodeURIComponentSafe(v){
  try{return decodeURIComponent(v)}catch{return v}
}

function showMessage(text){
  const box = document.getElementById("messagePanel");
  box.textContent = text;
  box.classList.remove("hidden");
  clearTimeout(showMessage.timer);
  showMessage.timer = setTimeout(()=>box.classList.add("hidden"), 6000);
}

function setSyncBusy(busy){
  const b1 = document.getElementById("syncButton");
  const b2 = document.getElementById("syncApiButton");
  const b3 = document.getElementById("testSessionButton");
  if(b1){ b1.disabled = busy; b1.textContent = busy ? "同步中…" : "同步"; }
  if(b2){ b2.disabled = busy; b2.textContent = busy ? "同步中…" : "↻ 用目前登入狀態同步"; }
  if(b3){ b3.disabled = busy; b3.textContent = busy ? "測試中…" : "🧪 測試目前淡江登入 Session"; }
}

function extractTokenFromResponse(text, response){
  const contentType = response.headers.get("content-type") || "";
  if(contentType.includes("application/json")){
    try{
      const x = JSON.parse(text);
      return x.token || x.access_token || x.ssoToken || x.sso_token || x.q || "";
    }catch{}
  }
  return "";
}

async function syncFromILife(explicitToken=""){
  const token = explicitToken || getToken();
  if(!token){
    showMessage("目前沒有可用的淡江登入 Token。請先從「設定 → 前往淡江登入」開始。");
    return false;
  }

  setSyncBusy(true);
  try{
    const base = getApiBase();
    const url = `${base}${base.includes("?") ? "&" : "?"}q=${encodeURIComponent(token)}`;
    const response = await fetch(url,{
      method:"GET",
      credentials:"include",
      cache:"no-store"
    });
    const text = await response.text();
    if(!response.ok) throw new Error(`HTTP ${response.status}`);

    let data;
    try{ data = JSON.parse(text); }
    catch{ throw new Error("iLife API 回傳不是 JSON"); }

    const normalized = normalizeILifeResponse(data);
    if(!normalized.courses.length) {
      throw new Error("API 有回應，但目前無法從回應中辨識課程資料。");
    }

    mergeImportedCourses(normalized);
    saveState();
    renderAll();
    showMessage(`同步完成：取得 ${normalized.courses.length} 門課程。`);
    return true;
  }catch(e){
    console.error(e);
    showMessage(`同步失敗：${e.message}。若瀏覽器顯示 CORS，代表網頁版還需要後端代理。`);
    return false;
  }finally{
    setSyncBusy(false);
  }
}

function mergeImportedCourses(data){
  const existingById = new Map(state.courses.map(c=>[String(c.id),c]));
  for(const incoming of data.courses){
    const old = existingById.get(String(incoming.id));
    if(old){
      incoming.customName = old.customName || "";
      incoming.note = old.note || "";
      incoming.journal = Array.isArray(old.journal) ? old.journal : [];
    }
  }
  state.courses = data.courses;
  state.semester = data.semester || state.semester || "";
  if(data.studentId) state.student.studentId = data.studentId;
  if(data.studentName) state.student.name = data.studentName;
}

function normalizeKnownILifeCourseArray(list){
  if(!Array.isArray(list)) return [];
  const groups = new Map();
  for(const row of list){
    if(!row || typeof row !== "object") continue;
    const name = String(row.ch_cos_name ?? row.courseName ?? "").trim();
    if(!name) continue;
    const seat = String(row.seatno ?? row.seatNumber ?? "").trim();
    const key = `${name}\u0000${seat}`;
    if(!groups.has(key)) groups.set(key,{
      id:String(row.courseId ?? row.course_id ?? `ilife-${Array.from(key).reduce((a,ch)=>((a*31+ch.charCodeAt(0))>>>0),7)}`),
      name,customName:"",department:"",grade:"",className:"",credits:"",seatNumber:seat,pdf:"",description:String(row.note ?? ""),times:[],note:"",journal:[]
    });
    const c=groups.get(key);
    const day=parseDay(row.weekno ?? row.week ?? row.weekday);
    const periods=parsePeriods(row.sessno ?? row.period ?? row.section);
    if(day && periods.length){
      const teacher=String(row.teach_name ?? row.teacher ?? "").trim();
      const room=String(row.room ?? row.classroom ?? "").replace(/\s+/g," ").trim();
      const sig=JSON.stringify([day,periods,room,teacher]);
      if(!c.times.some(t=>JSON.stringify([t.day,t.periods,t.room,t.teacher])===sig)) c.times.push({day,periods,room,teacher});
    }
  }
  return [...groups.values()].filter(c=>c.times.length);
}

function normalizeILifeResponse(payload){
  const root = unwrapPayload(payload);
  const list = findCourseArray(root);
  const knownCourses = normalizeKnownILifeCourseArray(list);
  const courses = knownCourses.length ? knownCourses : [];
  if(!courses.length){
    for(const item of list){
      const c = normalizeCourse(item);
      if(c) courses.push(c);
    }
  }
  return {
    semester: findAny(root, ["semester","term","schoolYearSemester","學期"]) || "",
    studentId: findAny(root, ["studentId","student_id","idno","studentNo","學號"]) || "",
    studentName: findAny(root, ["studentName","student_name","name","姓名"]) || "",
    courses
  };
}

function unwrapPayload(payload){
  if(Array.isArray(payload)) return payload;
  for(const k of ["data","result","results","items","rows","records","classSchedule","courseList","schedule"]){
    if(payload && payload[k] != null) return payload[k];
  }
  return payload;
}

function findCourseArray(root){
  if(Array.isArray(root)) return root;
  if(!root || typeof root!=="object") return [];
  for(const k of Object.keys(root)){
    const v = root[k];
    if(Array.isArray(v) && v.some(x=>x && typeof x==="object")){
      const looks = v.some(x=>hasAnyKey(x,["courseId","course_id","開課序號","courseName","科目名稱","classTime","上課時間","weekday","day"]));
      if(looks) return v;
    }
  }
  return [];
}

function normalizeCourse(item){
  if(!item || typeof item!=="object") return null;

  const id = String(findAny(item,["courseId","course_id","id","開課序號","classId","class_id"]) ?? "").trim();
  const name = String(findAny(item,["courseName","course_name","name","科目名稱","subjectName"]) ?? "").trim();
  if(!id && !name) return null;

  const timesRaw = [];
  for(const k of ["times","time","classTimes","classTime","schedule","上課時間","授課時間"]){
    const v = item[k];
    if(Array.isArray(v)) timesRaw.push(...v);
    else if(v && typeof v==="object") timesRaw.push(v);
    else if(typeof v==="string" && v.trim()) timesRaw.push(...parseTimeString(v));
  }

  const simpleDay = findAny(item,["day","weekday","weekDay","上課星期","星期"]);
  const simplePeriods = findAny(item,["periods","period","section","sections","節次","上課節次"]);
  const simpleRoom = findAny(item,["room","classroom","教室","上課教室"]);
  const simpleTeacher = findAny(item,["teacher","instructor","授課老師","老師"]);

  if(!timesRaw.length && (simpleDay || simplePeriods)){
    timesRaw.push({day:simpleDay,periods:simplePeriods,room:simpleRoom,teacher:simpleTeacher});
  }

  const times = [];
  for(const t of timesRaw){
    const nt = normalizeTime(t);
    if(nt) times.push(nt);
  }

  if(!times.length) return null;

  return {
    id,
    name,
    customName:"",
    department:String(findAny(item,["department","departmentCode","系所"]) ?? ""),
    grade:String(findAny(item,["grade","年級"]) ?? ""),
    className:String(findAny(item,["className","class","班別"]) ?? ""),
    credits:String(findAny(item,["credits","credit","學分"]) ?? ""),
    seatNumber:String(findAny(item,["seatNumber","seat","seatNo","座號"]) ?? ""),
    pdf:String(findAny(item,["pdf","pdfUrl","coursePdf"]) ?? ""),
    description:String(findAny(item,["description","courseDescription","課程說明"]) ?? ""),
    times,
    note:"",
    journal:[]
  };
}

function normalizeTime(t){
  if(t==null) return null;
  if(typeof t==="string"){
    const parsed = parseTimeString(t);
    return parsed[0] || null;
  }
  const dayValue = findAny(t,["day","weekday","weekDay","weekdayNo","week","上課星期","星期"]);
  const pValue = findAny(t,["periods","period","section","sections","periodNo","節次","上課節次"]);
  const room = String(findAny(t,["room","classroom","classRoom","location","roomName","教室","上課教室"]) ?? "");
  const teacher = String(findAny(t,["teacher","instructor","teacherName","授課老師","老師"]) ?? "");
  const day = parseDay(dayValue);
  const periods = parsePeriods(pValue);
  if(!day || !periods.length) return null;
  return {day,periods,room,teacher};
}

function parseTimeString(s){
  const text = String(s).replace(/\s+/g," ");
  const dayMatch = text.match(/星期\s*([一二三四五六日])|週\s*([一二三四五六日])|([1-7])/);
  const day = dayMatch ? (dayMatch[1]||dayMatch[2]||dayMatch[3]) : "";
  const periods = parsePeriods((text.match(/(?:第)?\s*([0-9]{1,2}(?:\s*[,、\/-]\s*[0-9]{1,2})*)\s*(?:節|堂)/)?.[1]) || "");
  const room = (text.match(/(?:教室|room|Room)\s*[:：]?\s*([A-Za-z0-9 ]+)/)?.[1] || "").trim();
  const teacher = (text.match(/(?:老師|教師|teacher)\s*[:：]?\s*([^,， ]+)/)?.[1] || "").trim();
  if(!day || !periods.length) return [];
  return [{day:parseDay(day),periods,room,teacher}];
}

function parseDay(v){
  const s = String(v ?? "").trim();
  const map = {"一":1,"二":2,"三":3,"四":4,"五":5,"六":6,"日":7,"天":7};
  if(map[s]) return map[s];
  const n = Number(s);
  if(Number.isInteger(n) && n>=1 && n<=7) return n;
  return null;
}

function parsePeriods(v){
  if(Array.isArray(v)) return v.flatMap(parsePeriods).filter(n=>n>=1&&n<=14);
  const s = String(v ?? "").trim();
  if(!s) return [];
  const nums = s.match(/\d{1,2}/g)?.map(Number) || [];
  return nums.filter(n=>n>=1&&n<=14);
}

function findAny(obj, keys){
  if(!obj || typeof obj!=="object") return null;
  for(const k of keys){
    if(obj[k] != null && obj[k] !== "") return obj[k];
  }
  return null;
}

function hasAnyKey(obj, keys){
  return keys.some(k=>Object.prototype.hasOwnProperty.call(obj,k));
}

async function testBrowserSession(){
  setSyncBusy(true);
  showMessage("正在測試瀏覽器目前的淡江登入 Session…");

  try{
    const base = getApiBase();

    // 第一個測試：完全不帶 q token。
    // 目的不是直接假設 API 一定能用，而是確認登入後的瀏覽器
    // cookie/session 是否能被 ilife API 接受。
    const response = await fetch(base,{
      method:"GET",
      credentials:"include",
      cache:"no-store"
    });

    const text = await response.text();
    const contentType = response.headers.get("content-type") || "";

    if(!response.ok){
      throw new Error(`HTTP ${response.status}${text ? `；${text.slice(0,180)}` : ""}`);
    }

    let payload = null;
    try{
      payload = JSON.parse(text);
    }catch{}

    if(payload){
      const normalized = normalizeILifeResponse(payload);

      if(normalized.courses.length){
        mergeImportedCourses(normalized);
        saveState();
        renderAll();
        showMessage(`成功：瀏覽器登入 Session 可以取得課表，共 ${normalized.courses.length} 門課。`);
        return true;
      }

      const keys = payload && typeof payload === "object" ? Object.keys(payload).slice(0,12).join(", ") : "";
      showMessage(`API 有回應 JSON，但目前沒有辨識出課程。${keys ? ` 回應欄位：${keys}` : ""}`);
      return false;
    }

    showMessage(`API 有回應，但不是 JSON。Content-Type：${contentType || "未提供"}`);
    return false;

  }catch(e){
    console.error("testBrowserSession:", e);

    const msg = String(e?.message || e);
    if(msg.includes("Failed to fetch") || msg.includes("NetworkError")){
      showMessage("瀏覽器無法讀取 iLife API。很可能是 CORS；下一步需要小型後端代理。");
    }else{
      showMessage(`Session 測試失敗：${msg}`);
    }
    return false;
  }finally{
    setSyncBusy(false);
  }
}

async function syncFromButton(){
  const token = getToken();
  if(!token){
    openSettings();
    showMessage("尚未取得登入 Token。");
    return;
  }
  await syncFromILife(token);
}

function openSettings(){
  renderSettings();
  document.getElementById("apiBaseInput").value = getApiBase();
  const bookmarklet = makeCaptureBookmarklet();
  const bookmarkInput = document.getElementById("captureBookmarkletInput");
  if(bookmarkInput) bookmarkInput.value = bookmarklet;
  showSheet("settingsPanel");
}

function renderAll(){
  renderHeader();
  renderSchedule();
  renderSettings();
  document.getElementById("networkStatus").textContent = navigator.onLine ? "目前有網路" : "離線可用";
}

document.getElementById("prevWeek").addEventListener("click",()=>{currentWeekOffset--;renderHeader();renderSchedule();});
document.getElementById("nextWeek").addEventListener("click",()=>{currentWeekOffset++;renderHeader();renderSchedule();});
document.getElementById("todayButton").addEventListener("click",()=>{currentWeekOffset=0;renderHeader();renderSchedule();});
document.getElementById("settingsButton").addEventListener("click",openSettings);
document.getElementById("syncButton").addEventListener("click",syncFromButton);
document.getElementById("syncApiButton").addEventListener("click",syncFromButton);
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",hideSheets));
document.getElementById("overlay").addEventListener("click",e=>{if(e.target.id==="overlay")hideSheets();});
document.getElementById("cancelCourse").addEventListener("click",hideSheets);
document.getElementById("saveCourseButton").addEventListener("click",saveCourse);
document.getElementById("addJournal").addEventListener("click",addJournal);
document.getElementById("showSeat").addEventListener("change",e=>{
  state.display.showSeat = e.target.checked; saveState(); renderSchedule();
});
document.getElementById("tkuLoginButton").addEventListener("click",openTKUSSO);
document.getElementById("testSessionButton").addEventListener("click",testBrowserSession);
document.getElementById("clearTokenButton").addEventListener("click",()=>{
  setToken("");
  renderHeader();
  showMessage("本機登入 Token 已清除。");
});
document.getElementById("importILifeJsonButton").addEventListener("click",()=>{
  try{
    const raw=document.getElementById("ilifeJsonInput").value.trim();
    if(!raw) throw new Error("請先貼上 JSON");
    const payload=JSON.parse(raw);
    const normalized=normalizeILifeResponse(payload);
    if(!normalized.courses.length) throw new Error("JSON 中找不到可辨識的課程時段");
    mergeImportedCourses(normalized);
    saveState(); renderAll();
    document.getElementById("ilifeJsonInput").value="";
    showMessage(`iLife JSON 匯入完成：${normalized.courses.length} 門課程。`);
  }catch(e){ alert(`iLife JSON 匯入失敗：${e.message}`); }
});

document.getElementById("loadDemo").addEventListener("click",loadDemo);
document.getElementById("clearCoursesButton").addEventListener("click",clearCourses);
document.getElementById("logoutAppButton").addEventListener("click",logoutApp);
document.getElementById("exportData").addEventListener("click",exportJSON);
document.getElementById("importData").addEventListener("change",e=>{
  const f=e.target.files?.[0]; if(f) importJSON(f); e.target.value="";
});
document.getElementById("openIlifeApiButton").addEventListener("click",openILifeApiPopup);
document.getElementById("copyCaptureBookmarkletButton").addEventListener("click",async()=>{
  const text=makeCaptureBookmarklet();
  try{await navigator.clipboard.writeText(text);showMessage("已複製「TKU 抓課表」書籤程式。請用 Ctrl+D 新增書籤，再把網址貼上。");}
  catch{const el=document.getElementById("captureBookmarkletInput");el.focus();el.select();showMessage("瀏覽器不允許自動複製，已選取書籤程式，請按 Ctrl+C。");}
});

window.addEventListener("message",event=>{
  if(!event.origin || !event.origin.endsWith(".tku.edu.tw")) return;
  if(event.data?.type === "TKU_ILIFE_API_TEXT") importBrowserApiText(event.data.text,"postMessage");
});

document.getElementById("saveApiBaseButton").addEventListener("click",()=>{
  const v = document.getElementById("apiBaseInput").value.trim();
  if(!/^https?:\/\//i.test(v)){ alert("API 網址格式不正確。"); return; }
  localStorage.setItem(API_KEY,v.replace(/\/+$/,""));
  renderHeader();
  showMessage("API 設定已儲存。");
});

window.addEventListener("online",renderAll);
window.addEventListener("offline",renderAll);

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(console.error));
}

(async()=>{
  await handleSSOCallback();
  renderAll();
  handleBrowserApiHash();
})();
