"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ModelCard from "@/components/ModelCard";
import { useStore, ModelEntry } from "@/lib/store";
import { generate3D, pollJobStatus } from "@/lib/api";

export default function ModelsPage() {
  const router = useRouter();
  const { images, models, addModel, updateModel } = useStore();
  const [started, setStarted] = useState(false);
  const [error, setError] = useState("");

  const selected = images.filter((i) => i.selected_for_3d && i.status === "done");

  useEffect(() => {
    if (started || selected.length === 0) return;
    setStarted(true);
    kickOffGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function kickOffGeneration() {
    for (const img of selected) {
      const displayImage = img.chibi_data_url || img.no_bg_data_url || img.original_data_url;
      const modelId = crypto.randomUUID();
      try {
        const { job_id } = await generate3D(displayImage, img.id);
        const entry: ModelEntry = {
          id: modelId,
          image_id: img.id,
          job_id,
          status: "pending",
          progress: 0,
          filename: img.filename.replace(/\.[^.]+$/, "") + "_chibi",
        };
        addModel(entry);
        pollModel(modelId, job_id);
      } catch (e: any) {
        setError(e.message);
      }
    }
  }

  async function pollModel(modelId: string, jobId: string) {
    const MAX_WAIT = 300_000;
    const start = Date.now();

    while (Date.now() - start < MAX_WAIT) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const data = await pollJobStatus(jobId);
        updateModel(modelId, {
          status: data.status,
          progress: data.progress ?? 0,
          stl_url: data.stl_url,
          glb_url: data.glb_url,
          "3mf_url": data["3mf_url"],
          thumbnail_url: data.thumbnail_url,
        });
        if (data.status === "succeeded" || data.status === "failed") break;
      } catch {
        break;
      }
    }
  }

  if (selected.length === 0 && !started) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex flex-col items-center justify-center p-6">
        <p className="text-gray-500 mb-4">No chibis selected for 3D generation.</p>
        <button onClick={() => router.push("/review")} className="btn-primary">Back to Review</button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-purple-700">3D Models</h1>
            <p className="text-sm text-gray-500">Generating {selected.length} model{selected.length !== 1 ? "s" : ""} via Meshy.ai</p>
          </div>
          <button onClick={() => router.push("/review")} className="btn-secondary text-sm">Back to Review</button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-600">{error}</div>
        )}

        {models.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {models.map((m) => (
              <ModelCard key={m.id} model={m} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
