import * as Tooltip from "@radix-ui/react-tooltip";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { LineItem, LineItemType } from "../lib/api";

interface Props {
  item: LineItem;
  onChange: (updated: LineItem) => void;
  onDelete: () => void;
}

const TYPE_LABELS: Record<LineItemType, string> = {
  item: "Item",
  tax: "Tax",
  discount: "Discount",
  tip: "Tip",
  fee: "Fee",
  other: "Other",
};

export function LineItemRow({ item, onChange, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 py-1.5 group ${item.confidence === "low" ? "bg-yellow-50 rounded px-1" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing px-1 touch-none"
        aria-label="Drag to reorder"
      >
        ⠿
      </button>

      <input
        className="flex-1 border-b border-transparent hover:border-gray-300 focus:border-blue-400 outline-none text-sm py-0.5 px-1 bg-transparent"
        value={item.name}
        placeholder="Item name"
        onChange={(e) => onChange({ ...item, name: e.target.value })}
      />

      {item.type === "item" ? (
        <input
          className="w-10 text-center border-b border-transparent hover:border-gray-300 focus:border-blue-400 outline-none text-sm py-0.5 bg-transparent text-gray-500"
          type="number"
          min="1"
          step="1"
          placeholder="—"
          value={item.quantity ?? ""}
          onChange={(e) => {
            const qty = parseInt(e.target.value);
            const unitPrice = item.amount / (item.quantity ?? 1);
            const newQty = qty > 0 ? qty : undefined;
            onChange({ ...item, quantity: newQty, amount: Math.round(unitPrice * (newQty ?? 1) * 100) / 100 });
          }}
          title="Quantity"
        />
      ) : <div className="w-10" />}

      <select
        className="text-xs border rounded px-1 py-0.5 bg-white text-gray-600"
        value={item.type}
        onChange={(e) => onChange({ ...item, type: e.target.value as LineItemType })}
      >
        {(Object.keys(TYPE_LABELS) as LineItemType[]).map((t) => (
          <option key={t} value={t}>{TYPE_LABELS[t]}</option>
        ))}
      </select>

      <div className={`flex items-center gap-1 ${item.confidence === "low" ? "bg-yellow-100 border border-yellow-300 rounded px-1" : ""}`}>
        {item.confidence === "low" && (
          <Tooltip.Provider delayDuration={200}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <span className="text-yellow-600 text-xs cursor-help select-none">⚠</span>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg z-50" sideOffset={4}>
                  Uncertain — please verify
                  <Tooltip.Arrow className="fill-gray-900" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        )}
        {item.type === "other" && item.rawText && (
          <Tooltip.Provider delayDuration={200}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <span className="text-blue-400 text-xs cursor-help select-none">ⓘ</span>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg max-w-xs z-50" sideOffset={4}>
                  Raw text: {item.rawText}
                  <Tooltip.Arrow className="fill-gray-900" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        )}
        <input
          className="w-20 text-right border-b border-transparent hover:border-gray-300 focus:border-blue-400 outline-none text-sm py-0.5 bg-transparent"
          type="number"
          step="0.01"
          min="0"
          value={Math.round((item.amount / (item.quantity ?? 1)) * 100) / 100}
          onChange={(e) => {
            const unitPrice = parseFloat(e.target.value) || 0;
            onChange({ ...item, amount: Math.round(unitPrice * (item.quantity ?? 1) * 100) / 100 });
          }}
        />
      </div>

      <button
        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-sm px-1 transition-opacity"
        onClick={onDelete}
        aria-label="Delete line item"
      >
        ×
      </button>
    </div>
  );
}
