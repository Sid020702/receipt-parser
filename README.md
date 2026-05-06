# Receipt Parser

Upload a receipt photo → get structured data → review and correct inline → save.

## Stack

- **Backend:** Bun + Hono + Azure Document Intelligence + Groq (fallback) + SQLite (`bun:sqlite`)
- **Frontend:** React 18 + Vite + Tailwind CSS + @dnd-kit (drag reorder) + Radix UI tooltips

## Quick Start

### 1. Install dependencies

```bash
bun install && bun install --cwd server && bun install --cwd client
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Description |
|---|---|
| `AZURE_DOC_INTELLIGENCE_ENDPOINT` | Azure Form Recognizer endpoint URL |
| `AZURE_DOC_INTELLIGENCE_KEY` | Azure Form Recognizer API key |
| `GROQ_API_KEY` | Groq API key (free at console.groq.com) |
| `PORT` | Server port (default: 3001) |

**Getting Azure credentials:**
1. Go to [portal.azure.com](https://portal.azure.com)
2. Create a "Document Intelligence" resource (free tier: 500 pages/month)
3. Copy endpoint and key from "Keys and Endpoint" tab

**Getting Groq credentials:**
1. Sign up at [console.groq.com](https://console.groq.com)
2. Create an API key (free tier, no credit card required)

### 3. Run

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

---

## What I Built

A web app that takes a photo of a receipt and extracts structured data from it — merchant name, date, line items with quantities and types, total, and currency. It uses Azure Document Intelligence as the primary extractor and falls back to Groq (llama-4-scout) when Azure misses fields like merchant or returns low-confidence results. The extracted data is shown in an editable UI where users can correct any mistakes, reorder line items via drag and drop, and save to a local SQLite database. The frontend is React with Tailwind, the backend is Bun with Hono, and everything runs with a single `npm run dev`.

---

## Tradeoffs I'd Defend

**1. Azure Document Intelligence as primary extractor, not a general vision LLM**

Azure's prebuilt Receipt model returns typed, structured fields — merchant, date, line items, total — with per-field confidence scores, without any prompt engineering. A general vision LLM can hallucinate structure or misread amounts; Azure was trained specifically on receipts and handles edge cases like currency values and date formats natively. The tradeoff is vendor lock-in and a cold-start latency of ~3-5 seconds per call. I accepted that because accuracy on the primary path matters more than speed, and the Groq fallback covers the cases Azure misses rather than replacing it entirely.

**2. Groq as fallback rather than running both in parallel**

I only call Groq when Azure misses a critical field (merchant, total, or line items). Running both always and merging would give higher recall but doubles latency and cost on every request. The current approach keeps the fast path fast — most receipts fully succeed through Azure — and only pays the extra cost when it's actually needed. The merge logic prefers Groq's line items when it extracts more than Azure, so the fallback genuinely adds value rather than just patching one field.

**3. SQLite over Postgres**

For a local-first single-user tool, SQLite is the right fit. No server to run, no connection pool to manage, zero ops overhead. `bun:sqlite` is built into the runtime — no native module compilation, no version mismatch. The tradeoff is that it doesn't scale to concurrent writes across multiple users, but that's not the problem being solved here. If this were a multi-user SaaS, I'd swap the DB layer — Zod schemas are the single source of truth, so that migration would be isolated to `db.ts`.

---

## Where I Used an LLM

- **Claude (Claude Code):** Used throughout for implementation — server routes, extraction pipeline, schema design, React components, and debugging. Wrote the overall architecture and made all design decisions myself; Claude executed the code.
- **Azure Document Intelligence:** Primary receipt extraction — structured field extraction with confidence scores, no prompting required.
- **Groq (llama-4-scout):** Fallback vision model when Azure misses fields. Wrote the prompt myself, iterated on it based on real failure cases (summary rows being included as line items, comma-separator currency misreads, non-standard surcharge codes like "SVG CHG").

---

## What I'd Do With Another Week

1. **Better currency handling.** Right now currency is extracted as a code (USD, IDR) but amounts aren't normalized. A receipt in IDR showing "24,000" might be parsed as 24 by a model that doesn't understand the locale. I'd add locale-aware amount parsing and store the raw string alongside the parsed number.

2. **Batch upload.** The current flow is one receipt at a time. Expense tracking is usually done in batches — you photograph 10 receipts after a trip. I'd add a queue with per-receipt status rather than blocking on each.

3. **Export.** Saved receipts are only visible in the app. CSV or JSON export would make this actually useful for feeding into accounting tools or spreadsheets.

4. **Smarter merge logic.** The current Azure + Groq merge is naive — more items wins. A better approach would be field-level merging with confidence-weighted selection, and deduplication when both models extract the same line item with slightly different names.

---

## One Thing I'd Push Back On

The spec asks for "inline review/correction UI" but doesn't say what happens after the user corrects and saves. There's no export, no integration, no way to get the data out of the app. If the goal is expense tracking, a receipt that's been reviewed and saved but is trapped in a local SQLite database hasn't actually solved the problem. I'd push back and ask: what does "done" look like for a receipt? Is there a downstream system — an accounting tool, a spreadsheet, an approval workflow? The correction UI is only valuable if the corrected data goes somewhere useful. Without that answer, there's a real risk of building a polished dead end.
