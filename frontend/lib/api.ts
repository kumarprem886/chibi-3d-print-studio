const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function post(path: string, body: object) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function get(path: string) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Upload ─────────────────────────────────────────────────────────────────

export async function uploadFiles(files: File[]) {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  const res = await fetch(`${API}/api/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Image processing ───────────────────────────────────────────────────────

export async function removeBg(imageData: string): Promise<string> {
  const data = await post("/api/remove-bg", { image_data: imageData });
  return data.result;
}

export async function generateChibi(imageData: string, prompt = ""): Promise<{ result: string; warning?: string }> {
  return post("/api/generate-chibi", { image_data: imageData, prompt });
}

export async function convertToSvg(imageData: string): Promise<{ result: string; svg_text: string }> {
  return post("/api/convert-svg", { image_data: imageData });
}

// ── Meshy AI ───────────────────────────────────────────────────────────────

/** Image → 3D */
export async function meshyImageTo3D(
  imageData: string,
  imageId = "",
  opts: { enablePbr?: boolean; targetPolycount?: number } = {}
): Promise<{ job_id: string; type: string }> {
  return post("/api/image-to-3d", {
    image_data: imageData,
    image_id: imageId,
    enable_pbr: opts.enablePbr ?? false,
    should_remesh: true,
    target_polycount: opts.targetPolycount ?? 30000,
  });
}

export async function meshyImageTo3DStatus(jobId: string) {
  return get(`/api/image-to-3d/${jobId}`);
}

/** Text → 3D (preview step) */
export async function meshyTextTo3DPreview(
  prompt: string,
  negativePrompt = "low quality, ugly, deformed",
  artStyle = "cartoon"
): Promise<{ job_id: string; type: string }> {
  return post("/api/text-to-3d/preview", { prompt, negative_prompt: negativePrompt, art_style: artStyle });
}

/** Text → 3D (refine step — call after preview succeeds) */
export async function meshyTextTo3DRefine(previewTaskId: string): Promise<{ job_id: string; type: string }> {
  return post("/api/text-to-3d/refine", { preview_task_id: previewTaskId });
}

export async function meshyTextTo3DStatus(jobId: string) {
  return get(`/api/text-to-3d/${jobId}`);
}

/** Text → Texture */
export async function meshyTextToTexture(
  modelUrl: string,
  objectPrompt: string,
  stylePrompt = "",
  resolution: "1024" | "2048" | "4096" = "1024"
): Promise<{ job_id: string; type: string }> {
  return post("/api/text-to-texture", {
    model_url: modelUrl,
    object_prompt: objectPrompt,
    style_prompt: stylePrompt,
    resolution,
  });
}

export async function meshyTextToTextureStatus(jobId: string) {
  return get(`/api/text-to-texture/${jobId}`);
}

/** Download helper */
export function downloadModelUrl(modelUrl: string, filename: string) {
  return `${API}/api/download-model?url=${encodeURIComponent(modelUrl)}&filename=${encodeURIComponent(filename)}`;
}

// ── Legacy (used by /models page) ─────────────────────────────────────────

export async function generate3D(imageData: string, imageId: string): Promise<{ job_id: string }> {
  return post("/api/generate-3d", { image_data: imageData, image_id: imageId });
}

export async function pollJobStatus(jobId: string) {
  return get(`/api/job-status/${jobId}`);
}
