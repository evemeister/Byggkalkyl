import { useState, useRef, useMemo } from "react";

// ══════════════════════════════════════════════════════════════════════════════
// SHARED HELPERS & DATA
// ══════════════════════════════════════════════════════════════════════════════
const uid      = () => Math.random().toString(36).slice(2, 9);
const pad      = n  => String(n).padStart(2, "0");
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtKr    = n  => Number(n||0).toLocaleString("sv-SE",{minimumFractionDigits:0,maximumFractionDigits:0}) + " kr";
const fmtDate  = iso => new Date(iso).toLocaleDateString("sv-SE",{day:"numeric",month:"short"});
const secsToH  = s  => (s/3600).toFixed(1);
const secsHHMM = s  => `${Math.floor(s/3600)}h ${pad(Math.floor((s%3600)/60))}min`;
const fmtTimer = s  => `${pad(Math.floor(s/3600))}:${pad(Math.floor((s%3600)/60))}:${pad(s%60)}`;

// Colors
const PROJ_COLORS = ["#e8652a","#3aaa6e","#4a9fd4","#f0c040","#a87edc","#dc8a4a"];
const CAT_COLORS  = { material:"#f0c040", verktyg:"#4a9fd4", transport:"#3aaa6e", uthyrning:"#a87edc", underentreprenad:"#e8652a", ovrigt:"#6b7177" };
const projColor   = (id, projects) => PROJ_COLORS[projects.findIndex(p=>p.id===id) % PROJ_COLORS.length] || "#888";

const CATEGORIES = [
  {id:"material",         label:"Material",             icon:"🧱"},
  {id:"verktyg",          label:"Verktyg",              icon:"🔧"},
  {id:"transport",        label:"Transport",            icon:"🚗"},
  {id:"uthyrning",        label:"Uthyrning",            icon:"🏗"},
  {id:"underentreprenad", label:"Underentreprenad",     icon:"👷"},
  {id:"ovrigt",           label:"Övrigt",               icon:"📦"},
];

const MONTHS_SV = ["Jan","Feb","Mar","Apr","Maj","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];
const DAYS_SV   = ["Mån","Tis","Ons","Tor","Fre","Lör","Sön"];

// ── Shared initial data ───────────────────────────────────────────────────────
const INIT_PROJECTS = [
  {id:"p1", name:"Badrumsrenovering Karlsson", customer:"Anna Karlsson",  address:"Storgatan 12, Göteborg",        pnr:"196203124521", startDate:"2026-04-15", endDate:"2026-05-20"},
  {id:"p2", name:"Bottenplatta Lindgren",       customer:"Erik Lindgren",  address:"Björkvägen 4, Partille",         pnr:"197809042233", startDate:"2026-04-20", endDate:"2026-05-28"},
  {id:"p3", name:"Köksrenovering Svensson",     customer:"Maria Svensson", address:"Tallgatan 8, Västra Frölunda",   pnr:"195511287712", startDate:"2026-05-01", endDate:"2026-06-15"},
];
const COMPANY = {name:"Hantverksfirman AB", orgnr:"556123-4567", address:"Verkstadsgatan 10, Göteborg", email:"info@hantverksfirman.se", fSkatt:true, momsreg:true};

function daysAgo(n) { const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); }

const INIT_ENTRIES = [
  {id:"e1",projId:"p1",date:daysAgo(12),startTime:"07:00",endTime:"15:30",secs:8.5*3600,note:"Rivning och demontering"},
  {id:"e2",projId:"p1",date:daysAgo(10),startTime:"07:00",endTime:"16:00",secs:9*3600,  note:"Tätskikt och membran"},
  {id:"e3",projId:"p1",date:daysAgo(7), startTime:"07:30",endTime:"15:00",secs:7.5*3600,note:"Plattsättning"},
  {id:"e4",projId:"p2",date:daysAgo(9), startTime:"07:00",endTime:"16:30",secs:9.5*3600,note:"Schaktning och formning"},
  {id:"e5",projId:"p2",date:daysAgo(6), startTime:"07:00",endTime:"15:00",secs:8*3600,  note:"Armering"},
  {id:"e6",projId:"p3",date:daysAgo(3), startTime:"07:30",endTime:"16:00",secs:8.5*3600,note:"Rivning kök"},
];

const INIT_RECEIPTS = [
  {id:"r1",projId:"p1",date:daysAgo(11),store:"Byggmax",   amount:2840,moms:568, category:"material", note:"Kakel och tätskikt",  rotEligible:true,  splits:[]},
  {id:"r2",projId:"p1",date:daysAgo(11),store:"Ahlsell",   amount:1890,moms:378, category:"material", note:"VVS-delar",            rotEligible:true,  splits:[]},
  {id:"r3",projId:"p2",date:daysAgo(8), store:"Byggmax",   amount:5200,moms:1040,category:"material", note:"Betong och armering",  rotEligible:false, splits:[]},
  {id:"r4",projId:"p2",date:daysAgo(5), store:"OKQ8",      amount:480, moms:96,  category:"transport",note:"Diesel",               rotEligible:false, splits:[]},
  {id:"r5",projId:"p3",date:daysAgo(2), store:"IKEA",      amount:8900,moms:1780,category:"material", note:"Köksskåp",             rotEligible:true,  splits:[]},
];

// ══════════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ══════════════════════════════════════════════════════════════════════════════
const T = {
  bg0:"#0e1012", bg1:"#161a1d", bg2:"#1c2024", bg3:"#222629",
  bdr:"#252b30", bdr2:"#343c44",
  ink:"#e4e0d8", muted:"#6b7177", muted2:"#8a9199",
  ora:"#e8652a", grn:"#3aaa6e", blu:"#4a9fd4", yel:"#f0c040", pur:"#a87edc",
};

// Common styles factory
const cs = {
  sec:   { background:T.bg2, border:`1.5px solid ${T.bdr}`, borderRadius:10, marginBottom:12, overflow:"hidden" },
  secH:  { padding:"10px 16px", borderBottom:`1px solid ${T.bdr}`, display:"flex", alignItems:"center", gap:8, background:T.bg1 },
  secHT: { fontSize:13, fontWeight:700, color:T.ink },
  secB:  { padding:"12px 16px" },
  lbl:   { fontFamily:"monospace", fontSize:10, letterSpacing:2, textTransform:"uppercase", color:T.muted, marginBottom:5, display:"block" },
  inp:   { width:"100%", border:`1.5px solid ${T.bdr}`, borderRadius:8, padding:"10px 12px", background:T.bg0, fontSize:14, color:T.ink, boxSizing:"border-box", outline:"none" },
  selW:  { border:`1.5px solid ${T.bdr}`, borderRadius:8, overflow:"hidden", background:T.bg0 },
  sel:   { width:"100%", border:"none", outline:"none", padding:"10px 12px", background:"transparent", fontSize:14, color:T.ink, appearance:"none" },
  ta:    { width:"100%", border:`1.5px solid ${T.bdr}`, borderRadius:8, padding:"10px 12px", background:T.bg0, fontSize:14, color:T.ink, resize:"none", outline:"none", lineHeight:1.6, boxSizing:"border-box" },
  btn:   (c,ok=true) => ({ width:"100%", padding:"13px", background:ok?c:T.bdr2, color:"#fff", border:"none", borderRadius:9, fontSize:15, fontWeight:700, cursor:ok?"pointer":"not-allowed", letterSpacing:1, marginBottom:8 }),
  outBtn:{ padding:"9px 14px", borderRadius:8, border:`1.5px solid ${T.bdr}`, background:"none", color:T.muted2, fontSize:12, fontWeight:600, cursor:"pointer" },
  grnBtn:{ padding:"9px 14px", borderRadius:8, border:`1.5px solid ${T.grn}44`, background:"#0e2016", color:T.grn, fontSize:12, fontWeight:600, cursor:"pointer" },
  g2:    { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 },
  divider:{ borderTop:`1px solid ${T.bdr}`, margin:"10px 0" },
  row:   (i,total) => ({ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom: i!==total-1?`1px solid ${T.bdr}`:"none" }),
};

// ══════════════════════════════════════════════════════════════════════════════
// MODUL 1 – MATERIALKALKYLATOR
// ══════════════════════════════════════════════════════════════════════════════
const YT_TYPES = {
  rect:   {name:"Rektangel",icon:"▭",fields:[{id:"l",label:"Längd",unit:"m",val:5,step:0.1},{id:"b",label:"Bredd",unit:"m",val:3,step:0.1}],area:f=>f.l*f.b,desc:f=>`${f.l}×${f.b} m`},
  circle: {name:"Cirkel",  icon:"○",fields:[{id:"d",label:"Diameter",unit:"m",val:3,step:0.1}],area:f=>Math.PI*(f.d/2)**2,desc:f=>`Ø${f.d} m`},
  tri:    {name:"Triangel",icon:"△",fields:[{id:"b",label:"Bas",unit:"m",val:4,step:0.1},{id:"h",label:"Höjd",unit:"m",val:3,step:0.1}],area:f=>0.5*f.b*f.h,desc:f=>`Bas ${f.b}×H ${f.h} m`},
  lshape: {name:"L-form",  icon:"⌐",fields:[{id:"tw",label:"Total L",unit:"m",val:6,step:0.1},{id:"th",label:"Total B",unit:"m",val:5,step:0.1},{id:"cw",label:"Utsk. L",unit:"m",val:3,step:0.1},{id:"ch",label:"Utsk. B",unit:"m",val:2.5,step:0.1}],area:f=>Math.max(0,f.tw*f.th-f.cw*f.ch),desc:f=>`${f.tw}×${f.th} – ${f.cw}×${f.ch} m`},
};

