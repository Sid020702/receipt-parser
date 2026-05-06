import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { initDb, saveReceipt, getReceipts, updateReceipt } from "../src/lib/db";
import type { Receipt } from "../src/types";
import { Database } from "bun:sqlite";

let testDb: Database;

const sampleReceipt: Receipt = {
  id: "test-1",
  merchant: "Test Merchant",
  date: "2026-05-06",
  lineItems: [
    { id: "l1", name: "Item A", amount: 10.0, type: "item", confidence: "high" },
    { id: "l2", name: "Tax", amount: 0.8, type: "tax", confidence: "high" },
  ],
  total: 10.8,
  currency: "USD",
  parseStatus: "success",
  imageUrl: "/uploads/test.jpg",
  createdAt: "2026-05-06T10:00:00Z",
  updatedAt: "2026-05-06T10:00:00Z",
};

beforeEach(() => {
  testDb = initDb(":memory:");
});

afterEach(() => {
  testDb.close();
});

describe("db", () => {
  test("saveReceipt and getReceipts round-trip", () => {
    saveReceipt(testDb, sampleReceipt);
    const receipts = getReceipts(testDb);
    expect(receipts).toHaveLength(1);
    expect(receipts[0].merchant).toBe("Test Merchant");
    expect(receipts[0].lineItems).toHaveLength(2);
    expect(receipts[0].lineItems[0].name).toBe("Item A");
  });

  test("updateReceipt modifies existing record", () => {
    saveReceipt(testDb, sampleReceipt);
    const updated = updateReceipt(testDb, "test-1", { merchant: "Updated Merchant", updatedAt: "2026-05-06T11:00:00Z" });
    expect(updated.merchant).toBe("Updated Merchant");
    expect(updated.lineItems).toHaveLength(2);
  });

  test("getReceipts returns empty array when no receipts", () => {
    const receipts = getReceipts(testDb);
    expect(receipts).toHaveLength(0);
  });
});
