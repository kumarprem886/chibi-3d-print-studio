"use client";
import { downloadModelUrl } from "@/lib/api";
import ProgressBar from "@/components/ProgressBar";

export type MeshyJob = {
  id: string;
  label: string;
  job_id: string;
  status: "pending" | "processing" | "succeeded" | "failed";
  progress: number;
  thumbnail_url?: string;
  stl_url?: string;
  glb_url?: string;
  obj_url?: string;
  fbx_url?: string;
  usdz_url?: string;
  "3mf_url"?: string;
  texture_urls?: string[];
  // for text-to-3d refine support
  type?: string;
  onRefine?: (jobId: string) => void;
};

const FORMATS = [
  { key: "stl_url",  ext: "stl",  label: "STL (FDM print)" },
  { key: "3mf_url",  ext: "3mf",  label: "3MF (FDM print)" },
  { key: "glb_url",  ext: "glb",  label: "GLB (preview)" },
  { key: "obj_url",  ext: "obj",  label: "OBJ" },
  { key: "fbx_url",  ext: "fbx",  label: "FBX" },
  { key: "usdz_url", ext: "usdz", label: "USDZ" },
] as const;

export default function MeshyResultCard({ job }: { job: MeshyJob }) {
  function dl(url: string, ext: string) {
    window.open(downloadModelUrl(url, `${job.label}.${ext}`), "_blank");
  }

  const isProcessing = job.status === "pending" || job.status === "processing";

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden">
      {/* Thumbnail */}
      <div className="h-44 bg-gray-100 flex items-center justify-center relative">
        {job.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={job.thumbnail_url} alt="3D preview" className="h-full w-full object-contain" />
        ) : job.status === "failed" ? (
          <span className="text-red-500 text-sm px-4 text-center">Generation failed</span>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 border-4 border-violet-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-400">Generating…</span>
          </div>
        )}
        <span className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium
          ${job.status === "succeeded" ? "bg-green-100 text-green-700" :
            job.status === "failed"    ? "bg-red-100 text-red-600" :
            "bg-yellow-100 text-yellow-700"}`}>
          {job.status}
        </span>
      </div>

      <div className="p-3">
        <p className="font-medium text-sm text-gray-700 truncate mb-2" title={job.label}>{job.label}</p>

        {isProcessing && <ProgressBar value={job.progress} label={`${job.progress}%`} />}

        {job.status === "succeeded" && (
          <>
            {/* Download buttons */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {FORMATS.map(({ key, ext, label }) => {
                const url = (job as any)[key];
                if (!url) return null;
                return (
                  <button key={ext} onClick={() => dl(url, ext)}
                    className="text-xs px-2 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors">
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Refine button for text-to-3d previews */}
            {job.type === "text-to-3d" && job.onRefine && (
              <button
                onClick={() => job.onRefine!(job.job_id)}
                className="mt-2 w-full text-xs px-3 py-1.5 rounded-lg border border-violet-400 text-violet-600 hover:bg-violet-50 font-medium transition-colors">
                ✨ Refine this model
              </button>
            )}

            {/* Texture URLs */}
            {job.texture_urls && job.texture_urls.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Textures:</p>
                <div className="flex gap-1 flex-wrap">
                  {job.texture_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer"
                      className="text-xs text-violet-600 underline">Texture {i + 1}</a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
