import { useState, useRef } from "react";

// ── Helpers ───────────────────────────────────────────────────────────────────
const pad = n => String(n).padStart(2,"0");
const uid = () => Math.random().toString(36).slice(2,9);
const todayISO = () => new Date().toISOString().slice(0,10);

function fmtTimer(secs) {
  return `${pad(Math.floor(secs/3600))}:${pad(Math.floor((secs%3600)/60))}:${pad(secs%60)}`;
}
function secsToHHMM(secs) {
  return `${Math.floor(secs/3600)}h ${pad(Math.floor((secs%3600)/60))}min`;
}
function secsToDecimal(secs) { return (secs/3600).toFixed(1); }

function timeToSecs(hhmm) {
  const [h,m] = hhmm.split(":").map(Number);
  return (h||0)*3600 + (m||0)*60;
}
function secsToHHMM_input(secs) {
  return `${pad(Math.floor(secs/3600))}:${pad(Math.floor((secs%3600)/60))}`;
}

// Week number (ISO)
function weekNum(date) {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 4 - (d.getDay()||7));
  const y = new Date(d.getFullYear(),0,1);
  return Math.ceil(((d-y)/86400000+1)/7);
}

// Month helpers
function monthDays(year, month) {
  // month 0-indexed
  const first = new Date(year, month, 1);
  const last  = new Date(year, month+1, 0);
  // pad start to monday
  let startDow = first.getDay(); // 0=sun
  if (startDow === 0) startDow = 7;
  const prefixDays = startDow - 1;
  const days = [];
  for (let i = prefixDays; i > 0; i--) {
    const d = new Date(year, month, 1-i);
    days.push({ iso: d.toISOString().slice(0,10), inMonth: false });
  }
  for (let d = 1; d <= last.getDate(); d++) {
    const dt = new Date(year, month, d);
    days.push({ iso: dt.toISOString().slice(0,10), inMonth: true });
  }
  // pad end to complete grid rows
  while (days.length % 7 !== 0) {
    const d = new Date(year, month+1, days.length - prefixDays - last.getDate() + 1);
    days.push({ iso: d.toISOString().slice(0,10), inMonth: false });
  }
  return days;
}

function addDays(iso, n) {
  const d = new Date(iso); d.setDate(d.getDate()+n);
  return d.toISOString().slice(0,10);
}

const COLORS   = ["#e8652a","#3aaa6e","#4a9fd4","#f0c040","#a87edc","#dc8a4a","#5ab8dc"];
const DAYNAMES = ["Mån","Tis","Ons","Tor","Fre","Lör","Sön"];
const MONTHS   = ["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"];

function projColor(id, projects) {
  return COLORS[projects.findIndex(p=>p.id===id) % COLORS.length] || "#888";
}

// ── Svenska helgdagar ────────────────────────────────────────────────────────
function easterDate(year) {
  // Meeus/Jones/Butcher algorithm
  const a=year%19,b=Math.floor(year/100),c=year%100;
  const d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25);
  const g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30;
  const i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7;
  const m=Math.floor((a+11*h+22*l)/451);
  const month=Math.floor((h+l-7*m+114)/31);
  const day=((h+l-7*m+114)%31)+1;
  return new Date(year, month-1, day);
}

function getSwedishHolidays(year) {
  const easter = easterDate(year);
  const add = (d, n) => { const r=new Date(d); r.setDate(r.getDate()+n); return r; };
  const iso = d => d.toISOString().slice(0,10);

  const fixed = [
    [`${year}-01-01`, "Nyårsdagen"],
    [`${year}-01-06`, "Trettondedag jul"],
    [`${year}-05-01`, "Valborg / 1 maj"],
    [`${year}-06-06`, "Nationaldagen"],
    [`${year}-12-24`, "Julafton"],
    [`${year}-12-25`, "Juldagen"],
    [`${year}-12-26`, "Annandag jul"],
    [`${year}-12-31`, "Nyårsafton"],
  ];

  // Midsommar: fredag mellan 20–26 juni
  const midsommar = (() => {
    for (let d=20; d<=26; d++) {
      const dt = new Date(year,5,d);
      if (dt.getDay()===5) return [iso(dt),"Midsommarafton"];
    }
  })();
  const midsommarDag = (() => {
    for (let d=20; d<=26; d++) {
      const dt = new Date(year,5,d);
      if (dt.getDay()===6) return [iso(dt),"Midsommardagen"];
    }
  })();

  // Alla helgons dag: lördag 31 okt–6 nov
  const allHelgon = (() => {
    for (let d=31; d<=37; d++) {
      const dt = new Date(year,9,d);
      if (dt.getDay()===6) return [iso(dt),"Alla helgons dag"];
    }
  })();

  const movable = [
    [iso(add(easter,-2)), "Långfredagen"],
    [iso(add(easter,-1)), "Påskafton"],
    [iso(easter),         "Påskdagen"],
    [iso(add(easter, 1)), "Annandag påsk"],
    [iso(add(easter,39)), "Kristi himmelsfärd"],
    [iso(add(easter,49)), "Pingstdagen"],
  ];

  return Object.fromEntries([...fixed, ...movable, midsommar, midsommarDag, allHelgon].filter(Boolean));
}

