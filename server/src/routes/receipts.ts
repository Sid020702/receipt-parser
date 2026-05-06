import { Hono } from "hono";
import { getReceipts, saveReceipt, updateReceipt } from "../lib/db";
import { ReceiptSchema } from "../lib/schema";
import type { Database } from "bun:sqlite";

export function receiptsRouter(db: Database) {
  const app = new Hono();

  app.get("/", (c) => {
    try {
      const receipts = getReceipts(db);
      return c.json(receipts);
    } catch (err) {
      return c.json({ error: "Failed to retrieve receipts" }, 500);
    }
  });

  app.post("/", async (c) => {
    const body = await c.req.json();
    const parsed = ReceiptSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid receipt data", details: parsed.error.flatten() }, 400);
    }
    saveReceipt(db, parsed.data);
    return c.json({ id: parsed.data.id }, 201);
  });

  app.delete("/:id", (c) => {
    const id = c.req.param("id");
    try {
      db.prepare("DELETE FROM receipts WHERE id = ?").run(id);
      return c.json({ ok: true });
    } catch (err) {
      return c.json({ error: "Failed to delete receipt" }, 500);
    }
  });

  app.put("/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    const patch = ReceiptSchema.partial().safeParse(body);
    if (!patch.success) {
      return c.json({ error: "Invalid receipt data", details: patch.error.flatten() }, 400);
    }
    try {
      const updated = updateReceipt(db, id, patch.data);
      return c.json(updated);
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) {
        return c.json({ error: "Receipt not found" }, 404);
      }
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  return app;
}
