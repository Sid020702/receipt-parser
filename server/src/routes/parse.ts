import { Hono } from "hono";
import { extractReceipt } from "../lib/extractor";
import { saveReceipt } from "../lib/db";
import type { Database } from "bun:sqlite";
import { v4 as uuidv4 } from "uuid";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";

function validateImageMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8;
  }
  if (mimeType === "image/png") {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }
  return false;
}

export function parseRouter(db: Database) {
  const app = new Hono();

  app.post("/", async (c) => {
    let formData: FormData;
    try {
      formData = await c.req.formData();
    } catch {
      return c.json({ error: "Invalid multipart form data" }, 400);
    }

    const file = formData.get("image");

    if (!file || typeof file === "string") {
      return c.json({ error: "No image provided" }, 400);
    }

    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Only JPG and PNG images are supported" }, 400);
    }

    const imageBuffer = Buffer.from(await file.arrayBuffer());

    if (!validateImageMagicBytes(imageBuffer, file.type)) {
      return c.json({ error: "File content does not match a valid JPG or PNG" }, 400);
    }

    const uploadsDir = join(process.cwd(), "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const ext = file.type === "image/png" ? "png" : "jpg";
    const filename = `${uuidv4()}.${ext}`;
    const filePath = join(uploadsDir, filename);

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
      await unlink(filePath).catch(() => {});
      return c.json({ error: "Failed to process receipt", details: err instanceof Error ? err.message : String(err) }, 500);
    }
  });

  return app;
}
