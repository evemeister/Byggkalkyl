import { useState, useRef } from "react";

const JOBBTYPER = [
  { id: "vvs",      label: "🔧 VVS",      text: "VVS – rör och vatteninstallation" },
  { id: "el",       label: "⚡ El",        text: "El och belysning" },
  { id: "badrum",   label: "🛁 Badrum",   text: "Badrumsrenovering" },
  { id: "kok",      label: "🍳 Kök",      text: "Köksrenovering" },
  { id: "malning",  label: "🎨 Målning",  text: "Målning och tapetsering" },
  { id: "betong",   label: "🧱 Betong",   text: "Betong och grundläggning" },
  { id: "mark",     label: "⛏️ Mark",     text: "Markarbeten och dränering" },
  { id: "golv",     label: "🪵 Golv",     text: "Golvläggning" },
  { id: "fasad",    label: "🏠 Fasad",    text: "Fasad och utvändig renovering" },
  { id: "snickeri", label: "🪚 Snickeri", text: "Snickeri och träarbeten" },
];

const sizeMap = { litet: "2–8 timmar", medium: "1–3 dagar", stort: "1 vecka eller mer" };

export default function AIOffert() {
  const [step, setStep]           = useState(1);
  const [kundNamn, setKundNamn]   = useState("");
  const [kundAdr, setKundAdr]     = useState("");
  const [jobDesc, setJobDesc]     = useState("");
  const [jobType, setJobType]     = useState("");
  const [timpris, setTimpris]     = useState(650);
  const [matUpplag, setMatUpplag] = useState(20);
  const [rot, setRot]             = useState("nej");
  const [jobSize, setJobSize]     = useState("medium");
  const [extraNotes, setExtraNotes] = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  // Offert state
  const [arbete, setArbete]         = useState("");
  const [villkor, setVillkor]       = useState("");
  const [material, setMaterial]     = useState([]);
  const [pArbete, setPArbete]       = useState(0);
  const [pMaterial, setPMaterial]   = useState(0);
  const [genDone, setGenDone]       = useState(false);

  const canStep2 = jobDesc.trim().length > 10;
  const today    = new Date().toLocaleDateString("sv-SE");

  const subtot = pArbete + pMaterial;
  const moms   = Math.round(subtot * 0.25);
  const total  = subtot + moms;
  const rotBelopp = Math.round(pArbete * 0.30);

  async function generate() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:3001/generera-offert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDesc, jobType, kundNamn, kundAdr,
          timpris, matUpplag, rot, jobSize, extraNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Serverfel");

      setArbete(data.arbetsbeskrivning || "");
      setVillkor(data.villkor || "Betalningsvillkor 30 dagar netto.");
      const mats = (data.material || []).map((m, i) => ({ id: i+1, ...m }));
      setMaterial(mats);
      setPArbete(data.priser?.pArbete || 0);
      setPMaterial(data.priser?.pMaterial || 0);
      setGenDone(true);
      setStep(3);
    } catch (e) {
      console.error("AI-offert fel:", e);
      if (e instanceof SyntaxError) {
        setError("AI:n returnerade ett oväntat svar. Försök igen.");
      } else if (e.message && (e.message.includes("fetch") || e.message.includes("network"))) {
        setError("Nätverksfel – kunde inte nå API:et. Kontrollera internetanslutningen.");
      } else {
        setError("Fel: " + (e.message || "Okänt fel – öppna F12 konsolen för detaljer."));
      }
    } finally {
      setLoading(false);
    }
  }

  function addMatRow() {
    setMaterial(m => [...m, { id: Date.now(), namn: "", antal: "1 st", apris: 0 }]);
  }
  function updateMat(id, key, val) {
    setMaterial(m => m.map(r => r.id === id ? { ...r, [key]: val } : r));
  }
  function removeMat(id) {
    setMaterial(m => m.filter(r => r.id !== id));
  }

  const s = { // styles
    body: { fontFamily: "'IBM Plex Sans', system-ui, sans-serif", background: "#f4f0e8", minHeight: "100vh", paddingBottom: 60 },
    hdr:  { background: "#141210", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 },
    hdrH1:{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: 2, color: "#fff", margin: 0 },
    hdrSpan: { color: "#d4541a" },
    badge:{ marginLeft: "auto", background: "#f4eefa", border: "1px solid #c8a8e8", borderRadius: 20, padding: "4px 12px", fontSize: 10, color: "#6a3a8a", fontFamily: "monospace", letterSpacing: 1 },

    steps:{ background: "#fff", borderBottom: "1px solid #ddd8ce", display: "flex" },
    step: (n) => ({ flex:1, padding: "12px 8px", display:"flex", alignItems:"center", gap:8, borderBottom: step===n ? "2px solid #d4541a" : step>n ? "2px solid #2a6e4a" : "2px solid transparent", cursor:"pointer" }),
    snum: (n) => ({ width:22, height:22, borderRadius:"50%", border: step===n?"2px solid #d4541a":step>n?"none":"2px solid #c8c0b4", background: step>n?"#2a6e4a":"transparent", display:"flex",alignItems:"center",justifyContent:"center", fontSize:11, fontWeight:600, color: step===n?"#d4541a":step>n?"#fff":"#8a8278", flexShrink:0, fontFamily:"monospace" }),
    slbl: (n) => ({ fontFamily:"monospace", fontSize:9, letterSpacing:1, textTransform:"uppercase", color: step===n?"#d4541a":step>n?"#2a6e4a":"#8a8278" }),
    sname:{ fontSize:12, fontWeight:600, color:"#141210" },

    wrap: { maxWidth:660, margin:"0 auto", padding:"24px 16px" },
    panel:{ background:"#fff", border:"1.5px solid #ddd8ce", borderRadius:10, overflow:"hidden", marginBottom:14 },
    ph:   { padding:"12px 18px", background:"#faf7f2", borderBottom:"1px solid #ddd8ce", display:"flex", alignItems:"center", gap:10 },
    phH:  { fontSize:14, fontWeight:600, margin:0 },
    phP:  { fontSize:11, color:"#8a8278", margin:0 },
    pb:   { padding:"16px 18px" },

    notice:{ background:"#e8f0f8", border:"1.5px solid #a0c4e8", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#1a4a7a", lineHeight:1.6, marginBottom:14 },
    field: { display:"flex", flexDirection:"column", gap:4, marginBottom:12 },
    flbl:  { fontFamily:"monospace", fontSize:10, letterSpacing:1.5, textTransform:"uppercase", color:"#8a8278" },
    frow:  { display:"flex", alignItems:"center", border:"1.5px solid #ddd8ce", borderRadius:7, overflow:"hidden", background:"#f4f0e8" },
    finput:{ flex:1, border:"none", outline:"none", padding:"9px 11px", fontFamily:"'IBM Plex Sans',sans-serif", fontSize:14, background:"transparent", color:"#141210" },
    funit: { padding:"0 10px", fontSize:11, color:"#8a8278", fontFamily:"monospace", borderLeft:"1px solid #ddd8ce" },
    fsel:  { flex:1, border:"none", outline:"none", padding:"9px 11px", background:"transparent", fontSize:14, color:"#141210" },

    ta:    { width:"100%", minHeight:90, border:"1.5px solid #ddd8ce", borderRadius:7, padding:"10px 12px", fontFamily:"'IBM Plex Sans',sans-serif", fontSize:14, color:"#141210", background:"#f4f0e8", resize:"vertical", outline:"none", lineHeight:1.6 },

    pills: { display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 },
    pill:  (active) => ({ padding:"5px 12px", borderRadius:20, border: active?"1.5px solid #d4541a":"1.5px solid #ddd8ce", background: active?"#fdf0e8":"#faf7f2", fontFamily:"monospace", fontSize:11, color: active?"#d4541a":"#8a8278", cursor:"pointer" }),

    grid2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 },

    genBtn:{ width:"100%", padding:"14px", background: loading?"#b0a898":"#141210", color:"#fff", border:"none", borderRadius:9, fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:2, cursor: loading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:14 },

    offertPanel:{ background:"#fff", border:"2px solid #141210", borderRadius:12, overflow:"hidden", marginBottom:14 },
    offertHdr:  { background:"#141210", padding:"16px 22px", display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16, flexWrap:"wrap" },
    ohTitle:    { fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:1, color:"#fff", margin:0 },
    ohSub:      { fontSize:11, color:"#888", margin:0 },
    ohPrice:    { textAlign:"right" },
    ohPriceLbl: { fontFamily:"monospace", fontSize:9, color:"#666", letterSpacing:1 },
    ohPriceVal: { fontFamily:"'Bebas Neue',sans-serif", fontSize:40, color:"#d4541a", lineHeight:1 },
    ohPriceSub: { fontSize:11, color:"#888" },

    os:         { padding:"16px 22px", borderBottom:"1px solid #ddd8ce" },
    osTitle:    { fontFamily:"monospace", fontSize:9, letterSpacing:2, textTransform:"uppercase", color:"#8a8278", marginBottom:8 },
    editTA:     { width:"100%", border:"1.5px solid transparent", borderRadius:6, padding:"7px 9px", fontFamily:"'IBM Plex Sans',sans-serif", fontSize:14, color:"#141210", background:"transparent", resize:"vertical", outline:"none", lineHeight:1.7, minHeight:60 },

    matRow:     { display:"flex", alignItems:"center", gap:8, background:"#faf7f2", border:"1px solid #ddd8ce", borderRadius:7, padding:"7px 10px", marginBottom:5 },
    matDel:     { width:22, height:22, borderRadius:4, border:"1px solid #ddd8ce", background:"none", cursor:"pointer", fontSize:11, color:"#8a8278", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
    addMatBtn:  { width:"100%", padding:"7px", border:"1.5px dashed #c8c0b4", borderRadius:7, background:"none", cursor:"pointer", fontFamily:"monospace", fontSize:11, color:"#8a8278", marginTop:6 },

    ptable:     { width:"100%", fontSize:13, borderCollapse:"collapse" },

    actRow:     { display:"flex", gap:8, flexWrap:"wrap" },
    actBtn:     (primary) => ({ flex:1, padding:"11px", borderRadius:7, border: primary?"none":"1.5px solid #ddd8ce", background: primary?"#d4541a":"#fff", color: primary?"#fff":"#141210", fontFamily:"'IBM Plex Sans',sans-serif", fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }),

    errBox:     { background:"#fdecea", border:"1.5px solid #e8a0a0", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#a8201a", marginBottom:12 },
  };

  return (
    <div style={s.body}>
      {/* HEADER */}
      <div style={s.hdr}>
        <h1 style={s.hdrH1}>AI-<span style={s.hdrSpan}>OFFERT</span></h1>
        <div style={s.badge}>✦ CLAUDE AI</div>
      </div>

      {/* STEPS */}
      <div style={s.steps}>
        {[["Beskriv jobbet",1],["Bilder & detaljer",2],["Offert",3]].map(([name,n])=>(
          <div key={n} style={s.step(n)} onClick={()=>{ if(n<step || (n===2&&canStep2)) setStep(n); }}>
            <div style={s.snum(n)}>{step>n?"✓":n}</div>
            <div>
              <div style={s.slbl(n)}>Steg {n}</div>
              <div style={s.sname}>{name}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={s.wrap}>

        {/* ══ STEG 1 ══ */}
        {step===1 && (
          <>
            <div style={s.notice}>
              <strong>Så fungerar det:</strong> Beskriv jobbet med egna ord – vad som ska göras och ungefär hur stort. AI:n skriver sedan en professionell offert med arbetsbeskrivning, materiallista och pris.
            </div>

            {/* Kund */}
            <div style={s.panel}>
              <div style={s.ph}><span style={{fontSize:18}}>👤</span><div><p style={s.phH}>Kundinformation</p><p style={s.phP}>Vem gäller offerten?</p></div></div>
              <div style={s.pb}>
                <div style={s.grid2}>
                  <div style={s.field}><label style={s.flbl}>Kundnamn</label><div style={s.frow}><input style={s.finput} placeholder="Anna Karlsson" value={kundNamn} onChange={e=>setKundNamn(e.target.value)}/></div></div>
                  <div style={s.field}><label style={s.flbl}>Adress / Plats</label><div style={s.frow}><input style={s.finput} placeholder="Storgatan 12, Göteborg" value={kundAdr} onChange={e=>setKundAdr(e.target.value)}/></div></div>
                </div>
              </div>
            </div>

            {/* Jobbeskrivning */}
            <div style={s.panel}>
              <div style={s.ph}><span style={{fontSize:18}}>📝</span><div><p style={s.phH}>Beskriv jobbet</p><p style={s.phP}>Vad ska göras?</p></div></div>
              <div style={s.pb}>
                <div style={{...s.pills}}>
                  {JOBBTYPER.map(jt=>(
                    <div key={jt.id} style={s.pill(jobType===jt.text)} onClick={()=>setJobType(jobType===jt.text?"":jt.text)}>{jt.label}</div>
                  ))}
                </div>
                <textarea
                  style={s.ta}
                  placeholder="Exempel: Byta ut handfat och blandare i badrum på övervåningen. Befintligt handfat är 60×50 cm. Ny blandare önskas i svart finish. Behöver även byta vattenlås och silikon längs hela kanten."
                  value={jobDesc}
                  onChange={e=>setJobDesc(e.target.value)}
                  rows={5}
                />
                <div style={{fontSize:11,color:"#8a8278",marginTop:6,fontFamily:"monospace"}}>{jobDesc.length} tecken{jobDesc.length<10 && jobDesc.length>0?" – beskriv lite mer":""}</div>
              </div>
            </div>

            <button style={{...s.genBtn, background: canStep2?"#141210":"#b0a898", cursor: canStep2?"pointer":"not-allowed"}}
              onClick={()=>canStep2&&setStep(2)} disabled={!canStep2}>
              NÄSTA – DETALJER →
            </button>
          </>
        )}

        {/* ══ STEG 2 ══ */}
        {step===2 && (
          <>
            <div style={s.panel}>
              <div style={s.ph}><span style={{fontSize:18}}>📋</span><div><p style={s.phH}>Offertdetaljer</p><p style={s.phP}>Hjälper AI:n prissätta rätt</p></div></div>
              <div style={s.pb}>
                <div style={s.grid2}>
                  <div style={s.field}>
                    <label style={s.flbl}>Timpris (kr/tim exkl. moms)</label>
                    <div style={s.frow}>
                      <input style={s.finput} type="number" value={timpris} onChange={e=>setTimpris(+e.target.value)}/>
                      <div style={s.funit}>kr/h</div>
                    </div>
                  </div>
                  <div style={s.field}>
                    <label style={s.flbl}>Materialupplägg</label>
                    <div style={s.frow}>
                      <select style={s.fsel} value={matUpplag} onChange={e=>setMatUpplag(+e.target.value)}>
                        <option value={10}>10%</option>
                        <option value={15}>15%</option>
                        <option value={20}>20%</option>
                        <option value={25}>25%</option>
                        <option value={30}>30%</option>
                      </select>
                    </div>
                  </div>
                  <div style={s.field}>
                    <label style={s.flbl}>ROT-avdrag</label>
                    <div style={s.frow}>
                      <select style={s.fsel} value={rot} onChange={e=>setRot(e.target.value)}>
                        <option value="ja">Ja – kunden nyttjar ROT</option>
                        <option value="nej">Nej</option>
                        <option value="kanske">Osäker</option>
                      </select>
                    </div>
                  </div>
                  <div style={s.field}>
                    <label style={s.flbl}>Ungefärlig storlek</label>
                    <div style={s.frow}>
                      <select style={s.fsel} value={jobSize} onChange={e=>setJobSize(e.target.value)}>
                        <option value="litet">Litet (2–8 tim)</option>
                        <option value="medium">Mellanjobb (1–3 dagar)</option>
                        <option value="stort">Stort (1+ vecka)</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div style={s.field}>
                  <label style={s.flbl}>Övrigt att tänka på (valfritt)</label>
                  <textarea style={{...s.ta,minHeight:60}} placeholder="T.ex. parkering finns på gatan, kunden önskar kvitto för ROT..." value={extraNotes} onChange={e=>setExtraNotes(e.target.value)} rows={2}/>
                </div>
              </div>
            </div>

            {error && <div style={s.errBox}>⚠️ {error}</div>}

            <button style={{...s.genBtn, background: loading?"#b0a898":"#141210"}} onClick={generate} disabled={loading}>
              {loading ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#ffffff44" strokeWidth="2"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur=".7s" repeatCount="indefinite"/>
                    </path>
                  </svg>
                  GENERERAR OFFERT...
                </>
              ) : "✦ GENERERA OFFERT MED AI"}
            </button>
          </>
        )}

        {/* ══ STEG 3 ══ */}
        {step===3 && genDone && (
          <>
            <div style={s.notice}>
              <strong>✦ AI-genererad offert</strong> – Klicka på valfri text eller siffra för att redigera direkt.
            </div>

            <div style={s.offertPanel}>

              {/* Header */}
              <div style={s.offertHdr}>
                <div>
                  <p style={s.ohTitle}>OFFERT</p>
                  <p style={s.ohSub}>{kundNamn || "Kund"}{kundAdr ? " · " + kundAdr : ""}</p>
                  <p style={{...s.ohSub,marginTop:2}}>Offertdatum: {today}</p>
                </div>
                <div style={s.ohPrice}>
                  <div style={s.ohPriceLbl}>TOTALT INKL. MOMS</div>
                  <div style={s.ohPriceVal}>{total.toLocaleString("sv-SE")} kr</div>
                  <div style={s.ohPriceSub}>exkl. moms: {subtot.toLocaleString("sv-SE")} kr</div>
                </div>
              </div>

              {/* Arbetsbeskrivning */}
              <div style={s.os}>
                <div style={s.osTitle}>Arbetsbeskrivning</div>
                <textarea style={s.editTA} value={arbete} onChange={e=>setArbete(e.target.value)} rows={4}/>
              </div>

              {/* Material */}
              <div style={{...s.os}}>
                <div style={s.osTitle}>Material & Produkter</div>
                {material.map(m=>(
                  <div key={m.id} style={s.matRow}>
                    <input style={{flex:1,border:"none",outline:"none",background:"transparent",fontFamily:"'IBM Plex Sans',sans-serif",fontSize:13,color:"#141210"}}
                      value={m.namn} onChange={e=>updateMat(m.id,"namn",e.target.value)} placeholder="Material"/>
                    <input style={{width:60,border:"none",outline:"none",background:"transparent",fontFamily:"monospace",fontSize:11,color:"#8a8278",textAlign:"right"}}
                      value={m.antal} onChange={e=>updateMat(m.id,"antal",e.target.value)}/>
                    <input style={{width:75,border:"none",outline:"none",background:"transparent",fontFamily:"monospace",fontSize:13,fontWeight:600,color:"#d4541a",textAlign:"right"}}
                      type="number" value={m.apris} onChange={e=>updateMat(m.id,"apris",+e.target.value)}/>
                    <span style={{fontSize:11,color:"#8a8278",fontFamily:"monospace",marginLeft:2}}>kr</span>
                    <button style={s.matDel} onClick={()=>removeMat(m.id)}>✕</button>
                  </div>
                ))}
                <button style={s.addMatBtn} onClick={addMatRow}>＋ Lägg till rad</button>
              </div>

              {/* Priser */}
              <div style={s.os}>
                <div style={s.osTitle}>Prissammanställning</div>
                <table style={s.ptable}>
                  <tbody>
                    <tr>
                      <td style={{padding:"4px 0"}}>Arbete</td>
                      <td style={{textAlign:"right",padding:"4px 0"}}>
                        <input type="number" value={pArbete} onChange={e=>setPArbete(+e.target.value)}
                          style={{border:"none",outline:"none",background:"transparent",fontFamily:"monospace",fontWeight:600,fontSize:13,textAlign:"right",width:80,color:"#141210"}}/>
                        <span style={{fontSize:11,color:"#8a8278",fontFamily:"monospace"}}> kr</span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{padding:"4px 0"}}>Material (inkl. pålägg)</td>
                      <td style={{textAlign:"right",padding:"4px 0"}}>
                        <input type="number" value={pMaterial} onChange={e=>setPMaterial(+e.target.value)}
                          style={{border:"none",outline:"none",background:"transparent",fontFamily:"monospace",fontWeight:600,fontSize:13,textAlign:"right",width:80,color:"#141210"}}/>
                        <span style={{fontSize:11,color:"#8a8278",fontFamily:"monospace"}}> kr</span>
                      </td>
                    </tr>
                    <tr style={{color:"#8a8278",fontSize:12}}>
                      <td style={{padding:"4px 0"}}>Moms 25%</td>
                      <td style={{textAlign:"right",fontFamily:"monospace",padding:"4px 0"}}>{moms.toLocaleString("sv-SE")} kr</td>
                    </tr>
                    <tr style={{fontWeight:700}}>
                      <td style={{paddingTop:10,borderTop:"2px solid #141210",fontSize:15}}>Totalt inkl. moms</td>
                      <td style={{paddingTop:10,borderTop:"2px solid #141210",textAlign:"right",fontFamily:"monospace",fontSize:18,color:"#d4541a"}}>{total.toLocaleString("sv-SE")} kr</td>
                    </tr>
                  </tbody>
                </table>

                {rot==="ja" && (
                  <div style={{marginTop:10,padding:"8px 12px",background:"#eaf3ee",border:"1px solid #a8d8b8",borderRadius:6,fontSize:12,color:"#2a6e4a"}}>
                    🏠 <strong>ROT-avdrag:</strong> Kunden kan begära {rotBelopp.toLocaleString("sv-SE")} kr i avdrag. Er utbetalning: {(pArbete-rotBelopp+pMaterial+moms).toLocaleString("sv-SE")} kr.
                  </div>
                )}
              </div>

              {/* Villkor */}
              <div style={{...s.os,borderBottom:"none"}}>
                <div style={s.osTitle}>Villkor</div>
                <textarea style={s.editTA} value={villkor} onChange={e=>setVillkor(e.target.value)} rows={2}/>
              </div>

            </div>

            {/* Actions */}
            <div style={s.actRow}>
              <button style={s.actBtn(false)} onClick={()=>setStep(1)}>← Redigera</button>
              <button style={s.actBtn(false)} onClick={()=>{
                const txt = `OFFERT – ${kundNamn||"Kund"}\n\nARBETSBESKRIVNING\n${arbete}\n\nTOTALT INKL. MOMS: ${total.toLocaleString("sv-SE")} kr\n\nVILLKOR\n${villkor}`;
                navigator.clipboard.writeText(txt).then(()=>alert("Kopierat!"));
              }}>📋 Kopiera</button>
              <button style={s.actBtn(true)} onClick={()=>alert("I mobilappen skickas offerten som PDF till kunden via e-post eller SMS.")}>📨 Skicka till kund</button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
