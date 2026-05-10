import { useState, useRef } from "react";

// ── Helpers ───────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = iso => new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });
const fmtAmount = n => Number(n).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CATEGORIES = [
  { id: "material",   label: "Material",         icon: "🧱" },
  { id: "verktyg",    label: "Verktyg & utrustning", icon: "🔧" },
  { id: "transport",  label: "Transport & frakt",  icon: "🚗" },
  { id: "uthyrning",  label: "Uthyrning",          icon: "🏗" },
  { id: "underentreprenad", label: "Underentreprenad", icon: "👷" },
  { id: "ovrigt",     label: "Övrigt",             icon: "📦" },
];

const PROJECTS = [
  { id: "p1", name: "Badrumsrenovering Karlsson" },
  { id: "p2", name: "Bottenplatta Lindgren" },
];

const SEED_RECEIPTS = [
  { id: uid(), date: "2026-05-02", store: "Byggmax Göteborg",   amount: 1247.50, moms: 249.50, category: "material",  projId: "p1", note: "Kakel och klister",     photo: null, status: "bokförd" },
  { id: uid(), date: "2026-05-03", store: "Hyrcenter AB",       amount: 890.00,  moms: 178.00, category: "uthyrning", projId: "p1", note: "Betongblandare 1 dag",  photo: null, status: "bokförd" },
  { id: uid(), date: "2026-05-05", store: "Ahlsell",            amount: 3420.00, moms: 684.00, category: "material",  projId: "p2", note: "Armering och distanser",photo: null, status: "ej bokförd" },
  { id: uid(), date: "2026-05-07", store: "OKQ8",               amount: 632.00,  moms: 126.40, category: "transport", projId: "p2", note: "Diesel – vecka 19",     photo: null, status: "ej bokförd" },
];

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Kvittoscanning() {
  const [receipts,    setReceipts]   = useState(SEED_RECEIPTS);
  const [projects,    setProjects]   = useState(PROJECTS);
  const [view,        setView]       = useState("arkiv");   // arkiv | scanna
  const [filterProj,  setFilterProj] = useState("all");
  const [filterCat,   setFilterCat]  = useState("all");
  const [filterStatus,setFilterStatus] = useState("all");
  const [lightbox,    setLightbox]   = useState(null);

  // Form state
  const [photo,     setPhoto]     = useState(null);  // {url, name}
  const [store,     setStore]     = useState("");
  const [date,      setDate]      = useState(todayISO());
  const [amount,    setAmount]    = useState("");
  const [moms,      setMoms]      = useState("");
  const [category,  setCategory]  = useState("material");
  const [projId,    setProjId]    = useState("p1");
  const [note,      setNote]      = useState("");
  const [saved,     setSaved]     = useState(false);

  const fileRef = useRef(null);

  // Auto-calculate moms when amount changes
  function handleAmount(val) {
    setAmount(val);
    if (val && !moms) {
      setMoms((parseFloat(val) * 0.2).toFixed(2));
    }
  }

  function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhoto({ url: ev.target.result, name: file.name });
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function saveReceipt() {
    if (!store.trim() || !amount) return;
    const r = {
      id: uid(),
      date,
      store: store.trim(),
      amount: parseFloat(amount),
      moms:   parseFloat(moms) || 0,
      category,
      projId,
      note: note.trim(),
      photo,
      status: "ej bokförd",
    };
    setReceipts(prev => [r, ...prev]);
    // Reset
    setPhoto(null); setStore(""); setAmount(""); setMoms("");
    setNote(""); setCategory("material");
    setSaved(true);
    setTimeout(() => { setSaved(false); setView("arkiv"); }, 1200);
  }

  function toggleStatus(id) {
    setReceipts(prev => prev.map(r =>
      r.id === id ? { ...r, status: r.status === "bokförd" ? "ej bokförd" : "bokförd" } : r
    ));
  }

  function deleteReceipt(id) {
    setReceipts(prev => prev.filter(r => r.id !== id));
  }

  function projName(id) {
    return projects.find(p => p.id === id)?.name || "Okänt projekt";
  }

  function catIcon(id) {
    return CATEGORIES.find(c => c.id === id)?.icon || "📦";
  }
  function catLabel(id) {
    return CATEGORIES.find(c => c.id === id)?.label || id;
  }

  // Filtered receipts
  const filtered = receipts.filter(r => {
    if (filterProj   !== "all" && r.projId   !== filterProj)   return false;
    if (filterCat    !== "all" && r.category  !== filterCat)    return false;
    if (filterStatus !== "all" && r.status    !== filterStatus)  return false;
    return true;
  });

  const totalAmount = filtered.reduce((s, r) => s + r.amount, 0);
  const totalMoms   = filtered.reduce((s, r) => s + r.moms, 0);
  const ejBokford   = receipts.filter(r => r.status === "ej bokförd").length;

  function copyReport() {
    const lines = filtered.map(r =>
      `${fmtDate(r.date)}  ${r.store.padEnd(24)}  ${fmtAmount(r.amount)} kr  ${catLabel(r.category)}  ${projName(r.projId)}`
    );
    const txt = `KVITTORAPPORT\n${"─".repeat(80)}\n${lines.join("\n")}\n${"─".repeat(80)}\nTotalt exkl. moms: ${fmtAmount(totalAmount - totalMoms)} kr\nMoms:              ${fmtAmount(totalMoms)} kr\nTotalt inkl. moms: ${fmtAmount(totalAmount)} kr`;
    navigator.clipboard.writeText(txt).then(() => alert("✓ Rapport kopierad!"));
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const bg0 = "#0e1012", bg1 = "#161a1d", bg2 = "#1c2024";
  const bdr = "#252b30", bdr2 = "#343c44";
  const ink = "#e4e0d8", muted = "#6b7177", muted2 = "#8a9199";
  const ora = "#e8652a", grn = "#3aaa6e", blu = "#4a9fd4", yel = "#f0c040";
  const red = "#e05050";

  const S = {
    app:   { fontFamily: "system-ui,sans-serif", background: bg0, minHeight: "100vh", color: ink, paddingBottom: 50 },
    hdr:   { background: bg1, borderBottom: `1px solid ${bdr}`, padding: "13px 18px", display: "flex", alignItems: "center", gap: 10 },
    h1:    { fontSize: 20, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: 1 },
    badge: (n) => ({ marginLeft: "auto", background: n > 0 ? "#2a1500" : "#0e2016", border: `1px solid ${n > 0 ? ora : grn}`, borderRadius: 20, padding: "3px 10px", fontSize: 10, color: n > 0 ? ora : grn, fontFamily: "monospace" }),

    nav:   { background: bg1, borderBottom: `1px solid ${bdr}`, display: "flex" },
    nb:  a => ({ flex: 1, padding: "12px 4px", textAlign: "center", fontSize: 10, fontWeight: a ? 700 : 400, color: a ? ora : muted, borderBottom: a ? `2px solid ${ora}` : "2px solid transparent", cursor: "pointer", letterSpacing: 1, textTransform: "uppercase", fontFamily: "monospace" }),

    body:  { maxWidth: 600, margin: "0 auto", padding: "16px 12px" },

    // Stats
    statRow: { display: "flex", gap: 8, marginBottom: 14 },
    stat:  c => ({ flex: 1, background: bg2, border: `1.5px solid ${c}33`, borderRadius: 10, padding: "12px 10px", textAlign: "center" }),
    sVal:  c => ({ fontFamily: "monospace", fontSize: 18, fontWeight: 800, color: c, lineHeight: 1 }),
    sLbl:  { fontSize: 9, color: muted, marginTop: 3, letterSpacing: 1, textTransform: "uppercase", fontFamily: "monospace" },

    // Filters
    filterRow: { display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" },
    fsel:  { flex: 1, minWidth: 120, border: `1.5px solid ${bdr}`, borderRadius: 8, overflow: "hidden", background: bg2 },
    sel:   { width: "100%", border: "none", outline: "none", padding: "8px 10px", background: "transparent", fontSize: 12, color: ink, appearance: "none", fontFamily: "monospace" },

    // Receipt card
    rcard: (s) => ({
      background: bg2,
      border: `1.5px solid ${s === "bokförd" ? grn + "55" : bdr}`,
      borderRadius: 10,
      marginBottom: 8,
      overflow: "hidden",
      transition: "border-color .2s",
    }),
    rcTop: { padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" },
    rcPhoto: { width: 52, height: 52, borderRadius: 7, overflow: "hidden", flexShrink: 0, background: bg1, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
    rcInfo: { flex: 1, minWidth: 0 },
    rcStore: { fontSize: 14, fontWeight: 700, color: ink, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    rcMeta: { fontSize: 11, color: muted, fontFamily: "monospace" },
    rcNote: { fontSize: 11, color: muted2, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    rcAmount: { textAlign: "right", flexShrink: 0 },
    rcAmtVal: { fontFamily: "monospace", fontSize: 16, fontWeight: 800, color: ora, lineHeight: 1 },
    rcAmtSub: { fontSize: 10, color: muted, fontFamily: "monospace", marginTop: 2 },
    rcBot: { padding: "8px 14px", borderTop: `1px solid ${bdr}`, display: "flex", gap: 6, alignItems: "center" },
    catBadge: (id) => {
      const colors = { material:"#2a1f0d", verktyg:"#0d2230", transport:"#0d2a1a", uthyrning:"#1a1a2a", underentreprenad:"#2a1a1a", ovrigt:"#1a1a1a" };
      const txts =   { material:yel,       verktyg:blu,        transport:grn,       uthyrning:"#a87edc",  underentreprenad:red,        ovrigt:muted2 };
      return { display:"inline-flex", alignItems:"center", gap:4, background:colors[id]||"#1a1a1a", borderRadius:12, padding:"3px 8px", fontSize:10, color:txts[id]||muted, fontFamily:"monospace" };
    },
    statusBadge: (s) => ({
      marginLeft: "auto",
      display: "inline-flex", alignItems: "center", gap:4,
      background: s === "bokförd" ? "#0e2016" : "#2a1500",
      border: `1px solid ${s === "bokförd" ? grn+"55" : ora+"55"}`,
      borderRadius: 12, padding: "3px 10px",
      fontSize: 10, color: s === "bokförd" ? grn : ora,
      cursor: "pointer", fontFamily: "monospace",
      userSelect: "none",
    }),
    delBtn: { width: 26, height: 26, borderRadius: 5, border: `1px solid ${bdr}`, background: "none", cursor: "pointer", fontSize: 11, color: muted, display: "flex", alignItems: "center", justifyContent: "center" },

    // ── SCANNA ──
    photoZone: (hasPhoto) => ({
      width: "100%",
      aspectRatio: "4/3",
      maxHeight: 260,
      borderRadius: 12,
      border: `2px dashed ${hasPhoto ? ora : bdr2}`,
      background: hasPhoto ? "#1a1208" : bg2,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      cursor: "pointer", marginBottom: 14, overflow: "hidden", position: "relative",
      transition: "all .2s",
    }),
    photoZoneImg: { width: "100%", height: "100%", objectFit: "cover" },
    photoZoneIcon: { fontSize: 40, marginBottom: 8, opacity: .5 },
    photoZoneTxt: { fontSize: 12, color: muted, fontFamily: "monospace", letterSpacing: 1 },
    photoChangeBtn: { position: "absolute", bottom: 10, right: 10, padding: "5px 12px", borderRadius: 6, border: "none", background: "rgba(0,0,0,.7)", color: "#fff", fontSize: 11, cursor: "pointer" },

    card:  { background: bg2, border: `1.5px solid ${bdr}`, borderRadius: 10, padding: 14, marginBottom: 12 },
    slbl:  { fontFamily: "monospace", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: muted, marginBottom: 6 },
    inp:   { width: "100%", border: `1.5px solid ${bdr}`, borderRadius: 8, padding: "10px 12px", background: bg0, fontSize: 14, color: ink, boxSizing: "border-box", outline: "none", fontFamily: "monospace" },
    g2:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 },
    selW:  { border: `1.5px solid ${bdr}`, borderRadius: 8, overflow: "hidden", background: bg0 },
    selFull: { width: "100%", border: "none", outline: "none", padding: "10px 12px", background: "transparent", fontSize: 14, color: ink, appearance: "none" },
    ta:    { width: "100%", border: `1.5px solid ${bdr}`, borderRadius: 8, padding: "10px 12px", background: bg0, fontSize: 14, color: ink, resize: "none", outline: "none", lineHeight: 1.6, boxSizing: "border-box" },

    catGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 12 },
    catBtn: (active) => ({
      padding: "8px 4px", borderRadius: 8,
      border: `1.5px solid ${active ? ora : bdr}`,
      background: active ? "#2e1a0d" : bg1,
      color: active ? ora : muted,
      fontSize: 11, cursor: "pointer", textAlign: "center",
      fontFamily: "monospace", transition: "all .15s",
    }),

    saveBtn: (ok) => ({
      width: "100%", padding: "14px",
      background: ok ? (saved ? grn : ora) : bdr2,
      color: "#fff", border: "none", borderRadius: 10,
      fontSize: 16, fontWeight: 700, cursor: ok ? "pointer" : "not-allowed",
      letterSpacing: 1, transition: "background .3s",
    }),

    momsHint: { fontSize: 11, color: muted, fontFamily: "monospace", marginTop: 4 },

    // Lightbox
    lbOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.94)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, flexDirection: "column", gap: 12 },
    lbImg:     { maxWidth: "95vw", maxHeight: "85vh", borderRadius: 10, objectFit: "contain" },
    lbClose:   { position: "fixed", top: 16, right: 16, width: 36, height: 36, borderRadius: "50%", background: bdr2, border: "none", color: ink, fontSize: 18, cursor: "pointer" },
    lbCap:     { fontSize: 12, color: muted, fontFamily: "monospace" },

    emptyState: { textAlign: "center", padding: "40px 0", color: muted, fontFamily: "monospace", fontSize: 12 },

    row:   { display: "flex", gap: 8, marginBottom: 12 },
    outB:  { padding: "9px 14px", borderRadius: 8, border: `1.5px solid ${bdr}`, background: "none", color: muted2, fontSize: 12, fontWeight: 600, cursor: "pointer" },
    grnB:  { padding: "9px 14px", borderRadius: 8, border: `1.5px solid ${grn}44`, background: "#0e2016", color: grn, fontSize: 12, fontWeight: 600, cursor: "pointer" },
  };

  const canSave = store.trim().length > 0 && amount !== "";

  return (
    <div style={S.app}>

      {/* Header */}
      <div style={S.hdr}>
        <h1 style={S.h1}>KVITTO<span style={{ color: ora }}>SCAN</span></h1>
        <div style={S.badge(ejBokford)}>
          {ejBokford > 0 ? `${ejBokford} ej bokförd${ejBokford !== 1 ? "a" : ""}` : "● Allt bokfört"}
        </div>
      </div>

      {/* Nav */}
      <div style={S.nav}>
        <div style={S.nb(view === "arkiv")}  onClick={() => setView("arkiv")}>🗂 Arkiv</div>
        <div style={S.nb(view === "scanna")} onClick={() => { setView("scanna"); setSaved(false); }}>📷 Scanna</div>
      </div>

      <div style={S.body}>

        {/* ══════════ ARKIV ══════════ */}
        {view === "arkiv" && (<>

          {/* Stats */}
          <div style={S.statRow}>
            <div style={S.stat(ora)}>
              <div style={S.sVal(ora)}>{fmtAmount(totalAmount)}</div>
              <div style={S.sLbl}>Totalt kr</div>
            </div>
            <div style={S.stat(muted2)}>
              <div style={S.sVal(muted2)}>{fmtAmount(totalMoms)}</div>
              <div style={S.sLbl}>Moms kr</div>
            </div>
            <div style={S.stat(grn)}>
              <div style={S.sVal(grn)}>{filtered.length}</div>
              <div style={S.sLbl}>Kvitton</div>
            </div>
          </div>

          {/* Filters */}
          <div style={S.filterRow}>
            <div style={S.fsel}>
              <select style={S.sel} value={filterProj} onChange={e => setFilterProj(e.target.value)}>
                <option value="all">Alla projekt</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={S.fsel}>
              <select style={S.sel} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                <option value="all">Alla kategorier</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div style={S.fsel}>
              <select style={S.sel} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="all">Alla status</option>
                <option value="ej bokförd">Ej bokförda</option>
                <option value="bokförd">Bokförda</option>
              </select>
            </div>
          </div>

          {/* Receipt list */}
          {filtered.length === 0 ? (
            <div style={S.emptyState}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🧾</div>
              Inga kvitton matchar filtret.
            </div>
          ) : (
            filtered.map(r => (
              <div key={r.id} style={S.rcard(r.status)}>
                <div style={S.rcTop}>
                  {/* Photo thumbnail */}
                  <div style={S.rcPhoto} onClick={() => r.photo && setLightbox(r.photo)}>
                    {r.photo
                      ? <img src={r.photo.url} alt={r.store} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ fontSize: 22, opacity: .3 }}>🧾</span>
                    }
                  </div>
                  {/* Info */}
                  <div style={S.rcInfo}>
                    <div style={S.rcStore}>{r.store}</div>
                    <div style={S.rcMeta}>{fmtDate(r.date)} · {projName(r.projId)}</div>
                    {r.note && <div style={S.rcNote}>{r.note}</div>}
                  </div>
                  {/* Amount */}
                  <div style={S.rcAmount}>
                    <div style={S.rcAmtVal}>{fmtAmount(r.amount)}</div>
                    <div style={S.rcAmtSub}>moms {fmtAmount(r.moms)}</div>
                  </div>
                </div>
                <div style={S.rcBot}>
                  <div style={S.catBadge(r.category)}>{catIcon(r.category)} {catLabel(r.category)}</div>
                  <div style={S.statusBadge(r.status)} onClick={() => toggleStatus(r.id)}>
                    {r.status === "bokförd" ? "✓ Bokförd" : "● Ej bokförd"}
                  </div>
                  <button style={S.delBtn} onClick={() => deleteReceipt(r.id)}>🗑</button>
                </div>
              </div>
            ))
          )}

          <div style={S.row}>
            <button style={{ ...S.grnB, flex: 1 }} onClick={copyReport}>📋 Kopiera rapport</button>
            <button style={{ ...S.outB }} onClick={() => { setView("scanna"); setSaved(false); }}>+ Nytt kvitto</button>
          </div>

        </>)}

        {/* ══════════ SCANNA ══════════ */}
        {view === "scanna" && (<>

          {saved && (
            <div style={{ background: "#0e2016", border: `1.5px solid ${grn}`, borderRadius: 10, padding: "14px 18px", marginBottom: 14, textAlign: "center", fontSize: 14, color: grn, fontWeight: 700 }}>
              ✓ Kvitto sparat!
            </div>
          )}

          {/* Photo zone */}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handlePhoto} />
          <div style={S.photoZone(!!photo)} onClick={() => fileRef.current?.click()}>
            {photo ? (<>
              <img src={photo.url} alt="kvitto" style={S.photoZoneImg} />
              <button style={S.photoChangeBtn} onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>Byt foto</button>
            </>) : (<>
              <div style={S.photoZoneIcon}>📷</div>
              <div style={S.photoZoneTxt}>TRYCK FÖR ATT FOTOGRAFERA</div>
              <div style={{ fontSize: 11, color: muted, marginTop: 4, fontFamily: "monospace" }}>eller välj bild från biblioteket</div>
            </>)}
          </div>

          {/* Butik & datum */}
          <div style={S.card}>
            <div style={{ ...S.slbl, marginBottom: 10 }}>Kvittoinformation</div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ ...S.slbl, marginBottom: 4 }}>Butik / leverantör</div>
              <input style={S.inp} placeholder="t.ex. Byggmax, Ahlsell..." value={store} onChange={e => setStore(e.target.value)} />
            </div>
            <div style={S.g2}>
              <div>
                <div style={{ ...S.slbl, marginBottom: 4 }}>Datum</div>
                <input style={S.inp} type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <div style={{ ...S.slbl, marginBottom: 4 }}>Projekt</div>
                <div style={S.selW}>
                  <select style={S.selFull} value={projId} onChange={e => setProjId(e.target.value)}>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Belopp */}
          <div style={S.card}>
            <div style={{ ...S.slbl, marginBottom: 10 }}>Belopp</div>
            <div style={S.g2}>
              <div>
                <div style={{ ...S.slbl, marginBottom: 4 }}>Totalt inkl. moms</div>
                <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${bdr}`, borderRadius: 8, overflow: "hidden", background: bg0 }}>
                  <input style={{ ...S.inp, border: "none", fontSize: 20, fontWeight: 700, color: ora }} type="number" placeholder="0.00" value={amount} onChange={e => handleAmount(e.target.value)} step="0.01" />
                  <span style={{ padding: "0 10px", fontSize: 11, color: muted, borderLeft: `1px solid ${bdr}` }}>kr</span>
                </div>
              </div>
              <div>
                <div style={{ ...S.slbl, marginBottom: 4 }}>Moms</div>
                <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${bdr}`, borderRadius: 8, overflow: "hidden", background: bg0 }}>
                  <input style={{ ...S.inp, border: "none", fontSize: 20, fontWeight: 700, color: muted2 }} type="number" placeholder="0.00" value={moms} onChange={e => setMoms(e.target.value)} step="0.01" />
                  <span style={{ padding: "0 10px", fontSize: 11, color: muted, borderLeft: `1px solid ${bdr}` }}>kr</span>
                </div>
                <div style={S.momsHint}>25% = {amount ? fmtAmount(parseFloat(amount) * 0.2) : "—"} kr</div>
              </div>
            </div>
          </div>

          {/* Kategori */}
          <div style={S.card}>
            <div style={{ ...S.slbl, marginBottom: 10 }}>Kategori</div>
            <div style={S.catGrid}>
              {CATEGORIES.map(c => (
                <div key={c.id} style={S.catBtn(category === c.id)} onClick={() => setCategory(c.id)}>
                  <div style={{ fontSize: 18, marginBottom: 3 }}>{c.icon}</div>
                  <div>{c.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Anteckning */}
          <div style={S.card}>
            <div style={{ ...S.slbl, marginBottom: 6 }}>Anteckning (valfritt)</div>
            <textarea style={{ ...S.ta, minHeight: 60 }} placeholder="Vad avser kvittot?" value={note} onChange={e => setNote(e.target.value)} rows={2} />
          </div>

          <button style={S.saveBtn(canSave)} onClick={canSave ? saveReceipt : null}>
            {saved ? "✓ SPARAT!" : "SPARA KVITTO"}
          </button>

        </>)}

      </div>

      {/* Lightbox */}
      {lightbox && (
        <div style={S.lbOverlay} onClick={() => setLightbox(null)}>
          <button style={S.lbClose} onClick={() => setLightbox(null)}>✕</button>
          <img src={lightbox.url} alt="kvitto" style={S.lbImg} onClick={e => e.stopPropagation()} />
          <div style={S.lbCap}>{lightbox.name}</div>
        </div>
      )}
    </div>
  );
}
