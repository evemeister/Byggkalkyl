import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";

dotenv.config();

const app  = express();
const port = process.env.PORT || 3001;
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ── Health check ──────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "AI-Offert backend körs" });
});

// ── POST /generera-offert ─────────────────────────────
app.post("/generera-offert", async (req, res) => {
  const {
    jobDesc,
    jobType     = "",
    kundNamn    = "",
    kundAdr     = "",
    timpris     = 650,
    matUpplag   = 20,
    rot         = "nej",
    jobSize     = "medium",
    extraNotes  = "",
    images      = [],   // base64-strängar
  } = req.body;

  if (!jobDesc || jobDesc.trim().length < 5) {
    return res.status(400).json({ error: "Jobbeskrivning saknas eller för kort." });
  }

  const sizeMap = {
    litet:  "2–8 timmar",
    medium: "1–3 dagar",
    stort:  "1 vecka eller mer",
  };

  const prompt = `Du är en erfaren svensk hantverkare som skriver proffsiga offerter på svenska.

Jobbeskrivning: ${jobDesc}
${jobType     ? `Jobbtyp: ${jobType}`                          : ""}
${kundNamn    ? `Kund: ${kundNamn}${kundAdr ? ", " + kundAdr : ""}` : ""}
Uppskattad storlek: ${sizeMap[jobSize] ?? sizeMap.medium}
Timpris: ${timpris} kr/tim (exkl. moms)
Materialupplägg: ${matUpplag}%
ROT-avdrag: ${rot === "ja" ? "Ja – kunden nyttjar ROT" : rot === "nej" ? "Nej" : "Osäker"}
${extraNotes  ? `Övrigt: ${extraNotes}` : ""}

Svara ENBART med ett JSON-objekt – inga förklaringar, inga backticks:
{
  "arbetsbeskrivning": "2–4 meningar som beskriver exakt vad som ingår, skrivet till kunden. Professionell och tydlig ton.",
  "material": [
    { "namn": "Materialnamn", "antal": "1 st", "apris": 500 }
  ],
  "arbetstimmar": 8,
  "villkor": "Betalningsvillkor 30 dagar netto. Offerten gäller 30 dagar från datum."
}

Krav:
- Materiallistan: 3–6 realistiska poster för just detta jobb
- Priser: marknadsmässiga för Sverige 2025
- Arbetstimmar: realistiskt för jobbets storlek
- Inga kommentarer utanför JSON-objektet`;

  try {
    // Bygg content – lägg till bilder om de finns
    const content = [];

    for (const img of images.slice(0, 4)) {
      if (img.data && img.mediaType) {
        content.push({
          type: "image",
          source: { type: "base64", media_type: img.mediaType, data: img.data },
        });
      }
    }

    content.push({ type: "text", text: prompt });

    const message = await client.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages:   [{ role: "user", content }],
    });

    const raw      = message.content.map(b => b.text || "").join("");
    const match    = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Inget JSON i svaret: " + raw.slice(0, 300));

    const parsed   = JSON.parse(match[0]);

    // Räkna ut priser
    const arbetstimmar = parsed.arbetstimmar || 8;
    const pArbete      = Math.round(arbetstimmar * timpris);
    const pMaterialRaw = parsed.material?.reduce((s, m) => s + (m.apris || 0), 0) ?? 0;
    const pMaterial    = Math.round(pMaterialRaw * (1 + matUpplag / 100));
    const subtot       = pArbete + pMaterial;
    const moms         = Math.round(subtot * 0.25);
    const total        = subtot + moms;

    res.json({
      arbetsbeskrivning: parsed.arbetsbeskrivning ?? "",
      material:          parsed.material ?? [],
      villkor:           parsed.villkor ?? "Betalningsvillkor 30 dagar netto.",
      priser: { pArbete, pMaterial, subtot, moms, total },
    });

  } catch (err) {
    console.error("Fel vid generering:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`✅  AI-Offert backend körs på http://localhost:${port}`);
  console.log(`    POST http://localhost:${port}/generera-offert`);
});
