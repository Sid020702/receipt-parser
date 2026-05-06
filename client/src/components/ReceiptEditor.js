import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, } from "@dnd-kit/sortable";
import { ConfidenceTag } from "./ConfidenceTag";
import { LineItemRow } from "./LineItemRow";
import { calcTotal, totalMatchesExtracted } from "../lib/totalCalc";
import { v4 as uuidv4 } from "uuid";
export function ReceiptEditor({ receipt, imageUrl, onSave, isSaving }) {
    const [draft, setDraft] = useState(receipt);
    const sensors = useSensors(useSensor(PointerSensor));
    useEffect(() => { setDraft(receipt); }, [receipt]);
    const calculatedTotal = calcTotal(draft.lineItems);
    const totalMismatch = draft.lineItems.length > 0 && !totalMatchesExtracted(calculatedTotal, draft.total);
    function updateItem(id, updated) {
        setDraft((d) => ({ ...d, lineItems: d.lineItems.map((li) => li.id === id ? updated : li) }));
    }
    function deleteItem(id) {
        setDraft((d) => ({ ...d, lineItems: d.lineItems.filter((li) => li.id !== id) }));
    }
    function addItem() {
        const newItem = { id: uuidv4(), name: "", amount: 0, type: "item", confidence: "high" };
        setDraft((d) => ({ ...d, lineItems: [...d.lineItems, newItem] }));
    }
    function handleDragEnd(event) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setDraft((d) => {
                const oldIdx = d.lineItems.findIndex((li) => li.id === active.id);
                const newIdx = d.lineItems.findIndex((li) => li.id === over.id);
                return { ...d, lineItems: arrayMove(d.lineItems, oldIdx, newIdx) };
            });
        }
    }
    return (_jsxs("div", { className: "flex gap-6", children: [_jsx("div", { className: "w-2/5 shrink-0 sticky top-4 self-start", children: _jsx("img", { src: imageUrl, alt: "Receipt", className: "w-full rounded-lg shadow border border-gray-200 object-contain max-h-[80vh]" }) }), _jsxs("div", { className: "flex-1 space-y-5", children: [draft.parseStatus === "failed" && (_jsxs("div", { className: "bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700", children: [_jsx("p", { className: "font-medium", children: "Parsing failed \u2014 please fill in the fields manually." }), draft.rawLlmResponse && (_jsxs("details", { className: "mt-2", children: [_jsx("summary", { className: "cursor-pointer text-xs text-red-500", children: "Raw model output" }), _jsx("pre", { className: "mt-1 text-xs overflow-auto whitespace-pre-wrap break-all", children: draft.rawLlmResponse })] }))] })), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1", children: "Merchant" }), _jsx(ConfidenceTag, { confidence: draft.merchant ? "high" : "low", children: _jsx("input", { className: "w-full text-lg font-semibold border-b border-transparent hover:border-gray-300 focus:border-blue-400 outline-none py-1 bg-transparent", value: draft.merchant, placeholder: "Merchant name", onChange: (e) => setDraft((d) => ({ ...d, merchant: e.target.value })) }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1", children: "Date" }), _jsx(ConfidenceTag, { confidence: draft.date ? "high" : "low", children: _jsx("input", { className: "border-b border-transparent hover:border-gray-300 focus:border-blue-400 outline-none py-1 bg-transparent text-sm", type: "date", value: draft.date, onChange: (e) => setDraft((d) => ({ ...d, date: e.target.value })) }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2", children: "Line Items" }), _jsx(DndContext, { sensors: sensors, collisionDetection: closestCenter, onDragEnd: handleDragEnd, children: _jsx(SortableContext, { items: draft.lineItems.map((li) => li.id), strategy: verticalListSortingStrategy, children: _jsx("div", { className: "divide-y divide-gray-100", children: draft.lineItems.map((item) => (_jsx(LineItemRow, { item: item, onChange: (updated) => updateItem(item.id, updated), onDelete: () => deleteItem(item.id) }, item.id))) }) }) }), _jsx("button", { className: "mt-2 text-sm text-blue-500 hover:text-blue-700 font-medium", onClick: addItem, children: "+ Add line item" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1", children: "Total" }), _jsxs("div", { className: "flex items-center gap-3 flex-wrap", children: [_jsx(ConfidenceTag, { confidence: draft.currency ? "high" : "low", children: _jsx("input", { className: "w-16 border-b border-transparent hover:border-gray-300 focus:border-blue-400 outline-none py-1 bg-transparent text-sm font-mono uppercase", value: draft.currency, placeholder: "CCY", maxLength: 3, onChange: (e) => setDraft((d) => ({ ...d, currency: e.target.value.toUpperCase() })), title: "Currency code (e.g. USD, IDR, EUR)" }) }), _jsx("input", { className: "w-32 text-xl font-bold border-b border-transparent hover:border-gray-300 focus:border-blue-400 outline-none py-1 bg-transparent", type: "number", step: "0.01", min: "0", value: draft.total, onChange: (e) => setDraft((d) => ({ ...d, total: parseFloat(e.target.value) || 0 })) }), totalMismatch && (_jsxs("span", { className: "text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1", children: ["Line items sum to ", calculatedTotal.toFixed(2), " \u2014 totals differ"] }))] })] }), _jsx("button", { className: "w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg transition-colors", onClick: () => onSave(draft), disabled: isSaving, children: isSaving ? "Saving…" : "Save Receipt" })] })] }));
}
