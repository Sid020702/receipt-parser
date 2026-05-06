import { extractWithAzure, type AzureExtractResult } from "./azureDoc";
import { extractWithGroq, type GroqExtractResult, type AzurePartial } from "./groq";
import type { LineItem, Receipt } from "../types";

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

export function mergeResults(azure: AzureExtractResult, groq: GroqExtractResult): {
  merchant: string | null;
  date: string | null;
  lineItems: LineItem[];
  total: number | null;
  currency: string;
} {
  return {
    merchant: azure.merchant ?? groq.merchant,
    date: azure.date ?? groq.date,
    lineItems: groq.lineItems.length > azure.lineItems.length ? groq.lineItems : azure.lineItems.length > 0 ? azure.lineItems : groq.lineItems,
    total: azure.total ?? groq.total,
    currency: azure.currency || groq.currency,
  };
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

  let azureResult: AzureExtractResult | null = null;
  let azureError: Error | null = null;

  try {
    console.log("[extractor] Calling Azure Document Intelligence...");
    azureResult = await withRetry(() => extractWithAzure(imageBuffer, mimeType), 3);
    console.log("[extractor] Azure result:", JSON.stringify({
      merchant: azureResult.merchant,
      date: azureResult.date,
      total: azureResult.total,
      currency: azureResult.currency,
      lineItemCount: azureResult.lineItems.length,
      hasLowConfidence: azureResult.hasLowConfidence,
    }));
  } catch (err) {
    azureError = err instanceof Error ? err : new Error(String(err));
    console.error("[extractor] Azure failed:", azureError.message);
  }

  const needsGroq =
    !azureResult ||
    azureResult.hasLowConfidence ||
    azureResult.lineItems.length === 0 ||
    !azureResult.total ||
    !azureResult.merchant;

  console.log(`[extractor] Needs Groq fallback: ${needsGroq}`, !azureResult ? "(no azure result)" :
    `merchant=${azureResult.merchant}, total=${azureResult.total}, items=${azureResult.lineItems.length}, lowConf=${azureResult.hasLowConfidence}`);

  let groqResult: GroqExtractResult | null = null;
  let rawLlmResponse: string | undefined;

  if (needsGroq) {
    try {
      console.log("[extractor] Calling Groq fallback...");
      const azurePartial: AzurePartial | undefined = azureResult ?? undefined;
      groqResult = await withRetry(() => extractWithGroq(imageBuffer, mimeType, azurePartial), 3);
      rawLlmResponse = groqResult.rawResponse;
      console.log("[extractor] Groq result:", JSON.stringify({
        merchant: groqResult.merchant,
        date: groqResult.date,
        total: groqResult.total,
        lineItemCount: groqResult.lineItems.length,
      }));
    } catch (err) {
      console.error("[extractor] Groq also failed:", err instanceof Error ? err.message : String(err));
    }
  }

  if (!azureResult && !groqResult) {
    console.error("[extractor] Both Azure and Groq failed — returning failed status");
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

  const merged = azureResult && groqResult
    ? mergeResults(azureResult, groqResult)
    : azureResult
    ? { merchant: azureResult.merchant, date: azureResult.date, lineItems: azureResult.lineItems, total: azureResult.total, currency: azureResult.currency }
    : { merchant: groqResult!.merchant, date: groqResult!.date, lineItems: groqResult!.lineItems, total: groqResult!.total, currency: groqResult!.currency };

  return {
    receipt: {
      merchant: merged.merchant ?? "",
      date: merged.date ?? "",
      lineItems: merged.lineItems,
      total: merged.total ?? 0,
      currency: merged.currency,
      parseStatus: "success",
      imageUrl,
      rawLlmResponse,
    },
  };
}
