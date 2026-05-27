"use client";
import { useState } from "react";
import { ImageEntry } from "@/lib/store";
import { convertToSvg } from "@/lib/api";

type Props = {
  entry: ImageEntry;
  onToggleSelect: () => void;
  onSvgReady: (svgDataUrl: string) => void;
};

const statusLabel: Record<ImageEntry["status"], string> = {
  idle: "Queued",
  removing_bg: "Removing background...",
  generating_chibi: "Generating chibi...",
  done: "Done",
  error: "Error",
};

export default function ChibiCard({ entry, onToggleSelect, onSvgReady }: Props) {
  const [svgLoading, setSvgLoading] = useState(false);
  const [svgError, setSvgError] = useState("");
  const [showSvg, setShowSvg] = useState(false);

  const displayImage = entry.chibi_data_url || entry.no_bg_data_url || entry.original_data_url;

  async function handleSvg() {
    if (entry.svg_data_url) { setShowSvg(true); return; }
    setSvgLoading(true);
    setSvgError("");
    try {
      const { result } = await convertToSvg(displayImage);
      onSvgReady(result);
      setShowSvg(true);
    } catch (e: any) {
      setSvgError(e.message);
    } finally {
      setSvgLoading(false);
    }
  }

  function downloadPng() {
    const a = document.createElement("a");
    a.href = displayImage;
    a.download = entry.filename.replace(/\.[^.]+$/, "") + "_chibi.png";
    a.click();
  }

  function downloadSvg() {
    if (!entry.svg_data_url) return;
    const a = document.createElement("a");
    a.href = entry.svg_data_url;
    a.download = entry.filename.replace(/\.[^.]+$/, "") + ".svg";
    a.click();
  }

  return (
    <div className={`rounded-2xl border-2 transition-all overflow-hidden shadow-sm bg-white
      ${entry.selected_for_3d ? "border-purple-500 shadow-purple-200" : "border-gray-200"}`}>
      {/* Selection checkbox */}
      <div className="flex items-center justify-between px-3 pt-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={entry.selected_for_3d}
            onChange={onToggleSelect}
            className="w-4 h-4 accent-purple-500"
            disabled={entry.status !== "done"}
          />
          <span className="text-xs font-medium text-gray-600 truncate max-w-[120px]" title={entry.filename}>
            {entry.filename}
          </span>
        </label>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
          ${entry.status === "done" ? "bg-green-100 text-green-700" :
            entry.status === "error" ? "bg-red-100 text-red-600" :
            "bg-yellow-100 text-yellow-700"}`}>
          {statusLabel[entry.status]}
        </span>
      </div>

      {/* Images side by side */}
      <div className="grid grid-cols-2 gap-1 p-3">
        <div className="relative">
          <p className="text-[10px] text-gray-400 text-center mb-1">Original</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={entry.original_data_url} alt="original" className="w-full h-28 object-contain rounded bg-gray-50" />
        </div>
        <div className="relative">
          <p className="text-[10px] text-gray-400 text-center mb-1">Chibi</p>
          {entry.status === "done" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayImage}
              alt="chibi"
              className="w-full h-28 object-contain rounded"
              style={{ background: "repeating-conic-gradient(#ddd 0% 25%, white 0% 50%) 0 0 / 12px 12px" }}
            />
          ) : (
            <div className="w-full h-28 bg-gray-100 rounded flex items-center justify-center">
              {entry.status === "error" ? (
                <span className="text-xs text-red-500 p-2 text-center">{entry.error}</span>
              ) : (
                <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          )}
        </div>
      </div>

      {entry.chibi_warning && (
        <p className="text-xs text-amber-600 px-3 pb-1">⚠ {entry.chibi_warning}</p>
      )}

      {/* Actions */}
      {entry.status === "done" && (
        <div className="flex gap-1.5 px-3 pb-3 flex-wrap">
          <button onClick={downloadPng} className="btn-secondary text-xs">PNG</button>
          <button onClick={handleSvg} disabled={svgLoading} className="btn-secondary text-xs">
            {svgLoading ? "..." : "SVG"}
          </button>
          {entry.svg_data_url && showSvg && (
            <button onClick={downloadSvg} className="btn-secondary text-xs">Save SVG</button>
          )}
          {svgError && <span className="text-xs text-red-500">{svgError}</span>}
        </div>
      )}

      {/* SVG preview */}
      {entry.svg_data_url && showSvg && (
        <div className="px-3 pb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={entry.svg_data_url} alt="SVG preview" className="w-full h-24 object-contain border rounded bg-white" />
        </div>
      )}
    </div>
  );
}
