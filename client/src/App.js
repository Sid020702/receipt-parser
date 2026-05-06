import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { UploadZone } from "./components/UploadZone";
import { ReceiptEditor } from "./components/ReceiptEditor";
import { SavedReceipts } from "./components/SavedReceipts";
import { parseReceipt, getReceipts, saveReceipt, updateReceipt, deleteReceipt } from "./lib/api";
export function App() {
    const [state, setState] = useState("idle");
    const [receipt, setReceipt] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [savedReceipts, setSavedReceipts] = useState([]);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);
    useEffect(() => {
        getReceipts().then(setSavedReceipts).catch(console.error);
    }, []);
    function showToast(msg) {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    }
    async function handleFile(file) {
        setError(null);
        setImagePreview(URL.createObjectURL(file));
        setState("parsing");
        try {
            const parsed = await parseReceipt(file);
            setReceipt(parsed);
            if (parsed.parseStatus !== "failed") {
                setSavedReceipts((prev) => [parsed, ...prev]);
            }
            setState("editing");
        }
        catch {
            setError("Failed to parse receipt. Please try again.");
            setState("idle");
            setImagePreview(null);
        }
    }
    async function handleSave(updated) {
        setState("saving");
        try {
            const isNew = !savedReceipts.find((r) => r.id === updated.id);
            if (isNew) {
                await saveReceipt(updated);
            }
            else {
                await updateReceipt(updated.id, updated);
            }
            const fresh = await getReceipts();
            setSavedReceipts(fresh);
            setReceipt(updated);
            showToast("Receipt saved!");
        }
        catch {
            setError("Failed to save. Please try again.");
        }
        finally {
            setState("editing");
        }
    }
    function handleSelectSaved(r) {
        setReceipt(r);
        setImagePreview(r.imageUrl);
        setState("editing");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
    async function handleDelete(id) {
        try {
            await deleteReceipt(id);
            setSavedReceipts((prev) => prev.filter((r) => r.id !== id));
            if (receipt?.id === id)
                handleReset();
        }
        catch {
            setError("Failed to delete receipt.");
        }
    }
    function handleReset() {
        setState("idle");
        setReceipt(null);
        setImagePreview(null);
        setError(null);
    }
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsxs("div", { className: "max-w-5xl mx-auto px-4 py-8", children: [_jsxs("header", { className: "mb-8", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Receipt Parser" }), _jsx("p", { className: "text-gray-500 text-sm mt-1", children: "Upload a receipt photo to extract and edit structured data." })] }), error && (_jsxs("div", { className: "mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex justify-between items-center", children: [_jsx("span", { children: error }), _jsx("button", { onClick: () => setError(null), className: "ml-4 text-red-400 hover:text-red-600", children: "\u00D7" })] })), state === "idle" && (_jsx(UploadZone, { onFile: handleFile })), state === "parsing" && (_jsxs("div", { className: "flex gap-6", children: [imagePreview && (_jsx("div", { className: "w-2/5 shrink-0", children: _jsx("img", { src: imagePreview, alt: "Processing receipt", className: "w-full rounded-lg shadow border border-gray-200 object-contain max-h-[80vh]" }) })), _jsxs("div", { className: "flex-1 space-y-4 animate-pulse", children: [_jsx("div", { className: "h-6 bg-gray-200 rounded w-1/2" }), _jsx("div", { className: "h-4 bg-gray-200 rounded w-1/3" }), _jsx("div", { className: "h-4 bg-gray-200 rounded w-full" }), _jsx("div", { className: "h-4 bg-gray-200 rounded w-full" }), _jsx("div", { className: "h-4 bg-gray-200 rounded w-3/4" }), _jsx("div", { className: "h-4 bg-gray-200 rounded w-5/6" }), _jsx("div", { className: "h-8 bg-gray-200 rounded w-1/4 mt-4" })] })] })), (state === "editing" || state === "saving") && receipt && imagePreview && (_jsxs("div", { children: [_jsx("button", { className: "text-sm text-gray-500 hover:text-gray-700 mb-5 flex items-center gap-1", onClick: handleReset, children: "\u2190 Upload another receipt" }), _jsx(ReceiptEditor, { receipt: receipt, imageUrl: imagePreview, onSave: handleSave, isSaving: state === "saving" })] })), _jsx(SavedReceipts, { receipts: savedReceipts, onSelect: handleSelectSaved, onDelete: handleDelete })] }), toast && (_jsxs("div", { className: "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm whitespace-nowrap", children: ["\u2713 ", toast] }))] }));
}
