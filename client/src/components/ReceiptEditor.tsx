import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { ConfidenceTag } from "./ConfidenceTag";
import { LineItemRow } from "./LineItemRow";
import type { Receipt, LineItem } from "../lib/api";
import { calcTotal, totalMatchesExtracted } from "../lib/totalCalc";
import { v4 as uuidv4 } from "uuid";

interface Props {
  receipt: Receipt;
  imageUrl: string;
  onSave: (updated: Receipt) => Promise<void>;
  isSaving: boolean;
}

export function ReceiptEditor({ receipt, imageUrl, onSave, isSaving }: Props) {
  const [draft, setDraft] = useState<Receipt>(receipt);
  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => { setDraft(receipt); }, [receipt]);

  const calculatedTotal = calcTotal(draft.lineItems);
  const totalMismatch = draft.lineItems.length > 0 && !totalMatchesExtracted(calculatedTotal, draft.total);

  function updateItem(id: string, updated: LineItem) {
    setDraft((d) => ({ ...d, lineItems: d.lineItems.map((li) => li.id === id ? updated : li) }));
  }

  function deleteItem(id: string) {
    setDraft((d) => ({ ...d, lineItems: d.lineItems.filter((li) => li.id !== id) }));
  }

  function addItem() {
    const newItem: LineItem = { id: uuidv4(), name: "", amount: 0, type: "item", confidence: "high" };
    setDraft((d) => ({ ...d, lineItems: [...d.lineItems, newItem] }));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setDraft((d) => {
        const oldIdx = d.lineItems.findIndex((li) => li.id === active.id);
        const newIdx = d.lineItems.findIndex((li) => li.id === over.id);
        return { ...d, lineItems: arrayMove(d.lineItems, oldIdx, newIdx) };
      });
    }
  }

  return (
    <div className="flex gap-6">
      {/* Image panel — sticky so it stays visible while scrolling editor */}
      <div className="w-2/5 shrink-0 sticky top-4 self-start">
        <img
          src={imageUrl}
          alt="Receipt"
          className="w-full rounded-lg shadow border border-gray-200 object-contain max-h-[80vh]"
        />
      </div>

      {/* Editor panel */}
      <div className="flex-1 space-y-5">
        {draft.parseStatus === "failed" && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
            <p className="font-medium">Parsing failed — please fill in the fields manually.</p>
            {draft.rawLlmResponse && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-red-500">Raw model output</summary>
                <pre className="mt-1 text-xs overflow-auto whitespace-pre-wrap break-all">{draft.rawLlmResponse}</pre>
              </details>
            )}
          </div>
        )}

        {/* Merchant */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Merchant</label>
          <ConfidenceTag confidence={draft.merchant ? "high" : "low"}>
            <input
              className="w-full text-lg font-semibold border-b border-transparent hover:border-gray-300 focus:border-blue-400 outline-none py-1 bg-transparent"
              value={draft.merchant}
              placeholder="Merchant name"
              onChange={(e) => setDraft((d) => ({ ...d, merchant: e.target.value }))}
            />
          </ConfidenceTag>
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Date</label>
          <ConfidenceTag confidence={draft.date ? "high" : "low"}>
            <input
              className="border-b border-transparent hover:border-gray-300 focus:border-blue-400 outline-none py-1 bg-transparent text-sm"
              type="date"
              value={draft.date}
              onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
            />
          </ConfidenceTag>
        </div>

        {/* Line items */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Line Items</label>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={draft.lineItems.map((li) => li.id)} strategy={verticalListSortingStrategy}>
              <div className="divide-y divide-gray-100">
                {draft.lineItems.map((item) => (
                  <LineItemRow
                    key={item.id}
                    item={item}
                    onChange={(updated) => updateItem(item.id, updated)}
                    onDelete={() => deleteItem(item.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <button
            className="mt-2 text-sm text-blue-500 hover:text-blue-700 font-medium"
            onClick={addItem}
          >
            + Add line item
          </button>
        </div>

        {/* Total */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total</label>
          <div className="flex items-center gap-3 flex-wrap">
            <ConfidenceTag confidence={draft.currency ? "high" : "low"}>
              <input
                className="w-16 border-b border-transparent hover:border-gray-300 focus:border-blue-400 outline-none py-1 bg-transparent text-sm font-mono uppercase"
                value={draft.currency}
                placeholder="CCY"
                maxLength={3}
                onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value.toUpperCase() }))}
                title="Currency code (e.g. USD, IDR, EUR)"
              />
            </ConfidenceTag>
            <input
              className="w-32 text-xl font-bold border-b border-transparent hover:border-gray-300 focus:border-blue-400 outline-none py-1 bg-transparent"
              type="number"
              step="0.01"
              min="0"
              value={draft.total}
              onChange={(e) => setDraft((d) => ({ ...d, total: parseFloat(e.target.value) || 0 }))}
            />
            {totalMismatch && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                Line items sum to {calculatedTotal.toFixed(2)} — totals differ
              </span>
            )}
          </div>
        </div>

        {/* Save */}
        <button
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
          onClick={() => onSave(draft)}
          disabled={isSaving}
        >
          {isSaving ? "Saving…" : "Save Receipt"}
        </button>
      </div>
    </div>
  );
}
