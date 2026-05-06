import { useRef, useState } from "react";

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function UploadZone({ onFile, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFile(file: File) {
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      alert("Only JPG and PNG files are supported.");
      return;
    }
    onFile(file);
  }

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors
        ${isDragging ? "border-blue-400 bg-blue-50 cursor-copy" : "border-gray-300 hover:border-gray-400 bg-gray-50 cursor-pointer"}
        ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      <div className="text-5xl mb-4 select-none">🧾</div>
      <p className="text-gray-700 font-medium text-lg">Drop a receipt photo here</p>
      <p className="text-gray-400 text-sm mt-1">or click to browse — JPG or PNG</p>
    </div>
  );
}
