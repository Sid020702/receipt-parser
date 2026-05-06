import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from "react";
export function UploadZone({ onFile, disabled }) {
    const inputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    function handleFile(file) {
        if (!["image/jpeg", "image/png"].includes(file.type)) {
            alert("Only JPG and PNG files are supported.");
            return;
        }
        onFile(file);
    }
    return (_jsxs("div", { className: `border-2 border-dashed rounded-xl p-12 text-center transition-colors
        ${isDragging ? "border-blue-400 bg-blue-50 cursor-copy" : "border-gray-300 hover:border-gray-400 bg-gray-50 cursor-pointer"}
        ${disabled ? "opacity-50 pointer-events-none" : ""}`, onClick: () => !disabled && inputRef.current?.click(), onDragOver: (e) => { e.preventDefault(); setIsDragging(true); }, onDragLeave: (e) => { if (!e.currentTarget.contains(e.relatedTarget))
            setIsDragging(false); }, onDrop: (e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file)
                handleFile(file);
        }, children: [_jsx("input", { ref: inputRef, type: "file", accept: "image/jpeg,image/png", className: "hidden", onChange: (e) => { const f = e.target.files?.[0]; if (f)
                    handleFile(f); e.target.value = ""; } }), _jsx("div", { className: "text-5xl mb-4 select-none", children: "\uD83E\uDDFE" }), _jsx("p", { className: "text-gray-700 font-medium text-lg", children: "Drop a receipt photo here" }), _jsx("p", { className: "text-gray-400 text-sm mt-1", children: "or click to browse \u2014 JPG or PNG" })] }));
}