// Rows of weeks for the month grid: each row = [weekNum, day0..day6]
function monthWeekRows(year, month) {
  const days = monthDays(year, month);
  const rows = [];
  for (let i=0; i<days.length; i+=7) {
    const week = weekNum(days[i].iso);
    rows.push({ week, days: days.slice(i, i+7) });
  }
  return rows;
}

// ── Seed ─────────────────────────────────────────────────────────────────────
const _today = todayISO();
const _d = new Date(_today);
const _m = _d.getMonth(), _y = _d.getFullYear();

function seedDate(dayOfMonth) {
  return new Date(_y, _m, dayOfMonth).toISOString().slice(0,10);
}

const SEED = [
  { id:uid(), projId:"p1", date:seedDate(2),  startTime:"07:30", endTime:"11:00", secs:3.5*3600, note:"Rivning och formbyggnad", type:"manual" },
  { id:uid(), projId:"p1", date:seedDate(3),  startTime:"07:00", endTime:"11:30", secs:4.5*3600, note:"Armering", type:"manual" },
  { id:uid(), projId:"p2", date:seedDate(3),  startTime:"13:00", endTime:"15:00", secs:2*3600,   note:"Besiktning", type:"manual" },
  { id:uid(), projId:"p1", date:seedDate(5),  startTime:"07:00", endTime:"12:00", secs:5*3600,   note:"Gjutning", type:"manual" },
  { id:uid(), projId:"p2", date:seedDate(7),  startTime:"08:00", endTime:"11:00", secs:3*3600,   note:"Avformning", type:"manual" },
  { id:uid(), projId:"p1", date:seedDate(9),  startTime:"07:30", endTime:"10:30", secs:3*3600,   note:"Avslutande arbeten", type:"manual" },
  { id:uid(), projId:"p2", date:seedDate(12), startTime:"09:00", endTime:"14:45", secs:5.75*3600,note:"Plattsättning kök", type:"manual" },
  { id:uid(), projId:"p1", date:seedDate(14), startTime:"07:00", endTime:"15:00", secs:8*3600,   note:"Heldag – rörkopplingar", type:"manual" },
  { id:uid(), projId:"p2", date:seedDate(16), startTime:"10:00", endTime:"12:00", secs:2*3600,   note:"Slutbesiktning", type:"manual" },
];

