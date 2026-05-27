"use client";
import { useCallback, useRef, useState } from "react";

type Props = {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
};

export default function UploadZone({ onFiles, disabled }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = useCallback(
    (files: FileList | null) => {
      if (!files || disabled) return;
      onFiles(Array.from(files));
    },
    [onFiles, disabled]
  );

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files); }}
      className={`
        border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all select-none
        ${dragging ? "border-purple-400 bg-purple-50" : "border-gray-300 hover:border-purple-400 hover:bg-purple-50"}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        className="hidden"
        onChange={(e) => handle(e.target.files)}
        disabled={disabled}
      />
      <div className="text-5xl mb-3">🖼️</div>
      <p className="text-lg font-semibold text-gray-700">Drop images or PDFs here</p>
      <p className="text-sm text-gray-400 mt-1">JPG, PNG, WEBP, PDF — single or multiple files</p>
    </div>
  );
}
