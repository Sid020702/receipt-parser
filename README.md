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

## Design Decisions

### Model choice: Azure Document Intelligence + Groq fallback

Azure's prebuilt Receipt model is purpose-built for receipts — it returns merchant, date, line items, and totals as typed fields with native per-field confidence scores, requiring no prompt engineering. At $0.001/page (500 free/month), it's cheaper and more accurate than general vision LLMs for this domain.

Groq (llama-4-maverick, free tier) serves as fallback when Azure returns low-confidence or missing fields. It's the fastest inference available and costs nothing.

### What counts as a line item

Everything: purchased items, taxes, tips, discounts, fees. Each line item has a `type` field (`item | tax | discount | tip | fee | other`) so the frontend can group and style them appropriately. Stripping tax/tip would lose data needed for expense tracking. The `other` category catches edge cases (bottle deposits, bag fees) and shows the raw receipt text in a tooltip so users know what they're correcting.

### Confidence highlighting

Fields with Azure confidence < 0.7, and all Groq-filled fields, are highlighted yellow with a tooltip: "Uncertain — please verify." Users see exactly what to review rather than checking everything blindly.

### Error handling

3 retries with exponential backoff (1s → 2s → 4s) on both Azure and Groq independently. If all fail, the app shows any raw model output and lets the user fill fields manually. We fail loudly — no silent data loss.

### Correction UX

The receipt image stays visible beside the editor at all times so users can cross-reference without scrolling. All fields are click-to-edit inline. The total auto-recalculates as line items change and shows a warning when it differs from the extracted value.

## Running Tests

```bash
# Server tests (schema validation, db round-trip, retry logic)
cd server && bun test

# Client tests (total recalculation logic)
cd client && bun run vitest run
```
