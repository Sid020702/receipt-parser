import type { LineItem } from "./api";

const TOLERANCE = 0.05;

export function calcTotal(items: LineItem[]): number {
  const sum = items.reduce((acc, item) => {
    const lineTotal = item.amount * (item.quantity ?? 1);
    return item.type === "discount" ? acc - lineTotal : acc + lineTotal;
  }, 0);
  return Math.round(sum * 100) / 100;
}

export function totalMatchesExtracted(calculated: number, extracted: number): boolean {
  return Math.abs(calculated - extracted) <= TOLERANCE;
}
