import type { LineItem } from "./api";

const TOLERANCE = 0.05;

export function calcTotal(items: LineItem[]): number {
  const sum = items.reduce((acc, item) => {
    return item.type === "discount" ? acc - item.amount : acc + item.amount;
  }, 0);
  return Math.round(sum * 100) / 100;
}

export function totalMatchesExtracted(calculated: number, extracted: number): boolean {
  return Math.abs(calculated - extracted) <= TOLERANCE;
}
