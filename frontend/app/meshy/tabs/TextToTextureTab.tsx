"use client";
import { useState, useCallback } from "react";
import { meshyTextToTexture, meshyTextToTextureStatus } from "@/lib/api";
import MeshyResultCard, { MeshyJob } from "./MeshyResultCard";

const STYLE_EXAMPLES = [
  "anime cel shading, pastel colors",
  "realistic painted wood and fabric",
  "glossy plastic toy finish",
  "hand-painted miniature warhammer style",
];

export default function TextToTextureTab() {
  const [modelUrl, setModelUrl] = useState("");
  const [objectPrompt, setObjectPrompt] = useState("");
  const [stylePrompt, setStylePrompt] = useState("");
  const [resolution, setResolution] = useState<"1024" | "2048" | "4096">("1024");
  const [jobs, setJobs] = useState<MeshyJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateJob = useCallback((id: string, patch: Partial<MeshyJob>) =>
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j))), []);

  async function generate() {
    if (!modelUrl.trim() || !objectPrompt.trim()) return;
    setLoading(true);
    setError("");
    const localId = crypto.randomUUID();
    const label = objectPrompt.slice(0, 40);
    setJobs((p) => [{ id: localId, label, job_id: "", status: "pending", progress: 0 }, ...p]);
    try {
      const { job_id } = await meshyTextToTexture(modelUrl, objectPrompt, stylePrompt, resolution);
      updateJob(localId, { job_id });
      await pollJob(localId, job_id);
    } catch (e: any) {
      setError(e.message);
      updateJob(localId, { status: "failed" });
    } finally {
      setLoading(false);
    }
  }

  async function pollJob(localId: string, jobId: string) {
    const deadline = Date.now() + 10 * 60 * 1000;
    while (Date.now() < deadline) {
      await delay(4000);
      try {
        const data = await meshyTextToTextureStatus(jobId);
        updateJob(localId, { ...data });
        if (data.status === "succeeded" || data.status === "failed") break;
      } catch { break; }
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
        <strong>How it works:</strong> Paste the URL of a GLB or OBJ model (from a previous generation), describe what it is and what style you want, and Meshy will paint it with AI textures.
      </div>

      {/* Model URL */}
      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-1.5">
          3D Model URL <span className="font-normal text-gray-400">(GLB or OBJ link from a previous Meshy result)</span>
        </label>
        <input
          value={modelUrl}
          onChange={(e) => setModelUrl(e.target.value)}
          placeholder="https://assets.meshy.ai/…/model.glb"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </div>

      {/* Object prompt */}
      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-1.5">What is this object?</label>
        <input
          value={objectPrompt}
          onChange={(e) => setObjectPrompt(e.target.value)}
          placeholder="a cute chibi girl wearing a wizard hat and robe"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </div>

      {/* Style prompt */}
      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-1.5">
          Texture style <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <input
          value={stylePrompt}
          onChange={(e) => setStylePrompt(e.target.value)}
          placeholder="anime cel shading, pastel colors"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {STYLE_EXAMPLES.map((s) => (
            <button key={s} onClick={() => setStylePrompt(s)}
              className="text-xs px-2 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-600 border border-violet-200 transition-colors">
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Resolution */}
      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-2">Texture resolution</label>
        <div className="flex gap-2">
          {(["1024", "2048", "4096"] as const).map((r) => (
            <button key={r} onClick={() => setResolution(r)}
              className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium transition-all
                ${resolution === r ? "border-violet-500 bg-violet-50 text-violet-700" : "border-gray-200 text-gray-600 hover:border-violet-300"}`}>
              {r}px
              {r === "1024" && <span className="block text-xs font-normal text-gray-400">fast</span>}
              {r === "2048" && <span className="block text-xs font-normal text-gray-400">balanced</span>}
              {r === "4096" && <span className="block text-xs font-normal text-gray-400">detailed</span>}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={generate}
        disabled={loading || !modelUrl.trim() || !objectPrompt.trim()}
        className="btn-primary w-full disabled:opacity-40 py-3">
        {loading ? "Applying textures…" : "Apply AI Texture"}
      </button>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>}

      {jobs.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-600 mb-3">Results</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {jobs.map((j) => <MeshyResultCard key={j.id} job={j} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
