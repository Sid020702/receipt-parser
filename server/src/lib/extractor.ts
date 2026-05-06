import { extractWithAzure, type AzureExtractResult } from "./azureDoc";
import { extractWithGroq, type GroqExtractResult } from "./groq";
import type { LineItem, Receipt } from "../types";
import { v4 as uuidv4 } from "uuid";

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
    lineItems: azure.lineItems.length > 0 ? azure.lineItems : groq.lineItems,
    total: azure.total ?? groq.total,
    currency: azure.currency !== "USD" ? azure.currency : groq.currency,
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
  let azureResult: AzureExtractResult | null = null;
  let azureError: Error | null = null;

  try {
    azureResult = await withRetry(() => extractWithAzure(imageBuffer, mimeType), 3);
  } catch (err) {
    azureError = err instanceof Error ? err : new Error(String(err));
  }

  const needsGroq =
    !azureResult ||
    azureResult.hasLowConfidence ||
    !azureResult.merchant ||
    !azureResult.total ||
    azureResult.lineItems.length === 0;

  let groqResult: GroqExtractResult | null = null;
  let rawLlmResponse: string | undefined;

  if (needsGroq) {
    try {
      groqResult = await withRetry(() => extractWithGroq(imageBuffer, mimeType), 3);
      rawLlmResponse = groqResult.rawResponse;
    } catch {
      // Groq also failed — will return failed status below
    }
  }

  if (!azureResult && !groqResult) {
    return {
      receipt: {
        merchant: "",
        date: "",
        lineItems: [],
        total: 0,
        currency: "USD",
        parseStatus: "failed",
        imageUrl,
        rawLlmResponse: azureError?.message,
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
