const KEY="tku_web_v11";
const BACKEND_KEY="tku_backend_v11";
const DEFAULT_BACKEND="";
const DAYS=[1,2,3,4,5,6,7].map(n=>({key:n,name:["","一","二","三","四","五","六","日"][n]}));
const PERIODS=[
  [1,"08:10–09:00"],[2,"09:10–10:00"],[3,"10:10–11:00"],[4,"11:10–12:00"],
  [5,"12:10–13:00"],[6,"13:10–14:00"],[7,"14:10–15:00"],[8,"15:10–16:00"],
  [9,"16:10–17:00"],[10,"17:10–18:00"],[11,"18:10–19:00"],[12,"19:10–20:00"],
  [13,"20:10–21:00"],[14,"21:10–22:00"]
].map(([number,time])=>({number,time}));
const DEFAULT={
  days:{1:true,2:true,3:true,4:true,5:true,6:false,7:false},
  periods:{1:true,2:true,3:true,4:true,5:true,6:true,7:true,8:true,9:true,10:true,11:false,12:false,13:false,14:false},
  showSeat:true
};
const DEMO={
  semester:"115-1 範例",student:{name:"範例學生",id:"DEMO0000"},display:structuredClone(DEFAULT),
  courses:[
    {id:"2952",name:"高等微積分",customName:"",department:"TSNXB",grade:"2",className:"",credits:"3",seatNumber:"033",description:"",
      times:[{day:1,periods:[1,2],room:"S 420",teacher:"余"},{day:3,periods:[1],room:"S 420",teacher:"余"},{day:3,periods:[2],room:"S 420",teacher:"助教"}],note:"",journal:[]},
    {id:"2951",name:"代數學（一）",customName:"",department:"TSNXB",grade:"2",className:"",credits:"3",seatNumber:"040",description:"",
      times:[{day:2,periods:[8,9],room:"S 420",teacher:"王"},{day:5,periods:[3],room:"S 420",teacher:"王"},{day:5,periods:[7],room:"S 420",teacher:"助教"}],note:"",journal:[]},
    {id:"2954",name:"機率論",customName:"",department:"TSNXB",grade:"2",className:"",credits:"3",seatNumber:"044",description:"",
      times:[{day:4,periods:[5,6],room:"C 013",teacher:"黃"},{day:5,periods:[4],room:"C 013",teacher:"黃"},{day:5,periods:[6],room:"C 002",teacher:"助教"}],note:"",journal:[]}
  ]
};
let state=load();
let offset=0,current=null;

