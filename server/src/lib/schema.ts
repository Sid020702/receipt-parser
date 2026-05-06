import { z } from "zod";

export const LineItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  type: z.enum(["item", "tax", "discount", "tip", "fee", "other"]),
  confidence: z.enum(["high", "low"]),
  rawText: z.string().optional(),
});

export const ReceiptSchema = z.object({
  id: z.string(),
  merchant: z.string(),
  date: z.string(),
  lineItems: z.array(LineItemSchema),
  total: z.number(),
  currency: z.string().default("USD"),
  rawLlmResponse: z.string().optional(),
  parseStatus: z.enum(["success", "processing", "failed"]),
  imageUrl: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type LineItem = z.infer<typeof LineItemSchema>;
export type Receipt = z.infer<typeof ReceiptSchema>;
export type ParseStatus = Receipt["parseStatus"];
export type LineItemType = LineItem["type"];
export type Confidence = LineItem["confidence"];
