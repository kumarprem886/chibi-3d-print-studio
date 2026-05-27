"use client";
import { useState } from "react";
import ImageTo3DTab from "./tabs/ImageTo3DTab";
import TextTo3DTab from "./tabs/TextTo3DTab";
import TextToTextureTab from "./tabs/TextToTextureTab";
import Link from "next/link";

const TABS = [
  { id: "image-to-3d",    label: "🖼️ Image → 3D",     desc: "Upload any image and convert it to a 3D model" },
  { id: "text-to-3d",     label: "✍️ Text → 3D",       desc: "Describe a model in words and generate it" },
  { id: "text-to-texture",label: "🎨 Text → Texture",  desc: "Apply AI-generated textures to an existing 3D model" },
];

export default function MeshyStudioPage() {
  const [activeTab, setActiveTab] = useState("image-to-3d");
  const tab = TABS.find((t) => t.id === activeTab)!;

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">← Home</Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-xl font-bold text-violet-700">Meshy AI Studio</h1>
            <span className="text-xs bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-medium">Powered by Meshy.ai</span>
          </div>
          <Link href="/review" className="btn-secondary text-sm">← Back to Chibis</Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Tab bar */}
        <div className="flex gap-2 mb-2 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all border ${
                activeTab === t.id
                  ? "bg-violet-600 text-white border-violet-600 shadow-md"
                  : "bg-white text-gray-600 border-gray-200 hover:border-violet-300 hover:text-violet-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-400 mb-6 pl-1">{tab.desc}</p>

        {/* Tab content */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          {activeTab === "image-to-3d"     && <ImageTo3DTab />}
          {activeTab === "text-to-3d"      && <TextTo3DTab />}
          {activeTab === "text-to-texture" && <TextToTextureTab />}
        </div>
      </div>
    </main>
  );
}
