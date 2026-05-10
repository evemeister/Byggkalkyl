# AI-Offert Backend

## Kom igång på 3 steg

### 1. Installera
```bash
cd backend
npm install
```

### 2. Lägg in din API-nyckel
```bash
cp .env.example .env
```
Öppna `.env` och ersätt `din-nyckel-här` med din riktiga nyckel.
Hämta den på: https://console.anthropic.com/

### 3. Starta servern
```bash
npm run dev
```

Du ska se:
```
✅  AI-Offert backend körs på http://localhost:3001
    POST http://localhost:3001/generera-offert
```

---

## Testa att det fungerar

```bash
curl -X POST http://localhost:3001/generera-offert \
  -H "Content-Type: application/json" \
  -d '{"jobDesc":"Byta handfat och blandare i badrum","timpris":650,"jobSize":"litet"}'
```

Du ska få tillbaka ett JSON-objekt med `arbetsbeskrivning`, `material` och `priser`.

---

## Filstruktur

```
backend/
  server.js        ← Express-servern med Anthropic-anropet
  package.json
  .env.example     ← Kopiera till .env och fyll i API-nyckeln
  .env             ← Skapas av dig, ignoreras av git

ai-offert.jsx      ← Frontend-komponenten (anropar localhost:3001)
```

---

## Felsökning

| Problem | Lösning |
|---|---|
| `ANTHROPIC_API_KEY is missing` | Kontrollera att `.env` finns och har rätt nyckel |
| `EADDRINUSE port 3001` | Porten används – ändra PORT i `.env` till t.ex. 3002, och uppdatera URL i `ai-offert.jsx` |
| Frontend får `Failed to fetch` | Kontrollera att servern körs på rätt port |

---

## Nästa steg

När appen byggs i React Native / Next.js:
- Flytta `server.js`-logiken till en API-route (`/api/generera-offert`)
- Eller deploya backend till Railway/Render (gratis tier räcker för MVP)
- Lägg till autentisering så inte vem som helst kan använda din API-nyckel
