const STORAGE_KEY = "tku_timetable_v14";
const WORKER_KEY = "tku_cloudflare_worker_v14";
const SESSION_Q_KEY = "tku_api_q_v14";
const DIRECT_BROWSER_API = "https://ilifeapp.az.tku.edu.tw/api/stu/course";
const TKU_API_BASE = "https://ilifeapi.az.tku.edu.tw/api/ilifeStuClassApi";
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
  version:14, semester:"115-1 範例", student:{name:"範例學生",studentId:"DEMO0000"},
  display:JSON.parse(JSON.stringify(DEFAULT_DISPLAY)),
  courses:[
    {id:"2952",name:"高等微積分",customName:"",department:"TSNXB",grade:"2",className:"",credits:"3",seatNumber:"033",pdf:"http://ap09.emis.tku.edu.tw/115_1/115_1_2952.PDF",description:"",times:[{day:1,periods:[1,2],room:"S 420",teacher:"余"},{day:3,periods:[1],room:"S 420",teacher:"余"},{day:3,periods:[2],room:"S 420",teacher:"助教"}],note:"",journal:[]},
    {id:"2951",name:"代數學（一）",customName:"",department:"TSNXB",grade:"2",className:"",credits:"3",seatNumber:"040",pdf:"http://ap09.emis.tku.edu.tw/115_1/115_1_2951.PDF",description:"",times:[{day:2,periods:[8,9],room:"S 420",teacher:"王"},{day:5,periods:[3],room:"S 420",teacher:"王"},{day:5,periods:[7],room:"S 420",teacher:"助教"}],note:"",journal:[]},
    {id:"2954",name:"機率論",customName:"",department:"TSNXB",grade:"2",className:"",credits:"3",seatNumber:"044",pdf:"http://ap09.emis.tku.edu.tw/115_1/115_1_2954.PDF",description:"",times:[{day:4,periods:[5,6],room:"C 013",teacher:"黃"},{day:5,periods:[4],room:"C 013",teacher:"黃"},{day:5,periods:[6],room:"C 002",teacher:"助教"}],note:"",journal:[]},
    {id:"1458",name:"哲學專題",customName:"",department:"TGCHB",grade:"0",className:"B",credits:"2",seatNumber:"016",pdf:"",description:"",times:[{day:4,periods:[9,10],room:"E 414",teacher:"林"}],note:"",journal:[]}
  ]
};

let state = loadState();
let currentWeekOffset = 0;
let currentCourseId = null;

