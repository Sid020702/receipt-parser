import Groq from "groq-sdk";
import { z } from "zod";
import sharp from "sharp";
import type { LineItem } from "../types";
import { v4 as uuidv4 } from "uuid";

const MAX_GROQ_BYTES = 3 * 1024 * 1024; // 3MB base64 budget

async function compressForGroq(imageBuffer: Buffer, mimeType: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const sizeAsBase64 = Math.ceil(imageBuffer.length * 4 / 3);
  if (sizeAsBase64 <= MAX_GROQ_BYTES) return { buffer: imageBuffer, mimeType };

  console.log(`[groq] Image too large (${imageBuffer.length} bytes), compressing...`);
  const compressed = await sharp(imageBuffer)
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  console.log(`[groq] Compressed to ${compressed.length} bytes`);
  return { buffer: compressed, mimeType: "image/jpeg" };
}

const GroqReceiptSchema = z.object({
  merchant: z.string().nullable(),
  date: z.string().nullable(),
  lineItems: z.array(z.object({
    name: z.string().nullable(),
    quantity: z.number().positive().nullable().optional(),
    amount: z.number().finite(),
    type: z.enum(["item", "tax", "discount", "tip", "fee", "other"]),
    confidence: z.enum(["high", "low"]).default("high"),
    rawText: z.string().nullable().optional(),
  })),
  total: z.number().nullable(),
  currency: z.string().default(""),
});

export interface GroqExtractResult {
  merchant: string | null;
  date: string | null;
  lineItems: LineItem[];
  total: number | null;
  currency: string;
  rawResponse: string;
}

export async function extractWithGroq(imageBuffer: Buffer, mimeType: string): Promise<GroqExtractResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Groq API key not configured");
  console.log(`[groq] API key: ${apiKey.slice(0, 8)}...`);

  const client = new Groq({ apiKey });
  const { buffer: sendBuffer, mimeType: sendMime } = await compressForGroq(imageBuffer, mimeType);
  const base64 = sendBuffer.toString("base64");
  const dataUrl = `data:${sendMime};base64,${base64}`;

  const prompt = `You are a receipt parser. Extract ALL information from this receipt image.
Return ONLY valid JSON matching this exact structure, no markdown, no explanation:
{
  "merchant": "string or null",
  "date": "YYYY-MM-DD or null",
  "lineItems": [
    {
      "name": "item name",
      "quantity": 1,
      "amount": 0.00,
      "type": "item|tax|discount|tip|fee|other",
      "confidence": "high|low",
      "rawText": "original text from receipt if type is other"
    }
  ],
  "total": 0.00 or null,
  "currency": "USD or IDR or EUR etc, or empty string if unknown"
}
Rules:
- EXCLUDE summary/metadata rows: subtotal, total, grand total, total sales, total items, cash tendered, change, balance due, amount due. These are not line items.
- INCLUDE only actual charges: purchased products/services, taxes, tips, discounts, fees, surcharges.
- Use type "item" for purchased products/services.
- Use type "tax" for GST, VAT, sales tax, or any tax charge.
- Use type "discount" for any reduction, savings, or promotional amount.
- Use type "tip" for gratuity or service tip.
- Use type "fee" for delivery, service, convenience, or surcharge fees.
- Use type "other" for ANYTHING else that is an actual charge — surcharges, levies, loyalty adjustments, codes like "SVG CHG", "PB1", percentage charges. Always include rawText for "other" items.
- Include "quantity" if explicitly shown on the receipt (e.g. "2x", "Qty: 3"). Omit if not shown.
- "amount" is the line total (quantity × unit price), not the unit price.
- Set "confidence" to "low" if you are uncertain about a value — e.g. blurry text, partially visible amount, ambiguous name. Set to "high" if you can clearly read it.
- Amounts must be positive numbers (discounts too).
- If the receipt uses comma as thousands separator (e.g. "24,000" means twenty-four thousand), parse accordingly — "24,000" = 24000, not 24.`;

  const response = await client.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: dataUrl } },
          { type: "text", text: prompt },
        ],
      },
    ],
    temperature: 0,
  });

  const rawResponse = response.choices[0]?.message?.content ?? "";
  console.log(`[groq] Raw response length: ${rawResponse.length}`);
  console.log(`[groq] Raw response preview: ${rawResponse.slice(0, 300)}`);

  if (!rawResponse) throw new Error("Groq returned empty response");

  let parsed: z.infer<typeof GroqReceiptSchema>;
  try {
    const jsonStr = rawResponse.slice(rawResponse.indexOf("{"), rawResponse.lastIndexOf("}") + 1);
    parsed = GroqReceiptSchema.parse(JSON.parse(jsonStr));
  } catch (err) {
    console.error("[groq] Parse error:", err instanceof Error ? err.message : String(err));
    throw new Error(`Groq response could not be parsed: ${rawResponse.slice(0, 200)}`);
  }

  const SUMMARY_PATTERN = /^(sub\s*total|total\s*sales|total\s*items?|grand\s*total|amount\s*due|balance\s*due|cash(\s*tendered)?|change|net\s*total)$/i;

  const lineItems: LineItem[] = parsed.lineItems
    .filter((item) => item.name != null && item.name.trim() !== "" && !SUMMARY_PATTERN.test(item.name.trim()))
    .map((item) => ({
      id: uuidv4(),
      name: item.name!,
      quantity: item.quantity ?? undefined,
      amount: item.amount,
      type: item.type,
      confidence: item.confidence,
      rawText: item.rawText ?? undefined,
    }));

  return {
    merchant: parsed.merchant,
    date: parsed.date,
    lineItems,
    total: parsed.total,
    currency: parsed.currency,
    rawResponse,
  };
}
