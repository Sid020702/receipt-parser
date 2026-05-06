import { describe, expect, test } from "bun:test";
import { LineItemSchema, ReceiptSchema } from "../src/lib/schema";

describe("LineItemSchema", () => {
  test("accepts valid line item", () => {
    const result = LineItemSchema.safeParse({
      id: "abc",
      name: "Coffee",
      amount: 4.5,
      type: "item",
      confidence: "high",
    });
    expect(result.success).toBe(true);
  });

  test("rejects unknown type", () => {
    const result = LineItemSchema.safeParse({
      id: "abc",
      name: "Coffee",
      amount: 4.5,
      type: "unknown",
      confidence: "high",
    });
    expect(result.success).toBe(false);
  });

  test("accepts other type with rawText", () => {
    const result = LineItemSchema.safeParse({
      id: "abc",
      name: "Misc charge",
      amount: 1.0,
      type: "other",
      confidence: "low",
      rawText: "MISC CHG 1.00",
    });
    expect(result.success).toBe(true);
  });
});

describe("ReceiptSchema", () => {
  test("accepts valid receipt", () => {
    const result = ReceiptSchema.safeParse({
      id: "r1",
      merchant: "Starbucks",
      date: "2026-05-06",
      lineItems: [
        { id: "l1", name: "Latte", amount: 5.5, type: "item", confidence: "high" },
        { id: "l2", name: "Tax", amount: 0.44, type: "tax", confidence: "high" },
      ],
      total: 5.94,
      currency: "USD",
      parseStatus: "success",
      imageUrl: "/uploads/abc.jpg",
      createdAt: "2026-05-06T10:00:00Z",
      updatedAt: "2026-05-06T10:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  test("rejects invalid parseStatus", () => {
    const result = ReceiptSchema.safeParse({
      id: "r1",
      merchant: "Starbucks",
      date: "2026-05-06",
      lineItems: [],
      total: 0,
      parseStatus: "unknown",
      imageUrl: "/uploads/abc.jpg",
      createdAt: "2026-05-06T10:00:00Z",
      updatedAt: "2026-05-06T10:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  test("defaults currency to USD", () => {
    const result = ReceiptSchema.safeParse({
      id: "r1",
      merchant: "Starbucks",
      date: "2026-05-06",
      lineItems: [],
      total: 0,
      parseStatus: "success",
      imageUrl: "/uploads/abc.jpg",
      createdAt: "2026-05-06T10:00:00Z",
      updatedAt: "2026-05-06T10:00:00Z",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.currency).toBe("USD");
  });
});
