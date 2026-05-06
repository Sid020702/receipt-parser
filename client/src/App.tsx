import { useState, useEffect } from "react";
import { UploadZone } from "./components/UploadZone";
import { ReceiptEditor } from "./components/ReceiptEditor";
import { SavedReceipts } from "./components/SavedReceipts";
import { parseReceipt, getReceipts, saveReceipt, updateReceipt, deleteReceipt, type Receipt } from "./lib/api";

type AppState = "idle" | "parsing" | "editing" | "saving";

export function App() {
  const [state, setState] = useState<AppState>("idle");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [savedReceipts, setSavedReceipts] = useState<Receipt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    getReceipts().then(setSavedReceipts).catch(console.error);
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleFile(file: File) {
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
    } catch {
      setError("Failed to parse receipt. Please try again.");
      setState("idle");
      setImagePreview(null);
    }
  }

  async function handleSave(updated: Receipt) {
    setState("saving");
    try {
      const isNew = !savedReceipts.find((r) => r.id === updated.id);
      if (isNew) {
        await saveReceipt(updated);
      } else {
        await updateReceipt(updated.id, updated);
      }
      const fresh = await getReceipts();
      setSavedReceipts(fresh);
      setReceipt(updated);
      showToast("Receipt saved!");
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setState("editing");
    }
  }

  function handleSelectSaved(r: Receipt) {
    setReceipt(r);
    setImagePreview(r.imageUrl);
    setState("editing");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    try {
      await deleteReceipt(id);
      setSavedReceipts((prev) => prev.filter((r) => r.id !== id));
      if (receipt?.id === id) handleReset();
    } catch {
      setError("Failed to delete receipt.");
    }
  }

  function handleReset() {
    setState("idle");
    setReceipt(null);
    setImagePreview(null);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Receipt Parser</h1>
          <p className="text-gray-500 text-sm mt-1">Upload a receipt photo to extract and edit structured data.</p>
        </header>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-600">×</button>
          </div>
        )}

        {state === "idle" && (
          <UploadZone onFile={handleFile} />
        )}

        {state === "parsing" && (
          <div className="flex gap-6">
            {imagePreview && (
              <div className="w-2/5 shrink-0">
                <img src={imagePreview} alt="Processing receipt" className="w-full rounded-lg shadow border border-gray-200 object-contain max-h-[80vh]" />
              </div>
            )}
            <div className="flex-1 space-y-4 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
              <div className="h-8 bg-gray-200 rounded w-1/4 mt-4" />
            </div>
          </div>
        )}

        {(state === "editing" || state === "saving") && receipt && imagePreview && (
          <div>
            <button
              className="text-sm text-gray-500 hover:text-gray-700 mb-5 flex items-center gap-1"
              onClick={handleReset}
            >
              ← Upload another receipt
            </button>
            <ReceiptEditor
              receipt={receipt}
              imageUrl={imagePreview}
              onSave={handleSave}
              isSaving={state === "saving"}
            />
          </div>
        )}

        <SavedReceipts receipts={savedReceipts} onSelect={handleSelectSaved} onDelete={handleDelete} />
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm">
          ✓ {toast}
        </div>
      )}
    </div>
  );
}
