import { describe, expect, test, mock } from "bun:test";
import { withRetry, mergeResults } from "../src/lib/extractor";
import type { AzureExtractResult } from "../src/lib/azureDoc";
import type { GroqExtractResult } from "../src/lib/groq";

describe("withRetry", () => {
  test("returns result on first success", async () => {
    const fn = mock(() => Promise.resolve("ok"));
    const result = await withRetry(fn, 3);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("retries on failure and eventually succeeds", async () => {
    let calls = 0;
    const fn = mock(() => {
      calls++;
      if (calls < 3) return Promise.reject(new Error("fail"));
      return Promise.resolve("ok");
    });
    const result = await withRetry(fn, 3, 0);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test("throws after max retries", async () => {
    const fn = mock(() => Promise.reject(new Error("always fail")));
    await expect(withRetry(fn, 3, 0)).rejects.toThrow("always fail");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe("mergeResults", () => {
  test("fills missing Azure fields from Groq", () => {
    const azure: AzureExtractResult = {
      merchant: null,
      date: "2026-05-06",
      lineItems: [],
      total: null,
      currency: "USD",
      hasLowConfidence: true,
    };
    const groq: GroqExtractResult = {
      merchant: "Starbucks",
      date: "2026-05-06",
      lineItems: [{ id: "g1", name: "Latte", amount: 5.5, type: "item", confidence: "low" }],
      total: 5.5,
      currency: "USD",
      rawResponse: "{}",
    };
    const merged = mergeResults(azure, groq);
    expect(merged.merchant).toBe("Starbucks");
    expect(merged.total).toBe(5.5);
    expect(merged.lineItems).toHaveLength(1);
  });

  test("prefers Azure fields when present", () => {
    const azure: AzureExtractResult = {
      merchant: "Azure Merchant",
      date: "2026-05-06",
      lineItems: [{ id: "a1", name: "Coffee", amount: 4.0, type: "item", confidence: "high" }],
      total: 4.0,
      currency: "USD",
      hasLowConfidence: false,
    };
    const groq: GroqExtractResult = {
      merchant: "Groq Merchant",
      date: "2026-05-06",
      lineItems: [],
      total: 99.0,
      currency: "USD",
      rawResponse: "{}",
    };
    const merged = mergeResults(azure, groq);
    expect(merged.merchant).toBe("Azure Merchant");
    expect(merged.total).toBe(4.0);
  });
});
