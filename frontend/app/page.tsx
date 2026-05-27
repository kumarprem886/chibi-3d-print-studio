"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UploadZone from "@/components/UploadZone";
import { useStore, ImageEntry } from "@/lib/store";
import { removeBgBrowser, generateChibiBrowser, extractPdfPages, fileToDataUrl } from "@/lib/browser-processing";

const HF_TOKEN = process.env.NEXT_PUBLIC_HF_TOKEN ?? "";

export default function UploadPage() {
  const router = useRouter();
  const { addImages, updateImage, clearAll } = useStore();
  const [processing, setProcessing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");

  async function handleFiles(files: File[]) {
    setProcessing(true);
    setOverallProgress(0);
    clearAll();

    try {
      // Expand PDFs into individual page images
      const expanded: { dataUrl: string; filename: string }[] = [];
      for (const file of files) {
        if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
          setStatusMsg(`Extracting pages from ${file.name}…`);
          const pages = await extractPdfPages(file);
          pages.forEach((dataUrl, i) =>
            expanded.push({ dataUrl, filename: `${file.name}_page${i + 1}.png` })
          );
        } else {
          expanded.push({ dataUrl: await fileToDataUrl(file), filename: file.name });
        }
      }

      // Create entries
      const entries: ImageEntry[] = expanded.map(() => ({
        id: crypto.randomUUID(),
        session_id: "browser",
        filename: "",
        original_data_url: "",
        selected_for_3d: false,
        status: "idle" as const,
      }));
      expanded.forEach((e, i) => {
        entries[i].filename = e.filename;
        entries[i].original_data_url = e.dataUrl;
      });
      addImages(entries);

      const total = entries.length;
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        setStatusMsg(`Removing background: ${entry.filename} (${i + 1}/${total})…`);
        updateImage(entry.id, { status: "removing_bg" });

        let noBgUrl = entry.original_data_url;
        try {
          noBgUrl = await removeBgBrowser(entry.original_data_url);
          updateImage(entry.id, { no_bg_data_url: noBgUrl });
        } catch {}

        setStatusMsg(`Generating chibi: ${entry.filename} (${i + 1}/${total})…`);
        updateImage(entry.id, { status: "generating_chibi" });

        const { result, warning } = await generateChibiBrowser(noBgUrl, HF_TOKEN);
        updateImage(entry.id, { chibi_data_url: result, chibi_warning: warning, status: "done" });

        setOverallProgress(Math.round(((i + 1) / total) * 100));
      }

      setStatusMsg("Done! Redirecting to review…");
      setTimeout(() => router.push("/review"), 600);
    } catch (e: any) {
      setStatusMsg(`Error: ${e.message}`);
      setProcessing(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <h1 className="text-3xl font-bold text-center text-purple-700 mb-2">Chibi 3D Print Studio</h1>
        <p className="text-center text-gray-500 mb-8">
          Upload photos or PDFs → chibi 2D art → 3D print files
        </p>

        <UploadZone onFiles={handleFiles} disabled={processing} />

        {processing && (
          <div className="mt-6 bg-white rounded-xl p-4 shadow-sm border border-purple-100">
            <p className="text-sm text-purple-600 font-medium mb-2">{statusMsg}</p>
            <div className="w-full bg-purple-100 rounded-full h-3">
              <div
                className="bg-purple-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1 text-right">{overallProgress}%</p>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          Runs 100% in your browser — JPG, PNG, WEBP, PDF supported
        </p>
        <div className="text-center mt-4">
          <Link href="/meshy" className="text-sm text-violet-600 hover:underline font-medium">
            🎨 Go straight to Meshy AI Studio →
          </Link>
        </div>
      </div>
    </main>
  );
}
