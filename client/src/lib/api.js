export async function parseReceipt(file) {
    const form = new FormData();
    form.append("image", file);
    const res = await fetch("/api/parse", { method: "POST", body: form });
    if (!res.ok)
        throw new Error(await res.text());
    return res.json();
}
export async function getReceipts() {
    const res = await fetch("/api/receipts");
    if (!res.ok)
        throw new Error(await res.text());
    return res.json();
}
export async function saveReceipt(receipt) {
    const res = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(receipt),
    });
    if (!res.ok)
        throw new Error(await res.text());
    return res.json();
}
export async function deleteReceipt(id) {
    const res = await fetch(`/api/receipts/${id}`, { method: "DELETE" });
    if (!res.ok)
        throw new Error(await res.text());
}
export async function updateReceipt(id, patch) {
    const res = await fetch(`/api/receipts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
    });
    if (!res.ok)
        throw new Error(await res.text());
    return res.json();
}