function load(){try{const x=JSON.parse(localStorage.getItem(KEY)||"null");return normalise(x||{student:{},courses:[]});}catch{return normalise({student:{},courses:[]})}}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function normalise(x){x=x||{};x.semester=x.semester||"";x.student=x.student||{name:"",id:""};x.display={...structuredClone(DEFAULT),...(x.display||{}),days:{...DEFAULT.days,...(x.display?.days||{})},periods:{...DEFAULT.periods,...(x.display?.periods||{})}};x.courses=Array.isArray(x.courses)?x.courses:[];return x}
function backend(){return (localStorage.getItem(BACKEND_KEY)||DEFAULT_BACKEND).replace(/\/+$/,"")}
function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
function monday(n=0){const d=new Date(),w=d.getDay(),diff=w===0?-6:1-w;d.setHours(0,0,0,0);d.setDate(d.getDate()+diff+n*7);return d}
function fmt(d){return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`}
function visibleDays(){return DAYS.filter(d=>state.display.days[d.key])}
function visiblePeriods(){return PERIODS.filter(p=>state.display.periods[p.number])}
function name(c){return c.customName?.trim()||c.name||"未命名課程"}

function render(){
  document.getElementById("subtitle").textContent=state.semester?`學期：${state.semester}`:"尚未同步";
  document.getElementById("studentName").textContent=state.student.name||"尚未登入";
  document.getElementById("studentId").textContent=state.student.id?`學號：${state.student.id}`:"請先登入淡江帳號";
  document.getElementById("onlineState").textContent=navigator.onLine?"目前有網路":"離線可用";
  document.getElementById("setName").textContent=state.student.name||"尚未取得";
  document.getElementById("setId").textContent=state.student.id||"尚未取得";
  document.getElementById("setAuth").textContent=state.student.id?"已登入":"未登入";
  document.getElementById("backendUrl").value=backend();
  renderWeek();renderSettings();
}
function renderWeek(){
  const m=monday(offset),s=new Date(m);s.setDate(s.getDate()+6);
  document.getElementById("weekText").textContent=`${fmt(m)} ～ ${fmt(s)}`;
  const root=document.getElementById("grid"),days=visibleDays(),periods=visiblePeriods();
  root.innerHTML="";root.style.setProperty("--days",days.length);
  root.appendChild(Object.assign(document.createElement("div"),{className:"corner"}));
  for(const d of days){const dt=new Date(m);dt.setDate(dt.getDate()+d.key-1);const h=document.createElement("div");h.className="day";h.innerHTML=`<b>星期${d.name}</b><small>${fmt(dt)}</small>`;root.appendChild(h)}
  for(const p of periods){
    const lab=document.createElement("div");lab.className="period";lab.innerHTML=`<strong>第${p.number}節</strong><small>${p.time}</small>`;root.appendChild(lab);
    for(const d of days){
      const cell=document.createElement("div");cell.className="cell";
      const items=[];
      for(const c of state.courses)for(const t of c.times||[])if(Number(t.day)===d.key&&(t.periods||[]).map(Number).includes(p.number))items.push({c,t});
      if(!items.length)cell.innerHTML=`<div class="empty">—</div>`;
      for(const {c,t} of items){
        const b=document.createElement("button");b.className="course";b.innerHTML=`<div class="cname">${esc(name(c))}</div><div class="cmeta">${esc(t.teacher||"")}${t.room?`　${esc(t.room)}`:""}</div>${state.display.showSeat&&c.seatNumber?`<div class="seat">座號 ${esc(c.seatNumber)}</div>`:""}`;b.onclick=()=>openCourse(c.id);cell.appendChild(b)
      }
      root.appendChild(cell)
    }
  }
}
function renderSettings(){
  const d=document.getElementById("daySettings");d.innerHTML="";
  for(const x of DAYS){const l=document.createElement("label");l.innerHTML=`<span>星期${x.name}</span><input type="checkbox" ${state.display.days[x.key]?"checked":""}>`;l.querySelector("input").onchange=e=>{state.display.days[x.key]=e.target.checked;save();renderWeek()};d.appendChild(l)}
  const p=document.getElementById("periodSettings");p.innerHTML="";
  for(const x of PERIODS){const l=document.createElement("label");l.innerHTML=`<span>第${x.number}節<small>${x.time}</small></span><input type="checkbox" ${state.display.periods[x.number]?"checked":""}>`;l.querySelector("input").onchange=e=>{state.display.periods[x.number]=e.target.checked;save();renderWeek()};p.appendChild(l)}
  document.getElementById("showSeat").checked=state.display.showSeat;
}
function openPanel(id){document.getElementById("overlay").classList.remove("hidden");document.getElementById(id).classList.remove("hidden");document.body.style.overflow="hidden"}
function closePanels(){document.getElementById("overlay").classList.add("hidden");document.querySelectorAll(".panel").forEach(p=>p.classList.add("hidden"));document.body.style.overflow="";current=null}
function msg(t){const m=document.getElementById("message");m.textContent=t;m.classList.remove("hidden");setTimeout(()=>m.classList.add("hidden"),8000)}
function openCourse(id){const c=state.courses.find(x=>String(x.id)===String(id));if(!c)return;current=c;document.getElementById("courseTitle").textContent=name(c);document.getElementById("courseSub").textContent=[c.department,c.className].filter(Boolean).join(" · ");document.getElementById("customName").value=c.customName||"";document.getElementById("courseInfo").innerHTML=[["原課名",c.name],["開課序號",c.id],["座號",c.seatNumber],["學分",c.credits],["系所",c.department],["年級/班別",[c.grade,c.className].filter(Boolean).join(" / ")]].map(([a,b])=>`<div><span>${a}</span><b>${esc(b||"—")}</b></div>`).join("");document.getElementById("desc").value=c.description||"";document.getElementById("note").value=c.note||"";document.getElementById("timeList").innerHTML=(c.times||[]).map(t=>`<div class="time-box">星期${DAYS.find(d=>d.key===Number(t.day))?.name||t.day}／第${(t.periods||[]).join("、")}節／${esc(t.room||"—")}／${esc(t.teacher||"—")}</div>`).join("");renderJournal();openPanel("coursePanel")}
function renderJournal(){document.getElementById("journalList").innerHTML=current?.journal?.length?current.journal.map(j=>`<div class="journal"><b>${esc(j.date)}</b><div>${esc(j.text)}</div></div>`).join(""):"<div class='hint'>尚無記事</div>"}
function saveCourse(){if(!current)return;current.customName=document.getElementById("customName").value.trim();current.note=document.getElementById("note").value;save();closePanels();render()}
function normaliseCourses(payload){
  const root=payload?.data??payload?.result??payload;
  const arr=Array.isArray(root)?root:(root?.courses||root?.items||root?.rows||root?.results||[]);
  const out=[];
  for(const x of arr){
    const id=String(x.courseId??x.course_id??x.id??x.開課序號??"").trim();
    const nm=String(x.courseName??x.course_name??x.name??x.科目名稱??"").trim();
    if(!id&&!nm)continue;
    const rawTimes=x.times??x.time??x.classTimes??x.classTime??x.schedule??[];
    const times=[];
    const a=Array.isArray(rawTimes)?rawTimes:[rawTimes];
    for(const t of a){
      const day=parseDay(t?.day??t?.weekday??t?.weekDay??t?.上課星期??t?.星期??x.day);
      const periods=parsePeriods(t?.periods??t?.period??t?.section??t?.sections??t?.節次??x.periods??x.period);
      if(day&&periods.length)times.push({day,periods,room:String(t?.room??t?.classroom??t?.教室??x.room??""),teacher:String(t?.teacher??t?.instructor??t?.授課老師??x.teacher??"")})
    }
    if(!times.length)continue;
    const old=state.courses.find(c=>String(c.id)===id);
    out.push({id,name:nm,customName:old?.customName||"",department:String(x.department??x.departmentCode??x.系所??""),grade:String(x.grade??x.年級??""),className:String(x.className??x.class??x.班別??""),credits:String(x.credits??x.credit??x.學分??""),seatNumber:String(x.seatNumber??x.seat??x.seatNo??x.座號??""),description:String(x.description??x.courseDescription??x.課程說明??""),times,note:old?.note||"",journal:old?.journal||[]})
  }
  return {courses:out,semester:String(root?.semester??root?.term??""),student:root?.student??{}}
}
function parseDay(v){const m={一:1,二:2,三:3,四:4,五:5,六:6,日:7};const s=String(v??"").trim();if(m[s])return m[s];const n=Number(s);return n>=1&&n<=7?n:null}
function parsePeriods(v){if(Array.isArray(v))return v.flatMap(parsePeriods).filter(x=>x>=1&&x<=14);return (String(v??"").match(/\d{1,2}/g)||[]).map(Number).filter(x=>x>=1&&x<=14)}

async function directTkuCourseFetch(){
  const url="https://ilifeapp.az.tku.edu.tw/api/stu/course";
  const response=await fetch(url,{method:"GET",mode:"cors",credentials:"include",cache:"no-store",headers:{"Accept":"application/json"}});
  const text=await response.text();
  if(!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0,180)}`);
  try{return JSON.parse(text)}catch{throw new Error(`API 回應不是 JSON：${text.slice(0,120)}`)}
}

