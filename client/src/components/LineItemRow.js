import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
const TYPE_LABELS = {
    item: "Item",
    tax: "Tax",
    discount: "Discount",
    tip: "Tip",
    fee: "Fee",
    other: "Other",
};
export function LineItemRow({ item, onChange, onDelete }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };
    return (_jsxs("div", { ref: setNodeRef, style: style, className: `flex items-center gap-2 py-1.5 group ${item.confidence === "low" ? "bg-yellow-50 rounded px-1" : ""}`, children: [_jsx("button", { ...attributes, ...listeners, className: "text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing px-1 touch-none", "aria-label": "Drag to reorder", children: "\u283F" }), _jsx("input", { className: "flex-1 border-b border-transparent hover:border-gray-300 focus:border-blue-400 outline-none text-sm py-0.5 px-1 bg-transparent", value: item.name, placeholder: "Item name", onChange: (e) => onChange({ ...item, name: e.target.value }) }), item.type === "item" ? (_jsx("input", { className: "w-10 text-center border-b border-transparent hover:border-gray-300 focus:border-blue-400 outline-none text-sm py-0.5 bg-transparent text-gray-500", type: "number", min: "1", step: "1", placeholder: "qty", value: item.quantity ?? "", onChange: (e) => {
                    const val = parseInt(e.target.value);
                    onChange({ ...item, quantity: val > 0 ? val : undefined });
                }, title: "Quantity" })) : null, _jsx("select", { className: "text-xs border rounded px-1 py-0.5 bg-white text-gray-600", value: item.type, onChange: (e) => onChange({ ...item, type: e.target.value }), children: Object.keys(TYPE_LABELS).map((t) => (_jsx("option", { value: t, children: TYPE_LABELS[t] }, t))) }), _jsxs("div", { className: `flex items-center gap-1 ${item.confidence === "low" ? "bg-yellow-100 border border-yellow-300 rounded px-1" : ""}`, children: [item.confidence === "low" && (_jsx(Tooltip.Provider, { delayDuration: 200, children: _jsxs(Tooltip.Root, { children: [_jsx(Tooltip.Trigger, { asChild: true, children: _jsx("span", { className: "text-yellow-600 text-xs cursor-help select-none", children: "\u26A0" }) }), _jsx(Tooltip.Portal, { children: _jsxs(Tooltip.Content, { className: "bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg z-50", sideOffset: 4, children: ["Uncertain \u2014 please verify", _jsx(Tooltip.Arrow, { className: "fill-gray-900" })] }) })] }) })), item.type === "other" && item.rawText && (_jsx(Tooltip.Provider, { delayDuration: 200, children: _jsxs(Tooltip.Root, { children: [_jsx(Tooltip.Trigger, { asChild: true, children: _jsx("span", { className: "text-blue-400 text-xs cursor-help select-none", children: "\u24D8" }) }), _jsx(Tooltip.Portal, { children: _jsxs(Tooltip.Content, { className: "bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg max-w-xs z-50", sideOffset: 4, children: ["Raw text: ", item.rawText, _jsx(Tooltip.Arrow, { className: "fill-gray-900" })] }) })] }) })), _jsx("input", { className: "w-20 text-right border-b border-transparent hover:border-gray-300 focus:border-blue-400 outline-none text-sm py-0.5 bg-transparent", type: "number", step: "0.01", min: "0", value: item.amount, onChange: (e) => onChange({ ...item, amount: parseFloat(e.target.value) || 0 }) })] }), _jsx("button", { className: "opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-sm px-1 transition-opacity", onClick: onDelete, "aria-label": "Delete line item", children: "\u00D7" })] }));
}