function normalise(data){
  const x = data && typeof data === "object" ? data : {};
  x.version = 14;
  x.semester = x.semester || "";
  x.student = x.student || {name:"",studentId:""};
  x.display = {
    ...clone(DEFAULT_DISPLAY), ...(x.display||{}),
    days:{...DEFAULT_DISPLAY.days,...(x.display?.days||{})},
    periods:{...DEFAULT_DISPLAY.periods,...(x.display?.periods||{})}
  };
  x.courses = Array.isArray(x.courses) ? x.courses : [];
  return x;
}
function loadState(){try{const raw=localStorage.getItem(STORAGE_KEY);return raw?normalise(JSON.parse(raw)):normalise({});}catch{return normalise({});}}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
function clone(v){return JSON.parse(JSON.stringify(v));}
function uid(){return globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;}
function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
function getWorkerBase(){return (localStorage.getItem(WORKER_KEY)||"").replace(/\/+$/g,"");}
function getSessionQ(){return sessionStorage.getItem(SESSION_Q_KEY)||"";}
function setSessionQ(v){if(v)sessionStorage.setItem(SESSION_Q_KEY,v);else sessionStorage.removeItem(SESSION_Q_KEY);}
function displayName(c){return c.customName?.trim()||c.name||"未命名課程";}
function getCourse(id){return state.courses.find(c=>String(c.id)===String(id));}
function getMonday(offset=0){const d=new Date();const day=d.getDay();const diff=day===0?-6:1-day;d.setHours(0,0,0,0);d.setDate(d.getDate()+diff+offset*7);return d;}
function dateText(d){return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`;}
function visibleDays(){return DAYS.filter(d=>state.display.days[d.key]);}
function visiblePeriods(){return PERIODS.filter(p=>state.display.periods[p.number]);}

function renderHeader(){
  document.getElementById("semesterText").textContent=state.semester?`學期：${state.semester}`:"本機課表";
  document.getElementById("studentName").textContent=state.student?.name||"尚未登入";
  document.getElementById("studentInfo").textContent=state.student?.studentId?`學號：${state.student.studentId}`:"可先使用範例資料測試課表";
  document.getElementById("settingStudentName").textContent=state.student?.name||"尚未取得";
  document.getElementById("settingStudentId").textContent=state.student?.studentId||"尚未取得";
  document.getElementById("tokenStatus").textContent=getSessionQ()?"本分頁已有 TKU 授權參數":"尚未取得";
  const wi=document.getElementById("workerBaseInput");if(wi)wi.value=getWorkerBase();
  const qi=document.getElementById("tkuAuthInput");if(qi)qi.value=getSessionQ();
  const mon=getMonday(currentWeekOffset);const sun=new Date(mon);sun.setDate(sun.getDate()+6);
  document.getElementById("weekText").textContent=`${dateText(mon)} ～ ${dateText(sun)}`;
}
function coursesForCell(day,period){const found=[];for(const c of state.courses){for(const t of c.times||[]){if(Number(t.day)!==day)continue;if(!(t.periods||[]).map(Number).includes(period))continue;found.push({course:c,time:t});}}return found;}
function renderSchedule(){
  const root=document.getElementById("schedule");root.innerHTML="";const days=visibleDays();const periods=visiblePeriods();root.style.setProperty("--day-count",String(days.length));
  if(!days.length||!periods.length){root.innerHTML=`<div style="grid-column:1/-1;padding:30px;text-align:center;color:#6b7280">請在設定中至少開啟一個星期與一個節次。</div>`;return;}
  const monday=getMonday(currentWeekOffset);const corner=document.createElement("div");corner.className="corner-cell";root.appendChild(corner);
  for(const day of days){const date=new Date(monday);date.setDate(monday.getDate()+day.key-1);const h=document.createElement("div");h.className="day-head";h.innerHTML=`<strong>星期${day.name}</strong><small>${esc(dateText(date))}</small>`;root.appendChild(h);}
  for(const period of periods){const l=document.createElement("div");l.className="period-label";l.innerHTML=`<strong>第${period.number}節</strong><span>${esc(period.time)}</span>`;root.appendChild(l);for(const day of days){const cell=document.createElement("div");cell.className="course-cell";const items=coursesForCell(day.key,period.number);if(!items.length){cell.innerHTML=`<div class="empty-cell">—</div>`;}else{for(const item of items){const c=item.course,t=item.time;const b=document.createElement("button");b.type="button";b.className="course-card";b.innerHTML=`<div class="course-name">${esc(displayName(c))}</div><div class="course-meta">${esc(t.teacher||"")}${t.room?`　${esc(t.room)}`:""}</div>${state.display.showSeat&&c.seatNumber?`<div class="course-seat">座號 ${esc(c.seatNumber)}</div>`:""}`;b.addEventListener("click",()=>openCourse(c.id));cell.appendChild(b);}}root.appendChild(cell);}}
}
function renderSettings(){
  const dc=document.getElementById("dayChecks");dc.innerHTML="";for(const d of DAYS){const label=document.createElement("label");label.className="toggle-item";label.innerHTML=`<span>星期${d.name}</span><input type="checkbox" ${state.display.days[d.key]?"checked":""}>`;label.querySelector("input").addEventListener("change",e=>{state.display.days[d.key]=e.target.checked;saveState();renderSchedule();});dc.appendChild(label);}
  const pc=document.getElementById("periodChecks");pc.innerHTML="";for(const p of PERIODS){const label=document.createElement("label");label.className="toggle-item";label.innerHTML=`<span>第${p.number}節<small>${esc(p.time)}</small></span><input type="checkbox" ${state.display.periods[p.number]?"checked":""}>`;label.querySelector("input").addEventListener("change",e=>{state.display.periods[p.number]=e.target.checked;saveState();renderSchedule();});pc.appendChild(label);}
  document.getElementById("showSeat").checked=!!state.display.showSeat;
}
function showSheet(id){document.getElementById("overlay").classList.remove("hidden");document.getElementById(id).classList.remove("hidden");document.body.style.overflow="hidden";}
function hideSheets(){document.getElementById("overlay").classList.add("hidden");document.getElementById("coursePanel").classList.add("hidden");document.getElementById("settingsPanel").classList.add("hidden");document.body.style.overflow="";currentCourseId=null;}
function openCourse(id){const c=getCourse(id);if(!c)return;currentCourseId=String(id);document.getElementById("courseTitle").textContent=displayName(c);document.getElementById("courseSubtitle").textContent=[c.department,c.className].filter(Boolean).join(" · ");document.getElementById("customName").value=c.customName||"";document.getElementById("schoolName").textContent=c.name||"—";document.getElementById("courseIdText").textContent=c.id||"—";document.getElementById("seatNumber").textContent=c.seatNumber||"—";document.getElementById("credits").textContent=c.credits||"—";document.getElementById("department").textContent=c.department||"—";document.getElementById("gradeClass").textContent=[c.grade,c.className].filter(Boolean).join(" / ")||"—";document.getElementById("description").value=c.description||"";document.getElementById("note").value=c.note||"";const times=document.getElementById("timesList");times.innerHTML="";for(const t of c.times||[]){const day=DAYS.find(d=>d.key===Number(t.day));const el=document.createElement("div");el.className="time-item";el.innerHTML=`<div class="time-title">星期${esc(day?.name||t.day)} · 第${esc((t.periods||[]).join("、"))}節</div><div class="time-sub">教室：${esc(t.room||"—")}</div><div class="time-teacher">授課：${esc(t.teacher||"—")}</div>`;times.appendChild(el);}document.getElementById("courseLinks").innerHTML=c.pdf?`<a href="${esc(c.pdf)}" target="_blank" rel="noopener">查看課程資料 ↗</a>`:"";renderJournal(c);showSheet("coursePanel");}
function renderJournal(c){const list=document.getElementById("journalList");list.innerHTML="";if(!c.journal?.length){list.innerHTML=`<div class="hint">尚無記事。</div>`;return;}for(const j of c.journal){const el=document.createElement("div");el.className="journal-item";el.innerHTML=`<strong>${esc(j.date)}</strong><div>${esc(j.text)}</div>`;list.appendChild(el);}}
function saveCourse(){const c=getCourse(currentCourseId);if(!c)return;c.customName=document.getElementById("customName").value.trim();c.description=document.getElementById("description").value;c.note=document.getElementById("note").value;saveState();hideSheets();renderAll();}
function addJournal(){const c=getCourse(currentCourseId);if(!c)return;const text=prompt("輸入記事內容：");if(!text?.trim())return;c.journal=Array.isArray(c.journal)?c.journal:[];c.journal.unshift({id:uid(),date:new Date().toLocaleString("zh-TW",{hour12:false}),text:text.trim()});saveState();renderJournal(c);}
function clearCourses(){if(!confirm("確定清除課表嗎？自訂課名、備註、記事與顯示設定會保留。"))return;state.courses=[];state.semester="";saveState();hideSheets();renderAll();}
function logoutApp(){if(!confirm("確定清除本機所有資料與本分頁 TKU 授權參數嗎？"))return;localStorage.removeItem(STORAGE_KEY);localStorage.removeItem(WORKER_KEY);setSessionQ("");state=normalise({});hideSheets();renderAll();}
function loadDemo(){if(!confirm("載入範例課表，會取代目前本機課表。"))return;state=clone(DEMO);saveState();hideSheets();renderAll();}
function exportJSON(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="tku-timetable.json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);}
async function importJSON(file){try{state=normalise(JSON.parse(await file.text()));saveState();renderAll();alert("匯入成功。");}catch(e){alert(`匯入失敗：${e.message}`);}}
function showMessage(text){const box=document.getElementById("messagePanel");box.textContent=text;box.classList.remove("hidden");clearTimeout(showMessage.timer);showMessage.timer=setTimeout(()=>box.classList.add("hidden"),7000);}
function setBusy(busy){for(const id of ["workerProbeButton","workerSyncButton","tkuLoginButton","pasteAuthButton"]){const b=document.getElementById(id);if(b)b.disabled=busy;}}

function unwrapApiPayload(payload){
  if(Array.isArray(payload))return payload;
  if(!payload||typeof payload!=="object")return [];
  for(const key of ["data","rows","items","result","courses","records","value"]){if(key in payload){const x=unwrapApiPayload(payload[key]);if(x.length)return x;}}
  return [];
}
function parsePeriod(v){const s=String(v??"").trim();if(!s)return[];return s.split(/[、,\s\/\-]+/).flatMap(part=>{const n=parseInt(part,10);return Number.isFinite(n)?[n]:[];}).filter(n=>n>=1&&n<=14);}
function parseDay(v){const map={"一":1,"二":2,"三":3,"四":4,"五":5,"六":6,"日":7,"天":7};const s=String(v??"").trim();if(map[s])return map[s];const n=parseInt(s,10);return n>=1&&n<=7?n:0;}
function rowToTime(row){const day=parseDay(row.week??row.weekno??row.day??row.weekday);const periods=parsePeriod(row.sessno??row.period??row.periods??row.section);return day&&periods.length?{day,periods,room:String(row.room??row.classroom??"").replace(/\s+/g," ").trim(),teacher:String(row.teach_name??row.teacher??row.teacherName??"").trim()}:null;}
function rowCourseKey(row){const name=String(row.ch_cos_name??row.courseName??row.name??"").trim();const seat=String(row.seatno??row.seatNumber??row.seat??"").trim();return `${name}|||${seat}`;}
function normalizeILifeResponse(payload){
  const rows=unwrapApiPayload(payload);const map=new Map();
  for(const row of rows){if(!row||typeof row!=="object")continue;const time=rowToTime(row);if(!time)continue;const name=String(row.ch_cos_name??row.courseName??row.name??"").trim();if(!name)continue;const key=rowCourseKey(row);let c=map.get(key);if(!c){c={id:uid(),name,customName:"",department:String(row.department??row.dept??"").trim(),grade:String(row.grade??"").trim(),className:String(row.className??row.class??"").trim(),credits:String(row.credits??row.credit??"").trim(),seatNumber:String(row.seatno??row.seatNumber??row.seat??"").trim(),pdf:String(row.pdf??row.url??"").trim(),description:String(row.description??row.note??"").trim(),times:[],note:"",journal:[]};map.set(key,c);}if(!c.times.some(t=>t.day===time.day&&JSON.stringify(t.periods)===JSON.stringify(time.periods)&&t.room===time.room&&t.teacher===time.teacher))c.times.push(time);}
  return {courses:[...map.values()],semester:""};
}
function mergeImportedCourses(normalized){
  const oldByKey=new Map(state.courses.map(c=>[`${c.name}|||${c.seatNumber||""}`,c]));
  const merged=normalized.courses.map(n=>{const o=oldByKey.get(`${n.name}|||${n.seatNumber||""}`);return o?{...n,id:o.id,customName:o.customName,note:o.note,journal:o.journal,description:o.description||n.description}:n;});
  state.courses=merged;
  if(normalized.semester)state.semester=normalized.semester;
}

function findAuthValueFromUrl(raw){
  const text=String(raw||"").trim();
  if(!text)return null;
  let u;try{u=new URL(text);}catch{try{u=new URL(text,location.href);}catch{return null;}}
  const keys=["q","token","access_token","ssotoken","sso_token","login_token","id_token","ticket","code"];
  for(const k of keys){const v=u.searchParams.get(k);if(v)return {kind:k,value:v,url:u.toString()};}
  if(u.hash){const h=new URLSearchParams(u.hash.replace(/^#/,""));for(const k of keys){const v=h.get(k);if(v)return {kind:k,value:v,url:u.toString()};}}
  return null;
}
function saveAuthFromInput(raw){
  const found=findAuthValueFromUrl(raw);
  if(found){setSessionQ(found.value);renderHeader();return found;}
  const direct=String(raw||"").trim();
  if(direct && !/^https?:\/\//i.test(direct)){setSessionQ(direct);renderHeader();return {kind:"direct",value:direct,url:""};}
  return null;
}
function openTKUSSO(){
  window.open(SSO_URL,"_blank","noopener");
  showMessage("已開啟淡江登入。登入完成後，請複製登入完成頁面的完整網址，回到本頁貼到「SSO／API 回傳網址」欄位。不要把帳號、密碼、Cookie 貼給任何人。");
}
async function workerJSON(path,body){
  const base=getWorkerBase();if(!base)throw new Error("請先填入 Cloudflare Worker 網址");
  const r=await fetch(base+path,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(body||{})});
  const x=await r.json().catch(()=>null);if(!x)throw new Error(`Worker 回傳非 JSON（HTTP ${r.status}）`);return x;
}
async function testWorker(){
  setBusy(true);try{const x=await workerJSON("/api/tku-probe",{q:getSessionQ()});const parts=[`Worker ${x.workerStatus??200}`,`TKU HTTP ${x.tkuStatus??"?"}`];if(x.contentType)parts.push(x.contentType);if(x.hasSetCookie)parts.push("TKU 回傳 Set-Cookie");if(x.bodySnippet)parts.push(`內容：${x.bodySnippet}`);showMessage(parts.join("｜"));}catch(e){showMessage(`Worker 測試失敗：${e.message}`);}finally{setBusy(false);}}
async function syncViaWorker(){
  setBusy(true);try{const q=getSessionQ();if(!q)throw new Error("還沒有 TKU 授權參數。先登入 TKU，再把登入完成網址貼到欄位並儲存。");const x=await workerJSON("/api/tku-course",{q});if(!x.ok)throw new Error(`${x.reason||"TKU API 沒有回傳課表"}${x.bodySnippet?`｜內容：${x.bodySnippet}`:""}`);const normalized=normalizeILifeResponse(x.data);if(!normalized.courses.length)throw new Error("Worker 有收到資料，但辨識不到課程。請把 Worker 回應貼給我檢查格式。");mergeImportedCourses(normalized);saveState();renderAll();showMessage(`成功取得 ${normalized.courses.length} 門課程。`);}catch(e){showMessage(`雲端同步失敗：${e.message}`);}finally{setBusy(false);}}
function applyAuthInput(){
  const raw=document.getElementById("tkuAuthInput").value.trim();const found=saveAuthFromInput(raw);if(!found){showMessage("找不到可使用的 q／token／code。請貼上完整 SSO／API 回傳網址。若你只拿到一個授權字串，也可以直接貼字串。");return;}showMessage(`已保存 TKU 授權參數（${found.kind}）。現在可以按「測試 Worker → TKU」；若測試回傳 JSON，再按「抓取課表」。`);
}
function clearAuth(){setSessionQ("");document.getElementById("tkuAuthInput").value="";renderHeader();showMessage("本分頁 TKU 授權參數已清除。")}
function openILifeApiPopup(){window.open(DIRECT_BROWSER_API,"_blank","noopener");showMessage("已開啟 TKU 課表 API。這只是手動驗證用；真正同步請使用 SSO 回傳授權參數 + Cloudflare Worker。")}
function copyApiTemplate(){const text=`${TKU_API_BASE}?q=請貼上授權參數`;navigator.clipboard?.writeText(text).then(()=>showMessage("已複製 API URL 範例。"),()=>showMessage(text));}

function renderAll(){renderHeader();renderSchedule();renderSettings();document.getElementById("networkStatus").textContent=navigator.onLine?"目前有網路":"離線可用";}

document.getElementById("prevWeek").addEventListener("click",()=>{currentWeekOffset--;renderHeader();renderSchedule();});
document.getElementById("nextWeek").addEventListener("click",()=>{currentWeekOffset++;renderHeader();renderSchedule();});
document.getElementById("todayButton").addEventListener("click",()=>{currentWeekOffset=0;renderHeader();renderSchedule();});
document.getElementById("settingsButton").addEventListener("click",()=>{renderSettings();renderHeader();showSheet("settingsPanel");});
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",hideSheets));
document.getElementById("overlay").addEventListener("click",e=>{if(e.target.id==="overlay")hideSheets();});
document.getElementById("cancelCourse").addEventListener("click",hideSheets);
document.getElementById("saveCourseButton").addEventListener("click",saveCourse);
document.getElementById("addJournal").addEventListener("click",addJournal);
document.getElementById("showSeat").addEventListener("change",e=>{state.display.showSeat=e.target.checked;saveState();renderSchedule();});
document.getElementById("tkuLoginButton").addEventListener("click",openTKUSSO);
document.getElementById("workerProbeButton").addEventListener("click",testWorker);
document.getElementById("workerSyncButton").addEventListener("click",syncViaWorker);
document.getElementById("pasteAuthButton").addEventListener("click",applyAuthInput);
document.getElementById("clearAuthButton").addEventListener("click",clearAuth);
document.getElementById("openIlifeApiButton").addEventListener("click",openILifeApiPopup);
document.getElementById("copyApiTemplateButton").addEventListener("click",copyApiTemplate);
document.getElementById("loadDemo").addEventListener("click",loadDemo);
document.getElementById("clearCoursesButton").addEventListener("click",clearCourses);
document.getElementById("logoutAppButton").addEventListener("click",logoutApp);
document.getElementById("exportData").addEventListener("click",exportJSON);
document.getElementById("importData").addEventListener("change",e=>{const f=e.target.files?.[0];if(f)importJSON(f);e.target.value="";});
document.getElementById("importILifeJsonButton").addEventListener("click",()=>{try{const raw=document.getElementById("ilifeJsonInput").value.trim();if(!raw)throw new Error("請先貼上 JSON");const normalized=normalizeILifeResponse(JSON.parse(raw));if(!normalized.courses.length)throw new Error("JSON 中找不到可辨識課程");mergeImportedCourses(normalized);saveState();renderAll();document.getElementById("ilifeJsonInput").value="";showMessage(`iLife JSON 匯入完成：${normalized.courses.length} 門課程。`);}catch(e){alert(`iLife JSON 匯入失敗：${e.message}`);}});
document.getElementById("saveWorkerBaseButton").addEventListener("click",()=>{const v=document.getElementById("workerBaseInput").value.trim();if(!/^https:\/\//i.test(v)){alert("Worker 網址必須是 https:// 開頭。");return;}localStorage.setItem(WORKER_KEY,v.replace(/\/+$/g,""));renderHeader();showMessage("Cloudflare Worker 網址已儲存。")});
window.addEventListener("online",renderAll);window.addEventListener("offline",renderAll);
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(console.error));

(function handleCallback(){
  const found=findAuthValueFromUrl(location.href);if(found){setSessionQ(found.value);const u=new URL(location.href);["q","token","access_token","ssotoken","sso_token","login_token","id_token","ticket","code"].forEach(k=>u.searchParams.delete(k));u.hash="";history.replaceState({},document.title,u.pathname+u.search);}
  renderAll();
})();