async function syncDirectTku(){
  try{
    msg("正在直接讀取淡江學生課表 API…");
    const payload=await directTkuCourseFetch();
    const parsed=normaliseCourses(payload);
    if(!parsed.courses.length) throw new Error("已取得 API 回應，但沒有辨識到課程。");
    const s=parsed.student||{};
    state.courses=parsed.courses;
    state.semester=parsed.semester||state.semester;
    state.student={name:String(s.name??s.studentName??state.student.name??""),id:String(s.id??s.studentId??s.student_id??state.student.id??"")};
    save(); render(); msg(`同步完成：${state.courses.length} 門課`); return true;
  }catch(e){
    console.error("Direct TKU API:",e);
    const text=String(e?.message||e);
    if(text.includes("Failed to fetch")||text.includes("NetworkError"))
      msg("直接抓取失敗：瀏覽器被淡江 API 的 CORS 阻擋。這不是課表資料格式問題。\n"+text);
    else msg(`直接抓取失敗：${text}`);
    return false;
  }
}

async function api(path,options={}){
  const base=backend(); if(!base) throw new Error("尚未設定 Backend URL");
  const r=await fetch(base+path,{credentials:"include",...options});
  const text=await r.text();let data;try{data=JSON.parse(text)}catch{data={raw:text}};
  if(!r.ok)throw new Error(`HTTP ${r.status}: ${data.error||data.raw||"Backend error"}`);
  return data;
}

