"use client";
import { useState, useCallback } from "react";
import { meshyTextTo3DPreview, meshyTextTo3DRefine, meshyTextTo3DStatus } from "@/lib/api";
import MeshyResultCard, { MeshyJob } from "./MeshyResultCard";

const ART_STYLES = [
  { value: "cartoon",   label: "🎨 Cartoon",   desc: "Stylised, great for chibis" },
  { value: "realistic", label: "📷 Realistic",  desc: "Lifelike materials" },
  { value: "low_poly",  label: "🔷 Low Poly",   desc: "Minimal, fast to print" },
  { value: "sculpture", label: "🗿 Sculpture",  desc: "Clay/marble look" },
  { value: "pbr",       label: "✨ PBR",        desc: "Full material maps" },
];

const EXAMPLES = [
  "a cute chibi girl with pink hair in a wizard outfit, full body, white background",
  "a small cartoon dinosaur wearing a party hat",
  "a chibi samurai holding a tiny sword, anime style",
  "a kawaii cat astronaut in a space suit",
];

export default function TextTo3DTab() {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("low quality, ugly, deformed, nsfw");
  const [artStyle, setArtStyle] = useState("cartoon");
  const [jobs, setJobs] = useState<MeshyJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateJob = useCallback((id: string, patch: Partial<MeshyJob>) =>
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j))), []);

  async function generate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");
    const localId = crypto.randomUUID();
    const newJob: MeshyJob = {
      id: localId, label: prompt.slice(0, 40), job_id: "",
      status: "pending", progress: 0, type: "text-to-3d",
      onRefine: handleRefine,
    };
    setJobs((p) => [newJob, ...p]);
    try {
      const { job_id } = await meshyTextTo3DPreview(prompt, negativePrompt, artStyle);
      updateJob(localId, { job_id });
      await pollJob(localId, job_id);
    } catch (e: any) {
      setError(e.message);
      updateJob(localId, { status: "failed" });
    } finally {
      setLoading(false);
    }
  }

  async function handleRefine(previewJobId: string) {
    const localId = crypto.randomUUID();
    setJobs((p) => [{
      id: localId, label: `Refined: ${previewJobId.slice(0, 8)}…`,
      job_id: "", status: "pending", progress: 0, type: "text-to-3d-refine",
    }, ...p]);
    try {
      const { job_id } = await meshyTextTo3DRefine(previewJobId);
      updateJob(localId, { job_id });
      await pollJob(localId, job_id);
    } catch (e: any) {
      setError(e.message);
      updateJob(localId, { status: "failed" });
    }
  }

  async function pollJob(localId: string, jobId: string) {
    const deadline = Date.now() + 10 * 60 * 1000;
    while (Date.now() < deadline) {
      await delay(4000);
      try {
        const data = await meshyTextTo3DStatus(jobId);
        updateJob(localId, { status: data.status, progress: data.progress ?? 0, ...data });
        if (data.status === "succeeded" || data.status === "failed") break;
      } catch { break; }
    }
  }

  return (
    <div className="space-y-5">
      {/* Prompt */}
      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-1.5">Describe your 3D model</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="a cute chibi girl with pink hair in a wizard outfit, full body, white background"
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
        {/* Example prompts */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => setPrompt(ex)}
              className="text-xs px-2 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-600 border border-violet-200 transition-colors truncate max-w-[220px]"
              title={ex}>
              {ex.slice(0, 35)}…
            </button>
          ))}
        </div>
      </div>

      {/* Art style */}
      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-2">Art style</label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {ART_STYLES.map((s) => (
            <button key={s.value} onClick={() => setArtStyle(s.value)}
              className={`rounded-xl border-2 p-3 text-left transition-all ${
                artStyle === s.value ? "border-violet-500 bg-violet-50" : "border-gray-200 hover:border-violet-300"}`}>
              <p className="text-sm font-semibold">{s.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Negative prompt */}
      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-1.5">Negative prompt <span className="font-normal text-gray-400">(what to avoid)</span></label>
        <input
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </div>

      <button
        onClick={generate}
        disabled={loading || !prompt.trim()}
        className="btn-primary w-full disabled:opacity-40 py-3">
        {loading ? "Generating preview…" : "Generate 3D Model"}
      </button>
      <p className="text-xs text-gray-400 text-center -mt-3">
        Generates a <strong>preview</strong> first (~1 min), then you can refine it for higher quality (+2 min)
      </p>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>}

      {/* Results */}
      {jobs.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-600 mb-3">Results</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {jobs.map((j) => <MeshyResultCard key={j.id} job={{ ...j, onRefine: handleRefine }} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
