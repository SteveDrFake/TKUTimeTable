(() => {
"use strict";

const STORAGE_KEY = "tku_timetable_rebuild_v1";
const CAPTURE_INBOX_KEY = "tku_timetable_capture_inbox_v1";
const DB_VERSION = 1;
const DAYS = [
  {key:1,name:"一"},{key:2,name:"二"},{key:3,name:"三"},{key:4,name:"四"},{key:5,name:"五"},{key:6,name:"六"},{key:7,name:"日"}
];
const PERIODS = Array.from({length:14},(_,i)=>({number:i+1}));
const DEFAULT_STATE = {
  version: DB_VERSION,
  semester: "",
  student: {name:"", studentId:"", className:""},
  display: {
    days: {1:true,2:true,3:true,4:true,5:true,6:false,7:false},
    periods: Object.fromEntries(PERIODS.map(p=>[p.number,p.number<=10])),
    showSeat: true,
    showRoom: true,
    showTeacher: true
  },
  courses: [],
  importedAt: "",
  source: ""
};
let state = normalizeState(loadState());
let currentWeekOffset = 0;
let currentCourseId = null;
let pendingImport = null;
let deferredInstallPrompt = null;

function el(id){return document.getElementById(id)}
function clone(v){return JSON.parse(JSON.stringify(v))}
function uid(){return crypto?.randomUUID?.() || `c_${Date.now()}_${Math.random().toString(36).slice(2)}`}
function esc(v){return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function trim(v){return String(v ?? "").trim()}
function fmtDateTime(value){if(!value) return "—"; const d=new Date(value); if(Number.isNaN(d.getTime())) return String(value); return d.toLocaleString("zh-TW",{hour12:false})}
function toast(message,kind=""){const box=el("toast");box.textContent=message;box.className=`toast ${kind?kind:""}`;box.classList.remove("hidden");clearTimeout(toast._t);toast._t=setTimeout(()=>box.classList.add("hidden"),3200)}

function normalizeState(raw){
  const x = raw && typeof raw === "object" ? raw : {};
  const s = clone(DEFAULT_STATE);
  s.semester = trim(x.semester);
  s.student = {...s.student,...(x.student && typeof x.student === "object" ? x.student : {})};
  s.display.days = {...s.display.days,...(x.display?.days || {})};
  s.display.periods = {...s.display.periods,...(x.display?.periods || {})};
  s.display.showSeat = x.display?.showSeat !== false;
  s.display.showRoom = x.display?.showRoom !== false;
  s.display.showTeacher = x.display?.showTeacher !== false;
  s.courses = Array.isArray(x.courses) ? x.courses.map(normalizeCourse).filter(Boolean) : [];
  s.importedAt = x.importedAt || "";
  s.source = x.source || "";
  return s;
}
function normalizeCourse(c){
  if(!c || typeof c !== "object") return null;
  const out = {
    id: String(c.id ?? uid()),
    name: trim(c.name) || "未命名課程",
    customName: trim(c.customName),
    department: trim(c.department),
    grade: trim(c.grade),
    className: trim(c.className || c.class || ""),
    credits: c.credits == null ? "" : String(c.credits),
    seatNumber: trim(c.seatNumber || c.seatno || ""),
    description: String(c.description ?? ""),
    pdf: trim(c.pdf),
    note: String(c.note ?? ""),
    journal: Array.isArray(c.journal) ? c.journal.map(j=>({id:String(j.id||uid()),date:String(j.date||""),text:String(j.text||"")})).filter(j=>j.text.trim()) : [],
    times: []
  };
  const seen = new Set();
  for(const t of Array.isArray(c.times) ? c.times : []){
    const day = Number(t.day ?? t.weekno);
    const periods = [...new Set((Array.isArray(t.periods) ? t.periods : [t.period ?? t.sessno]).map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=14))].sort((a,b)=>a-b);
    if(!Number.isInteger(day)||day<1||day>7||!periods.length) continue;
    const time = {day,periods,teacher:trim(t.teacher),room:trim(t.room),startTimes:Array.isArray(t.startTimes)?t.startTimes.map(String):[]};
    const key = JSON.stringify([day,periods,time.teacher,time.room,time.startTimes]);
    if(!seen.has(key)){seen.add(key);out.times.push(time)}
  }
  return out;
}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function loadState(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")}catch{return {}}}
function visibleDays(){return DAYS.filter(d=>state.display.days[d.key])}
function visiblePeriods(){return PERIODS.filter(p=>state.display.periods[p.number])}
function displayName(c){return trim(c.customName)||c.name||"未命名課程"}
function getCourse(id){return state.courses.find(c=>String(c.id)===String(id))||null}

function mondayFor(offset=0){const d=new Date();const day=d.getDay();const diff=day===0?-6:1-day;d.setHours(0,0,0,0);d.setDate(d.getDate()+diff+offset*7);return d}
function dateText(d){return `${d.getMonth()+1}/${d.getDate()}`}
function periodLabel(n){return `第${n}節`}

function renderHeader(){
  el("semesterLabel").textContent = state.semester ? `學期：${state.semester}` : "尚未載入課表";
  el("studentName").textContent = state.student.name || "尚未登入";
  const info = [state.student.studentId && `學號：${state.student.studentId}`,state.student.className].filter(Boolean).join(" · ");
  el("studentInfo").textContent = info || (state.courses.length ? `已載入 ${state.courses.length} 門課` : "先從設定匯入課表資料");
  const pill=el("statusPill"); pill.textContent=navigator.onLine?"已連線／本機資料":"離線可用"; pill.className=`status-pill ${navigator.onLine?"good":""}`;
  const monday=mondayFor(currentWeekOffset); const sunday=new Date(monday);sunday.setDate(sunday.getDate()+6);
  el("weekText").textContent=`${monday.getFullYear()}/${dateText(monday)} ～ ${sunday.getFullYear()}/${dateText(sunday)}`;
  el("lastUpdated").textContent=state.importedAt?`最後匯入：${fmtDateTime(state.importedAt)}`:"尚未匯入資料";
}

function courseOccurrencesForCell(day,period){
  const items=[]; for(const course of state.courses){for(const time of course.times){if(Number(time.day)!==day) continue;if(time.periods.includes(period)) items.push({course,time})}}
  return items;
}
function renderSchedule(){
  const grid=el("scheduleGrid");grid.innerHTML="";const days=visibleDays();const periods=visiblePeriods();
  grid.style.setProperty("--day-count",String(days.length));
  grid.style.gridTemplateColumns=`var(--time-w) repeat(${Math.max(days.length,1)}, var(--day-w))`;
  if(!days.length||!periods.length){grid.innerHTML='<div style="grid-column:1/-1;padding:42px;text-align:center;color:#6b7280">請在設定中至少開啟一個星期與一個節次。</div>';return}
  const monday=mondayFor(currentWeekOffset);
  const corner=document.createElement("div");corner.className="corner-cell";grid.appendChild(corner);
  for(const day of days){const d=new Date(monday);d.setDate(monday.getDate()+day.key-1);const h=document.createElement("div");h.className="day-head";h.innerHTML=`<strong>星期${day.name}</strong><small>${esc(dateText(d))}</small>`;grid.appendChild(h)}
  for(const period of periods){
    const p=document.createElement("div");p.className="period-label";p.innerHTML=`<strong>${periodLabel(period.number)}</strong><span>—</span>`;grid.appendChild(p);
    for(const day of days){
      const cell=document.createElement("div");cell.className="course-cell";const items=courseOccurrencesForCell(day.key,period.number);
      if(!items.length)cell.innerHTML='<div class="empty-cell">—</div>';
      else for(const {course,time} of items){const b=document.createElement("button");b.type="button";b.className="course-card";const meta=[];if(state.display.showTeacher&&time.teacher)meta.push(time.teacher);if(state.display.showRoom&&time.room)meta.push(time.room);b.innerHTML=`<div class="course-name">${esc(displayName(course))}</div>${meta.length?`<div class="course-meta">${esc(meta.join(" · "))}</div>`:""}${state.display.showSeat&&course.seatNumber?`<div class="course-seat">座號 ${esc(course.seatNumber)}</div>`:""}`;b.addEventListener("click",()=>openCourse(course.id));cell.appendChild(b)}
      grid.appendChild(cell);
    }
  }
}

function openSheet(sheetId){el("overlay").classList.remove("hidden");el("overlay").setAttribute("aria-hidden","false");for(const id of ["settingsSheet","importSheet","courseSheet"])el(id).classList.add("hidden");el(sheetId).classList.remove("hidden");document.body.style.overflow="hidden"}
function closeSheets(){el("overlay").classList.add("hidden");el("overlay").setAttribute("aria-hidden","true");for(const id of ["settingsSheet","importSheet","courseSheet"])el(id).classList.add("hidden");document.body.style.overflow="";currentCourseId=null}
function fillSettings(){
  el("semesterInput").value=state.semester;el("studentNameInput").value=state.student.name;el("studentIdInput").value=state.student.studentId;el("studentClassInput").value=state.student.className;
  const dayBox=el("dayChecks");dayBox.innerHTML="";for(const d of DAYS){const label=document.createElement("label");label.className="toggle-item";label.innerHTML=`<span>星期${d.name}</span><input type="checkbox" ${state.display.days[d.key]?"checked":""}>`;label.querySelector("input").addEventListener("change",e=>{state.display.days[d.key]=e.target.checked;saveState();renderSchedule()});dayBox.appendChild(label)}
  const periodBox=el("periodChecks");periodBox.innerHTML="";for(const p of PERIODS){const label=document.createElement("label");label.className="toggle-item";label.innerHTML=`<span>${periodLabel(p.number)}</span><input type="checkbox" ${state.display.periods[p.number]?"checked":""}>`;label.querySelector("input").addEventListener("change",e=>{state.display.periods[p.number]=e.target.checked;saveState();renderSchedule()});periodBox.appendChild(label)}
  el("showSeatInput").checked=state.display.showSeat;el("showRoomInput").checked=state.display.showRoom;el("showTeacherInput").checked=state.display.showTeacher;
  el("courseCountStat").textContent=String(state.courses.length);el("timeCountStat").textContent=String(state.courses.reduce((n,c)=>n+c.times.length,0));el("importedAtStat").textContent=fmtDateTime(state.importedAt);el("diagnosticMessage").textContent=state.courses.length?`資料來源：${state.source||"本機"}
資料狀態正常，可以離線使用。`:"尚未匯入資料。";
}
function openSettings(){fillSettings();openSheet("settingsSheet")}

function parseAnyCourseJson(input){
  let data=input;
  if(typeof input==="string"){try{data=JSON.parse(input)}catch(e){return {ok:false,error:`JSON 格式錯誤：${e.message}`}}}
  if(Array.isArray(data))return parseILifeRows(data);
  if(data && Array.isArray(data.courses))return {ok:true,courses:data.courses.map(normalizeCourse).filter(Boolean),source:"一般課表 JSON"};
  if(data && Array.isArray(data.data))return parseILifeRows(data.data);
  return {ok:false,error:"找不到可辨識的 courses 陣列或 iLife 課表陣列。"};
}
function first(obj,names){for(const n of names){if(obj[n]!=null&&String(obj[n]).trim()!=="")return obj[n]}return ""}
function parseILifeRows(rows){
  if(!Array.isArray(rows))return {ok:false,error:"資料不是陣列。"};
  const map=new Map();
  let used=0;
  for(const r of rows){
    if(!r||typeof r!=="object")continue;
    const name=trim(first(r,["ch_cos_name","courseName","name","subject"]));
    const seat=trim(first(r,["seatno","seatNumber","seat"]));
    const day=Number(first(r,["weekno","week","day"]));
    const periodRaw=first(r,["sessno","period","section"]);const period=Number(String(periodRaw).replace(/[^0-9]/g,""));
    if(!name||!Number.isInteger(day)||day<1||day>7||!Number.isInteger(period)||period<1||period>14)continue;
    const courseId=trim(first(r,["courseId","course_id","cosid","classId","class_id"]));
    const key=courseId || `${name}||${seat}||${trim(first(r,["class","className","dept"] ))}`;
    if(!map.has(key))map.set(key,{id:courseId||uid(),name,customName:"",department:trim(first(r,["department","dept"])),grade:trim(first(r,["grade"])),className:trim(first(r,["className","class","classno"])),credits:String(first(r,["credits","credit"])||""),seatNumber:seat,description:String(first(r,["description","note","remark"])||""),pdf:trim(first(r,["pdf","pdfUrl","coursePdf"])),note:"",journal:[],times:[]});
    const course=map.get(key);if(!course.seatNumber&&seat)course.seatNumber=seat;
    const teacher=trim(first(r,["teach_name","teacher","teacherName"]));const room=trim(first(r,["room","classroom"]));const start=trim(first(r,["sesstime","startTime"]));
    let t=course.times.find(x=>x.day===day&&x.teacher===teacher&&x.room===room);if(!t){t={day,periods:[],teacher,room,startTimes:[]};course.times.push(t)}if(!t.periods.includes(period))t.periods.push(period);if(start&&!t.startTimes.includes(start))t.startTimes.push(start);used++;
  }
  const courses=[...map.values()].map(c=>normalizeCourse(c));return courses.length?{ok:true,courses,source:"TKU iLife JSON",rowCount:used}:{ok:false,error:"JSON 裡沒有找到可用的星期／節次／課名資料。"};
}
function previewImport(){const result=parseAnyCourseJson(el("apiJsonInput").value);pendingImport=result.ok?result:null;el("importPreview").textContent=result.ok?`解析成功
課程：${result.courses.length} 門
上課時段：${result.courses.reduce((n,c)=>n+c.times.length,0)}
${result.rowCount?`有效資料列：${result.rowCount}`:""}`:`解析失敗
${result.error}`;return result}
function commitImport(){const result=pendingImport || previewImport();if(!result.ok)return;state.courses=result.courses;state.importedAt=new Date().toISOString();state.source=result.source;saveState();closeSheets();renderAll();toast(`已匯入 ${state.courses.length} 門課`)}

function sampleState(){
  const make=(id,name,seat,day,periods,teacher,room)=>({id,name,customName:"",department:"範例",grade:"",className:"",credits:"3",seatNumber:String(seat),description:"範例課程資料",pdf:"",note:"",journal:[],times:[{day,periods,teacher,room,startTimes:[]}]});
  return [
    make("demo-1","高等微積分","033",1,[1,2],"余成義","S 420"),
    make("demo-2","英文（二）","004",5,[8,9],"羅老師","S 101"),
    make("demo-3","機率論","044",4,[5,6],"黃老師","C 013"),
    make("demo-4","科學論文導讀（二）","002",4,[3,4],"穆老師","Q 305"),
    make("demo-5","代數學（一）","040",2,[8,9],"王老師","S 420"),
    { ...make("demo-6","代數學（一）","040",5,[3],"王老師","S 420"), times:[{day:5,periods:[3],teacher:"王老師",room:"S 420",startTimes:[]},{day:5,periods:[7],teacher:"助教",room:"S 420",startTimes:[]}]},
    make("demo-7","微分方程（一）","032",2,[3,4],"謝老師","S 420"),
    make("demo-8","男、女生體育－羽球興趣班","020",1,[7,8],"蔡老師","")
  ].map(normalizeCourse);
}

function openCourse(id){const c=getCourse(id);if(!c)return;currentCourseId=String(id);el("courseTitle").textContent=displayName(c);el("courseSubtitle").textContent=[c.department,c.className].filter(Boolean).join(" · ");el("customNameInput").value=c.customName||"";el("detailSchoolName").textContent=c.name||"—";el("detailCourseId").textContent=c.id||"—";el("detailSeat").textContent=c.seatNumber||"—";el("detailCredits").textContent=c.credits||"—";el("detailDepartment").textContent=c.department||"—";el("detailGradeClass").textContent=[c.grade,c.className].filter(Boolean).join(" / ")||"—";el("detailDescription").value=c.description||"";el("detailNote").value=c.note||"";renderTimes(c);renderJournal(c);openSheet("courseSheet")}
function renderTimes(c){const root=el("detailTimes");root.innerHTML="";if(!c.times.length){root.innerHTML='<div class="hint">沒有上課時段資料。</div>';return}for(const t of c.times){const day=DAYS.find(d=>d.key===t.day);const times=t.startTimes?.length?` · ${t.startTimes.join("、")}`:"";const item=document.createElement("div");item.className="time-item";item.innerHTML=`<div class="time-title">星期${esc(day?.name||t.day)} · 第${esc(t.periods.join("、"))}節${esc(times)}</div><div class="time-sub">教室：${esc(t.room||"—")}</div><div class="time-teacher">授課：${esc(t.teacher||"—")}</div>`;root.appendChild(item)}}
function renderJournal(c){const root=el("journalList");root.innerHTML="";if(!c.journal?.length){root.innerHTML='<div class="hint">尚無記事。</div>';return}for(const j of c.journal){const item=document.createElement("div");item.className="journal-item";item.innerHTML=`<strong>${esc(j.date)}</strong><div>${esc(j.text)}</div>`;root.appendChild(item)}}
function saveCurrentCourse(){const c=getCourse(currentCourseId);if(!c)return;c.customName=trim(el("customNameInput").value);c.note=el("detailNote").value;saveState();closeSheets();renderAll();toast("課程已儲存")}
function deleteCurrentCourse(){const c=getCourse(currentCourseId);if(!c)return;if(!confirm(`確定刪除「${displayName(c)}」嗎？`))return;state.courses=state.courses.filter(x=>String(x.id)!==String(currentCourseId));saveState();closeSheets();renderAll();toast("已刪除課程")}
function addJournal(){const c=getCourse(currentCourseId);if(!c)return;const text=prompt("輸入記事內容：");if(!trim(text))return;c.journal.unshift({id:uid(),date:new Date().toLocaleString("zh-TW",{hour12:false}),text:trim(text)});saveState();renderJournal(c);toast("記事已新增")}

function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`tku-timetable-${state.semester||"data"}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function importFile(file){try{const text=await file.text();const parsed=parseAnyCourseJson(text);if(!parsed.ok){toast(parsed.error);return}state.courses=parsed.courses;state.importedAt=new Date().toISOString();state.source=parsed.source||"JSON 檔案";saveState();renderAll();toast(`已匯入 ${state.courses.length} 門課`)}catch(e){toast(`匯入失敗：${e.message}`)}}
function saveProfile(){state.semester=trim(el("semesterInput").value);state.student.name=trim(el("studentNameInput").value);state.student.studentId=trim(el("studentIdInput").value);state.student.className=trim(el("studentClassInput").value);saveState();renderHeader();fillSettings();toast("學生資料已儲存")}
function quickDays(){for(const d of DAYS)state.display.days[d.key]=d.key<=5;saveState();fillSettings();renderSchedule()}
function periodsDay(){for(const p of PERIODS)state.display.periods[p.number]=p.number<=10;saveState();fillSettings();renderSchedule()}
function periodsAll(){for(const p of PERIODS)state.display.periods[p.number]=true;saveState();fillSettings();renderSchedule()}
function clearCourses(){if(!confirm("確定清除課表嗎？學生資料與顯示設定會保留。"))return;state.courses=[];state.importedAt="";state.source="";saveState();fillSettings();renderAll();toast("課表已清除")}
function resetApp(){if(!confirm("確定清除這個網站保存的全部資料嗎？"))return;localStorage.removeItem(STORAGE_KEY);state=normalizeState({});saveState();fillSettings();closeSheets();renderAll();toast("已清除本網站資料")}
function syncAction(){
  openSettings();
  // 直接開始開啟 TKU iLife API，保留設定頁作為操作說明與書籤入口。
  setTimeout(()=>openTkuCoursePage(),80);
  toast("已開啟 TKU iLife API；登入後點「抓取 TKU JSON」書籤。");
}

const TKU_ALLOWED_MESSAGE_ORIGINS = [
  "https://sso.tku.edu.tw",
  "https://sinfo.ais.tku.edu.tw",
  "http://sinfo.ais.tku.edu.tw"
];

function tkuCaptureBookmarklet(){
  const targetOrigin=location.origin;
  const captureUrl=new URL("./capture.html",location.href).href;
  const code=`javascript:(()=>{try{\
const clean=s=>String(s??"").replace(/\\s+/g," ").trim();\
const enc=s=>{const bytes=new TextEncoder().encode(s),parts=[];for(let i=0;i<bytes.length;i++)parts.push(String.fromCharCode(bytes[i]));return btoa(parts.join("")).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/g,"")};\
const rowsFromJson=v=>{if(Array.isArray(v))return v;if(v&&typeof v==="object"){for(const k of ["data","rows","items","result","courses","list"]){if(Array.isArray(v[k]))return v[k]} }return null};\
const body=clean(document.body?.innerText||document.documentElement?.innerText||"");\
let parsed=null;try{parsed=JSON.parse(body)}catch{}\
const rows=rowsFromJson(parsed);\
if(rows){\
  const payload={type:"TKU_TIMETABLE_CAPTURE",version:2,source:"TKU iLife API JSON",capturedAt:new Date().toISOString(),rawRows:rows};\
  const opener=window.opener;\
  if(opener&&!opener.closed){try{opener.postMessage(payload,"${targetOrigin}");alert("已抓到 "+rows.length+" 筆 TKU iLife 資料，已送回課表網站。請切回課表頁面。" );return}catch{}}\
  const u="${captureUrl}#data="+enc(JSON.stringify(payload));\
  location.href=u;\
  return;\
}\
throw new Error("目前頁面不是可解析的 TKU iLife JSON。請先從課表網站按『開啟 TKU iLife 課表 API』，登入後直到畫面顯示 [ ... ] JSON 再執行此書籤。" );\
}catch(e){alert("抓取失敗："+(e?.message||e))}})();void 0;`;
  return code;
}

function openTkuCoursePage(){
  const url=trim(el("tkuCourseUrlInput").value)||"https://ilifeapp.az.tku.edu.tw/api/stu/course";
  try{new URL(url); }catch{toast("淡江課表網址格式不正確");return;}
  const win=window.open(url,"tkuCourseCapture","noopener=false,width=1200,height=900");
  if(!win){toast("瀏覽器阻擋了新視窗，請允許本網站開啟新視窗。")}
  else {toast("已開啟淡江課表；登入並進入課表後，點你的抓取書籤。")}
}

async function copyTkuBookmarklet(){
  const code=tkuCaptureBookmarklet();
  try{
    await navigator.clipboard.writeText(code);
    toast("已複製。請建立一個書籤，名稱可填『抓取淡江課表』，網址貼上剛複製的內容。");
  }catch{
    const ta=document.createElement("textarea");ta.value=code;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();toast("已複製。請建立書籤並把網址貼上。");
  }
}

function courseMergeKey(c){
  const id=trim(c?.id);
  if(id) return `id:${id}`;
  return `name:${trim(c?.name).replace(/\s+/g," ").toLowerCase()}|seat:${trim(c?.seatNumber)}|dept:${trim(c?.department)}|class:${trim(c?.className)}`;
}
function mergeImportedCourses(imported){
  const oldMap=new Map();
  for(const c of state.courses||[]) oldMap.set(courseMergeKey(c),c);
  return imported.map(c=>{
    const old=oldMap.get(courseMergeKey(c));
    if(!old) return c;
    return normalizeCourse({
      ...c,
      customName: old.customName || "",
      note: old.note || "",
      journal: Array.isArray(old.journal) ? old.journal : [],
      // 保留舊資料中較完整的學校資訊，但以本次 API 新資料優先。
      description: c.description || old.description || "",
      pdf: c.pdf || old.pdf || ""
    });
  });
}

function applyCapturedPayload(data){
  if(!data||data.type!=="TKU_TIMETABLE_CAPTURE"||![1,2].includes(data.version))return false;
  let parsed=null;
  if(Array.isArray(data.rawRows)) parsed=parseILifeRows(data.rawRows);
  else if(Array.isArray(data.courses)) parsed={ok:true,courses:data.courses.map(normalizeCourse).filter(Boolean),source:data.source||"淡江課表頁抓取"};
  if(!parsed?.ok||!parsed.courses.length){toast(parsed?.error||"已收到資料，但沒有可用課程。","error");return false;}
  state.courses=mergeImportedCourses(parsed.courses);
  state.importedAt=data.capturedAt||new Date().toISOString();
  state.source=parsed.source||data.source||"TKU iLife JSON";
  state.semester=state.semester||"淡江課表";
  saveState();
  renderAll();
  fillSettings();
  const detail=`已收到 ${state.courses.length} 門課、${state.courses.reduce((n,c)=>n+c.times.length,0)} 個上課時段。\n來源：${state.source}\n時間：${fmtDateTime(state.importedAt)}\n自訂課名／備註／記事：已保留`;
  if(el("captureStatus")) el("captureStatus").textContent=detail;
  toast(`已抓到 ${state.courses.length} 門課`);
  return true;
}
function handleTkuCaptureMessage(event){
  if(!TKU_ALLOWED_MESSAGE_ORIGINS.includes(event.origin))return;
  applyCapturedPayload(event.data);
}
function consumeCaptureInbox(){
  try{
    const raw=localStorage.getItem(CAPTURE_INBOX_KEY);
    if(!raw)return;
    localStorage.removeItem(CAPTURE_INBOX_KEY);
    const payload=JSON.parse(raw);
    applyCapturedPayload(payload);
  }catch(e){
    localStorage.removeItem(CAPTURE_INBOX_KEY);
    toast(`接收 TKU JSON 失敗：${e.message||e}`,"error");
  }
}

function testCaptureMessage(){
  applyCapturedPayload({type:"TKU_TIMETABLE_CAPTURE",version:2,capturedAt:new Date().toISOString(),source:"測試 JSON",rawRows:[
    {weekno:"1",sessno:"01",seatno:"033",ch_cos_name:"高等微積分",teach_name:"余成義",room:"S 420",sesstime:"08:10"},
    {weekno:"1",sessno:"02",seatno:"033",ch_cos_name:"高等微積分",teach_name:"余成義",room:"S 420",sesstime:"09:10"},
    {weekno:"3",sessno:"01",seatno:"033",ch_cos_name:"高等微積分",teach_name:"余成義",room:"S 420",sesstime:"08:10"},
    {weekno:"3",sessno:"02",seatno:"033",ch_cos_name:"高等微積分",teach_name:"助教",room:"S 420",sesstime:"09:10"},
    {weekno:"2",sessno:"08",seatno:"040",ch_cos_name:"代數學（一）",teach_name:"王",room:"S 420",sesstime:"15:10"},
    {weekno:"2",sessno:"09",seatno:"040",ch_cos_name:"代數學（一）",teach_name:"王",room:"S 420",sesstime:"16:10"}
  ]});
}

function renderAll(){renderHeader();renderSchedule();}
function showInstallHelp(){alert("手機安裝：在手機瀏覽器開啟本網站，使用瀏覽器的「加入主畫面／安裝 App」功能。此網站的資料會保存在你的裝置本機。")}

function bindEvents(){
  el("settingsButton").addEventListener("click",openSettings);el("syncButton").addEventListener("click",syncAction);el("prevWeek").addEventListener("click",()=>{currentWeekOffset--;renderHeader();renderSchedule()});el("nextWeek").addEventListener("click",()=>{currentWeekOffset++;renderHeader();renderSchedule()});el("weekTitleButton").addEventListener("click",()=>{currentWeekOffset=0;renderHeader();renderSchedule()});
  el("saveProfileButton").addEventListener("click",saveProfile);el("weekdaysAllButton").addEventListener("click",quickDays);el("periodsDayButton").addEventListener("click",periodsDay);el("periodsAllButton").addEventListener("click",periodsAll);
  el("showSeatInput").addEventListener("change",e=>{state.display.showSeat=e.target.checked;saveState();renderSchedule()});el("showRoomInput").addEventListener("change",e=>{state.display.showRoom=e.target.checked;saveState();renderSchedule()});el("showTeacherInput").addEventListener("change",e=>{state.display.showTeacher=e.target.checked;saveState();renderSchedule()});
  el("openImportButton").addEventListener("click",()=>{el("apiJsonInput").value="";el("importPreview").textContent="等待匯入。";pendingImport=null;openSheet("importSheet")});el("previewImportButton").addEventListener("click",previewImport);el("commitImportButton").addEventListener("click",commitImport);
  el("openTkuCoursePageButton").addEventListener("click",openTkuCoursePage);el("copyTkuBookmarkletButton").addEventListener("click",copyTkuBookmarklet);el("testCaptureMessageButton").addEventListener("click",testCaptureMessage);window.addEventListener("message",handleTkuCaptureMessage);
  el("loadDemoButton").addEventListener("click",()=>{state.courses=sampleState();state.semester=state.semester||"範例學期";state.importedAt=new Date().toISOString();state.source="內建範例";saveState();fillSettings();renderAll();toast("已載入範例課表")});el("exportButton").addEventListener("click",exportData);el("jsonFileInput").addEventListener("change",e=>{const f=e.target.files?.[0];if(f)importFile(f);e.target.value=""});el("clearCoursesButton").addEventListener("click",clearCourses);el("resetAppButton").addEventListener("click",resetApp);
  el("cancelCourseButton").addEventListener("click",closeSheets);el("saveCourseButton").addEventListener("click",saveCurrentCourse);el("deleteCourseButton").addEventListener("click",deleteCurrentCourse);el("addJournalButton").addEventListener("click",addJournal);el("installHelpButton").addEventListener("click",showInstallHelp);
  el("overlay").addEventListener("click",e=>{if(e.target===el("overlay"))closeSheets()});document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",closeSheets));window.addEventListener("keydown",e=>{if(e.key==="Escape")closeSheets()});window.addEventListener("online",renderHeader);window.addEventListener("offline",renderHeader);
  window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstallPrompt=e});
}

function registerPwa(){if("serviceWorker" in navigator && location.protocol.startsWith("http")){window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js?v=1").catch(()=>{}))}}
function boot(){try{bindEvents();consumeCaptureInbox();renderAll();registerPwa()}catch(e){console.error(e);toast(`初始化失敗：${e.message}`)}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
