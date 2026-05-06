import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer";
import type { LineItem } from "../types";
import { v4 as uuidv4 } from "uuid";

const CONFIDENCE_THRESHOLD = 0.7;

export interface AzureExtractResult {
  merchant: string | null;
  date: string | null;
  lineItems: LineItem[];
  total: number | null;
  currency: string;
  hasLowConfidence: boolean;
}

export async function extractWithAzure(imageBuffer: Buffer, mimeType: string): Promise<AzureExtractResult> {
  const endpoint = process.env.AZURE_DOC_INTELLIGENCE_ENDPOINT;
  const key = process.env.AZURE_DOC_INTELLIGENCE_KEY;

  if (!endpoint || !key) throw new Error("Azure credentials not configured");

  // mimeType is accepted for documentation purposes; the SDK infers content type from the body stream
  void mimeType;

  const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));

  try {
  const poller = await client.beginAnalyzeDocument("prebuilt-receipt", imageBuffer);

  const result = await poller.pollUntilDone();
  const doc = result.documents?.[0];

  if (!doc) throw new Error("Azure returned no document");

  const fields = doc.fields;
  let hasLowConfidence = false;

  function conf(confidence: number | undefined): "high" | "low" {
    const c = confidence ?? 0;
    if (c < CONFIDENCE_THRESHOLD) { hasLowConfidence = true; return "low"; }
    return "high";
  }

  const merchantField = fields["MerchantName"];
  const dateField = fields["TransactionDate"];
  const totalField = fields["Total"];
  const currencyField = fields["Currency"];

  const lineItems: LineItem[] = [];
  const itemsField = fields["Items"];
  if (itemsField?.kind === "array") {
    for (const item of itemsField.values ?? []) {
      if (item.kind !== "object") continue;
      const f = item.properties ?? {};
      const descField = f["Description"];
      const description = descField?.content ?? "";
      const totalPriceField = f["TotalPrice"];
      const priceField = f["Price"];
      const amountField = totalPriceField ?? priceField;
      // Currency fields have a CurrencyValue with .amount; number fields have .value directly
      let amount = 0;
      if (amountField?.kind === "currency" && amountField.value != null) {
        amount = amountField.value.amount;
      } else if (amountField?.kind === "number" && amountField.value != null) {
        amount = amountField.value;
      } else if (amountField?.value != null) {
        amount = parseFloat(String((amountField as { value: unknown }).value)) || 0;
      }
      const itemConf = conf(
        Math.min(descField?.confidence ?? 1, amountField?.confidence ?? 1)
      );
      lineItems.push({
        id: uuidv4(),
        name: description,
        amount,
        type: "item",
        confidence: itemConf,
      });
    }
  }

  const taxField = fields["TotalTax"];
  if (taxField != null) {
    let taxAmount = 0;
    if (taxField.kind === "currency" && taxField.value != null) {
      taxAmount = taxField.value.amount;
    } else if (taxField.kind === "number" && taxField.value != null) {
      taxAmount = taxField.value;
    } else if ((taxField as { value?: unknown }).value != null) {
      taxAmount = parseFloat(String((taxField as { value: unknown }).value)) || 0;
    }
    lineItems.push({
      id: uuidv4(),
      name: "Tax",
      amount: taxAmount,
      type: "tax",
      confidence: conf(taxField.confidence),
    });
  }

  const tipField = fields["Tip"];
  if (tipField != null) {
    let tipAmount = 0;
    if (tipField.kind === "currency" && tipField.value != null) {
      tipAmount = tipField.value.amount;
    } else if (tipField.kind === "number" && tipField.value != null) {
      tipAmount = tipField.value;
    } else if ((tipField as { value?: unknown }).value != null) {
      tipAmount = parseFloat(String((tipField as { value: unknown }).value)) || 0;
    }
    lineItems.push({
      id: uuidv4(),
      name: "Tip",
      amount: tipAmount,
      type: "tip",
      confidence: conf(tipField.confidence),
    });
  }

  // Extract total: may be currency or number field
  let total: number | null = null;
  if (totalField?.kind === "currency" && totalField.value != null) {
    total = totalField.value.amount;
  } else if (totalField?.kind === "number" && totalField.value != null) {
    total = totalField.value;
  }

  // Extract currency: the Currency field is a string field; fallback to USD
  let currency = "USD";
  if (currencyField?.kind === "string" && typeof currencyField.value === "string") {
    currency = currencyField.value;
  }

  return {
    merchant: merchantField?.content ?? null,
    date: dateField?.kind === "date" && dateField.value instanceof Date
      ? dateField.value.toISOString().split("T")[0]
      : (dateField?.kind === "string" && typeof dateField.value === "string" ? dateField.value : null),
    lineItems,
    total,
    currency,
    hasLowConfidence,
  };
  } catch (err) {
    throw new Error(`Azure extraction failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
