import { useState, useRef } from "react";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtKr  = n => Number(n||0).toLocaleString("sv-SE",{minimumFractionDigits:2,maximumFractionDigits:2}) + " kr";
const fmtKr0 = n => Number(n||0).toLocaleString("sv-SE",{minimumFractionDigits:0,maximumFractionDigits:0}) + " kr";
const fmtDate = iso => new Date(iso).toLocaleDateString("sv-SE",{day:"numeric",month:"long",year:"numeric"});
const todayISO = () => new Date().toISOString().slice(0,10);
const pad = n => String(n).padStart(2,"0");
const secsToH = s => (s/3600).toFixed(1);

const PROJECTS = [
  { id:"p1", name:"Badrumsrenovering Karlsson", customer:"Anna Karlsson", address:"Storgatan 12, 413 01 Göteborg", orgNr:"", pnr:"19620312-4521", startDate:"2026-04-15", endDate:"2026-05-20" },
  { id:"p2", name:"Bottenplatta Lindgren",       customer:"Erik Lindgren",  address:"Björkvägen 4, 433 30 Partille",  orgNr:"", pnr:"19780904-2233", startDate:"2026-04-20", endDate:"2026-05-28" },
  { id:"p3", name:"Köksrenovering Svensson",     customer:"Maria Svensson", address:"Tallgatan 8, 421 44 Västra Frölunda", orgNr:"", pnr:"19551128-7712", startDate:"2026-05-01", endDate:"2026-06-15" },
];

const COMPANY = { name:"Hantverksfirman AB", orgnr:"556123-4567", address:"Verkstadsgatan 10, 418 78 Göteborg", phone:"031-123 45 67", email:"info@hantverksfirman.se", fSkatt:true, momsreg:true };

// Seed data
const SEED_ENTRIES = [
  { id:"e1", projId:"p1", date:"2026-04-15", startTime:"07:00", endTime:"15:30", secs:8.5*3600, note:"Rivning och demontering" },
  { id:"e2", projId:"p1", date:"2026-04-17", startTime:"07:00", endTime:"16:00", secs:9*3600,   note:"Tätskikt och membran" },
  { id:"e3", projId:"p1", date:"2026-04-22", startTime:"07:30", endTime:"15:00", secs:7.5*3600, note:"Plattsättning" },
  { id:"e4", projId:"p1", date:"2026-05-02", startTime:"08:00", endTime:"14:00", secs:6*3600,   note:"Sanitetsporslin" },
  { id:"e5", projId:"p2", date:"2026-04-20", startTime:"07:00", endTime:"16:30", secs:9.5*3600, note:"Schaktning och formning" },
  { id:"e6", projId:"p2", date:"2026-04-22", startTime:"07:00", endTime:"15:00", secs:8*3600,   note:"Armering" },
  { id:"e7", projId:"p2", date:"2026-04-25", startTime:"06:30", endTime:"14:00", secs:7.5*3600, note:"Gjutning" },
  { id:"e8", projId:"p3", date:"2026-05-05", startTime:"07:00", endTime:"16:00", secs:9*3600,   note:"Rivning kök" },
  { id:"e9", projId:"p3", date:"2026-05-08", startTime:"07:30", endTime:"15:30", secs:8*3600,   note:"Snickeri skåpstommar" },
];

const SEED_RECEIPTS = [
  { id:"r1", projId:"p1", date:"2026-04-16", store:"Byggmax",   amount:2840, moms:568,  category:"material",  note:"Kakel och tätskikt", rotEligible:true  },
  { id:"r2", projId:"p1", date:"2026-04-16", store:"Ahlsell",   amount:1890, moms:378,  category:"material",  note:"VVS-delar",           rotEligible:true  },
  { id:"r3", projId:"p1", date:"2026-04-18", store:"Hyrcenter", amount:560,  moms:112,  category:"uthyrning", note:"Borrmaskin 2 dagar",  rotEligible:false },
  { id:"r4", projId:"p2", date:"2026-04-21", store:"Byggmax",   amount:5200, moms:1040, category:"material",  note:"Betong och armering",  rotEligible:false },
  { id:"r5", projId:"p2", date:"2026-04-23", store:"OKQ8",      amount:480,  moms:96,   category:"transport", note:"Diesel",               rotEligible:false },
  { id:"r6", projId:"p3", date:"2026-05-06", store:"IKEA",      amount:8900, moms:1780, category:"material",  note:"Köksskåp",             rotEligible:true  },
  { id:"r7", projId:"p3", date:"2026-05-06", store:"Ahlsell",   amount:1200, moms:240,  category:"material",  note:"Bänkskiva beslag",     rotEligible:true  },
];

