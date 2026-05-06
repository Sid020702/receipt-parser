# Receipt Parser

Upload a receipt photo → get structured data → review and correct inline → save.

## Stack

- **Backend:** Bun + Hono + Groq (llama-4-scout vision) + SQLite (`bun:sqlite`)
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
| `GROQ_API_KEY` | Groq API key (free at console.groq.com) |
| `PORT` | Server port (default: 3001) |

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

A web app that takes a photo of a receipt and extracts structured data from it — merchant name, date, line items with quantities and types, total, and currency. It uses Groq's llama-4-scout vision model with 3 retries and exponential backoff to extract structured data from the image. The extracted data is shown in an editable UI where users can correct any mistakes, reorder line items via drag and drop, and save to a local SQLite database. The frontend is React with Tailwind, the backend is Bun with Hono, and everything runs with a single `npm run dev`.

---

## Tradeoffs I'd Defend

**1. Groq (llama-4-scout) over a purpose-built OCR model**

Groq's llama-4-scout vision model handles the full extraction in a single call — no prompt chaining, no separate OCR step. Responses come back in under 3 seconds on average, which keeps the upload-to-edit flow feeling fast. It performs well across diverse receipt formats including non-English receipts, unusual surcharge codes, and locale-specific number formats. The alternative was Azure Document Intelligence's prebuilt Receipt model, which returns typed fields with per-field confidence scores but costs more, adds vendor lock-in, and requires a separate API integration. The tradeoff with Groq is that a general vision LLM has more variance and can occasionally hallucinate structure — mitigated by a constrained prompt and 3 retries with exponential backoff. Cost is zero on the free tier.

**2. Prompt-level filtering over post-processing**

Summary rows (subtotal, cash, change) appear on almost every receipt and are not line items. I handle this in two places: the prompt explicitly tells the model to exclude them, and a server-side regex filter catches anything that slips through. The prompt-first approach means less post-processing code; the regex is a safety net, not the primary mechanism. The tradeoff is that prompt instructions aren't guaranteed — hence the fallback filter.

**3. SQLite over Postgres**

For a local-first single-user tool, SQLite is the right fit. No server to run, no connection pool to manage, zero ops overhead. `bun:sqlite` is built into the runtime — no native module compilation, no version mismatch. The tradeoff is that it doesn't scale to concurrent writes across multiple users, but that's not the problem being solved here. If this were a multi-user SaaS, I'd swap the DB layer — Zod schemas are the single source of truth, so that migration would be isolated to `db.ts`.

---

## Where I Used an LLM

- **Claude (Claude Code):** Used throughout for implementation — server routes, extraction pipeline, schema design, React components, and debugging. Drove all architecture and product decisions myself; Claude wrote the code.
- **Groq (llama-4-scout):** Receipt extraction. Wrote and iterated the prompt based on real failure cases: summary rows being included as line items, comma-separator currency misreads (24,000 IDR parsed as 24), non-standard surcharge codes like "SVG CHG" and "PB1" being dropped, and null fields crashing the Zod parser.

---

## What I'd Do With Another Week

1. **Better currency handling.** Currency is extracted as a code (USD, IDR) but amounts aren't normalized. A receipt in IDR showing "24,000" could be misread without locale context. I'd store the raw string alongside the parsed number and add locale-aware parsing.

2. **Batch upload.** The current flow is one receipt at a time. Expense tracking is usually done in batches — you photograph 10 receipts after a trip. I'd add a queue with per-receipt status rather than blocking on each.

3. **Export.** Saved receipts are only visible in the app. CSV or JSON export would make this actually useful for feeding into accounting tools or spreadsheets.

4. **Receipt image preprocessing.** Images are only resized when they exceed Groq's request limit. Preprocessing all images — deskewing, contrast enhancement, denoising — would improve OCR accuracy on low-quality or angled photos before they even reach the model.

---

## One Thing I'd Push Back On

The spec asks for "inline review/correction UI" but doesn't say what happens after the user corrects and saves. There's no export, no integration, no way to get the data out of the app. If the goal is expense tracking, a receipt that's been reviewed and saved but is trapped in a local SQLite database hasn't actually solved the problem. I'd push back and ask: what does "done" look like for a receipt? Is there a downstream system — an accounting tool, a spreadsheet, an approval workflow? The correction UI is only valuable if the corrected data goes somewhere useful. Without that answer, there's a real risk of building a polished dead end.
