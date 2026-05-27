"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ChibiCard from "@/components/ChibiCard";
import UploadZone from "@/components/UploadZone";
import { useStore, ImageEntry } from "@/lib/store";
import { removeBgBrowser, generateChibiBrowser, extractPdfPages, fileToDataUrl, imageToSvgBrowser } from "@/lib/browser-processing";

const HF_TOKEN = process.env.NEXT_PUBLIC_HF_TOKEN ?? "";

export default function ReviewPage() {
  const router = useRouter();
  const { images, addImages, updateImage, toggleSelect, selectAll, deselectAll } = useStore();
  const [addingMore, setAddingMore] = useState(false);
  const [addMsg, setAddMsg] = useState("");

  const selected = images.filter((i) => i.selected_for_3d);

  async function processFiles(files: File[]) {
    setAddingMore(true);
    setAddMsg("Processing…");
    try {
      const expanded: { dataUrl: string; filename: string }[] = [];
      for (const file of files) {
        if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
          setAddMsg(`Extracting pages from ${file.name}…`);
          const pages = await extractPdfPages(file);
          pages.forEach((dataUrl, i) =>
            expanded.push({ dataUrl, filename: `${file.name}_page${i + 1}.png` })
          );
        } else {
          expanded.push({ dataUrl: await fileToDataUrl(file), filename: file.name });
        }
      }

      const entries: ImageEntry[] = expanded.map((e) => ({
        id: crypto.randomUUID(),
        session_id: "browser",
        filename: e.filename,
        original_data_url: e.dataUrl,
        selected_for_3d: false,
        status: "idle" as const,
      }));
      addImages(entries);

      for (const entry of entries) {
        setAddMsg(`Removing BG: ${entry.filename}…`);
        updateImage(entry.id, { status: "removing_bg" });
        let noBgUrl = entry.original_data_url;
        try {
          noBgUrl = await removeBgBrowser(entry.original_data_url);
          updateImage(entry.id, { no_bg_data_url: noBgUrl });
        } catch {}

        setAddMsg(`Generating chibi: ${entry.filename}…`);
        updateImage(entry.id, { status: "generating_chibi" });
        const { result, warning } = await generateChibiBrowser(noBgUrl, HF_TOKEN);
        updateImage(entry.id, { chibi_data_url: result, chibi_warning: warning, status: "done" });
      }
      setAddMsg("");
    } catch (e: any) {
      setAddMsg(`Error: ${e.message}`);
    } finally {
      setAddingMore(false);
    }
  }

  async function handleSvg(id: string, dataUrl: string) {
    try {
      const svg = await imageToSvgBrowser(dataUrl);
      const b64 = btoa(unescape(encodeURIComponent(svg)));
      updateImage(id, { svg_data_url: `data:image/svg+xml;base64,${b64}` });
    } catch (e: any) {
      console.error("SVG error", e);
    }
  }

  if (images.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex flex-col items-center justify-center p-6">
        <p className="text-gray-500 mb-4">No images yet.</p>
        <button onClick={() => router.push("/")} className="btn-primary">Upload Images</button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-purple-700">Review Chibis</h1>
            <p className="text-sm text-gray-500">{images.length} image{images.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => router.push("/")} className="btn-secondary text-sm">+ New Upload</button>
            <button onClick={selectAll} className="btn-secondary text-sm">Select All</button>
            <button onClick={deselectAll} className="btn-secondary text-sm">Deselect All</button>
            <Link href="/meshy" className="btn-secondary text-sm bg-violet-50 border-violet-300 text-violet-700 hover:bg-violet-100">
              🎨 Meshy Studio
            </Link>
            <button
              onClick={() => router.push("/models")}
              disabled={selected.length === 0}
              className="btn-primary text-sm disabled:opacity-40"
            >
              Generate 3D ({selected.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {images.map((entry) => (
            <ChibiCard
              key={entry.id}
              entry={entry}
              onToggleSelect={() => toggleSelect(entry.id)}
              onSvgReady={(svg) => updateImage(entry.id, { svg_data_url: svg })}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-6">
          <p className="text-sm font-medium text-gray-600 mb-3">Add more images or PDFs</p>
          <UploadZone onFiles={processFiles} disabled={addingMore} />
          {addMsg && <p className="text-sm text-purple-600 mt-2">{addMsg}</p>}
        </div>
      </div>
    </main>
  );
}
