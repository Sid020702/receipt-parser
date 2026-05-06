import { useState } from "react";
import type { Receipt } from "../lib/api";

interface Props {
  receipts: Receipt[];
  onSelect: (receipt: Receipt) => void;
  onDelete: (id: string) => void;
}

export function SavedReceipts({ receipts, onSelect, onDelete }: Props) {
  const [open, setOpen] = useState(false);

  if (receipts.length === 0) return null;

  return (
    <div className="border-t border-gray-200 mt-10 pt-5">
      <button
        className="text-sm font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1.5"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-xs">{open ? "▾" : "▸"}</span>
        Saved receipts ({receipts.length})
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {receipts.map((r) => (
            <div
              key={r.id}
              className="border border-gray-200 rounded-lg px-4 py-3 hover:bg-gray-50 hover:border-gray-300 transition-colors flex justify-between items-center gap-2"
            >
              <button
                className="flex-1 text-left flex justify-between items-center min-w-0"
                onClick={() => onSelect(r)}
              >
                <div className="min-w-0">
                  <span className="font-medium text-sm text-gray-900 truncate block">{r.merchant || "Unknown merchant"}</span>
                  <span className="text-gray-400 text-xs">{r.date}</span>
                </div>
                <span className="text-gray-700 text-sm font-mono ml-4 shrink-0">{r.currency} {r.total.toFixed(2)}</span>
              </button>
              <button
                className="shrink-0 text-gray-300 hover:text-red-500 transition-colors p-1 rounded"
                onClick={(e) => { e.stopPropagation(); onDelete(r.id); }}
                title="Delete receipt"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