function Kalkylator() {
  const [type,   setType]   = useState("rect");
  const [fields, setFields] = useState({l:5,b:3});
  const [depth,  setDepth]  = useState(15);
  const [spill,  setSpill]  = useState(0);
  const [shapes, setShapes] = useState([]);
  const cfg = YT_TYPES[type];

  function getVal(id) { return fields[id] ?? cfg.fields.find(f=>f.id===id)?.val ?? 0; }
  function setVal(id,v){ setFields(f=>({...f,[id]:parseFloat(v)||0})); }
  function buildFields() {
    const vals={};
    cfg.fields.forEach(f=>{ vals[f.id]=fields[f.id]??f.val; });
    return vals;
  }
  function addShape() {
    const f=buildFields();
    const area=cfg.area(f);
    if(area<=0) return;
    setShapes(s=>[...s,{id:uid(),type,fields:f,area,desc:cfg.desc(f),name:cfg.name,icon:cfg.icon}]);
  }

  const totalArea = shapes.reduce((s,sh)=>s+sh.area,0);
  const depthM    = depth/100;
  const vol       = totalArea*depthM*(1+spill/100);
  const bags25    = vol>0?Math.ceil(vol/(25/2300)):0;

  const S = {
    typeGrid:{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, marginBottom:14 },
    typeBtn: a => ({ padding:"10px 4px", borderRadius:8, border:`1.5px solid ${a?T.ora:T.bdr}`, background:a?"#2e1a0d":T.bg2, color:a?T.ora:T.muted, fontSize:11, cursor:"pointer", textAlign:"center", fontFamily:"monospace" }),
    fGrid:  { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 },
    fBox:   { display:"flex", alignItems:"center", border:`1.5px solid ${T.bdr}`, borderRadius:8, overflow:"hidden", background:T.bg0 },
    fInp:   { flex:1, border:"none", outline:"none", padding:"9px 10px", background:"transparent", fontSize:16, fontWeight:600, color:T.ink },
    fUnit:  { padding:"0 10px", fontSize:11, color:T.muted, borderLeft:`1px solid ${T.bdr}` },
    shapeRow:(i,tot)=>({ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:i!==tot-1?`1px solid ${T.bdr}`:"none" }),
    result: { background:T.bg1, border:`1.5px solid ${T.ora}33`, borderRadius:10, padding:"16px", marginBottom:12 },
    rval:   { fontFamily:"monospace", fontSize:36, fontWeight:800, color:T.ora, lineHeight:1 },
    rsub:   { fontSize:11, color:T.muted, marginTop:4 },
  };

  return (
    <div>
      <div style={cs.sec}>
        <div style={cs.secH}><span>📐</span><div style={cs.secHT}>Ytberäkning</div></div>
        <div style={cs.secB}>
          <div style={S.typeGrid}>
            {Object.entries(YT_TYPES).map(([k,v])=>(
              <div key={k} style={S.typeBtn(type===k)} onClick={()=>{setType(k);setFields({});}}>
                <div style={{fontSize:18,marginBottom:3}}>{v.icon}</div>{v.name}
              </div>
            ))}
          </div>
          <div style={S.fGrid}>
            {cfg.fields.map(f=>(
              <div key={f.id}>
                <label style={cs.lbl}>{f.label}</label>
                <div style={S.fBox}>
                  <input style={S.fInp} type="number" value={getVal(f.id)} step={f.step} onChange={e=>setVal(f.id,e.target.value)}/>
                  <div style={S.fUnit}>{f.unit}</div>
                </div>
              </div>
            ))}
          </div>
          <button style={{...cs.btn(T.ora),marginBottom:0}} onClick={addShape}>+ Lägg till yta</button>
        </div>
      </div>

      {shapes.length>0 && (
        <div style={cs.sec}>
          <div style={cs.secH}><span>📋</span><div style={cs.secHT}>Tillagda ytor</div></div>
          <div style={cs.secB}>
            {shapes.map((s,i)=>(
              <div key={s.id} style={S.shapeRow(i,shapes.length)}>
                <span style={{fontSize:16}}>{s.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,color:T.ink}}>{s.name} – {s.desc}</div>
                </div>
                <div style={{fontFamily:"monospace",fontSize:13,color:T.ora}}>{s.area.toFixed(2)} m²</div>
                <button style={{...cs.outBtn,padding:"4px 8px",fontSize:11}} onClick={()=>setShapes(sh=>sh.filter(x=>x.id!==s.id))}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={cs.sec}>
        <div style={cs.secH}><span>⚙️</span><div style={cs.secHT}>Djup & spill</div></div>
        <div style={cs.secB}>
          <div style={cs.g2}>
            <div>
              <label style={cs.lbl}>Djup / Tjocklek</label>
              <div style={S.fBox}><input style={S.fInp} type="number" value={depth} onChange={e=>setDepth(+e.target.value)}/><div style={S.fUnit}>cm</div></div>
            </div>
            <div>
              <label style={cs.lbl}>Spillfaktor</label>
              <div style={{display:"flex",gap:4}}>
                {[0,5,10,15].map(p=>(
                  <div key={p} onClick={()=>setSpill(p)} style={{flex:1,padding:"9px 4px",borderRadius:7,border:`1.5px solid ${spill===p?T.ora:T.bdr}`,background:spill===p?"#2e1a0d":T.bg1,color:spill===p?T.ora:T.muted,fontSize:11,cursor:"pointer",textAlign:"center",fontFamily:"monospace"}}>
                    +{p}%
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={S.result}>
        <div style={{fontSize:11,color:T.muted,fontFamily:"monospace",letterSpacing:1,marginBottom:6}}>TOTAL AREA</div>
        <div style={S.rval}>{totalArea.toFixed(2)}<span style={{fontSize:20,color:T.muted,marginLeft:6}}>m²</span></div>
        <div style={S.rsub}>Volym: {vol.toFixed(3)} m³ · Betong 25 kg: {bags25} säckar</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODUL 2 – AI-OFFERT (chat-baserad)
// ══════════════════════════════════════════════════════════════════════════════
function AIOffert({ projects }) {
  const [step,       setStep]      = useState(1);
  const [kundNamn,   setKundNamn]  = useState("");
  const [kundAdr,    setKundAdr]   = useState("");
  const [jobDesc,    setJobDesc]   = useState("");
  const [jobType,    setJobType]   = useState("");
  const [timpris,    setTimpris]   = useState(650);
  const [matUpplag,  setMatUpplag] = useState(20);
  const [rot,        setRot]       = useState("nej");
  const [jobSize,    setJobSize]   = useState("medium");
  const [loading,    setLoading]   = useState(false);
  const [error,      setError]     = useState("");
  const [offert,     setOffert]    = useState(null);
  const [arbete,     setArbete]    = useState("");
  const [villkor,    setVillkor]   = useState("");
  const [material,   setMaterial]  = useState([]);
  const [pArbete,    setPArbete]   = useState(0);
  const [pMaterial,  setPMaterial] = useState(0);

  const JOBBTYPER = ["🔧 VVS","⚡ El","🛁 Badrum","🍳 Kök","🎨 Målning","🧱 Betong","⛏️ Mark","🪵 Golv","🏠 Fasad","🪚 Snickeri"];
  const SIZES = {litet:"2–8 timmar",medium:"1–3 dagar",stort:"1+ vecka"};
  const canNext = jobDesc.trim().length > 10;
  const today = new Date().toLocaleDateString("sv-SE");
  const subtot = pArbete+pMaterial, moms=Math.round(subtot*0.25), total=subtot+moms;

  async function generate() {
    setLoading(true); setError("");
    const prompt = `Du är en erfaren svensk hantverkare. Skriv en offert på svenska.\n\nJobb: ${jobDesc}\n${jobType?`Typ: ${jobType}\n`:""}\nStorlek: ${SIZES[jobSize]}\nTimpris: ${timpris} kr/tim\nMaterialupplägg: ${matUpplag}%\nROT: ${rot==="ja"?"Ja":"Nej"}\n\nSvara ENBART med JSON (inga backticks):\n{"arbetsbeskrivning":"...","material":[{"namn":"...","antal":"...","apris":0}],"arbetstimmar":8,"villkor":"..."}`;
    try {
      const res  = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","anthropic-version":"2023-06-01"},body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:1000,messages:[{role:"user",content:prompt}]})});
      const data = await res.json();
      if(data.error) throw new Error(data.error.message);
      const raw  = data.content?.map(b=>b.text||"").join("");
      const m    = raw.match(/\{[\s\S]*\}/);
      if(!m) throw new Error("Oväntat svar, försök igen.");
      const p    = JSON.parse(m[0]);
      const mats = (p.material||[]).map((x,i)=>({id:i+1,...x}));
      setArbete(p.arbetsbeskrivning||""); setVillkor(p.villkor||"30 dagar netto.");
      setMaterial(mats);
      setPArbete(Math.round((p.arbetstimmar||8)*timpris));
      setPMaterial(Math.round(mats.reduce((s,x)=>s+(x.apris||0),0)*(1+matUpplag/100)));
      setOffert(true); setStep(3);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }

  const S = {
    stepBar:{ display:"flex", background:T.bg2, borderRadius:10, padding:4, marginBottom:14, gap:4 },
    stepBtn:a=>({ flex:1, padding:"9px", borderRadius:7, border:"none", background:a?T.bg0:T.bg2, color:a?T.ora:T.muted, fontWeight:a?700:400, cursor:"pointer", fontSize:13, transition:"all .15s" }),
    pill:  a=>({ padding:"5px 12px", borderRadius:20, border:`1.5px solid ${a?T.ora:T.bdr}`, background:a?"#2e1a0d":T.bg2, color:a?T.ora:T.muted, fontSize:11, cursor:"pointer", fontFamily:"monospace" }),
    pills: { display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 },
    ofHdr: { background:"#141210", padding:"14px 18px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, borderRadius:"8px 8px 0 0" },
    editTA:{ width:"100%", border:"1px solid transparent", borderRadius:6, padding:"7px 9px", background:"transparent", color:T.ink, resize:"vertical", outline:"none", lineHeight:1.7, minHeight:50, fontSize:14, boxSizing:"border-box" },
    matRow:{ display:"flex", alignItems:"center", gap:8, background:T.bg1, border:`1px solid ${T.bdr}`, borderRadius:7, padding:"7px 10px", marginBottom:5 },
    matInp:{ border:"none", outline:"none", background:"transparent", color:T.ink, fontSize:13 },
    prow:  { display:"flex", justifyContent:"space-between", padding:"4px 0", fontSize:13 },
    ptot:  { display:"flex", justifyContent:"space-between", padding:"10px 0 4px", borderTop:`2px solid ${T.ink}`, fontSize:16, fontWeight:700 },
    actRow:{ display:"flex", gap:8 },
    actBtn:p=>({ flex:1, padding:"11px", borderRadius:7, border:p?"none":`1.5px solid ${T.bdr}`, background:p?T.ora:"#fff", color:p?"#fff":T.ink, fontSize:13, fontWeight:600, cursor:"pointer" }),
  };

  return (
    <div>
      <div style={S.stepBar}>
        <button style={S.stepBtn(step===1)} onClick={()=>setStep(1)}>1 · Beskriv</button>
        <button style={S.stepBtn(step===2)} onClick={()=>canNext&&setStep(2)}>2 · Detaljer</button>
        <button style={S.stepBtn(step===3)} onClick={()=>offert&&setStep(3)}>3 · Offert</button>
      </div>

      {step===1 && (
        <div style={cs.sec}>
          <div style={cs.secH}><span>📝</span><div style={cs.secHT}>Beskriv jobbet</div></div>
          <div style={cs.secB}>
            <div style={cs.g2}>
              <div><label style={cs.lbl}>Kundnamn</label><input style={cs.inp} placeholder="Anna Karlsson" value={kundNamn} onChange={e=>setKundNamn(e.target.value)}/></div>
              <div><label style={cs.lbl}>Adress</label><input style={cs.inp} placeholder="Storgatan 12" value={kundAdr} onChange={e=>setKundAdr(e.target.value)}/></div>
            </div>
            <label style={cs.lbl}>Jobbtyp</label>
            <div style={S.pills}>
              {JOBBTYPER.map(jt=><div key={jt} style={S.pill(jobType===jt)} onClick={()=>setJobType(jobType===jt?"":jt)}>{jt}</div>)}
            </div>
            <label style={cs.lbl}>Beskriv jobbet</label>
            <textarea style={{...cs.ta,minHeight:90,marginBottom:8}} rows={4} placeholder="Vad ska göras?" value={jobDesc} onChange={e=>setJobDesc(e.target.value)}/>
            <button style={cs.btn(T.ora,canNext)} onClick={()=>canNext&&setStep(2)}>NÄSTA →</button>
          </div>
        </div>
      )}

      {step===2 && (
        <div style={cs.sec}>
          <div style={cs.secH}><span>📋</span><div style={cs.secHT}>Prisdetaljer</div></div>
          <div style={cs.secB}>
            <div style={cs.g2}>
              <div><label style={cs.lbl}>Timpris kr/h</label>
                <input style={cs.inp} type="number" value={timpris} onChange={e=>setTimpris(+e.target.value)}/></div>
              <div><label style={cs.lbl}>Materialupplägg</label>
                <div style={cs.selW}><select style={cs.sel} value={matUpplag} onChange={e=>setMatUpplag(+e.target.value)}>
                  {[10,15,20,25,30].map(v=><option key={v} value={v}>{v}%</option>)}
                </select></div></div>
              <div><label style={cs.lbl}>Storlek</label>
                <div style={cs.selW}><select style={cs.sel} value={jobSize} onChange={e=>setJobSize(e.target.value)}>
                  <option value="litet">Litet (2–8 tim)</option>
                  <option value="medium">Mellanjobb (1–3 dagar)</option>
                  <option value="stort">Stort (1+ vecka)</option>
                </select></div></div>
              <div><label style={cs.lbl}>ROT-avdrag</label>
                <div style={cs.selW}><select style={cs.sel} value={rot} onChange={e=>setRot(e.target.value)}>
                  <option value="nej">Nej</option><option value="ja">Ja</option>
                </select></div></div>
            </div>
            {error && <div style={{background:"#2a0f0f",border:`1px solid #e05050`,borderRadius:8,padding:"10px 14px",fontSize:12,color:"#e05050",marginBottom:10}}>⚠️ {error}</div>}
            <button style={cs.btn(T.ink,!loading)} onClick={generate} disabled={loading}>
              {loading?"⏳ GENERERAR...":"✦ GENERERA OFFERT MED AI"}
            </button>
          </div>
        </div>
      )}

      {step===3 && offert && (
        <>
          <div style={{background:T.bg2,border:`2px solid ${T.ink}`,borderRadius:10,marginBottom:12,overflow:"hidden"}}>
            <div style={S.ofHdr}>
              <div><div style={{fontSize:20,fontWeight:800,color:"#fff",letterSpacing:1}}>OFFERT</div>
                <div style={{fontSize:11,color:"#888"}}>{kundNamn||"Kund"}{kundAdr?" · "+kundAdr:""}</div>
                <div style={{fontSize:11,color:"#888"}}>{today}</div></div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:9,color:"#666",letterSpacing:1}}>TOTALT INKL. MOMS</div>
                <div style={{fontSize:32,fontWeight:800,color:T.ora,fontFamily:"monospace"}}>{total.toLocaleString("sv-SE")} kr</div>
              </div>
            </div>
            <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.bdr}`}}>
              <div style={{fontSize:10,color:T.muted,fontFamily:"monospace",letterSpacing:1,marginBottom:6}}>ARBETSBESKRIVNING</div>
              <textarea style={S.editTA} value={arbete} onChange={e=>setArbete(e.target.value)} rows={3}/>
            </div>
            <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.bdr}`}}>
              <div style={{fontSize:10,color:T.muted,fontFamily:"monospace",letterSpacing:1,marginBottom:8}}>MATERIAL</div>
              {material.map(m=>(
                <div key={m.id} style={S.matRow}>
                  <input value={m.namn} onChange={e=>setMaterial(ms=>ms.map(r=>r.id===m.id?{...r,namn:e.target.value}:r))} style={{...S.matInp,flex:1}}/>
                  <input value={m.antal} onChange={e=>setMaterial(ms=>ms.map(r=>r.id===m.id?{...r,antal:e.target.value}:r))} style={{...S.matInp,width:55,textAlign:"right",color:T.muted,fontSize:11}}/>
                  <input type="number" value={m.apris} onChange={e=>setMaterial(ms=>ms.map(r=>r.id===m.id?{...r,apris:+e.target.value}:r))} style={{...S.matInp,width:70,textAlign:"right",fontWeight:600,color:T.ora}}/>
                  <span style={{fontSize:11,color:T.muted}}>kr</span>
                  <button onClick={()=>setMaterial(ms=>ms.filter(r=>r.id!==m.id))} style={{width:22,height:22,borderRadius:4,border:`1px solid ${T.bdr}`,background:"none",cursor:"pointer",color:T.muted,fontSize:10}}>✕</button>
                </div>
              ))}
              <button onClick={()=>setMaterial(ms=>[...ms,{id:Date.now(),namn:"",antal:"1 st",apris:0}])} style={{...cs.outBtn,width:"100%",marginTop:4,fontSize:11}}>＋ Lägg till</button>
            </div>
            <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.bdr}`}}>
              <div style={S.prow}><span style={{color:T.muted2}}>Arbete</span><span style={{fontFamily:"monospace"}}>{pArbete.toLocaleString("sv-SE")} kr</span></div>
              <div style={S.prow}><span style={{color:T.muted2}}>Material</span><span style={{fontFamily:"monospace"}}>{pMaterial.toLocaleString("sv-SE")} kr</span></div>
              <div style={{...S.prow,color:T.muted,fontSize:12}}><span>Moms 25%</span><span style={{fontFamily:"monospace"}}>{moms.toLocaleString("sv-SE")} kr</span></div>
              <div style={S.ptot}><span>Totalt inkl. moms</span><span style={{color:T.ora,fontFamily:"monospace"}}>{total.toLocaleString("sv-SE")} kr</span></div>
              {rot==="ja"&&<div style={{marginTop:8,padding:"6px 10px",background:"#0e2016",borderRadius:6,fontSize:11,color:T.grn}}>🏠 ROT-avdrag: {Math.round(pArbete*0.3).toLocaleString("sv-SE")} kr</div>}
            </div>
            <div style={{padding:"14px 18px"}}>
              <div style={{fontSize:10,color:T.muted,fontFamily:"monospace",letterSpacing:1,marginBottom:4}}>VILLKOR</div>
              <textarea style={S.editTA} value={villkor} onChange={e=>setVillkor(e.target.value)} rows={2}/>
            </div>
          </div>
          <div style={S.actRow}>
            <button style={S.actBtn(false)} onClick={()=>{setStep(1);setOffert(null);}}>← Ny</button>
            <button style={S.actBtn(false)} onClick={()=>generate()}>🔄 Om</button>
            <button style={S.actBtn(true)} onClick={()=>{const t=`OFFERT\n${kundNamn}\n\n${arbete}\n\nTotalt: ${total.toLocaleString("sv-SE")} kr\n\n${villkor}`;navigator.clipboard.writeText(t).then(()=>alert("✓ Kopierad!"));}}>📋 Kopiera</button>
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODUL 3 – TIDRAPPORTERING (simplified for unified app)
// ══════════════════════════════════════════════════════════════════════════════
function weekNum(iso) {
  const d=new Date(iso); d.setHours(0,0,0,0); d.setDate(d.getDate()+4-(d.getDay()||7));
  const y=new Date(d.getFullYear(),0,1); return Math.ceil(((d-y)/86400000+1)/7);
}
function monthDays(year,month) {
  const first=new Date(year,month,1), last=new Date(year,month+1,0);
  let dow=first.getDay(); if(dow===0)dow=7; const prefix=dow-1;
  const days=[];
  for(let i=prefix;i>0;i--){const d=new Date(year,month,1-i);days.push({iso:d.toISOString().slice(0,10),inMonth:false});}
  for(let d=1;d<=last.getDate();d++){const dt=new Date(year,month,d);days.push({iso:dt.toISOString().slice(0,10),inMonth:true});}
  while(days.length%7!==0){const d=new Date(year,month+1,days.length-prefix-last.getDate()+1);days.push({iso:d.toISOString().slice(0,10),inMonth:false});}
  return days;
}
function monthWeekRows(year,month){ const days=monthDays(year,month),rows=[]; for(let i=0;i<days.length;i+=7)rows.push({week:weekNum(days[i].iso),days:days.slice(i,i+7)}); return rows; }
function addDays(iso,n){const d=new Date(iso);d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}

function getSwedishHolidays(year) {
  function easter(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;return new Date(y,mo-1,da);}
  const ea=easter(year);
  const add=(d,n)=>{const r=new Date(d);r.setDate(r.getDate()+n);return r;};
  const iso=d=>d.toISOString().slice(0,10);
  const mid=()=>{for(let d=20;d<=26;d++){const dt=new Date(year,5,d);if(dt.getDay()===5)return iso(dt);}};
  const allh=()=>{for(let d=31;d<=37;d++){const dt=new Date(year,9,d);if(dt.getDay()===6)return iso(dt);}};
  const fixed={[`${year}-01-01`]:"Nyårsdagen",[`${year}-01-06`]:"Trettondagen",[`${year}-05-01`]:"1 maj",[`${year}-06-06`]:"Nationaldagen",[`${year}-12-24`]:"Julafton",[`${year}-12-25`]:"Juldagen",[`${year}-12-26`]:"Annandag jul",[`${year}-12-31`]:"Nyårsafton"};
  const movable={[iso(add(ea,-2))]:"Långfredagen",[iso(add(ea,-1))]:"Påskafton",[iso(ea)]:"Påskdagen",[iso(add(ea,1))]:"Annandag påsk",[iso(add(ea,39))]:"Kristi himmelsfärd",[iso(add(ea,49))]:"Pingstdagen"};
  if(mid())movable[mid()]="Midsommarafton";
  if(allh())movable[allh()]="Alla helgons";
  return {...fixed,...movable};
}

function Tidrapport({ projects, entries, setEntries }) {
  const [subView,  setSubView]  = useState("manad");
  const now=new Date();
  const [calYear,  setCalYear]  = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selDay,   setSelDay]   = useState(todayISO());
  const [running,  setRunning]  = useState(false);
  const [elapsed,  setElapsed]  = useState(0);
  const [tProj,    setTProj]    = useState(projects[0]?.id||"");
  const [tNote,    setTNote]    = useState("");
  const [manProj,  setManProj]  = useState(projects[0]?.id||"");
  const [manDate,  setManDate]  = useState(todayISO());
  const [manStart, setManStart] = useState("07:00");
  const [manEnd,   setManEnd]   = useState("15:00");
  const [manNote,  setManNote]  = useState("");
  const [manMode,  setManMode]  = useState("clock");
  const [manHours, setManHours] = useState("8");
  const tickRef=useRef(null), startRef=useRef(null);
  const photoRef=useRef(null);
  const [photos,   setPhotos]   = useState([]);
  const [lightbox, setLightbox] = useState(null);

  function startTimer(){startRef.current=Date.now()-elapsed*1000;tickRef.current=setInterval(()=>setElapsed(Math.floor((Date.now()-startRef.current)/1000)),1000);setRunning(true);}
  function pauseTimer(){clearInterval(tickRef.current);setRunning(false);}
  function saveTimer(){
    if(elapsed<30)return;
    const n=new Date(),et=`${pad(n.getHours())}:${pad(n.getMinutes())}`,st=(()=>{const s=new Date(n-elapsed*1000);return `${pad(s.getHours())}:${pad(s.getMinutes())}`;})();
    setEntries(e=>[{id:uid(),projId:tProj,date:todayISO(),startTime:st,endTime:et,secs:elapsed,note:tNote||"—",photos:[]},  ...e]);
    setElapsed(0);setTNote("");setRunning(false);clearInterval(tickRef.current);
  }
  function saveManual(){
    let secs;
    if(manMode==="clock"){const s=parseInt(manStart)*3600+parseInt(manStart.slice(3))*60,e2=parseInt(manEnd)*3600+parseInt(manEnd.slice(3))*60;secs=e2>s?e2-s:0;if(secs<=0)return;}
    else{secs=Math.round(parseFloat(manHours||0)*3600);if(secs<=0)return;}
    setEntries(e=>[{id:uid(),projId:manProj,date:manDate,startTime:manMode==="clock"?manStart:"",endTime:manMode==="clock"?manEnd:"",secs,note:manNote||"—",photos:[...photos]}, ...e]);
    setManNote("");setManHours("8");setPhotos([]);
  }

  const col=id=>projColor(id,projects);
  const pName=id=>projects.find(p=>p.id===id)?.name||"Okänt";
  const daySecs=iso=>entries.filter(e=>e.date===iso).reduce((s,e)=>s+e.secs,0);
  const dayEnts=iso=>entries.filter(e=>e.date===iso);
  const weekRows=monthWeekRows(calYear,calMonth);
  const holidays=getSwedishHolidays(calYear);
  const maxDay=Math.max(...monthWeekRows(calYear,calMonth).flatMap(r=>r.days).map(d=>daySecs(d.iso)),1);
  const selEnts=dayEnts(selDay);
  const monthSecs=monthDays(calYear,calMonth).filter(d=>d.inMonth).reduce((s,d)=>s+daySecs(d.iso),0);

  const clockDur=()=>{const s=parseInt(manStart)*3600+parseInt(manStart.slice(3))*60,e2=parseInt(manEnd)*3600+parseInt(manEnd.slice(3))*60;return e2>s?secsHHMM(e2-s):"—";};

  const S = {
    subnav:{ display:"flex", background:T.bg2, borderRadius:10, padding:4, marginBottom:12, gap:4 },
    snb:  a=>({ flex:1, padding:"8px 4px", borderRadius:7, border:"none", background:a?T.bg0:T.bg2, color:a?T.ora:T.muted, fontWeight:a?700:400, cursor:"pointer", fontSize:11, fontFamily:"monospace", textAlign:"center" }),
    mhdr: { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 },
    mnavB:{ width:30, height:30, borderRadius:7, border:`1.5px solid ${T.bdr}`, background:"none", color:T.muted2, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
    dayH: { display:"grid", gridTemplateColumns:"22px repeat(7,1fr)", gap:2, marginBottom:3 },
    wkLbl:{ fontSize:8, fontFamily:"monospace", color:T.bdr2, textAlign:"center", padding:"3px 0" },
    mGrid:{ display:"flex", flexDirection:"column", gap:2, marginBottom:10 },
    mRow: { display:"grid", gridTemplateColumns:"22px repeat(7,1fr)", gap:2 },
    mWk:  { display:"flex", alignItems:"center", justifyContent:"center", fontSize:7, fontFamily:"monospace", color:T.bdr2 },
    mCell:(im,isT,isSel,isR)=>({ borderRadius:5, background:isSel?"#2e1a0d":isT?"#161e24":T.bg2, border:`1.5px solid ${isSel?T.ora:isT?T.bdr2:T.bdr}`, padding:"4px 2px 3px", cursor:"pointer", minHeight:46, display:"flex", flexDirection:"column", alignItems:"center", gap:1, opacity:im?1:0.25, transition:"all .12s" }),
    mNum:(isT,isSel,isR)=>({ fontSize:11, fontWeight:isT||isSel||isR?700:400, color:isSel?T.ora:isR?"#e05050":isT?T.ora:T.ink, lineHeight:1, fontFamily:"monospace" }),
    mBar:(h,c)=>({ width:"65%", height:`${Math.max(2,Math.round(h*26))}px`, background:c, borderRadius:2, transition:"height .3s" }),
    mHrs:{ fontSize:7, color:T.muted, fontFamily:"monospace" },
    mHol:{ fontSize:6, color:"#e05050", maxWidth:"100%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", padding:"0 1px", textAlign:"center" },
    ddPan:{ background:T.bg2, border:`1.5px solid ${T.ora}`, borderRadius:10, padding:"12px 14px", marginBottom:12 },
    ddTit:{ fontSize:11, fontWeight:700, color:T.ora, marginBottom:8, fontFamily:"monospace", textTransform:"uppercase" },
    eRow: { display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:`1px solid ${T.bdr}` },
    eDot: c=>({ width:7, height:7, borderRadius:"50%", background:c, flexShrink:0 }),
    eInfo:{ flex:1 },
    ePrj: { fontSize:12, fontWeight:600, color:T.ink },
    eMeta:{ fontSize:10, color:T.muted },
    eTime:{ fontFamily:"monospace", fontSize:12, fontWeight:700, color:T.ora, flexShrink:0 },
    eDel: { width:20, height:20, borderRadius:4, border:`1px solid ${T.bdr}`, background:"none", cursor:"pointer", fontSize:10, color:"#555", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
    tBox: { background:T.bg2, border:`1.5px solid ${T.bdr}`, borderRadius:12, padding:"20px 16px", marginBottom:12, textAlign:"center" },
    clock:r=>({ fontSize:44, fontWeight:800, fontFamily:"monospace", letterSpacing:2, color:r?T.ora:T.ink, lineHeight:1, marginBottom:4 }),
    cSub: { fontSize:9, color:T.muted, fontFamily:"monospace", letterSpacing:1, marginBottom:14 },
    tBtns:{ display:"flex", gap:8, justifyContent:"center", marginBottom:14 },
    bigB: (c,ok)=>({ padding:"11px 22px", borderRadius:9, border:"none", background:ok?c:T.bdr, color:ok?"#fff":"#555", fontSize:13, fontWeight:700, cursor:ok?"pointer":"not-allowed" }),
    smB:  c=>({ padding:"9px 14px", borderRadius:8, border:"none", background:c, color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }),
    modeRow:{ display:"flex", gap:0, marginBottom:10, border:`1.5px solid ${T.bdr}`, borderRadius:8, overflow:"hidden" },
    modeB:a=>({ flex:1, padding:"9px", textAlign:"center", background:a?T.ora:T.bg1, color:a?"#fff":T.muted, fontSize:11, fontWeight:a?700:400, cursor:"pointer", border:"none", fontFamily:"monospace" }),
    photoGrid:{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, marginBottom:10 },
    photoAdd:{ aspectRatio:"1", borderRadius:7, border:`1.5px dashed ${T.bdr2}`, background:T.bg0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:"pointer", gap:4 },
    photoThumb:{ aspectRatio:"1", borderRadius:7, overflow:"hidden", position:"relative", border:`1px solid ${T.bdr}` },
    photoDel:{ position:"absolute", top:3, right:3, width:18, height:18, borderRadius:"50%", background:"rgba(0,0,0,.7)", border:"none", color:"#fff", fontSize:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
    pStrip:{ display:"flex", gap:4, marginTop:5, flexWrap:"wrap" },
    pMini: { width:40, height:40, borderRadius:4, overflow:"hidden", border:`1px solid ${T.bdr}`, cursor:"pointer" },
    lbOver:{ position:"fixed", inset:0, background:"rgba(0,0,0,.92)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500, flexDirection:"column", gap:12 },
    lbImg: { maxWidth:"95vw", maxHeight:"82vh", borderRadius:10, objectFit:"contain" },
    lbClose:{ position:"fixed", top:16, right:16, width:34, height:34, borderRadius:"50%", background:T.bdr2, border:"none", color:T.ink, fontSize:16, cursor:"pointer" },
    statRow:{ display:"flex", gap:8, marginBottom:12 },
    stat:  c=>({ flex:1, background:T.bg2, border:`1.5px solid ${c}33`, borderRadius:9, padding:"10px 8px", textAlign:"center" }),
    sv:  c=>({ fontFamily:"monospace", fontSize:16, fontWeight:800, color:c, lineHeight:1 }),
    sl:    { fontSize:8, color:T.muted, marginTop:3, letterSpacing:1, textTransform:"uppercase", fontFamily:"monospace" },
    dur:   { background:"#1a2e1a", border:`1px solid ${T.grn}44`, borderRadius:6, padding:"5px 10px", fontSize:11, color:T.grn, fontFamily:"monospace", textAlign:"center", marginBottom:8 },
  };

  function handlePhotos(e){Array.from(e.target.files).forEach(file=>{const r=new FileReader();r.onload=ev=>setPhotos(p=>[...p,{id:uid(),url:ev.target.result,name:file.name}]);r.readAsDataURL(file);});e.target.value="";}

  return (
    <div>
      <div style={S.subnav}>
        <button style={S.snb(subView==="manad")}    onClick={()=>setSubView("manad")}>📅 Månad</button>
        <button style={S.snb(subView==="registrera")} onClick={()=>setSubView("registrera")}>⏱ Registrera</button>
      </div>

      {/* MÅNADSVY */}
      {subView==="manad" && (<>
        <div style={S.statRow}>
          <div style={S.stat(T.ora)}><div style={S.sv(T.ora)}>{secsHHMM(monthSecs)}</div><div style={S.sl}>Månaden</div></div>
          <div style={S.stat(T.grn)}><div style={S.sv(T.grn)}>{monthDays(calYear,calMonth).filter(d=>d.inMonth&&daySecs(d.iso)>0).length}</div><div style={S.sl}>Dagar</div></div>
        </div>
        <div style={S.mhdr}>
          <button style={S.mnavB} onClick={()=>{const d=new Date(calYear,calMonth-1,1);setCalYear(d.getFullYear());setCalMonth(d.getMonth());}}>‹</button>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:15,fontWeight:700,color:T.ink}}>{"Januari Februari Mars April Maj Juni Juli Augusti September Oktober November December".split(" ")[calMonth]} {calYear}</div>
          </div>
          <button style={S.mnavB} onClick={()=>{const d=new Date(calYear,calMonth+1,1);setCalYear(d.getFullYear());setCalMonth(d.getMonth());}}>›</button>
        </div>
        <div style={S.dayH}>
          <div style={S.wkLbl}>V</div>
          {DAYS_SV.map(d=><div key={d} style={{...S.wkLbl,fontSize:9,color:T.muted,textTransform:"uppercase"}}>{d}</div>)}
        </div>
        <div style={S.mGrid}>
          {weekRows.map(({week,days:rd})=>(
            <div key={week} style={S.mRow}>
              <div style={S.mWk}>{week}</div>
              {rd.map(({iso,inMonth})=>{
                const secs=daySecs(iso),isT=iso===todayISO(),isSel=iso===selDay,ents=dayEnts(iso);
                const topCol=ents.length>0?col(ents[0].projId):T.bdr;
                const dow=new Date(iso).getDay(),isR=!!(holidays[iso]||dow===0||dow===6);
                return (
                  <div key={iso} style={S.mCell(inMonth,isT,isSel,isR)} onClick={()=>setSelDay(iso)}>
                    <div style={S.mNum(isT,isSel,isR&&inMonth)}>{new Date(iso).getDate()}</div>
                    {holidays[iso]&&inMonth&&<div style={S.mHol}>{holidays[iso].split(" ")[0]}</div>}
                    {secs>0&&<><div style={S.mBar(secs/maxDay,topCol)}/><div style={S.mHrs}>{secsToH(secs)}h</div></>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div style={S.ddPan}>
          <div style={S.ddTit}>{new Date(selDay).toLocaleDateString("sv-SE",{weekday:"long",day:"numeric",month:"long"})}{daySecs(selDay)>0?` · ${secsHHMM(daySecs(selDay))}`:""}
          </div>
          {selEnts.length===0
            ? <div style={{textAlign:"center",color:T.muted,fontSize:12,padding:"8px 0",fontFamily:"monospace"}}>Ingen tid registrerad</div>
            : selEnts.map((e,i)=>(
              <div key={e.id} style={{paddingBottom:6,borderBottom:i!==selEnts.length-1?`1px solid ${T.bdr}`:"none",marginBottom:i!==selEnts.length-1?6:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={S.eDot(col(e.projId))}/>
                  <div style={S.eInfo}>
                    <div style={S.ePrj}>{pName(e.projId)}</div>
                    <div style={S.eMeta}>{e.startTime&&e.endTime?`${e.startTime}–${e.endTime} · `:""}{e.note}</div>
                  </div>
                  <div style={S.eTime}>{secsHHMM(e.secs)}</div>
                  <button style={S.eDel} onClick={()=>setEntries(es=>es.filter(x=>x.id!==e.id))}>✕</button>
                </div>
                {e.photos?.length>0&&<div style={S.pStrip}>{e.photos.map(ph=><div key={ph.id} style={S.pMini} onClick={()=>setLightbox(ph)}><img src={ph.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>)}</div>}
              </div>
            ))
          }
          <button style={{...cs.outBtn,fontSize:11,marginTop:8}} onClick={()=>{setManDate(selDay);setSubView("registrera");}}>+ Lägg till tid</button>
        </div>
        <button style={{...cs.grnBtn,width:"100%"}} onClick={()=>{const lines=projects.map(p=>{const s=entries.filter(e=>e.projId===p.id).reduce((x,e)=>x+e.secs,0);return s>0?`${p.name}: ${secsHHMM(s)}`:null;}).filter(Boolean);navigator.clipboard.writeText(`TIDRAPPORT\n\n${lines.join("\n")}\n\nTotalt: ${secsHHMM(entries.reduce((s,e)=>s+e.secs,0))}`).then(()=>alert("✓ Kopierad!"));}}>📋 Kopiera månadsrapport</button>
      </>)}

      {/* REGISTRERA */}
      {subView==="registrera" && (<>
        <div style={{...S.subnav,marginBottom:12}}>
          <button style={S.snb(subView==="timer")} onClick={()=>{}}>⏱ Timer</button>
          <button style={S.snb(subView==="manuell")} onClick={()=>{}}>✏️ Manuell</button>
        </div>
        {/* Timer */}
        <div style={S.tBox}>
          <div style={S.clock(running)}>{fmtTimer(elapsed)}</div>
          <div style={S.cSub}>{running?"● SPELAR IN":elapsed>0?"PAUSAD":"REDO"}</div>
          <div style={S.tBtns}>
            {!running&&elapsed===0&&<button style={S.bigB(T.ora,true)} onClick={startTimer}>▶ STARTA</button>}
            {running&&<button style={S.bigB(T.yel,true)} onClick={pauseTimer}>⏸ PAUSA</button>}
            {!running&&elapsed>0&&<><button style={S.smB(T.ora)} onClick={startTimer}>▶</button><button style={S.smB(T.grn)} onClick={saveTimer}>✓ Spara</button><button style={S.smB("#444")} onClick={()=>{clearInterval(tickRef.current);setRunning(false);setElapsed(0);}}>✕</button></>}
          </div>
          <div style={cs.selW}><select style={cs.sel} value={tProj} onChange={e=>setTProj(e.target.value)}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <textarea style={{...cs.ta,minHeight:44,marginTop:8}} placeholder="Anteckning..." value={tNote} onChange={e=>setTNote(e.target.value)} rows={2}/>
        </div>

        {/* Manuell */}
        <div style={cs.sec}>
          <div style={cs.secH}><span>✏️</span><div style={cs.secHT}>Manuell inmatning</div></div>
          <div style={cs.secB}>
            <div style={cs.g2}>
              <div><div style={cs.selW}><select style={cs.sel} value={manProj} onChange={e=>setManProj(e.target.value)}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div></div>
              <div><input style={cs.inp} type="date" value={manDate} onChange={e=>setManDate(e.target.value)}/></div>
            </div>
            <div style={S.modeRow}>
              <button style={S.modeB(manMode==="clock")} onClick={()=>setManMode("clock")}>🕐 Klockslag</button>
              <button style={S.modeB(manMode==="hours")} onClick={()=>setManMode("hours")}>⏱ Timmar</button>
            </div>
            {manMode==="clock"&&(
              <><div style={cs.g2}>
                <div><label style={cs.lbl}>Start</label><input style={cs.inp} type="time" value={manStart} onChange={e=>setManStart(e.target.value)}/></div>
                <div><label style={cs.lbl}>Slut</label><input style={cs.inp} type="time" value={manEnd} onChange={e=>setManEnd(e.target.value)}/></div>
              </div><div style={S.dur}>Varaktighet: {clockDur()}</div></>
            )}
            {manMode==="hours"&&(
              <div style={{display:"flex",alignItems:"center",border:`1.5px solid ${T.bdr}`,borderRadius:8,overflow:"hidden",background:T.bg0,marginBottom:10}}>
                <input style={{...cs.inp,border:"none",fontSize:20,fontWeight:700,color:T.ora,flex:1}} type="number" placeholder="8" value={manHours} onChange={e=>setManHours(e.target.value)} step="0.5"/>
                <span style={{padding:"0 12px",fontSize:11,color:T.muted,borderLeft:`1px solid ${T.bdr}`}}>tim</span>
              </div>
            )}
            <textarea style={{...cs.ta,minHeight:50,marginBottom:10}} placeholder="Vad gjordes?" value={manNote} onChange={e=>setManNote(e.target.value)} rows={2}/>
            <label style={cs.lbl}>Bilder (valfritt)</label>
            <input ref={photoRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={handlePhotos}/>
            <div style={S.photoGrid}>
              {photos.map(ph=>(
                <div key={ph.id} style={S.photoThumb}>
                  <img src={ph.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  <button style={S.photoDel} onClick={()=>setPhotos(p=>p.filter(x=>x.id!==ph.id))}>✕</button>
                </div>
              ))}
              {photos.length<6&&<div style={S.photoAdd} onClick={()=>photoRef.current?.click()}><span style={{fontSize:20,color:T.muted}}>📷</span><span style={{fontSize:9,color:T.muted,fontFamily:"monospace"}}>Lägg till</span></div>}
            </div>
            <button style={cs.btn(T.ora)} onClick={saveManual}>Spara tidspost</button>
          </div>
        </div>
      </>)}

      {lightbox&&<div style={S.lbOver} onClick={()=>setLightbox(null)}><button style={S.lbClose}>✕</button><img src={lightbox.url} alt="" style={S.lbImg} onClick={e=>e.stopPropagation()}/></div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODUL 4 – KVITTOSCANNING
// ══════════════════════════════════════════════════════════════════════════════
function Kvitton({ projects, receipts, setReceipts }) {
  const [view,       setView]      = useState("arkiv");
  const [photo,      setPhoto]     = useState(null);
  const [store,      setStore]     = useState("");
  const [date,       setDate]      = useState(todayISO());
  const [amount,     setAmount]    = useState("");
  const [moms,       setMoms]      = useState("");
  const [category,   setCategory]  = useState("material");
  const [projId,     setProjId]    = useState(projects[0]?.id||"");
  const [note,       setNote]      = useState("");
  const [saved,      setSaved]     = useState(false);
  const [filterProj, setFilterProj]= useState("all");
  const [filterCat,  setFilterCat] = useState("all");
  const [search,     setSearch]    = useState("");
  const [lightbox,   setLightbox]  = useState(null);
  const fileRef=useRef(null);

  function handlePhoto(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setPhoto({url:ev.target.result,name:f.name});r.readAsDataURL(f);e.target.value="";}
  function saveR(){
    if(!store.trim()||!amount)return;
    setReceipts(prev=>[{id:uid(),date,store:store.trim(),amount:parseFloat(amount),moms:parseFloat(moms)||0,category,projId,note:note.trim(),photo,rotEligible:category==="material",splits:[]},...prev]);
    setPhoto(null);setStore("");setAmount("");setMoms("");setNote("");setSaved(true);
    setTimeout(()=>{setSaved(false);setView("arkiv");},1200);
  }

  const col=id=>projColor(id,projects);
  const q=search.toLowerCase().trim();
  const filtered=receipts.filter(r=>{
    if(filterProj!=="all"&&r.projId!==filterProj) return false;
    if(filterCat!=="all"&&r.category!==filterCat)  return false;
    if(q&&![r.store,r.note,r.date].some(s=>(s||"").toLowerCase().includes(q))) return false;
    return true;
  });
  const totalAmt=filtered.reduce((s,r)=>s+r.amount,0);
  const totalMoms=filtered.reduce((s,r)=>s+r.moms,0);

  const S = {
    subnav:{ display:"flex", background:T.bg2, borderRadius:10, padding:4, marginBottom:12, gap:4 },
    snb:  a=>({ flex:1, padding:"8px", borderRadius:7, border:"none", background:a?T.bg0:T.bg2, color:a?T.ora:T.muted, fontWeight:a?700:400, cursor:"pointer", fontSize:12, textAlign:"center" }),
    rcard:{ background:T.bg2, border:`1.5px solid ${T.bdr}`, borderRadius:10, marginBottom:8, overflow:"hidden" },
    rcTop:{ padding:"11px 14px", display:"flex", gap:10, alignItems:"flex-start" },
    rcPh: { width:48, height:48, borderRadius:7, overflow:"hidden", flexShrink:0, background:T.bg1, border:`1px solid ${T.bdr}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" },
    rcInfo:{ flex:1, minWidth:0 },
    rcSt: { fontSize:13, fontWeight:700, color:T.ink, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
    rcMt: { fontSize:11, color:T.muted },
    rcAm: { textAlign:"right", flexShrink:0 },
    rcAv: { fontFamily:"monospace", fontSize:15, fontWeight:800, color:T.ora },
    rcAs: { fontSize:10, color:T.muted, fontFamily:"monospace" },
    rcBot:{ padding:"7px 14px", borderTop:`1px solid ${T.bdr}`, display:"flex", gap:6, alignItems:"center" },
    catB: id=>({ display:"inline-flex", alignItems:"center", gap:4, background:`${CAT_COLORS[id]||T.muted}22`, borderRadius:12, padding:"3px 8px", fontSize:10, color:CAT_COLORS[id]||T.muted, fontFamily:"monospace" }),
    pzWrap:{ width:"100%", aspectRatio:"4/3", maxHeight:220, borderRadius:12, border:`2px dashed ${photo?T.ora:T.bdr2}`, background:photo?"#1a1208":T.bg2, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:"pointer", marginBottom:12, overflow:"hidden", position:"relative" },
    pzChg:{ position:"absolute", bottom:8, right:8, padding:"4px 10px", borderRadius:6, border:"none", background:"rgba(0,0,0,.7)", color:"#fff", fontSize:11, cursor:"pointer" },
    catGrid:{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, marginBottom:12 },
    catBt:a=>({ padding:"8px 4px", borderRadius:8, border:`1.5px solid ${a?T.ora:T.bdr}`, background:a?"#2e1a0d":T.bg1, color:a?T.ora:T.muted, fontSize:11, cursor:"pointer", textAlign:"center", fontFamily:"monospace" }),
    statRow:{ display:"flex", gap:8, marginBottom:12 },
    stat:  c=>({ flex:1, background:T.bg2, border:`1.5px solid ${c}33`, borderRadius:9, padding:"10px 8px", textAlign:"center" }),
    sv:  c=>({ fontFamily:"monospace", fontSize:15, fontWeight:800, color:c, lineHeight:1 }),
    sl:    { fontSize:8, color:T.muted, marginTop:3, letterSpacing:1, textTransform:"uppercase", fontFamily:"monospace" },
    lbOv: { position:"fixed", inset:0, background:"rgba(0,0,0,.92)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500, flexDirection:"column", gap:12 },
    lbImg:{ maxWidth:"95vw", maxHeight:"82vh", borderRadius:10, objectFit:"contain" },
    lbCls:{ position:"fixed", top:16, right:16, width:34, height:34, borderRadius:"50%", background:T.bdr2, border:"none", color:T.ink, fontSize:16, cursor:"pointer" },
  };

  const catIcon=id=>CATEGORIES.find(c=>c.id===id)?.icon||"📦";
  const catLabel=id=>CATEGORIES.find(c=>c.id===id)?.label||id;
  const pName=id=>projects.find(p=>p.id===id)?.name||"Okänt";

  // Highlight matching text
  function Highlight({text}) {
    if(!q||!text) return <span>{text}</span>;
    const idx=text.toLowerCase().indexOf(q);
    if(idx===-1) return <span>{text}</span>;
    return <span>{text.slice(0,idx)}<mark style={{background:`${T.ora}44`,color:T.ink,borderRadius:2,padding:"0 1px"}}>{text.slice(idx,idx+q.length)}</mark>{text.slice(idx+q.length)}</span>;
  }

  return (
    <div>
      <div style={S.subnav}>
        <button style={S.snb(view==="arkiv")} onClick={()=>setView("arkiv")}>🗂 Arkiv</button>
        <button style={S.snb(view==="scanna")} onClick={()=>{setView("scanna");setSaved(false);}}>📷 Scanna</button>
      </div>

      {view==="arkiv"&&(<>
        <div style={S.statRow}>
          <div style={S.stat(T.ora)}><div style={S.sv(T.ora)}>{fmtKr(totalAmt)}</div><div style={S.sl}>Totalt</div></div>
          <div style={S.stat(T.muted2)}><div style={S.sv(T.muted2)}>{fmtKr(totalMoms)}</div><div style={S.sl}>Moms</div></div>
          <div style={S.stat(T.grn)}><div style={S.sv(T.grn)}>{filtered.length}</div><div style={S.sl}>Kvitton</div></div>
        </div>

        {/* Sökfält */}
        <div style={{display:"flex",alignItems:"center",border:`1.5px solid ${search?T.ora:T.bdr}`,borderRadius:9,overflow:"hidden",background:T.bg2,marginBottom:8,transition:"border-color .15s"}}>
          <span style={{padding:"0 12px",fontSize:16,color:T.muted,flexShrink:0}}>🔍</span>
          <input
            style={{flex:1,border:"none",outline:"none",padding:"10px 4px",background:"transparent",fontSize:14,color:T.ink}}
            placeholder="Sök butik, anteckning, datum..."
            value={search}
            onChange={e=>setSearch(e.target.value)}
          />
          {search&&<button onClick={()=>setSearch("")} style={{padding:"0 12px",border:"none",background:"none",color:T.muted,fontSize:16,cursor:"pointer",flexShrink:0}}>✕</button>}
        </div>

        {/* Filter: projekt + kategori */}
        <div style={{display:"flex",gap:6,marginBottom:12}}>
          <div style={{...cs.selW,flex:1}}><select style={cs.sel} value={filterProj} onChange={e=>setFilterProj(e.target.value)}>
            <option value="all">Alla projekt</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select></div>
          <div style={{...cs.selW,flex:1}}><select style={cs.sel} value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
            <option value="all">Alla kategorier</option>{CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
          </select></div>
        </div>

        {/* Sökresultatinfo */}
        {(search||filterProj!=="all"||filterCat!=="all")&&(
          <div style={{fontSize:11,color:T.muted,fontFamily:"monospace",marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
            <span>{filtered.length} av {receipts.length} kvitton</span>
            {(search||filterProj!=="all"||filterCat!=="all")&&<button onClick={()=>{setSearch("");setFilterProj("all");setFilterCat("all");}} style={{border:`1px solid ${T.bdr}`,borderRadius:10,background:"none",color:T.muted,fontSize:10,cursor:"pointer",padding:"2px 8px"}}>Rensa filter</button>}
          </div>
        )}
        {filtered.map(r=>(
          <div key={r.id} style={S.rcard}>
            <div style={S.rcTop}>
              <div style={S.rcPh} onClick={()=>r.photo&&setLightbox(r.photo)}>
                {r.photo?<img src={r.photo.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:20,opacity:.3}}>🧾</span>}
              </div>
              <div style={S.rcInfo}>
                <div style={S.rcSt}><Highlight text={r.store}/></div>
                <div style={S.rcMt}><Highlight text={r.date}/> · {pName(r.projId)}</div>
                {r.note&&<div style={{fontSize:11,color:T.muted2,marginTop:2}}><Highlight text={r.note}/></div>}
              </div>
              <div style={S.rcAm}>
                <div style={S.rcAv}>{fmtKr(r.amount)}</div>
                <div style={S.rcAs}>moms {fmtKr(r.moms)}</div>
              </div>
            </div>
            <div style={S.rcBot}>
              <div style={S.catB(r.category)}>{catIcon(r.category)} {catLabel(r.category)}</div>
              <button style={{...cs.outBtn,marginLeft:"auto",padding:"3px 10px",fontSize:10}} onClick={()=>setReceipts(rs=>rs.filter(x=>x.id!==r.id))}>🗑</button>
            </div>
          </div>
        ))}
        {filtered.length===0&&(
          <div style={{textAlign:"center",color:T.muted,padding:"40px 0",fontFamily:"monospace",fontSize:12}}>
            <div style={{fontSize:32,marginBottom:12}}>🔍</div>
            {search ? `Inga kvitton matchar "${search}"` : "Inga kvitton"}<br/>
            {search&&<button onClick={()=>setSearch("")} style={{marginTop:10,padding:"5px 14px",borderRadius:8,border:`1px solid ${T.bdr}`,background:"none",color:T.muted,fontSize:11,cursor:"pointer"}}>Rensa sökning</button>}
          </div>
        )}
      </>)}

      {view==="scanna"&&(<>
        {saved&&<div style={{background:"#0e2016",border:`1.5px solid ${T.grn}`,borderRadius:10,padding:"12px",marginBottom:12,textAlign:"center",color:T.grn,fontWeight:700}}>✓ Kvitto sparat!</div>}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handlePhoto}/>
        <div style={S.pzWrap} onClick={()=>fileRef.current?.click()}>
          {photo?(<><img src={photo.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/><button style={S.pzChg} onClick={e=>{e.stopPropagation();fileRef.current?.click();}}>Byt</button></>)
          :(<><div style={{fontSize:36,opacity:.4}}>📷</div><div style={{fontSize:11,color:T.muted,fontFamily:"monospace"}}>TRYCK FÖR ATT FOTOGRAFERA</div></>)}
        </div>
        <div style={cs.sec}>
          <div style={cs.secB}>
            <div style={cs.g2}>
              <div><label style={cs.lbl}>Butik</label><input style={cs.inp} placeholder="Byggmax..." value={store} onChange={e=>setStore(e.target.value)}/></div>
              <div><label style={cs.lbl}>Datum</label><input style={cs.inp} type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
              <div><label style={cs.lbl}>Belopp inkl. moms</label>
                <div style={{display:"flex",alignItems:"center",border:`1.5px solid ${T.bdr}`,borderRadius:8,overflow:"hidden",background:T.bg0}}>
                  <input style={{...cs.inp,border:"none",fontSize:18,fontWeight:700,color:T.ora,flex:1}} type="number" placeholder="0" value={amount} onChange={e=>{setAmount(e.target.value);if(e.target.value&&!moms)setMoms((parseFloat(e.target.value)*0.2).toFixed(0));}}/>
                  <span style={{padding:"0 8px",fontSize:11,color:T.muted,borderLeft:`1px solid ${T.bdr}`}}>kr</span>
                </div>
              </div>
              <div><label style={cs.lbl}>Moms</label>
                <div style={{display:"flex",alignItems:"center",border:`1.5px solid ${T.bdr}`,borderRadius:8,overflow:"hidden",background:T.bg0}}>
                  <input style={{...cs.inp,border:"none",fontSize:18,fontWeight:700,color:T.muted2,flex:1}} type="number" placeholder="0" value={moms} onChange={e=>setMoms(e.target.value)}/>
                  <span style={{padding:"0 8px",fontSize:11,color:T.muted,borderLeft:`1px solid ${T.bdr}`}}>kr</span>
                </div>
              </div>
            </div>
            <label style={cs.lbl}>Projekt</label>
            <div style={{...cs.selW,marginBottom:12}}><select style={cs.sel} value={projId} onChange={e=>setProjId(e.target.value)}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <label style={cs.lbl}>Kategori</label>
            <div style={S.catGrid}>
              {CATEGORIES.map(c=><div key={c.id} style={S.catBt(category===c.id)} onClick={()=>setCategory(c.id)}><div style={{fontSize:16,marginBottom:2}}>{c.icon}</div>{c.label}</div>)}
            </div>
            <textarea style={{...cs.ta,minHeight:50,marginBottom:12}} placeholder="Anteckning..." value={note} onChange={e=>setNote(e.target.value)} rows={2}/>
            <button style={cs.btn(saved?T.grn:T.ora, store.trim().length>0&&amount!=="")} onClick={()=>store.trim()&&amount&&saveR()}>{saved?"✓ SPARAT!":"SPARA KVITTO"}</button>
          </div>
        </div>
      </>)}

      {lightbox&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,flexDirection:"column",gap:12}} onClick={()=>setLightbox(null)}><button style={S.lbCls}>✕</button><img src={lightbox.url} alt="" style={S.lbImg} onClick={e=>e.stopPropagation()}/></div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODUL 5 – EXPORT & ROT
// ══════════════════════════════════════════════════════════════════════════════
function ExportROT({ projects, entries, receipts }) {
  const [selProj, setSelProj] = useState(projects[0]?.id||"");
  const [tab,     setTab]     = useState("rapport");
  const [timpris, setTimpris] = useState(650);
  const [rotPct,  setRotPct]  = useState(30);
  const [preview, setPreview] = useState(false);

  const proj=projects.find(p=>p.id===selProj)||projects[0];
  const pEntries=entries.filter(e=>e.projId===selProj);
  const pReceipts=receipts.filter(r=>r.projId===selProj);

  const totalSecs=pEntries.reduce((s,e)=>s+e.secs,0);
  const arbeteExkl=Math.round(totalSecs/3600*timpris);
  const matExkl=pReceipts.reduce((s,r)=>s+(r.amount-r.moms),0);
  const matMoms=pReceipts.reduce((s,r)=>s+r.moms,0);
  const totExkl=arbeteExkl+matExkl, totMoms=Math.round(arbeteExkl*0.25)+matMoms, totInkl=totExkl+totMoms;
  const rotMat=pReceipts.filter(r=>r.rotEligible).reduce((s,r)=>s+(r.amount-r.moms),0);
  const rotBase=arbeteExkl+rotMat, rotAvdrag=Math.min(Math.round(rotBase*(rotPct/100)),50000);
  const efterROT=totInkl-rotAvdrag;

  function copyText(){
    const t=tab==="rapport"
      ?`PROJEKTRAPPORT – ${proj?.name}\nKund: ${proj?.customer}\n\nARBETE\n${pEntries.map(e=>`${e.date} ${e.startTime||""}${e.endTime?"-"+e.endTime:""} ${secsToH(e.secs)}h ${e.note}`).join("\n")}\nTotalt arbete: ${fmtKr(arbeteExkl)}\n\nMATERIAL\n${pReceipts.map(r=>`${r.date} ${r.store} ${fmtKr(r.amount-r.moms)}`).join("\n")}\n\nTOTALT inkl. moms: ${fmtKr(totInkl)}`
      :`ROT-UNDERLAG\nKund: ${proj?.customer}\nAdress: ${proj?.address}\n\nArbetskostnad: ${fmtKr(arbeteExkl)}\nROT-material: ${fmtKr(rotMat)}\nROT-avdrag ${rotPct}%: ${fmtKr(rotAvdrag)}\n\nFaktura: ${fmtKr(totInkl)}\nKunden betalar: ${fmtKr(efterROT)}`;
    navigator.clipboard.writeText(t).then(()=>alert("✓ Kopierat!"));
  }

  const S = {
    subnav:{ display:"flex", background:T.bg2, borderRadius:10, padding:4, marginBottom:12, gap:4 },
    snb:  a=>({ flex:1, padding:"8px", borderRadius:7, border:"none", background:a?T.bg0:T.bg2, color:a?T.ora:T.muted, fontWeight:a?700:400, cursor:"pointer", fontSize:12, textAlign:"center" }),
    trow: (last)=>({ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:!last?`1px solid ${T.bdr}`:"none", fontSize:13 }),
    tlbl: { color:T.muted2 },
    tval: { fontFamily:"monospace", fontWeight:600, color:T.ink },
    tbig: { display:"flex", justifyContent:"space-between", padding:"10px 0 4px", fontSize:17, fontWeight:700, borderTop:`2px solid ${T.ink}` },
    rbox: { background:"#0e2016", border:`1.5px solid ${T.grn}44`, borderRadius:10, padding:"14px", marginBottom:12 },
    rrow: (last)=>({ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:!last?`1px solid ${T.bdr}`:"none", fontSize:13 }),
    rbig: { display:"flex", justifyContent:"space-between", padding:"10px 0 0", fontSize:18, fontWeight:800, color:T.grn },
    pvOv: { position:"fixed", inset:0, background:"rgba(0,0,0,.92)", zIndex:300, overflowY:"auto", padding:"20px 12px 80px" },
    pvDoc:{ maxWidth:560, margin:"0 auto", background:"#fff", borderRadius:10, padding:"28px 24px", color:"#111", fontFamily:"Georgia,serif" },
    pvPrint:{ position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)", padding:"12px 28px", background:T.ora, color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer" },
    pvCls:{ position:"fixed", top:16, right:16, width:36, height:36, borderRadius:"50%", background:T.bdr2, border:"none", color:T.ink, fontSize:18, cursor:"pointer" },
  };

  return (
    <div>
      <div style={cs.sec}>
        <div style={cs.secH}><span>🏗</span><div style={cs.secHT}>Välj projekt</div></div>
        <div style={cs.secB}>
          <div style={cs.selW}><select style={cs.sel} value={selProj} onChange={e=>setSelProj(e.target.value)}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          {proj&&<div style={{fontSize:12,color:T.muted,marginTop:8}}>{proj.customer} · {proj.address}</div>}
        </div>
      </div>

      <div style={S.subnav}>
        <button style={S.snb(tab==="rapport")} onClick={()=>setTab("rapport")}>📄 Rapport</button>
        <button style={S.snb(tab==="rot")}     onClick={()=>setTab("rot")}>🏠 ROT</button>
      </div>

      {tab==="rapport"&&(<>
        <div style={cs.sec}>
          <div style={cs.secH}><span>⚙️</span><div style={cs.secHT}>Timpris</div></div>
          <div style={cs.secB}>
            <div style={{display:"flex",alignItems:"center",border:`1.5px solid ${T.bdr}`,borderRadius:8,overflow:"hidden",background:T.bg0}}>
              <input style={{...cs.inp,border:"none",fontSize:20,fontWeight:700,color:T.ora,flex:1}} type="number" value={timpris} onChange={e=>setTimpris(+e.target.value)}/>
              <span style={{padding:"0 12px",fontSize:11,color:T.muted,borderLeft:`1px solid ${T.bdr}`}}>kr/h</span>
            </div>
          </div>
        </div>
        <div style={cs.sec}>
          <div style={cs.secH}><span>⏱</span><div style={cs.secHT}>Arbetstid – {secsToH(totalSecs)} h</div></div>
          <div style={cs.secB}>
            {pEntries.map((e,i)=><div key={e.id} style={{...S.trow(i===pEntries.length-1)}}><span style={S.tlbl}>{e.date} · {e.note}</span><span style={{fontFamily:"monospace",color:T.ora}}>{secsToH(e.secs)} h</span></div>)}
            <div style={{...S.trow(true),fontWeight:700,marginTop:4}}><span style={S.tlbl}>{secsToH(totalSecs)} h × {fmtKr(timpris)}/h</span><span style={{color:T.ora,fontFamily:"monospace"}}>{fmtKr(arbeteExkl)}</span></div>
          </div>
        </div>
        <div style={cs.sec}>
          <div style={cs.secH}><span>🧱</span><div style={cs.secHT}>Material</div></div>
          <div style={cs.secB}>
            {pReceipts.map((r,i)=><div key={r.id} style={{...S.trow(i===pReceipts.length-1)}}><span style={S.tlbl}>{r.store} · {r.note}</span><span style={{fontFamily:"monospace",color:T.ora}}>{fmtKr(r.amount-r.moms)}</span></div>)}
          </div>
        </div>
        <div style={cs.sec}>
          <div style={cs.secH}><span>🧾</span><div style={cs.secHT}>Sammanställning</div></div>
          <div style={cs.secB}>
            <div style={S.trow(false)}><span style={S.tlbl}>Arbete exkl. moms</span><span style={S.tval}>{fmtKr(arbeteExkl)}</span></div>
            <div style={S.trow(false)}><span style={S.tlbl}>Material exkl. moms</span><span style={S.tval}>{fmtKr(matExkl)}</span></div>
            <div style={{...S.trow(false),color:T.muted,fontSize:12}}><span>Moms 25%</span><span style={{fontFamily:"monospace"}}>{fmtKr(totMoms)}</span></div>
            <div style={S.tbig}><span>Totalt inkl. moms</span><span style={{color:T.ora,fontFamily:"monospace"}}>{fmtKr(totInkl)}</span></div>
          </div>
        </div>
      </>)}

      {tab==="rot"&&(<>
        <div style={cs.sec}>
          <div style={cs.secH}><span>⚙️</span><div style={cs.secHT}>ROT-procent</div></div>
          <div style={cs.secB}>
            <div style={{display:"flex",gap:8}}>
              {[30,50].map(p=><button key={p} onClick={()=>setRotPct(p)} style={{flex:1,padding:"9px",borderRadius:8,border:`1.5px solid ${rotPct===p?T.grn:T.bdr}`,background:rotPct===p?"#0e2016":T.bg1,color:rotPct===p?T.grn:T.muted,fontSize:13,fontWeight:700,cursor:"pointer"}}>{p}%</button>)}
            </div>
          </div>
        </div>
        <div style={S.rbox}>
          <div style={{fontFamily:"monospace",fontSize:10,letterSpacing:2,textTransform:"uppercase",color:T.grn,marginBottom:12}}>ROT-BERÄKNING</div>
          <div style={S.rrow(false)}><span style={{color:T.muted2}}>Arbete exkl. moms</span><span style={{fontFamily:"monospace",fontWeight:600}}>{fmtKr(arbeteExkl)}</span></div>
          <div style={S.rrow(false)}><span style={{color:T.muted2}}>ROT-material</span><span style={{fontFamily:"monospace",fontWeight:600}}>{fmtKr(rotMat)}</span></div>
          <div style={{...S.rrow(false),color:T.grn}}><span>ROT-avdrag {rotPct}%</span><span style={{fontWeight:700,fontFamily:"monospace"}}>{fmtKr(rotAvdrag)}</span></div>
          <div style={{height:1,background:`${T.grn}33`,margin:"8px 0"}}/>
          <div style={S.rrow(true)}><span style={{color:T.muted2}}>Faktura inkl. moms</span><span style={{fontFamily:"monospace"}}>{fmtKr(totInkl)}</span></div>
          <div style={S.rbig}><span>Kunden betalar</span><span>{fmtKr(efterROT)}</span></div>
          <div style={{fontSize:10,color:`${T.grn}88`,marginTop:8,fontFamily:"monospace"}}>ROT-avdrag begärs av utföraren hos Skatteverket.</div>
        </div>
      </>)}

      <button style={cs.btn(T.ink)} onClick={()=>setPreview(true)}>🖨 Förhandsgranska & Skriv ut</button>
      <button style={{...cs.outBtn,width:"100%",marginBottom:8}} onClick={copyText}>📋 Kopiera som text</button>

      {preview&&(
        <div style={S.pvOv}>
          <button style={S.pvCls} onClick={()=>setPreview(false)}>✕</button>
          <div style={S.pvDoc}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:20,borderBottom:"2px solid #111",paddingBottom:14}}>
              <div><div style={{fontSize:22,fontWeight:700}}>{tab==="rot"?"ROT-UNDERLAG":"PROJEKTRAPPORT"}</div><div style={{fontSize:13,color:"#555",marginTop:4}}>{proj?.name}</div><div style={{fontSize:11,color:"#888"}}>Datum: {todayISO()}</div></div>
              <div style={{textAlign:"right",fontSize:11,color:"#555"}}><div style={{fontWeight:700,color:"#111",marginBottom:3}}>{COMPANY.name}</div><div>{COMPANY.orgnr}</div><div>{COMPANY.email}</div></div>
            </div>
            <div style={{marginBottom:16}}><div style={{fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"#888",marginBottom:6}}>Kund</div><div style={{fontWeight:700}}>{proj?.customer}</div><div style={{fontSize:12,color:"#555"}}>{proj?.address}</div></div>
            {tab==="rapport"&&(<>
              <div style={{marginBottom:14}}><div style={{fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"#888",marginBottom:6}}>Arbetstid</div>{pEntries.map(e=><div key={e.id} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"3px 0",borderBottom:"1px solid #f0f0f0"}}><span>{e.date} · {e.note}</span><span>{secsToH(e.secs)} h</span></div>)}<div style={{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:600,padding:"6px 0"}}><span>Totalt {secsToH(totalSecs)} h × {fmtKr(timpris)}/h</span><span>{fmtKr(arbeteExkl)}</span></div></div>
              <div style={{marginBottom:14}}><div style={{fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"#888",marginBottom:6}}>Material</div>{pReceipts.map(r=><div key={r.id} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"3px 0",borderBottom:"1px solid #f0f0f0"}}><span>{r.store} · {r.note}</span><span>{fmtKr(r.amount-r.moms)}</span></div>)}</div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:15,fontWeight:700,borderTop:"2px solid #111",paddingTop:10}}><span>Totalt inkl. moms</span><span>{fmtKr(totInkl)}</span></div>
            </>)}
            {tab==="rot"&&(<>
              <div style={{background:"#e8f5ec",borderRadius:8,padding:"14px"}}><div style={{fontWeight:700,color:"#2a6e4a",marginBottom:8}}>ROT-avdragsberäkning</div><div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"3px 0"}}><span>Arbete exkl. moms</span><span>{fmtKr(arbeteExkl)}</span></div><div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"3px 0"}}><span>ROT-berättigat material</span><span>{fmtKr(rotMat)}</span></div><div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"3px 0"}}><span>ROT-avdrag {rotPct}%</span><span>-{fmtKr(rotAvdrag)}</span></div><div style={{display:"flex",justifyContent:"space-between",fontSize:16,fontWeight:700,color:"#2a6e4a",borderTop:"1.5px solid #a8d8b8",paddingTop:8,marginTop:6}}><span>Kunden betalar</span><span>{fmtKr(efterROT)}</span></div></div>
            </>)}
            <div style={{marginTop:36,paddingTop:14,borderTop:"1px solid #ddd",display:"flex",gap:40}}><div style={{flex:1}}><div style={{fontSize:11,color:"#888",marginBottom:20}}>Utförarens underskrift</div><div style={{borderBottom:"1px solid #000",width:"80%"}}/><div style={{fontSize:11,color:"#555",marginTop:4}}>{COMPANY.name}</div></div><div style={{flex:1}}><div style={{fontSize:11,color:"#888",marginBottom:20}}>Kundens underskrift</div><div style={{borderBottom:"1px solid #000",width:"80%"}}/><div style={{fontSize:11,color:"#555",marginTop:4}}>{proj?.customer}</div></div></div>
          </div>
          <button style={S.pvPrint} onClick={()=>window.print()}>🖨 Skriv ut / PDF</button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// APP SHELL
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [module,   setModule]   = useState("kalkyl");
  const [projects, setProjects] = useState(INIT_PROJECTS);
  const [entries,  setEntries]  = useState(INIT_ENTRIES);
  const [receipts, setReceipts] = useState(INIT_RECEIPTS);

  const MODULES = [
    {id:"kalkyl",  label:"Kalkyl",  icon:"📐"},
    {id:"offert",  label:"Offert",  icon:"📝"},
    {id:"tid",     label:"Tid",     icon:"⏱"},
    {id:"kvitto",  label:"Kvitto",  icon:"🧾"},
    {id:"export",  label:"Export",  icon:"📄"},
  ];

  const S = {
    app:   { fontFamily:"system-ui,sans-serif", background:T.bg0, minHeight:"100vh", color:T.ink, display:"flex", flexDirection:"column" },
    hdr:   { background:T.bg1, borderBottom:`1px solid ${T.bdr}`, padding:"12px 18px", display:"flex", alignItems:"center", gap:12, flexShrink:0 },
    logo:  { fontFamily:"monospace", fontSize:11, letterSpacing:3, textTransform:"uppercase", color:T.muted2 },
    logoB: { color:T.ora, fontWeight:700 },
    badge: { marginLeft:"auto", background:T.bg2, border:`1px solid ${T.bdr}`, borderRadius:20, padding:"3px 10px", fontSize:10, color:T.muted, fontFamily:"monospace" },
    body:  { flex:1, overflowY:"auto", padding:"16px 14px 100px", maxWidth:640, margin:"0 auto", width:"100%" },
    tab:   { position:"fixed", bottom:0, left:0, right:0, background:T.bg1, borderTop:`1px solid ${T.bdr}`, display:"flex", zIndex:100, paddingBottom:"env(safe-area-inset-bottom,0)" },
    tb:  a => ({ flex:1, padding:"10px 4px 12px", textAlign:"center", cursor:"pointer", border:"none", background:"none", transition:"all .15s" }),
    tbi: a => ({ fontSize:18, display:"block", marginBottom:2 }),
    tbl: a => ({ fontSize:9, fontFamily:"monospace", letterSpacing:.5, color: a?T.ora:T.muted, fontWeight: a?700:400, display:"block", textTransform:"uppercase" }),
    tbLine: a => ({ width:20, height:2, background:a?T.ora:"transparent", borderRadius:1, margin:"0 auto 4px", transition:"all .2s" }),
  };

  return (
    <div style={S.app}>
      <div style={S.hdr}>
        <div style={S.logo}><span style={S.logoB}>BYGG</span>KALKYLEN</div>
        <div style={S.badge}>MVP v1.0</div>
      </div>

      <div style={S.body}>
        {module==="kalkyl" && <Kalkylator />}
        {module==="offert" && <AIOffert projects={projects} />}
        {module==="tid"    && <Tidrapport projects={projects} entries={entries} setEntries={setEntries} />}
        {module==="kvitto" && <Kvitton projects={projects} receipts={receipts} setReceipts={setReceipts} />}
        {module==="export" && <ExportROT projects={projects} entries={entries} receipts={receipts} />}
      </div>

      <div style={S.tab}>
        {MODULES.map(m=>(
          <button key={m.id} style={S.tb(module===m.id)} onClick={()=>setModule(m.id)}>
            <div style={S.tbLine(module===m.id)}/>
            <span style={S.tbi(module===m.id)}>{m.icon}</span>
            <span style={S.tbl(module===m.id)}>{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