async function login(){
  window.open("https://ilifeapp.az.tku.edu.tw/Stu/Course","_blank","noopener");
  msg("已開啟淡江學生課表。請先在淡江完成登入，再回到本頁按「同步課表」。");
}
async function sync(){
  const ok=await syncDirectTku();
  if(ok) return;
  if(backend()){
    try{
      const data=await api("/api/timetable");
      const parsed=normaliseCourses(data);
      if(!parsed.courses.length)throw new Error("Backend 已回應，但沒有辨識到課程");
      const s=parsed.student||{};
      state.courses=parsed.courses;state.semester=parsed.semester||state.semester;state.student={name:String(s.name??s.studentName??state.student.name??""),id:String(s.id??s.studentId??s.student_id??state.student.id??"")};save();render();msg(`Backend 同步完成：${state.courses.length} 門課`);
    }catch(e){console.error(e);msg(`Backend 同步失敗：${e.message}`)}
  }
}
async function logout(){try{await api("/api/auth/logout",{method:"POST"})}catch{};state=normalise({student:{},courses:[]});save();render();msg("已清除本機資料")}
function loadDemo(){state=structuredClone(DEMO);save();render();msg("已載入範例課表")}
function clearCourses(){state.courses=[];state.semester="";save();render();msg("課表已清除")}
function exportData(){const a=document.createElement("a"),u=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:"application/json"}));a.href=u;a.download="tku-timetable.json";a.click();setTimeout(()=>URL.revokeObjectURL(u),500)}
async function importData(f){try{state=normalise(JSON.parse(await f.text()));save();render();msg("匯入成功")}catch(e){msg(`匯入失敗：${e.message}`)}}

document.getElementById("prevWeek").onclick=()=>{offset--;renderWeek()};
document.getElementById("nextWeek").onclick=()=>{offset++;renderWeek()};
document.getElementById("todayBtn").onclick=()=>{offset=0;renderWeek()};
document.getElementById("settingsBtn").onclick=()=>openPanel("settingsPanel");
document.getElementById("syncBtn").onclick=sync;
document.getElementById("sync2Btn").onclick=sync;
document.getElementById("directApiBtn").onclick=syncDirectTku;
document.getElementById("loginBtn").onclick=login;
document.getElementById("clearAuthBtn").onclick=logout;
document.getElementById("showSeat").onchange=e=>{state.display.showSeat=e.target.checked;save();renderWeek()};
document.getElementById("saveCourse").onclick=saveCourse;
document.getElementById("addJournal").onclick=()=>{if(!current)return;const t=prompt("輸入記事");if(t?.trim()){current.journal=current.journal||[];current.journal.unshift({date:new Date().toLocaleString("zh-TW",{hour12:false}),text:t.trim()});save();renderJournal()}};
document.getElementById("demoBtn").onclick=loadDemo;
document.getElementById("clearBtn").onclick=clearCourses;
document.getElementById("wipeBtn").onclick=()=>{localStorage.clear();state=normalise({student:{},courses:[]});render();msg("已清除全部資料")};
document.getElementById("exportBtn").onclick=exportData;
document.getElementById("importBtn").onchange=e=>{if(e.target.files[0])importData(e.target.files[0]);e.target.value=""};
document.getElementById("saveBackendBtn").onclick=()=>{localStorage.setItem(BACKEND_KEY,document.getElementById("backendUrl").value.trim().replace(/\/+$/,""));render();msg("Backend URL 已儲存")};
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=closePanels);
document.getElementById("overlay").onclick=e=>{if(e.target.id==="overlay")closePanels()};
window.addEventListener("online",render);window.addEventListener("offline",render);
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js"));

(async()=>{
  try{
    const me=await api("/api/auth/me");
    if(me.authenticated){
      state.student={name:me.name||"",id:me.studentId||me.id||""};
      save();render();
      await sync();
    }else render();
  }catch{render()}
})();
