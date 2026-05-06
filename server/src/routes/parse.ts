import { Hono } from "hono";
import { extractReceipt } from "../lib/extractor";
import { saveReceipt } from "../lib/db";
import type { Database } from "bun:sqlite";
import { v4 as uuidv4 } from "uuid";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export function parseRouter(db: Database) {
  const app = new Hono();

  app.post("/", async (c) => {
    const formData = await c.req.formData();
    const file = formData.get("image");

    if (!file || typeof file === "string") {
      return c.json({ error: "No image provided" }, 400);
    }

    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Only JPG and PNG images are supported" }, 400);
    }

    const uploadsDir = join(process.cwd(), "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const ext = file.type === "image/png" ? "png" : "jpg";
    const filename = `${uuidv4()}.${ext}`;
    const filePath = join(uploadsDir, filename);
    const imageBuffer = Buffer.from(await file.arrayBuffer());

    await writeFile(filePath, imageBuffer);

    const imageUrl = `/uploads/${filename}`;

    try {
      const { receipt } = await extractReceipt(imageBuffer, file.type, imageUrl);

      const now = new Date().toISOString();
      const fullReceipt = {
        ...receipt,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
      };

      if (fullReceipt.parseStatus !== "failed") {
        saveReceipt(db, fullReceipt);
      }

      return c.json(fullReceipt);
    } catch (err) {
      return c.json({ error: "Failed to process receipt", details: err instanceof Error ? err.message : String(err) }, 500);
    }
  });

  return app;
}
