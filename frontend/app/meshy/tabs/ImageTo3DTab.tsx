"use client";
import { useState, useCallback } from "react";
import { meshyImageTo3D, meshyImageTo3DStatus } from "@/lib/api";
import MeshyResultCard, { MeshyJob } from "./MeshyResultCard";
import { useStore } from "@/lib/store";

export default function ImageTo3DTab() {
  const { images } = useStore();
  const doneImages = images.filter((i) => i.status === "done");

  const [jobs, setJobs] = useState<MeshyJob[]>([]);
  const [enablePbr, setEnablePbr] = useState(false);
  const [polycount, setPolycount] = useState(30000);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const updateJob = useCallback((id: string, patch: Partial<MeshyJob>) =>
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j))), []);

  async function startJob(imageData: string, label: string) {
    setError("");
    const jobLocalId = crypto.randomUUID();
    const newJob: MeshyJob = { id: jobLocalId, label, job_id: "", status: "pending", progress: 0 };
    setJobs((p) => [newJob, ...p]);
    try {
      const { job_id } = await meshyImageTo3D(imageData, jobLocalId, { enablePbr, targetPolycount: polycount });
      updateJob(jobLocalId, { job_id });
      pollJob(jobLocalId, job_id);
    } catch (e: any) {
      setError(e.message);
      updateJob(jobLocalId, { status: "failed" });
    }
  }

  async function pollJob(localId: string, jobId: string) {
    const deadline = Date.now() + 5 * 60 * 1000;
    while (Date.now() < deadline) {
      await delay(4000);
      try {
        const data = await meshyImageTo3DStatus(jobId);
        updateJob(localId, { status: data.status, progress: data.progress ?? 0, ...data });
        if (data.status === "succeeded" || data.status === "failed") break;
      } catch { break; }
    }
  }

  function handleFiles(files: File[]) {
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        startJob(dataUrl, file.name.replace(/\.[^.]+$/, ""));
      };
      reader.readAsDataURL(file);
    });
  }

  return (
    <div className="space-y-6">
      {/* Options */}
      <div className="flex flex-wrap gap-6 items-end bg-gray-50 rounded-xl p-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={enablePbr} onChange={(e) => setEnablePbr(e.target.checked)} className="accent-violet-500 w-4 h-4" />
          <span className="text-sm font-medium text-gray-700">Enable PBR textures</span>
        </label>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Target polycount</label>
          <select value={polycount} onChange={(e) => setPolycount(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5">
            <option value={10000}>10k (low — fast print)</option>
            <option value={30000}>30k (medium)</option>
            <option value={100000}>100k (high detail)</option>
          </select>
        </div>
      </div>

      {/* From chibi review */}
      {doneImages.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-600 mb-3">From your chibi review:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {doneImages.map((img) => {
              const display = img.chibi_data_url || img.no_bg_data_url || img.original_data_url;
              return (
                <button key={img.id} onClick={() => startJob(display, img.filename.replace(/\.[^.]+$/, "") + "_chibi")}
                  className="group relative rounded-xl border-2 border-gray-200 hover:border-violet-400 overflow-hidden transition-all bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={display} alt={img.filename} className="w-full h-24 object-contain" />
                  <div className="absolute inset-0 bg-violet-600/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-bold">Generate 3D</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate px-1.5 py-1">{img.filename}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* File upload drop zone */}
      <div>
        <p className="text-sm font-semibold text-gray-600 mb-3">Or upload a new image:</p>
        <div
          onClick={() => { const i = document.createElement("input"); i.type = "file"; i.multiple = true; i.accept = ".png,.jpg,.jpeg,.webp"; i.onchange = (e) => handleFiles(Array.from((e.target as HTMLInputElement).files || [])); i.click(); }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(Array.from(e.dataTransfer.files)); }}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
            ${dragging ? "border-violet-400 bg-violet-50" : "border-gray-200 hover:border-violet-300 hover:bg-violet-50"}`}>
          <p className="text-4xl mb-2">📁</p>
          <p className="text-sm text-gray-500">Drop images here or click to pick files</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>}

      {/* Results */}
      {jobs.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-600 mb-3">Results ({jobs.length})</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {jobs.map((j) => <MeshyResultCard key={j.id} job={j} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