const TIMPRIS = 650;
const ROT_PCT = 0.30;
const ROT_MAX_PER_PERSON = 50000;

// ── Main ─────────────────────────────────────────────────────────────────────
export default function ExportROT() {
  const [selProj,   setSelProj]   = useState("p1");
  const [tab,       setTab]       = useState("rapport");  // rapport | rot
  const [timpris,   setTimpris]   = useState(TIMPRIS);
  const [rotPct,    setRotPct]    = useState(30);
  const [pnr,       setPnr]       = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const proj     = PROJECTS.find(p => p.id === selProj);
  const entries  = SEED_ENTRIES.filter(e => e.projId === selProj);
  const receipts = SEED_RECEIPTS.filter(r => r.projId === selProj);

  const totalSecs    = entries.reduce((s,e) => s+e.secs, 0);
  const totalHours   = totalSecs / 3600;
  const arbeteExkl   = Math.round(totalHours * timpris);
  const matExkl      = receipts.reduce((s,r) => s + r.amount - r.moms, 0);
  const matMoms      = receipts.reduce((s,r) => s + r.moms, 0);
  const arbetemoms   = Math.round(arbeteExkl * 0.25);
  const totExkl      = arbeteExkl + matExkl;
  const totMoms      = arbetemoms + matMoms;
  const totInkl      = totExkl + totMoms;

  // ROT
  const rotEligibleMat  = receipts.filter(r => r.rotEligible).reduce((s,r) => s + r.amount - r.moms, 0);
  const rotBase         = arbeteExkl + rotEligibleMat; // ROT on labour + eligible materials
  const rotAvdrag       = Math.min(Math.round(rotBase * (rotPct/100)), ROT_MAX_PER_PERSON);
  const efterROT        = totInkl - rotAvdrag;

  const bg0="#0e1012",bg1="#161a1d",bg2="#1c2024",bdr="#252b30",bdr2="#343c44";
  const ink="#e4e0d8",muted="#6b7177",muted2="#8a9199";
  const ora="#e8652a",grn="#3aaa6e",blu="#4a9fd4",yel="#f0c040";

  const S = {
    app:   { fontFamily:"system-ui,sans-serif", background:bg0, minHeight:"100vh", color:ink, paddingBottom:60 },
    hdr:   { background:bg1, borderBottom:`1px solid ${bdr}`, padding:"13px 18px", display:"flex", alignItems:"center", gap:10 },
    h1:    { fontSize:20, fontWeight:800, color:"#fff", margin:0, letterSpacing:1 },
    nav:   { background:bg1, borderBottom:`1px solid ${bdr}`, display:"flex" },
    nb:  a => ({ flex:1, padding:"12px 4px", textAlign:"center", fontSize:10, fontWeight:a?700:400, color:a?ora:muted, borderBottom:a?`2px solid ${ora}`:"2px solid transparent", cursor:"pointer", letterSpacing:1, textTransform:"uppercase", fontFamily:"monospace" }),
    body:  { maxWidth:620, margin:"0 auto", padding:"16px 12px" },

    projSel: { background:bg2, border:`1.5px solid ${bdr}`, borderRadius:10, padding:"14px 16px", marginBottom:14, display:"flex", flexDirection:"column", gap:10 },
    lbl:   { fontFamily:"monospace", fontSize:10, letterSpacing:2, textTransform:"uppercase", color:muted, marginBottom:4 },
    selW:  { border:`1.5px solid ${bdr}`, borderRadius:8, overflow:"hidden", background:bg0 },
    sel:   { width:"100%", border:"none", outline:"none", padding:"10px 12px", background:"transparent", fontSize:14, color:ink, appearance:"none" },
    inp:   { width:"100%", border:`1.5px solid ${bdr}`, borderRadius:8, padding:"10px 12px", background:bg0, fontSize:14, color:ink, boxSizing:"border-box", outline:"none", fontFamily:"monospace" },
    g2:    { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 },

    sec:   { background:bg2, border:`1.5px solid ${bdr}`, borderRadius:10, marginBottom:12, overflow:"hidden" },
    secH:  { padding:"10px 16px", borderBottom:`1px solid ${bdr}`, display:"flex", alignItems:"center", gap:8, background:bg1 },
    secHT: { fontSize:13, fontWeight:700, color:ink },
    secB:  { padding:"12px 16px" },

    trow:  { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:`1px solid ${bdr}`, fontSize:13 },
    tlast: { borderBottom:"none" },
    tlbl:  { color:muted2 },
    tval:  { fontFamily:"monospace", fontWeight:600, color:ink },
    tvalOra:{ fontFamily:"monospace", fontWeight:700, color:ora, fontSize:15 },
    tvalGrn:{ fontFamily:"monospace", fontWeight:700, color:grn, fontSize:15 },

    erow:  { display:"flex", gap:10, padding:"7px 0", borderBottom:`1px solid ${bdr}`, fontSize:12, alignItems:"center" },
    elast: { borderBottom:"none" },
    edate: { color:muted, fontFamily:"monospace", width:60, flexShrink:0 },
    enote: { flex:1, color:ink },
    ehrs:  { fontFamily:"monospace", color:ora, flexShrink:0 },
    eclock:{ fontFamily:"monospace", color:muted, fontSize:11, flexShrink:0, width:90, textAlign:"right" },

    rrow:  { display:"flex", gap:10, padding:"7px 0", borderBottom:`1px solid ${bdr}`, fontSize:12, alignItems:"center" },
    rlast: { borderBottom:"none" },
    rdate: { color:muted, fontFamily:"monospace", width:60, flexShrink:0 },
    rstore:{ flex:1, color:ink, fontWeight:600 },
    rnote: { flex:2, color:muted2, fontSize:11 },
    ramt:  { fontFamily:"monospace", color:ora, flexShrink:0 },
    rrot:  a => ({ width:16, height:16, borderRadius:3, background:a?"#0e2016":bdr, border:`1.5px solid ${a?grn:bdr2}`, flexShrink:0 }),

    sumRow:{ display:"flex", justifyContent:"space-between", padding:"8px 0", fontSize:14 },
    sumDiv:{ borderTop:`2px solid ${bdr}`, margin:"8px 0" },
    sumBig:{ display:"flex", justifyContent:"space-between", padding:"10px 0", fontSize:17, fontWeight:700 },

    rotBox:{ background:"#0e2016", border:`1.5px solid ${grn}44`, borderRadius:10, padding:"16px", marginBottom:12 },
    rotTit:{ fontFamily:"monospace", fontSize:10, letterSpacing:2, textTransform:"uppercase", color:grn, marginBottom:12 },
    rotRow:{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:`1px solid ${bdr}`, fontSize:13 },
    rotLst:{ borderBottom:"none" },
    rotLbl:{ color:muted2 },
    rotVal:{ fontFamily:"monospace", fontWeight:600 },
    rotBig:{ display:"flex", justifyContent:"space-between", padding:"12px 0 0", fontSize:20, fontWeight:800, color:grn },

    printBtn: ok => ({ width:"100%", padding:"14px", background:ok?ora:bdr2, color:"#fff", border:"none", borderRadius:10, fontSize:16, fontWeight:700, cursor:ok?"pointer":"not-allowed", letterSpacing:1, marginBottom:8 }),
    copyBtn:  { width:"100%", padding:"12px", background:"none", color:muted2, border:`1.5px solid ${bdr}`, borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer", marginBottom:8 },
    prevBtn:  { width:"100%", padding:"12px", background:bg2, color:muted2, border:`1.5px solid ${bdr2}`, borderRadius:10, fontSize:13, cursor:"pointer" },

    // Print preview
    previewOverlay: { position:"fixed", inset:0, background:"rgba(0,0,0,.92)", zIndex:300, overflowY:"auto", padding:"20px 12px 60px" },
    previewDoc: { maxWidth:580, margin:"0 auto", background:"#fff", borderRadius:10, padding:"32px 28px", color:"#111", fontFamily:"Georgia,serif" },
    pvH1:  { fontSize:26, fontWeight:700, margin:"0 0 4px", letterSpacing:1 },
    pvH2:  { fontSize:14, color:"#555", margin:"0 0 24px" },
    pvSec: { marginBottom:20 },
    pvSecT:{ fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:"#888", borderBottom:"1px solid #ddd", paddingBottom:6, marginBottom:10 },
    pvRow: { display:"flex", justifyContent:"space-between", fontSize:13, padding:"4px 0", borderBottom:"1px solid #f0f0f0" },
    pvTot: { display:"flex", justifyContent:"space-between", fontSize:16, fontWeight:700, padding:"10px 0 0", borderTop:"2px solid #111" },
    pvRot: { background:"#e8f5ec", borderRadius:8, padding:"14px", marginTop:16 },
    pvRotT:{ fontSize:13, fontWeight:700, color:"#2a6e4a", marginBottom:8 },
    pvRotR:{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"3px 0" },
    pvRotB:{ display:"flex", justifyContent:"space-between", fontSize:16, fontWeight:700, color:"#2a6e4a", borderTop:"1.5px solid #a8d8b8", paddingTop:8, marginTop:6 },
    pvClose:{ position:"fixed", top:16, right:16, width:40, height:40, borderRadius:"50%", background:bdr2, border:"none", color:ink, fontSize:20, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
    pvPrint:{ position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)", padding:"12px 32px", background:ora, color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 20px rgba(0,0,0,.4)" },
  };

  function copyRapport() {
    const lines = [
      `PROJEKTRAPPORT – ${proj.name}`,
      `Kund: ${proj.customer}  |  ${proj.address}`,
      `Utfört: ${fmtDate(proj.startDate)} – ${fmtDate(proj.endDate)}`,
      `Företag: ${COMPANY.name}  |  Org.nr: ${COMPANY.orgnr}`,
      "",
      "ARBETSTID",
      ...entries.map(e => `  ${e.date}  ${e.startTime||""}${e.endTime?`–${e.endTime}`:""} (${secsToH(e.secs)} h)  ${e.note}`),
      `  Totalt: ${secsToH(totalSecs)} h × ${fmtKr0(timpris)}/h = ${fmtKr0(arbeteExkl)} kr`,
      "",
      "MATERIAL & KOSTNADER",
      ...receipts.map(r => `  ${r.date}  ${r.store}  ${fmtKr(r.amount-r.moms)} exkl. moms  ${r.note}`),
      `  Totalt material: ${fmtKr0(matExkl)} kr`,
      "",
      "SAMMANSTÄLLNING",
      `  Arbete exkl. moms:    ${fmtKr0(arbeteExkl)} kr`,
      `  Material exkl. moms:  ${fmtKr0(matExkl)} kr`,
      `  Moms 25%:             ${fmtKr0(totMoms)} kr`,
      `  TOTALT inkl. moms:    ${fmtKr0(totInkl)} kr`,
      ...(rotAvdrag > 0 ? [
        "",
        `  ROT-avdrag (${rotPct}%):    -${fmtKr0(rotAvdrag)} kr`,
        `  ATT BETALA efter ROT:  ${fmtKr0(efterROT)} kr`,
      ] : []),
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => alert("✓ Rapport kopierad!"));
  }

  function copyROT() {
    const lines = [
      "ROT-UNDERLAG",
      `Kund: ${proj.customer}  |  Personnummer: ${proj.pnr || pnr || "—"}`,
      `Fastighetsadress: ${proj.address}`,
      "",
      `Utförare: ${COMPANY.name}  |  Org.nr: ${COMPANY.orgnr}`,
      `F-skattsedel: ${COMPANY.fSkatt?"Ja":"Nej"}  |  Momsregistrerad: ${COMPANY.momsreg?"Ja":"Nej"}`,
      "",
      `Arbetskostnad exkl. moms:    ${fmtKr0(arbeteExkl)} kr`,
      `ROT-berättigat material:     ${fmtKr0(rotEligibleMat)} kr`,
      `Underlag för ROT-avdrag:     ${fmtKr0(rotBase)} kr`,
      `ROT-avdrag ${rotPct}%:              ${fmtKr0(rotAvdrag)} kr`,
      "",
      `Totalt faktura inkl. moms:   ${fmtKr0(totInkl)} kr`,
      `Kunden betalar (efter ROT):  ${fmtKr0(efterROT)} kr`,
      `ROT-avdrag begärs av utföraren hos Skatteverket.`,
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => alert("✓ ROT-underlag kopierat!"));
  }

  return (
    <div style={S.app}>

      <div style={S.hdr}>
        <h1 style={S.h1}>EXPORT <span style={{color:ora}}>&</span> ROT</h1>
      </div>

      <div style={S.nav}>
        <div style={S.nb(tab==="rapport")} onClick={()=>setTab("rapport")}>📄 Projektrapport</div>
        <div style={S.nb(tab==="rot")}     onClick={()=>setTab("rot")}>🏠 ROT-underlag</div>
      </div>

      <div style={S.body}>

        {/* Välj projekt */}
        <div style={S.projSel}>
          <div>
            <div style={S.lbl}>Välj projekt</div>
            <div style={S.selW}>
              <select style={S.sel} value={selProj} onChange={e=>setSelProj(e.target.value)}>
                {PROJECTS.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div style={S.g2}>
            <div>
              <div style={S.lbl}>Kund</div>
              <div style={{fontSize:13,color:ink}}>{proj.customer}</div>
              <div style={{fontSize:11,color:muted,marginTop:2}}>{proj.address}</div>
            </div>
            <div>
              <div style={S.lbl}>Period</div>
              <div style={{fontSize:12,color:muted,fontFamily:"monospace"}}>{proj.startDate} –</div>
              <div style={{fontSize:12,color:muted,fontFamily:"monospace"}}>{proj.endDate}</div>
            </div>
          </div>
        </div>

        {/* ══ RAPPORT ══ */}
        {tab === "rapport" && (<>

          {/* Timpris */}
          <div style={{...S.sec,marginBottom:12}}>
            <div style={S.secH}><span>⚙️</span><div style={S.secHT}>Inställningar</div></div>
            <div style={S.secB}>
              <div style={S.lbl}>Timpris (kr/h exkl. moms)</div>
              <div style={{display:"flex",alignItems:"center",border:`1.5px solid ${bdr}`,borderRadius:8,overflow:"hidden",background:bg0}}>
                <input type="number" value={timpris} onChange={e=>setTimpris(+e.target.value)}
                  style={{...S.inp,border:"none",fontSize:20,fontWeight:700,color:ora}}/>
                <span style={{padding:"0 12px",fontSize:12,color:muted,borderLeft:`1px solid ${bdr}`}}>kr/h</span>
              </div>
            </div>
          </div>

          {/* Tid */}
          <div style={S.sec}>
            <div style={S.secH}><span>⏱</span><div style={S.secHT}>Arbetstid – {secsToH(totalSecs)} h</div></div>
            <div style={S.secB}>
              {entries.map((e,i)=>(
                <div key={e.id} style={{...S.erow,...(i===entries.length-1?S.elast:{})}}>
                  <div style={S.edate}>{e.date.slice(5).replace("-","/")}</div>
                  <div style={S.enote}>{e.note}</div>
                  <div style={S.eclock}>{e.startTime&&e.endTime?`${e.startTime}–${e.endTime}`:""}</div>
                  <div style={S.ehrs}>{secsToH(e.secs)} h</div>
                </div>
              ))}
              <div style={{...S.trow,...S.tlast,marginTop:8}}>
                <span style={S.tlbl}>{secsToH(totalSecs)} h × {fmtKr0(timpris)}/h</span>
                <span style={S.tvalOra}>{fmtKr0(arbeteExkl)} kr</span>
              </div>
            </div>
          </div>

          {/* Material */}
          <div style={S.sec}>
            <div style={S.secH}><span>🧱</span><div style={S.secHT}>Material & kostnader – {fmtKr0(matExkl)} kr</div></div>
            <div style={S.secB}>
              {receipts.map((r,i)=>(
                <div key={r.id} style={{...S.rrow,...(i===receipts.length-1?S.rlast:{})}}>
                  <div style={S.rdate}>{r.date.slice(5).replace("-","/")}</div>
                  <div style={S.rstore}>{r.store}</div>
                  <div style={S.rnote}>{r.note}</div>
                  <div style={S.ramt}>{fmtKr(r.amount-r.moms)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sammanställning */}
          <div style={S.sec}>
            <div style={S.secH}><span>🧾</span><div style={S.secHT}>Sammanställning</div></div>
            <div style={S.secB}>
              <div style={S.sumRow}><span style={{color:muted2}}>Arbete exkl. moms</span><span style={{fontFamily:"monospace"}}>{fmtKr0(arbeteExkl)} kr</span></div>
              <div style={S.sumRow}><span style={{color:muted2}}>Material exkl. moms</span><span style={{fontFamily:"monospace"}}>{fmtKr0(matExkl)} kr</span></div>
              <div style={S.sumRow}><span style={{color:muted2}}>Moms 25%</span><span style={{fontFamily:"monospace",color:muted}}>{fmtKr0(totMoms)} kr</span></div>
              <div style={S.sumDiv}/>
              <div style={S.sumBig}><span>Totalt inkl. moms</span><span style={{color:ora,fontFamily:"monospace"}}>{fmtKr0(totInkl)} kr</span></div>
            </div>
          </div>

          <button style={S.printBtn(true)} onClick={()=>setShowPreview(true)}>🖨 Förhandsgranska & Skriv ut</button>
          <button style={S.copyBtn} onClick={copyRapport}>📋 Kopiera rapport som text</button>

        </>)}

        {/* ══ ROT ══ */}
        {tab === "rot" && (<>

          {/* Kundinfo */}
          <div style={S.sec}>
            <div style={S.secH}><span>👤</span><div style={S.secHT}>Kundinformation</div></div>
            <div style={S.secB}>
              <div style={S.g2}>
                <div>
                  <div style={S.lbl}>Namn</div>
                  <div style={{fontSize:13,color:ink,fontWeight:600}}>{proj.customer}</div>
                </div>
                <div>
                  <div style={S.lbl}>Personnummer</div>
                  <input style={{...S.inp,fontSize:14}} placeholder="ÅÅMMDD-XXXX"
                    value={pnr||proj.pnr} onChange={e=>setPnr(e.target.value)}/>
                </div>
              </div>
              <div style={{marginTop:10}}>
                <div style={S.lbl}>Fastighetsadress (där arbetet utförts)</div>
                <div style={{fontSize:13,color:ink}}>{proj.address}</div>
              </div>
            </div>
          </div>

          {/* ROT-procent */}
          <div style={S.sec}>
            <div style={S.secH}><span>⚙️</span><div style={S.secHT}>ROT-inställningar</div></div>
            <div style={S.secB}>
              <div style={S.lbl}>ROT-avdrag %</div>
              <div style={{display:"flex",gap:8,marginBottom:12}}>
                {[30,50].map(p=>(
                  <button key={p} onClick={()=>setRotPct(p)}
                    style={{flex:1,padding:"9px",borderRadius:8,border:`1.5px solid ${rotPct===p?grn:bdr}`,background:rotPct===p?"#0e2016":bg1,color:rotPct===p?grn:muted,fontSize:13,fontWeight:700,cursor:"pointer"}}>
                    {p}% {p===30?"(standard)":"(max privatp.)"}
                  </button>
                ))}
              </div>
              <div style={{fontSize:11,color:muted,fontFamily:"monospace"}}>
                Max ROT per person och år: {fmtKr0(ROT_MAX_PER_PERSON)}
              </div>
            </div>
          </div>

          {/* Berättigade kostnader */}
          <div style={S.sec}>
            <div style={S.secH}><span>✓</span><div style={S.secHT}>ROT-berättigade kostnader</div></div>
            <div style={S.secB}>
              <div style={{...S.trow}}>
                <span style={S.tlbl}>Arbetskostnad exkl. moms</span>
                <span style={S.tval}>{fmtKr0(arbeteExkl)} kr</span>
              </div>
              <div style={S.lbl} >Material kvitton</div>
              {receipts.map((r,i)=>(
                <div key={r.id} style={{...S.rrow,...(i===receipts.length-1?S.rlast:{})}}>
                  <div style={S.rdate}>{r.date.slice(5).replace("-","/")}</div>
                  <div style={S.rstore}>{r.store}</div>
                  <div style={S.rnote}>{r.note}</div>
                  <div style={{...S.rrot(r.rotEligible)}} title={r.rotEligible?"ROT-berättigat":"Ej ROT"}/>
                  <div style={{...S.ramt,color:r.rotEligible?grn:muted}}>{fmtKr(r.amount-r.moms)}</div>
                </div>
              ))}
              <div style={{fontSize:10,color:muted,fontFamily:"monospace",marginTop:8}}>
                Grön markering = ROT-berättigat material (direkt kopplat till arbetet)
              </div>
            </div>
          </div>

          {/* ROT-beräkning */}
          <div style={S.rotBox}>
            <div style={S.rotTit}>ROT-AVDRAGSBERÄKNING</div>
            <div style={S.rotRow}>
              <span style={S.rotLbl}>Arbetskostnad exkl. moms</span>
              <span style={S.rotVal}>{fmtKr0(arbeteExkl)} kr</span>
            </div>
            <div style={S.rotRow}>
              <span style={S.rotLbl}>ROT-berättigat material</span>
              <span style={S.rotVal}>{fmtKr0(rotEligibleMat)} kr</span>
            </div>
            <div style={S.rotRow}>
              <span style={S.rotLbl}>Underlag för ROT ({rotPct}%)</span>
              <span style={S.rotVal}>{fmtKr0(rotBase)} kr</span>
            </div>
            <div style={{...S.rotRow,color:grn}}>
              <span>ROT-avdrag</span>
              <span style={{fontWeight:700}}>{fmtKr0(rotAvdrag)} kr</span>
            </div>
            <div style={{height:1,background:`${grn}44`,margin:"8px 0"}}/>
            <div style={{...S.trow,...S.tlast}}>
              <span style={{color:muted2}}>Faktura inkl. moms</span>
              <span style={{fontFamily:"monospace"}}>{fmtKr0(totInkl)} kr</span>
            </div>
            <div style={S.rotBig}>
              <span>Kunden betalar</span>
              <span>{fmtKr0(efterROT)} kr</span>
            </div>
            <div style={{fontSize:11,color:`${grn}99`,marginTop:8,fontFamily:"monospace"}}>
              ROT-avdraget {fmtKr0(rotAvdrag)} kr begärs av utföraren direkt hos Skatteverket.
            </div>
          </div>

          {/* Företagsinfo */}
          <div style={S.sec}>
            <div style={S.secH}><span>🏢</span><div style={S.secHT}>Utförarens uppgifter</div></div>
            <div style={S.secB}>
              <div style={{...S.trow}}><span style={S.tlbl}>Företag</span><span style={S.tval}>{COMPANY.name}</span></div>
              <div style={{...S.trow}}><span style={S.tlbl}>Org.nr</span><span style={S.tval}>{COMPANY.orgnr}</span></div>
              <div style={{...S.trow}}><span style={S.tlbl}>F-skattsedel</span><span style={{...S.tval,color:grn}}>{COMPANY.fSkatt?"✓ Ja":"Nej"}</span></div>
              <div style={{...S.trow,...S.tlast}}><span style={S.tlbl}>Momsregistrerad</span><span style={{...S.tval,color:grn}}>{COMPANY.momsreg?"✓ Ja":"Nej"}</span></div>
            </div>
          </div>

          <button style={S.printBtn(true)} onClick={()=>setShowPreview(true)}>🖨 Förhandsgranska & Skriv ut</button>
          <button style={S.copyBtn} onClick={copyROT}>📋 Kopiera ROT-underlag som text</button>

        </>)}

      </div>

      {/* ── PRINT PREVIEW ── */}
      {showPreview && (
        <div style={S.previewOverlay}>
          <button style={S.pvClose} onClick={()=>setShowPreview(false)}>✕</button>

          <div style={S.previewDoc} id="print-doc">

            {/* Header */}
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:24,borderBottom:"2px solid #111",paddingBottom:16}}>
              <div>
                <div style={S.pvH1}>{tab==="rot"?"ROT-UNDERLAG":"PROJEKTRAPPORT"}</div>
                <div style={S.pvH2}>{proj.name}</div>
                <div style={{fontSize:12,color:"#555"}}>Datum: {fmtDate(todayISO())}</div>
              </div>
              <div style={{textAlign:"right",fontSize:12,color:"#555"}}>
                <div style={{fontWeight:700,color:"#111",marginBottom:4}}>{COMPANY.name}</div>
                <div>{COMPANY.orgnr}</div>
                <div>{COMPANY.address}</div>
                <div>{COMPANY.email}</div>
              </div>
            </div>

            {/* Kund */}
            <div style={S.pvSec}>
              <div style={S.pvSecT}>Kund</div>
              <div style={{fontSize:13}}><strong>{proj.customer}</strong></div>
              <div style={{fontSize:12,color:"#555"}}>{proj.address}</div>
              {tab==="rot" && <div style={{fontSize:12,color:"#555"}}>Personnummer: {pnr||proj.pnr||"—"}</div>}
              <div style={{fontSize:12,color:"#555",marginTop:4}}>Utfört: {fmtDate(proj.startDate)} – {fmtDate(proj.endDate)}</div>
            </div>

            {tab==="rapport" && (<>
              {/* Tid */}
              <div style={S.pvSec}>
                <div style={S.pvSecT}>Arbetstid</div>
                {entries.map(e=>(
                  <div key={e.id} style={S.pvRow}>
                    <span>{e.date} {e.startTime&&e.endTime?`${e.startTime}–${e.endTime}`:""} – {e.note}</span>
                    <span>{secsToH(e.secs)} h</span>
                  </div>
                ))}
                <div style={{...S.pvRow,fontWeight:600,marginTop:4}}>
                  <span>Totalt {secsToH(totalSecs)} h × {fmtKr0(timpris)} kr/h</span>
                  <span>{fmtKr0(arbeteExkl)} kr</span>
                </div>
              </div>

              {/* Material */}
              <div style={S.pvSec}>
                <div style={S.pvSecT}>Material & kostnader</div>
                {receipts.map(r=>(
                  <div key={r.id} style={S.pvRow}>
                    <span>{r.date} {r.store} – {r.note}</span>
                    <span>{fmtKr(r.amount-r.moms)}</span>
                  </div>
                ))}
              </div>

              {/* Summa */}
              <div style={{marginTop:16}}>
                <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:13}}><span>Arbete exkl. moms</span><span>{fmtKr0(arbeteExkl)} kr</span></div>
                <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:13}}><span>Material exkl. moms</span><span>{fmtKr0(matExkl)} kr</span></div>
                <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:13,color:"#888"}}><span>Moms 25%</span><span>{fmtKr0(totMoms)} kr</span></div>
                <div style={S.pvTot}><span>TOTALT inkl. moms</span><span>{fmtKr0(totInkl)} kr</span></div>
              </div>
            </>)}

            {tab==="rot" && (<>
              <div style={S.pvSec}>
                <div style={S.pvSecT}>Kostnadsunderlag</div>
                <div style={S.pvRow}><span>Arbetskostnad exkl. moms</span><span>{fmtKr0(arbeteExkl)} kr</span></div>
                <div style={S.pvRow}><span>ROT-berättigat material exkl. moms</span><span>{fmtKr0(rotEligibleMat)} kr</span></div>
                <div style={{...S.pvRow,fontWeight:600}}><span>Underlag för ROT-avdrag</span><span>{fmtKr0(rotBase)} kr</span></div>
              </div>

              <div style={S.pvRot}>
                <div style={S.pvRotT}>ROT-avdragsberäkning ({rotPct}%)</div>
                <div style={S.pvRotR}><span>Faktura inkl. moms</span><span>{fmtKr0(totInkl)} kr</span></div>
                <div style={S.pvRotR}><span>ROT-avdrag {rotPct}% av {fmtKr0(rotBase)} kr</span><span>-{fmtKr0(rotAvdrag)} kr</span></div>
                <div style={S.pvRotB}><span>Kunden betalar</span><span>{fmtKr0(efterROT)} kr</span></div>
                <div style={{fontSize:11,color:"#2a6e4a",marginTop:8}}>ROT-avdraget begärs av utföraren direkt hos Skatteverket. F-skattsedel innehas.</div>
              </div>
            </>)}

            {/* Signatur */}
            <div style={{marginTop:40,paddingTop:16,borderTop:"1px solid #ddd",display:"flex",gap:40}}>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:"#888",marginBottom:24}}>Utförarens underskrift</div>
                <div style={{borderBottom:"1px solid #000",width:"80%"}}/>
                <div style={{fontSize:11,color:"#555",marginTop:4}}>{COMPANY.name}</div>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:"#888",marginBottom:24}}>Kundens underskrift</div>
                <div style={{borderBottom:"1px solid #000",width:"80%"}}/>
                <div style={{fontSize:11,color:"#555",marginTop:4}}>{proj.customer}</div>
              </div>
            </div>

          </div>

          <button style={S.pvPrint} onClick={()=>window.print()}>🖨 Skriv ut / Spara PDF</button>
        </div>
      )}

    </div>
  );
}
