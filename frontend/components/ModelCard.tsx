"use client";
import { ModelEntry } from "@/lib/store";
import { downloadModelUrl } from "@/lib/api";
import ProgressBar from "./ProgressBar";

type Props = { model: ModelEntry };

export default function ModelCard({ model }: Props) {
  function download(url: string | undefined, ext: string) {
    if (!url) return;
    const proxy = downloadModelUrl(url, `${model.filename}.${ext}`);
    window.open(proxy, "_blank");
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Thumbnail / spinner */}
      <div className="h-40 bg-gray-50 flex items-center justify-center">
        {model.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={model.thumbnail_url} alt="3D preview" className="h-full w-full object-contain" />
        ) : model.status === "failed" ? (
          <span className="text-red-500 text-sm">Generation failed</span>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-400">Generating 3D model...</span>
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="font-medium text-sm text-gray-700 truncate mb-2">{model.filename}</p>

        {model.status === "processing" || model.status === "pending" ? (
          <ProgressBar value={model.progress} label={`${model.progress}%`} />
        ) : model.status === "succeeded" ? (
          <div className="flex gap-2 flex-wrap mt-1">
            <button
              onClick={() => download(model.stl_url, "stl")}
              className="btn-primary text-xs"
            >
              Download STL
            </button>
            <button
              onClick={() => download(model["3mf_url"], "3mf")}
              className="btn-secondary text-xs"
            >
              Download 3MF
            </button>
          </div>
        ) : (
          <p className="text-xs text-red-500">Failed to generate model</p>
        )}
      </div>
    </div>
  );
}
