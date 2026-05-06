import Groq from "groq-sdk";
import { z } from "zod";
import type { LineItem } from "../types";
import { v4 as uuidv4 } from "uuid";

const GroqReceiptSchema = z.object({
  merchant: z.string().nullable(),
  date: z.string().nullable(),
  lineItems: z.array(z.object({
    name: z.string(),
    amount: z.number(),
    type: z.enum(["item", "tax", "discount", "tip", "fee", "other"]),
    rawText: z.string().optional(),
  })),
  total: z.number().nullable(),
  currency: z.string().default("USD"),
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

  const client = new Groq({ apiKey });
  const base64 = imageBuffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const prompt = `You are a receipt parser. Extract all information from this receipt image.
Return ONLY valid JSON matching this exact structure, no markdown, no explanation:
{
  "merchant": "string or null",
  "date": "YYYY-MM-DD or null",
  "lineItems": [
    {
      "name": "item name",
      "amount": 0.00,
      "type": "item|tax|discount|tip|fee|other",
      "rawText": "original text if type is other"
    }
  ],
  "total": 0.00 or null,
  "currency": "USD"
}
Include ALL line items: purchased items, taxes, tips, discounts, fees.
Use type "other" for anything that doesn't clearly fit the other categories, and include rawText.
Amounts must be positive numbers (discounts too — the UI will style them differently by type).`;

  const response = await client.chat.completions.create({
    model: "meta-llama/llama-4-maverick-17b-128e-instruct",
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

  // Strip markdown code fences if model wraps output
  const jsonStr = rawResponse.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

  const parsed = GroqReceiptSchema.parse(JSON.parse(jsonStr));

  const lineItems: LineItem[] = parsed.lineItems.map((item) => ({
    id: uuidv4(),
    name: item.name,
    amount: item.amount,
    type: item.type,
    confidence: "low" as const,
    rawText: item.rawText,
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
