import { describe, expect, test } from "vitest";
import { calcTotal, totalMatchesExtracted } from "../src/lib/totalCalc";
import type { LineItem } from "../src/lib/api";

describe("calcTotal", () => {
  test("sums all positive line items", () => {
    const items: LineItem[] = [
      { id: "1", name: "Coffee", amount: 4.5, type: "item", confidence: "high" },
      { id: "2", name: "Tax", amount: 0.36, type: "tax", confidence: "high" },
    ];
    expect(calcTotal(items)).toBeCloseTo(4.86);
  });

  test("subtracts discounts", () => {
    const items: LineItem[] = [
      { id: "1", name: "Coffee", amount: 5.0, type: "item", confidence: "high" },
      { id: "2", name: "Coupon", amount: 1.0, type: "discount", confidence: "high" },
    ];
    expect(calcTotal(items)).toBeCloseTo(4.0);
  });

  test("returns 0 for empty list", () => {
    expect(calcTotal([])).toBe(0);
  });
});

describe("totalMatchesExtracted", () => {
  test("returns true when within tolerance", () => {
    expect(totalMatchesExtracted(10.0, 10.01)).toBe(true);
  });

  test("returns false when outside tolerance", () => {
    expect(totalMatchesExtracted(10.0, 10.1)).toBe(false);
  });
});
