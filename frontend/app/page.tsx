"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UploadZone from "@/components/UploadZone";
import { uploadFiles, removeBg, generateChibi } from "@/lib/api";
import { useStore, ImageEntry } from "@/lib/store";

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
      setStatusMsg("Uploading files...");
      const { images: raw } = await uploadFiles(files);

      const entries: ImageEntry[] = raw.map((r: any) => ({
        id: r.id,
        session_id: r.session_id,
        filename: r.filename,
        original_data_url: r.data_url,
        selected_for_3d: false,
        status: "idle" as const,
      }));
      addImages(entries);

      const total = entries.length;

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        setStatusMsg(`Processing ${entry.filename} (${i + 1}/${total})...`);

        updateImage(entry.id, { status: "removing_bg" });
        let noBgUrl: string;
        try {
          noBgUrl = await removeBg(entry.original_data_url);
          updateImage(entry.id, { no_bg_data_url: noBgUrl });
        } catch {
          noBgUrl = entry.original_data_url;
        }

        updateImage(entry.id, { status: "generating_chibi" });
        try {
          const { result, warning } = await generateChibi(noBgUrl);
          updateImage(entry.id, {
            chibi_data_url: result,
            chibi_warning: warning,
            status: "done",
          });
        } catch (e: any) {
          updateImage(entry.id, { status: "error", error: e.message, no_bg_data_url: noBgUrl });
        }

        setOverallProgress(Math.round(((i + 1) / total) * 100));
      }

      setStatusMsg("All done! Redirecting to review...");
      setTimeout(() => router.push("/review"), 800);
    } catch (e: any) {
      setStatusMsg(`Error: ${e.message}`);
      setProcessing(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <h1 className="text-3xl font-bold text-center text-purple-700 mb-2">Chibi 3D Print Studio</h1>
        <p className="text-center text-gray-500 mb-8">Upload photos or PDFs → get chibi 2D art → generate 3D print files</p>

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
          Supports JPG, PNG, WEBP, and PDF (multi-page). Max 50MB per file.
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