let _store = {
  projects: [
    { id:"p1", name:"Badrumsrenovering Karlsson" },
    { id:"p2", name:"Bottenplatta Lindgren" },
  ],
  entries: SEED,
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function Tidrapportering() {
  const [projects,    setProjects]   = useState(_store.projects);
  const [entries,     setEntries]    = useState(_store.entries);

  // View
  const [view,        setView]       = useState("manad");
  const [subView,     setSubView]    = useState("timer");
  const [lightbox,    setLightbox]   = useState(null); // {url, caption}

  // Calendar
  const now = new Date();
  const [calYear,  setCalYear]  = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selDay,   setSelDay]   = useState(todayISO());

  // Timer
  const [running,    setRunning]   = useState(false);
  const [elapsed,    setElapsed]   = useState(0);
  const [timerProj,  setTimerProj] = useState("p1");
  const [timerNote,  setTimerNote] = useState("");
  const startRef = useRef(null);
  const tickRef  = useRef(null);

  // Manual / klockslag entry
  const [manProj,   setManProj]   = useState("p1");
  const [manDate,   setManDate]   = useState(todayISO());
  const [manStart,  setManStart]  = useState("07:00");
  const [manEnd,    setManEnd]    = useState("15:00");
  const [manNote,   setManNote]   = useState("");
  const [manMode,   setManMode]   = useState("clock");
  const [manHours,  setManHours]  = useState("8");
  const [manPhotos, setManPhotos] = useState([]); // [{id, url, name}]
  const photoRef = useRef(null);

  // New project
  const [newProjName, setNewProjName] = useState("");
  const [showNewProj, setShowNewProj] = useState(false);

  // ── Timer ──
  function startTimer() {
    startRef.current = Date.now() - elapsed*1000;
    tickRef.current  = setInterval(() => setElapsed(Math.floor((Date.now()-startRef.current)/1000)), 1000);
    setRunning(true);
  }
  function pauseTimer() { clearInterval(tickRef.current); setRunning(false); }
  function saveTimer() {
    if (elapsed < 30) return;
    const now2 = new Date();
    const endT = `${pad(now2.getHours())}:${pad(now2.getMinutes())}`;
    const startT = (() => { const s = new Date(now2-elapsed*1000); return `${pad(s.getHours())}:${pad(s.getMinutes())}`; })();
    addEntry({ projId:timerProj, date:todayISO(), startTime:startT, endTime:endT, secs:elapsed, note:timerNote.trim()||"—", type:"timer" });
    setElapsed(0); setTimerNote(""); setRunning(false); clearInterval(tickRef.current);
  }
  function discardTimer() { clearInterval(tickRef.current); setRunning(false); setElapsed(0); }

  function addEntry(e) {
    const entry = { id:uid(), ...e };
    setEntries(prev => [entry, ...prev]);
    _store.entries = [entry, ..._store.entries];
  }

  // ── Photo handler ──
  function handlePhotoUpload(e) {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        setManPhotos(prev => [...prev, { id: uid(), url: ev.target.result, name: file.name }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  // ── Manual save ──
  function saveManual() {
    let secs;
    if (manMode === "clock") {
      const s = timeToSecs(manStart), e2 = timeToSecs(manEnd);
      secs = e2 > s ? e2-s : 0;
      if (secs <= 0) return;
    } else {
      secs = Math.round(parseFloat(manHours||0)*3600);
      if (secs <= 0) return;
    }
    addEntry({ projId:manProj, date:manDate, startTime:manMode==="clock"?manStart:"", endTime:manMode==="clock"?manEnd:"", secs, note:manNote.trim()||"—", type:"manual", photos:[...manPhotos] });
    setManNote(""); setManHours("8"); setManPhotos([]);
  }

  function deleteEntry(id) {
    setEntries(prev => prev.filter(e => e.id!==id));
    _store.entries = _store.entries.filter(e => e.id!==id);
  }

  function addProject() {
    if (!newProjName.trim()) return;
    const p = { id:uid(), name:newProjName.trim() };
    setProjects(ps => [...ps,p]);
    _store.projects = [..._store.projects, p];
    setNewProjName(""); setShowNewProj(false);
    setTimerProj(p.id); setManProj(p.id);
  }

  // ── Derived ──
  const col       = id => projColor(id, projects);
  const projName  = id => projects.find(p=>p.id===id)?.name || "Okänt";
  const daySecs   = iso => entries.filter(e=>e.date===iso).reduce((s,e)=>s+e.secs,0);
  const dayEnts   = iso => entries.filter(e=>e.date===iso);
  const totalSecs = entries.reduce((s,e)=>s+e.secs,0);
  const selEntries = dayEnts(selDay);
  const selSecs    = daySecs(selDay);

  const monthGrid  = monthDays(calYear, calMonth);
  const weekRows   = monthWeekRows(calYear, calMonth);
  const holidays   = getSwedishHolidays(calYear);
  const maxDaySecs = Math.max(...monthGrid.map(d => daySecs(d.iso)), 1);

  // Calulate duration from start/end for display
  const clockDuration = () => {
    const s = timeToSecs(manStart), e2 = timeToSecs(manEnd);
    return e2 > s ? secsToHHMM(e2-s) : "—";
  };

  const projStats = projects.map(p => ({
    ...p,
    secs:  entries.filter(e=>e.projId===p.id).reduce((s,e)=>s+e.secs,0),
    count: entries.filter(e=>e.projId===p.id).length,
  }));

  function copySummary() {
    const lines = projStats.filter(p=>p.secs>0).map(p=>`${p.name}: ${secsToHHMM(p.secs)}`);
    navigator.clipboard.writeText(`TIDRAPPORT\n\n${lines.join("\n")}\n\nTotalt: ${secsToHHMM(totalSecs)}`).then(()=>alert("✓ Kopierad!"));
  }

  // ── Styles ───────────────────────────────────────────────────────────────────
  const bg0 = "#0e1012", bg1 = "#161a1d", bg2 = "#1c2024", bdr = "#252b30", bdr2 = "#343c44";
  const ink = "#e4e0d8", muted = "#6b7177", muted2 = "#8a9199";
  const ora = "#e8652a", grn = "#3aaa6e", blu = "#4a9fd4", yel = "#f0c040";

  const S = {
    app:   { fontFamily:"system-ui,sans-serif", background:bg0, minHeight:"100vh", color:ink, paddingBottom:50 },
    hdr:   { background:bg1, borderBottom:`1px solid ${bdr}`, padding:"13px 18px", display:"flex", alignItems:"center", gap:10 },
    h1:    { fontSize:20, fontWeight:800, color:"#fff", margin:0, letterSpacing:1 },
    badge: { marginLeft:"auto", background: running?"#1a1200":"#0e2016", border:`1px solid ${running?yel:grn}`, borderRadius:20, padding:"3px 10px", fontSize:10, color:running?yel:grn },
    nav:   { background:bg1, borderBottom:`1px solid ${bdr}`, display:"flex" },
    nb:  a => ({ flex:1, padding:"11px 4px", textAlign:"center", fontSize:10, fontWeight:a?700:400, color:a?ora:muted, borderBottom:a?`2px solid ${ora}`:"2px solid transparent", cursor:"pointer", letterSpacing:1, textTransform:"uppercase", fontFamily:"monospace" }),
    body:  { maxWidth:600, margin:"0 auto", padding:"14px 12px" },

    // ── MONTH CALENDAR ──
    mhdr:  { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 },
    mnavB: { width:32, height:32, borderRadius:7, border:`1.5px solid ${bdr}`, background:"none", color:muted2, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
    mTitle:{ fontSize:16, fontWeight:700, color:ink },
    mSub:  { fontSize:10, color:muted, fontFamily:"monospace" },

    dayHead:{ display:"grid", gridTemplateColumns:"24px repeat(7,1fr)", gap:2, marginBottom:4 },
    dhCell: { textAlign:"center", fontSize:9, fontFamily:"monospace", letterSpacing:1, color:muted, padding:"4px 0", textTransform:"uppercase" },
    dhWk:   { fontSize:9, fontFamily:"monospace", color:bdr2, padding:"4px 0", textAlign:"center" },

    mGrid: { display:"flex", flexDirection:"column", gap:2, marginBottom:12 },
    mRow:  { display:"grid", gridTemplateColumns:"24px repeat(7,1fr)", gap:2 },
    mWkNum:{ display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontFamily:"monospace", color:bdr2, paddingTop:4 },

    mCell: (inMonth, isToday, isSel, isRed) => ({
      borderRadius:6,
      background: isSel ? "#2e1a0d" : isToday ? "#161e24" : bg2,
      border:`1.5px solid ${isSel?ora:isToday?bdr2:bdr}`,
      padding:"5px 3px 4px",
      cursor:"pointer",
      minHeight:52,
      display:"flex",
      flexDirection:"column",
      alignItems:"center",
      gap:2,
      opacity: inMonth ? 1 : 0.25,
      transition:"all .12s",
    }),
    mNum:  (isToday, isSel, isRed) => ({ fontSize:13, fontWeight:isToday||isSel||isRed?700:400, color: isSel?ora : isRed?"#e05050" : isToday?ora : ink, lineHeight:1, fontFamily:"monospace" }),
    mHol:  { fontSize:7, color:"#e05050", fontFamily:"monospace", textAlign:"center", lineHeight:1.2, maxWidth:"100%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", padding:"0 1px" },
    mBar:  (h, c) => ({ width:"65%", height:`${Math.max(3,Math.round(h*28))}px`, background:c, borderRadius:2, transition:"height .3s" }),
    mHrs:  { fontSize:8, color:muted, fontFamily:"monospace" },
    mDots: { display:"flex", gap:2, justifyContent:"center", flexWrap:"wrap" },
    mDot:  c => ({ width:5, height:5, borderRadius:"50%", background:c }),

    // ── DAY DETAIL ──
    ddPanel:{ background:bg2, border:`1.5px solid ${ora}`, borderRadius:10, padding:"12px 14px", marginBottom:12 },
    ddTitle:{ fontSize:12, fontWeight:700, color:ora, marginBottom:10, fontFamily:"monospace", letterSpacing:1, textTransform:"uppercase" },
    eRow:  { display:"flex", alignItems:"center", gap:8, padding:"8px 0", borderBottom:`1px solid ${bdr}` },
    eLast: { borderBottom:"none" },
    eDot:  c => ({ width:8, height:8, borderRadius:"50%", background:c, flexShrink:0 }),
    eInfo: { flex:1 },
    ePrj:  { fontSize:12, fontWeight:600, color:ink },
    eMeta: { fontSize:11, color:muted, marginTop:1 },
    eTime: { fontSize:13, fontWeight:700, color:ora, fontFamily:"monospace", flexShrink:0 },
    eDel:  { width:22, height:22, borderRadius:4, border:`1px solid ${bdr}`, background:"none", cursor:"pointer", fontSize:10, color:"#555", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },

    // ── TIMER ──
    tBox:  { background:bg2, border:`1.5px solid ${bdr}`, borderRadius:12, padding:"20px 16px", marginBottom:12, textAlign:"center" },
    clock: r => ({ fontSize:50, fontWeight:800, fontFamily:"monospace", letterSpacing:2, color:r?ora:ink, lineHeight:1, marginBottom:4 }),
    clkSb: { fontSize:9, color:muted, fontFamily:"monospace", letterSpacing:1, marginBottom:16 },
    tBtns: { display:"flex", gap:8, justifyContent:"center", marginBottom:14 },
    bigB:  (c,ok) => ({ padding:"12px 24px", borderRadius:10, border:"none", background:ok?c:bdr, color:ok?"#fff":"#555", fontSize:14, fontWeight:700, cursor:ok?"pointer":"not-allowed", letterSpacing:1 }),
    smB:   c => ({ padding:"9px 14px", borderRadius:8, border:"none", background:c, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }),

    // ── MANUAL ENTRY ──
    manPanel:{ background:bg2, border:`1.5px solid ${bdr}`, borderRadius:10, padding:"14px", marginBottom:12 },
    modeRow: { display:"flex", gap:0, marginBottom:12, border:`1.5px solid ${bdr}`, borderRadius:8, overflow:"hidden" },
    modeBtn: a => ({ flex:1, padding:"9px", textAlign:"center", background:a?ora:bg1, color:a?"#fff":muted, fontSize:12, fontWeight:600, cursor:"pointer", border:"none", fontFamily:"monospace" }),

    // ── SHARED ──
    selW:  { background:bg0, border:`1.5px solid ${bdr}`, borderRadius:8, overflow:"hidden", marginBottom:10 },
    sel:   { width:"100%", border:"none", outline:"none", padding:"9px 11px", background:"transparent", fontSize:14, color:ink, appearance:"none" },
    inp:   { width:"100%", border:`1.5px solid ${bdr}`, borderRadius:8, padding:"9px 11px", background:bg0, fontSize:14, color:ink, boxSizing:"border-box", outline:"none" },
    ta:    { width:"100%", border:`1.5px solid ${bdr}`, borderRadius:8, padding:"9px 11px", background:bg0, fontSize:14, color:ink, resize:"none", outline:"none", lineHeight:1.6, boxSizing:"border-box" },

    statRow:{ display:"flex", gap:8, marginBottom:12 },
    stat:  c => ({ flex:1, background:bg2, border:`1.5px solid ${c}33`, borderRadius:10, padding:"10px 8px", textAlign:"center" }),
    sVal:  c => ({ fontFamily:"monospace", fontSize:18, fontWeight:800, color:c, lineHeight:1 }),
    sLbl:  { fontSize:9, color:muted, marginTop:3, letterSpacing:1, textTransform:"uppercase", fontFamily:"monospace" },

    card:  { background:bg2, border:`1.5px solid ${bdr}`, borderRadius:10, marginBottom:8, overflow:"hidden" },
    cTop:  { padding:"11px 14px", display:"flex", alignItems:"center", gap:10 },
    cDot:  c => ({ width:9, height:9, borderRadius:"50%", background:c, flexShrink:0 }),
    cName: { fontSize:14, fontWeight:600, color:ink, flex:1 },
    cSub:  { fontSize:11, color:muted, fontFamily:"monospace" },
    cStat: { fontFamily:"monospace", fontSize:13, fontWeight:700, color:ora, flexShrink:0 },

    slbl:  { fontFamily:"monospace", fontSize:10, letterSpacing:2, textTransform:"uppercase", color:muted, marginBottom:8 },
    row:   { display:"flex", gap:8, marginBottom:10 },
    outB:  { padding:"9px 14px", borderRadius:8, border:`1.5px solid ${bdr}`, background:"none", color:muted2, fontSize:12, fontWeight:600, cursor:"pointer" },
    primB: { padding:"9px 14px", borderRadius:8, border:"none", background:ora, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" },
    grnB:  { padding:"9px 14px", borderRadius:8, border:`1.5px solid ${grn}44`, background:"#0e2016", color:grn, fontSize:12, fontWeight:600, cursor:"pointer" },

    g2:    { display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 },
    dur:   { background:"#1a2e1a", border:`1px solid ${grn}44`, borderRadius:6, padding:"6px 10px", fontSize:12, color:grn, fontFamily:"monospace", textAlign:"center", marginBottom:10 },

    // Photos
    photoGrid: { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, marginBottom:10 },
    photoAdd:  { aspectRatio:"1", borderRadius:7, border:`1.5px dashed ${bdr2}`, background:bg0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:"pointer", gap:4, transition:"all .15s" },
    photoThumb:{ aspectRatio:"1", borderRadius:7, overflow:"hidden", position:"relative", border:`1px solid ${bdr}` },
    photoDel:  { position:"absolute", top:4, right:4, width:20, height:20, borderRadius:"50%", background:"rgba(0,0,0,.7)", border:"none", color:"#fff", fontSize:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
    // Entry photos strip
    photoStrip:{ display:"flex", gap:4, marginTop:6, flexWrap:"wrap" },
    photoMini: { width:48, height:48, borderRadius:5, overflow:"hidden", border:`1px solid ${bdr}`, cursor:"pointer" },
    // Lightbox
    lbOverlay: { position:"fixed", inset:0, background:"rgba(0,0,0,.92)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, flexDirection:"column", gap:12 },
    lbImg:     { maxWidth:"95vw", maxHeight:"82vh", borderRadius:10, objectFit:"contain" },
    lbClose:   { position:"fixed", top:16, right:16, width:36, height:36, borderRadius:"50%", background:bdr2, border:"none", color:ink, fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
    lbCaption: { fontSize:12, color:muted, fontFamily:"monospace" },

    legend:{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 },
    legItem:{ display:"flex", alignItems:"center", gap:5, background:bg2, border:`1px solid ${bdr}`, borderRadius:20, padding:"3px 9px" },
    legDot: c => ({ width:7, height:7, borderRadius:"50%", background:c }),
    legTxt: { fontSize:10, color:muted2 },
    legVal: c => ({ fontSize:10, fontFamily:"monospace", color:c }),
  };

  // ── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div style={S.app}>

      {/* Header */}
      <div style={S.hdr}>
        <h1 style={S.h1}>TID<span style={{color:ora}}>RAPPORT</span></h1>
        <div style={S.badge}>{running?"● SPELAR IN":"● REDO"}</div>
      </div>

      {/* Nav – timer och manual är nu en flik */}
      <div style={S.nav}>
        <div style={S.nb(view==="manad")}      onClick={()=>setView("manad")}>📅 Månad</div>
        <div style={S.nb(view==="registrera")} onClick={()=>setView("registrera")}>⏱ Registrera</div>
        <div style={S.nb(view==="projekt")}    onClick={()=>setView("projekt")}>🏗 Projekt</div>
      </div>

      <div style={S.body}>

        {/* ══════════ MÅNADSKALENDER ══════════ */}
        {view === "manad" && (<>

          {/* Month nav */}
          <div style={S.mhdr}>
            <button style={S.mnavB} onClick={()=>{ const d=new Date(calYear,calMonth-1,1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }}>‹</button>
            <div style={{textAlign:"center"}}>
              <div style={S.mTitle}>{MONTHS[calMonth]} {calYear}</div>
            </div>
            <button style={S.mnavB} onClick={()=>{ const d=new Date(calYear,calMonth+1,1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }}>›</button>
          </div>

          {/* Day headers */}
          <div style={S.dayHead}>
            <div style={S.dhWk}>V</div>
            {DAYNAMES.map(d=><div key={d} style={S.dhCell}>{d}</div>)}
          </div>

          {/* Month grid – row per week */}
          <div style={S.mGrid}>
            {weekRows.map(({ week, days: rowDays }) => (
              <div key={week} style={S.mRow}>
                {/* Week number */}
                <div style={S.mWkNum}>{week}</div>
                {/* 7 day cells */}
                {rowDays.map(({ iso, inMonth }) => {
                  const secs      = daySecs(iso);
                  const isToday   = iso === todayISO();
                  const isSel     = iso === selDay;
                  const ents      = dayEnts(iso);
                  const projsDay  = [...new Set(ents.map(e=>e.projId))];
                  const barH      = secs / maxDaySecs;
                  const topCol    = projsDay.length > 0 ? col(projsDay[0]) : bdr;
                  const holName   = holidays[iso];
                  const dow       = new Date(iso).getDay(); // 0=sun,6=sat
                  const isWeekend = dow === 0 || dow === 6;
                  const isRed     = !!(holName || isWeekend);

                  return (
                    <div key={iso} style={S.mCell(inMonth, isToday, isSel, isRed)}
                      onClick={()=>setSelDay(iso)}>
                      <div style={S.mNum(isToday, isSel, isRed && inMonth)}>
                        {new Date(iso).getDate()}
                      </div>
                      {holName && inMonth && (
                        <div style={S.mHol} title={holName}>
                          {holName.split(" ")[0]}
                        </div>
                      )}
                      {secs > 0 && <>
                        <div style={S.mBar(barH, topCol)}/>
                        <div style={S.mHrs}>{secsToDecimal(secs)}h</div>
                        {projsDay.length > 1 && (
                          <div style={S.mDots}>
                            {projsDay.slice(0,3).map(pid=><div key={pid} style={S.mDot(col(pid))}/>)}
                          </div>
                        )}
                      </>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Månadsstatistik */}
          <div style={S.statRow}>
            <div style={S.stat(ora)}>
              <div style={S.sVal(ora)}>{secsToHHMM(monthGrid.filter(d=>d.inMonth).reduce((s,d)=>s+daySecs(d.iso),0))}</div>
              <div style={S.sLbl}>Månaden</div>
            </div>
            <div style={S.stat(grn)}>
              <div style={S.sVal(grn)}>{monthGrid.filter(d=>d.inMonth&&daySecs(d.iso)>0).length}</div>
              <div style={S.sLbl}>Arbetsdagar</div>
            </div>
            <div style={S.stat(blu)}>
              <div style={S.sVal(blu)}>{entries.filter(e=>{ const d=new Date(e.date); return d.getMonth()===calMonth&&d.getFullYear()===calYear; }).length}</div>
              <div style={S.sLbl}>Poster</div>
            </div>
          </div>

          {/* Selected day detail */}
          <div style={S.ddPanel}>
            <div style={S.ddTitle}>
              {new Date(selDay).toLocaleDateString("sv-SE",{weekday:"long",day:"numeric",month:"long"})}
              {selSecs > 0 && ` · ${secsToHHMM(selSecs)}`}
            </div>
            {selEntries.length === 0
              ? <div style={{textAlign:"center",color:muted,fontSize:12,padding:"8px 0",fontFamily:"monospace"}}>Ingen tid registrerad</div>
              : selEntries.map((e,i)=>(
                <div key={e.id} style={{paddingBottom:8, borderBottom: i!==selEntries.length-1?`1px solid ${bdr}`:"none", marginBottom: i!==selEntries.length-1?8:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={S.eDot(col(e.projId))}/>
                    <div style={S.eInfo}>
                      <div style={S.ePrj}>{projName(e.projId)}</div>
                      <div style={S.eMeta}>
                        {e.startTime&&e.endTime?`${e.startTime}–${e.endTime} · `:""}{e.note}
                      </div>
                    </div>
                    <div style={S.eTime}>{secsToHHMM(e.secs)}</div>
                    <button style={S.eDel} onClick={()=>deleteEntry(e.id)}>✕</button>
                  </div>
                  {e.photos?.length > 0 && (
                    <div style={S.photoStrip}>
                      {e.photos.map(ph=>(
                        <div key={ph.id} style={S.photoMini} onClick={()=>setLightbox({url:ph.url,caption:ph.name})}>
                          <img src={ph.url} alt={ph.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            }
            <div style={{marginTop:10,display:"flex",gap:8}}>
              <button style={{...S.outB,fontSize:11}} onClick={()=>{ setManDate(selDay); setSubView("manual"); setView("registrera"); }}>+ Lägg till tid denna dag</button>
            </div>
          </div>

          {/* Legend */}
          <div style={S.legend}>
            {projStats.filter(p=>p.secs>0).map(p=>(
              <div key={p.id} style={S.legItem}>
                <div style={S.legDot(col(p.id))}/>
                <span style={S.legTxt}>{p.name}</span>
                <span style={S.legVal(col(p.id))}>{secsToHHMM(entries.filter(e=>e.projId===p.id&&new Date(e.date).getMonth()===calMonth).reduce((s,e)=>s+e.secs,0))}</span>
              </div>
            ))}
          </div>

          <button style={{...S.grnB,width:"100%"}} onClick={copySummary}>📋 Kopiera månadsrapport</button>

        </>)}

        {/* ══════════ REGISTRERA ══════════ */}
        {view === "registrera" && (<>

          {/* Underkategori-tabbar */}
          <div style={{display:"flex",gap:0,background:bg2,borderRadius:10,padding:4,marginBottom:14,border:`1.5px solid ${bdr}`}}>
            <button style={{flex:1,padding:"9px",borderRadius:7,border:"none",background:subView==="timer"?bg0:bg2,color:subView==="timer"?ora:muted,fontWeight:subView==="timer"?700:400,cursor:"pointer",fontSize:13,transition:"all .15s"}}>
              <span onClick={()=>setSubView("timer")}>Timer</span>
            </button>
            <button style={{flex:1,padding:"9px",borderRadius:7,border:"none",background:subView==="manual"?bg0:bg2,color:subView==="manual"?ora:muted,fontWeight:subView==="manual"?700:400,cursor:"pointer",fontSize:13,transition:"all .15s"}}>
              <span onClick={()=>setSubView("manual")}>✏️ Manuell</span>
            </button>
          </div>

          {/* ── Timer ── */}
          {subView === "timer" && (<>
            <div style={S.tBox}>
              <div style={S.clock(running)}>{fmtTimer(elapsed)}</div>
              <div style={S.clkSb}>{running?"● SPELAR IN":elapsed>0?"PAUSAD":"REDO ATT STARTA"}</div>
              <div style={S.tBtns}>
                {!running && elapsed===0 && <button style={S.bigB(ora,true)} onClick={startTimer}>▶ STARTA</button>}
                {running && <button style={S.bigB(yel,true)} onClick={pauseTimer}>⏸ PAUSA</button>}
                {!running && elapsed>0 && <>
                  <button style={S.smB(ora)} onClick={startTimer}>▶ Fortsätt</button>
                  <button style={S.smB(grn)} onClick={saveTimer}>✓ Spara</button>
                  <button style={S.smB("#444")} onClick={discardTimer}>✕ Kasta</button>
                </>}
              </div>
              <div style={S.selW}><select style={S.sel} value={timerProj} onChange={e=>setTimerProj(e.target.value)}>
                {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select></div>
              <textarea style={{...S.ta,minHeight:44}} placeholder="Anteckning..." value={timerNote} onChange={e=>setTimerNote(e.target.value)} rows={2}/>
            </div>
          </>)}

          {/* ── Manuell ── */}
          {subView === "manual" && (<>
            <div style={S.manPanel}>
              <div style={S.g2}>
                <div>
                  <div style={{...S.slbl,marginBottom:4}}>Projekt</div>
                  <div style={S.selW}><select style={S.sel} value={manProj} onChange={e=>setManProj(e.target.value)}>
                    {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select></div>
                </div>
                <div>
                  <div style={{...S.slbl,marginBottom:4}}>Datum</div>
                  <input style={S.inp} type="date" value={manDate} onChange={e=>setManDate(e.target.value)}/>
                </div>
              </div>

              <div style={{...S.slbl,marginBottom:6}}>Inmatningsmetod</div>
              <div style={S.modeRow}>
                <button style={S.modeBtn(manMode==="clock")} onClick={()=>setManMode("clock")}>🕐 Klockslag</button>
                <button style={S.modeBtn(manMode==="hours")} onClick={()=>setManMode("hours")}>Timmar</button>
              </div>

              {manMode === "clock" && (<>
                <div style={S.g2}>
                  <div>
                    <div style={{...S.slbl,marginBottom:4}}>Starttid</div>
                    <input style={S.inp} type="time" value={manStart} onChange={e=>setManStart(e.target.value)}/>
                  </div>
                  <div>
                    <div style={{...S.slbl,marginBottom:4}}>Sluttid</div>
                    <input style={S.inp} type="time" value={manEnd} onChange={e=>setManEnd(e.target.value)}/>
                  </div>
                </div>
                <div style={S.dur}>Varaktighet: {clockDuration()}</div>
              </>)}

              {manMode === "hours" && (
                <div style={{marginBottom:10}}>
                  <div style={{...S.slbl,marginBottom:4}}>Antal timmar</div>
                  <div style={{display:"flex",alignItems:"center",border:`1.5px solid ${bdr}`,borderRadius:8,overflow:"hidden",background:bg0}}>
                    <input style={{...S.inp,border:"none",flex:1,fontSize:20,fontWeight:700,color:ora}} type="number" placeholder="8" value={manHours} onChange={e=>setManHours(e.target.value)} step="0.5" min="0.5"/>
                    <span style={{padding:"0 12px",fontSize:12,color:muted,borderLeft:`1px solid ${bdr}`}}>tim</span>
                  </div>
                </div>
              )}

              <div style={{...S.slbl,marginBottom:4,marginTop:4}}>Anteckning</div>
              <textarea style={{...S.ta,minHeight:60,marginBottom:12}} placeholder="Vad gjordes?" value={manNote} onChange={e=>setManNote(e.target.value)} rows={2}/>

              {/* Photo upload */}
              <div style={{fontFamily:"monospace",fontSize:10,letterSpacing:2,textTransform:"uppercase",color:muted,marginBottom:8}}>BILDER (valfritt)</div>
              <input ref={photoRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={handlePhotoUpload}/>
              <div style={S.photoGrid}>
                {manPhotos.map(ph=>(
                  <div key={ph.id} style={S.photoThumb}>
                    <img src={ph.url} alt={ph.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    <button style={S.photoDel} onClick={()=>setManPhotos(prev=>prev.filter(p=>p.id!==ph.id))}>✕</button>
                  </div>
                ))}
                {manPhotos.length < 6 && (
                  <div style={S.photoAdd} onClick={()=>photoRef.current?.click()}>
                    <span style={{fontSize:22,color:muted}}>📷</span>
                    <span style={{fontSize:10,color:muted,fontFamily:"monospace"}}>Lägg till</span>
                  </div>
                )}
              </div>

              <button style={{...S.primB,width:"100%",fontSize:14,padding:"12px"}} onClick={saveManual}>Spara tidspost</button>
            </div>

            {entries.filter(e=>e.date===manDate).length > 0 && (<>
              <div style={S.slbl}>{new Date(manDate).toLocaleDateString("sv-SE",{weekday:"long",day:"numeric",month:"long"})}</div>
              <div style={S.card}>
                {entries.filter(e=>e.date===manDate).map((e,i,arr)=>(
                  <div key={e.id} style={{padding:"10px 14px", borderBottom: i!==arr.length-1?`1px solid ${bdr}`:"none"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={S.eDot(col(e.projId))}/>
                      <div style={S.eInfo}>
                        <div style={S.ePrj}>{projName(e.projId)}</div>
                        <div style={S.eMeta}>{e.startTime&&e.endTime?`${e.startTime}–${e.endTime} · `:""}{e.note}</div>
                      </div>
                      <div style={S.eTime}>{secsToHHMM(e.secs)}</div>
                      <button style={S.eDel} onClick={()=>deleteEntry(e.id)}>✕</button>
                    </div>
                    {e.photos?.length > 0 && (
                      <div style={S.photoStrip}>
                        {e.photos.map(ph=>(
                          <div key={ph.id} style={S.photoMini} onClick={()=>setLightbox({url:ph.url,caption:ph.name})}>
                            <img src={ph.url} alt={ph.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>)}
          </>)}

        </>)}

        {/* Lightbox */}
        {lightbox && (
          <div style={S.lbOverlay} onClick={()=>setLightbox(null)}>
            <button style={S.lbClose} onClick={()=>setLightbox(null)}>✕</button>
            <img src={lightbox.url} alt={lightbox.caption} style={S.lbImg} onClick={e=>e.stopPropagation()}/>
            <div style={S.lbCaption}>{lightbox.caption}</div>
          </div>
        )}

        {/* ══════════ PROJEKT ══════════ */}
        {view === "projekt" && (<>
          <div style={S.slbl}>Projektöversikt</div>
          {projStats.map(p=>(
            <div key={p.id} style={S.card}>
              <div style={S.cTop}>
                <div style={S.cDot(col(p.id))}/>
                <div style={{flex:1}}>
                  <div style={S.cName}>{p.name}</div>
                  <div style={S.cSub}>{p.count} poster</div>
                </div>
                <div style={S.cStat}>{p.secs>0?secsToHHMM(p.secs):"—"}</div>
              </div>
              {p.secs>0&&(
                <div style={{padding:"0 14px 12px"}}>
                  <div style={{background:bg0,borderRadius:4,height:4,overflow:"hidden"}}>
                    <div style={{width:`${Math.min(100,(p.secs/Math.max(totalSecs,1))*100)}%`,height:"100%",background:col(p.id),borderRadius:4}}/>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!showNewProj
            ? <button style={{...S.outB,width:"100%",marginTop:4}} onClick={()=>setShowNewProj(true)}>＋ Nytt projekt</button>
            : <div style={{...S.card,padding:14,marginTop:4}}>
                <div style={{...S.slbl,marginBottom:8}}>Nytt projekt</div>
                <input style={{...S.inp,marginBottom:10}} placeholder="Projektnamn..." value={newProjName} onChange={e=>setNewProjName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addProject()}/>
                <div style={{display:"flex",gap:8}}>
                  <button style={S.outB} onClick={()=>setShowNewProj(false)}>Avbryt</button>
                  <button style={{...S.primB,flex:1}} onClick={addProject}>Skapa projekt</button>
                </div>
              </div>
          }
        </>)}

      </div>
    </div>
  );
}
