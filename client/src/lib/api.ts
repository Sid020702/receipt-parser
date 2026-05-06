export type LineItemType = "item" | "tax" | "discount" | "tip" | "fee" | "other";
export type Confidence = "high" | "low";
export type ParseStatus = "success" | "processing" | "failed";

export interface LineItem {
  id: string;
  name: string;
  quantity?: number;
  amount: number;
  type: LineItemType;
  confidence: Confidence;
  rawText?: string;
}

export interface Receipt {
  id: string;
  merchant: string;
  date: string;
  lineItems: LineItem[];
  total: number;
  currency: string;
  rawLlmResponse?: string;
  parseStatus: ParseStatus;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export async function parseReceipt(file: File): Promise<Receipt> {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch("/api/parse", { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getReceipts(): Promise<Receipt[]> {
  const res = await fetch("/api/receipts");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function saveReceipt(receipt: Receipt): Promise<{ id: string }> {
  const res = await fetch("/api/receipts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(receipt),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteReceipt(id: string): Promise<void> {
  const res = await fetch(`/api/receipts/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}

export async function updateReceipt(id: string, patch: Partial<Receipt>): Promise<Receipt> {
  const res = await fetch(`/api/receipts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
