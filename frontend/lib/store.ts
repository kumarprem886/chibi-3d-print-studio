"use client";
import { create } from "zustand";

export type ImageEntry = {
  id: string;
  session_id: string;
  filename: string;
  original_data_url: string;
  no_bg_data_url?: string;
  chibi_data_url?: string;
  chibi_warning?: string;
  svg_data_url?: string;
  selected_for_3d: boolean;
  status: "idle" | "removing_bg" | "generating_chibi" | "done" | "error";
  error?: string;
};

export type ModelEntry = {
  id: string;
  image_id: string;
  job_id: string;
  status: "pending" | "processing" | "succeeded" | "failed";
  progress: number;
  stl_url?: string;
  glb_url?: string;
  thumbnail_url?: string;
  "3mf_url"?: string;
  filename: string;
};

type Store = {
  images: ImageEntry[];
  models: ModelEntry[];
  setImages: (imgs: ImageEntry[]) => void;
  addImages: (imgs: ImageEntry[]) => void;
  updateImage: (id: string, patch: Partial<ImageEntry>) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  addModel: (m: ModelEntry) => void;
  updateModel: (id: string, patch: Partial<ModelEntry>) => void;
  clearAll: () => void;
};

export const useStore = create<Store>((set) => ({
  images: [],
  models: [],
  setImages: (images) => set({ images }),
  addImages: (imgs) => set((s) => ({ images: [...s.images, ...imgs] })),
  updateImage: (id, patch) =>
    set((s) => ({ images: s.images.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
  toggleSelect: (id) =>
    set((s) => ({
      images: s.images.map((i) => (i.id === id ? { ...i, selected_for_3d: !i.selected_for_3d } : i)),
    })),
  selectAll: () => set((s) => ({ images: s.images.map((i) => ({ ...i, selected_for_3d: true })) })),
  deselectAll: () => set((s) => ({ images: s.images.map((i) => ({ ...i, selected_for_3d: false })) })),
  addModel: (m) => set((s) => ({ models: [...s.models, m] })),
  updateModel: (id, patch) =>
    set((s) => ({ models: s.models.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
  clearAll: () => set({ images: [], models: [] }),
}));
