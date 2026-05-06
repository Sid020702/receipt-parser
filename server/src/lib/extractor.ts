import { extractWithGroq, type GroqExtractResult } from "./groq";
import type { Receipt } from "../types";

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error = new Error("Unknown error");
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

export interface ExtractReceiptResult {
  receipt: Omit<Receipt, "id" | "createdAt" | "updatedAt">;
}

export async function extractReceipt(
  imageBuffer: Buffer,
  mimeType: string,
  imageUrl: string
): Promise<ExtractReceiptResult> {
  console.log(`[extractor] Starting extraction for ${imageUrl} (${imageBuffer.length} bytes, ${mimeType})`);

  let groqResult: GroqExtractResult | null = null;

  try {
    console.log("[extractor] Calling Groq...");
    groqResult = await withRetry(() => extractWithGroq(imageBuffer, mimeType), 3);
    console.log("[extractor] Groq result:", JSON.stringify({
      merchant: groqResult.merchant,
      date: groqResult.date,
      total: groqResult.total,
      lineItemCount: groqResult.lineItems.length,
      currency: groqResult.currency,
    }));
  } catch (err) {
    console.error("[extractor] Groq failed:", err instanceof Error ? err.message : String(err));
  }

  if (!groqResult) {
    console.error("[extractor] Groq failed — returning failed status");
    return {
      receipt: {
        merchant: "",
        date: "",
        lineItems: [],
        total: 0,
        currency: "",
        parseStatus: "failed",
        imageUrl,
        rawLlmResponse: undefined,
      },
    };
  }

  return {
    receipt: {
      merchant: groqResult.merchant ?? "",
      date: groqResult.date ?? "",
      lineItems: groqResult.lineItems,
      total: groqResult.total ?? 0,
      currency: groqResult.currency,
      parseStatus: "success",
      imageUrl,
      rawLlmResponse: groqResult.rawResponse,
    },
  };
}
