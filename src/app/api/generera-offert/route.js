import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SIZE_MAP = {
  litet: "2–8 timmar",
  medium: "1–3 dagar",
  stort: "1 vecka eller mer",
};

export async function POST(req) {
  try {
    const {
      jobDesc = "",
      jobType = "",
      kundNamn = "",
      timpris = 650,
      matUpplag = 20,
      rot = "nej",
      jobSize = "medium",
    } = await req.json();

    if (!jobDesc || jobDesc.trim().length < 5) {
      return NextResponse.json({ error: "Jobbeskrivning saknas." }, { status: 400 });
    }

    const prompt = `Du är en erfaren svensk hantverkare som skriver proffsiga offerter på svenska.

Jobb: ${jobDesc}
${jobType ? `Typ: ${jobType}` : ""}
Storlek: ${SIZE_MAP[jobSize] ?? SIZE_MAP.medium}
Timpris: ${timpris} kr/tim exkl. moms
Materialupplägg: ${matUpplag}%
ROT: ${rot === "ja" ? "Ja" : "Nej"}

Svara ENBART med JSON utan backticks:
{
  "arbetsbeskrivning": "2-3 meningar till kunden",
  "material": [{"namn":"...","antal":"...","apris":0}],
  "arbetstimmar": 8,
  "villkor": "Betalningsvillkor 30 dagar netto."
}

3–5 realistiska materialposter med svenska priser 2025.`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content.map(b => b.text ?? "").join("");
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Oväntat svar från AI.");
    const parsed = JSON.parse(match[0]);

    const pArbete = Math.round((parsed.arbetstimmar ?? 8) * timpris);
    const pMaterialRaw = (parsed.material ?? []).reduce((s, m) => s + (m.apris ?? 0), 0);
    const pMaterial = Math.round(pMaterialRaw * (1 + matUpplag / 100));
    const subtot = pArbete + pMaterial;
    const moms = Math.round(subtot * 0.25);
    const total = subtot + moms;

    return NextResponse.json({
      arbetsbeskrivning: parsed.arbetsbeskrivning ?? "",
      material: parsed.material ?? [],
      villkor: parsed.villkor ?? "Betalningsvillkor 30 dagar netto.",
      priser: { pArbete, pMaterial, subtot, moms, total },
    });

  } catch (err) {
    console.error("Offert-fel:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
