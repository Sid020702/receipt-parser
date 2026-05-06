import { Database } from "bun:sqlite";
import type { Receipt } from "../types";
import { ReceiptSchema } from "./schema";

export function initDb(path: string = "./data/receipts.db"): Database {
  const db = new Database(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      merchant TEXT NOT NULL,
      date TEXT NOT NULL,
      line_items TEXT NOT NULL,
      total REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      raw_llm_response TEXT,
      parse_status TEXT NOT NULL,
      image_url TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  return db;
}

export function saveReceipt(db: Database, receipt: Receipt): void {
  db.prepare(`
    INSERT INTO receipts (id, merchant, date, line_items, total, currency, raw_llm_response, parse_status, image_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    receipt.id,
    receipt.merchant,
    receipt.date,
    JSON.stringify(receipt.lineItems),
    receipt.total,
    receipt.currency,
    receipt.rawLlmResponse ?? null,
    receipt.parseStatus,
    receipt.imageUrl,
    receipt.createdAt,
    receipt.updatedAt
  );
}

export function getReceipts(db: Database): Receipt[] {
  const rows = db.prepare("SELECT * FROM receipts ORDER BY created_at DESC").all() as any[];
  return rows.map(rowToReceipt);
}

export function updateReceipt(db: Database, id: string, patch: Partial<Receipt>): Receipt {
  const existing = db.prepare("SELECT * FROM receipts WHERE id = ?").get(id) as any;
  if (!existing) throw new Error(`Receipt ${id} not found`);

  const current = rowToReceipt(existing);
  const merged: Receipt = { ...current, ...patch, id };

  db.prepare(`
    UPDATE receipts SET
      merchant = ?, date = ?, line_items = ?, total = ?, currency = ?,
      raw_llm_response = ?, parse_status = ?, image_url = ?, updated_at = ?
    WHERE id = ?
  `).run(
    merged.merchant,
    merged.date,
    JSON.stringify(merged.lineItems),
    merged.total,
    merged.currency,
    merged.rawLlmResponse ?? null,
    merged.parseStatus,
    merged.imageUrl,
    merged.updatedAt,
    id
  );

  return merged;
}

function rowToReceipt(row: any): Receipt {
  return ReceiptSchema.parse({
    id: row.id,
    merchant: row.merchant,
    date: row.date,
    lineItems: JSON.parse(row.line_items),
    total: row.total,
    currency: row.currency,
    rawLlmResponse: row.raw_llm_response ?? undefined,
    parseStatus: row.parse_status,
    imageUrl: row.image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
