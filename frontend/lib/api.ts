// All API calls go directly from the browser — no backend server needed.
// Meshy and HuggingFace both support CORS for browser requests.

const MESHY_BASE = "https://api.meshy.ai";

function meshyKey() {
  return process.env.NEXT_PUBLIC_MESHY_API_KEY ?? "";
}

function meshyHeaders() {
  return {
    Authorization: `Bearer ${meshyKey()}`,
    "Content-Type": "application/json",
  };
}

async function meshyPost(path: string, body: object) {
  const res = await fetch(`${MESHY_BASE}${path}`, {
    method: "POST",
    headers: meshyHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Meshy error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function meshyGet(path: string) {
  const res = await fetch(`${MESHY_BASE}${path}`, { headers: meshyHeaders() });
  if (!res.ok) throw new Error(`Meshy error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Image → 3D ────────────────────────────────────────────────────────────────

export async function meshyImageTo3D(
  imageData: string,
  _imageId = "",
  opts: { enablePbr?: boolean; targetPolycount?: number } = {}
): Promise<{ job_id: string }> {
  const data = await meshyPost("/openapi/v1/image-to-3d", {
    image_url: imageData,
    enable_pbr: opts.enablePbr ?? false,
    should_remesh: true,
    topology: "quad",
    target_polycount: opts.targetPolycount ?? 30000,
  });
  return { job_id: data.result ?? data.id };
}

export async function meshyImageTo3DStatus(jobId: string) {
  const data = await meshyGet(`/openapi/v1/image-to-3d/${jobId}`);
  return _parseStatus(data);
}

// ── Text → 3D ─────────────────────────────────────────────────────────────────

export async function meshyTextTo3DPreview(
  prompt: string,
  negativePrompt = "low quality, ugly, deformed",
  artStyle = "cartoon"
): Promise<{ job_id: string }> {
  const data = await meshyPost("/openapi/v2/text-to-3d", {
    mode: "preview",
    prompt,
    negative_prompt: negativePrompt,
    art_style: artStyle,
  });
  return { job_id: data.result ?? data.id };
}

export async function meshyTextTo3DRefine(previewTaskId: string): Promise<{ job_id: string }> {
  const data = await meshyPost("/openapi/v2/text-to-3d", {
    mode: "refine",
    preview_task_id: previewTaskId,
  });
  return { job_id: data.result ?? data.id };
}

export async function meshyTextTo3DStatus(jobId: string) {
  const data = await meshyGet(`/openapi/v2/text-to-3d/${jobId}`);
  return _parseStatus(data);
}

// ── Text → Texture ────────────────────────────────────────────────────────────

export async function meshyTextToTexture(
  modelUrl: string,
  objectPrompt: string,
  stylePrompt = "",
  resolution: "1024" | "2048" | "4096" = "1024"
): Promise<{ job_id: string }> {
  const data = await meshyPost("/openapi/v1/text-to-texture", {
    model_url: modelUrl,
    object_prompt: objectPrompt,
    style_prompt: stylePrompt,
    negative_prompt: "low quality, ugly",
    resolution,
    enable_original_uv: true,
    enable_pbr: false,
  });
  return { job_id: data.result ?? data.id };
}

export async function meshyTextToTextureStatus(jobId: string) {
  const data = await meshyGet(`/openapi/v1/text-to-texture/${jobId}`);
  return _parseStatus(data);
}

// ── Direct download ───────────────────────────────────────────────────────────

export function downloadModelUrl(modelUrl: string, _filename: string) {
  // In static mode, just return the Meshy CDN URL directly
  return modelUrl;
}

// ── Legacy shims (used by /models page) ──────────────────────────────────────

export async function generate3D(imageData: string, imageId: string) {
  return meshyImageTo3D(imageData, imageId);
}

export async function pollJobStatus(jobId: string) {
  return meshyImageTo3DStatus(jobId);
}

// Kept for compatibility — actual processing is now in browser-processing.ts
export async function uploadFiles(_files: File[]) { return { images: [] }; }
export async function removeBg(imageData: string) { return imageData; }
export async function generateChibi(imageData: string) { return { result: imageData }; }
export async function convertToSvg(_imageData: string) { return { result: "", svg_text: "" }; }

// ── Helpers ───────────────────────────────────────────────────────────────────

function _parseStatus(data: Record<string, unknown>) {
  const status = (data.status as string ?? "unknown").toLowerCase();
  const modelUrls = (data.model_urls ?? {}) as Record<string, string>;
  return {
    job_id: data.id as string ?? "",
    status,
    progress: data.progress as number ?? 0,
    stl_url:       modelUrls.stl,
    glb_url:       modelUrls.glb,
    obj_url:       modelUrls.obj,
    fbx_url:       modelUrls.fbx,
    usdz_url:      modelUrls.usdz,
    "3mf_url":     modelUrls["3mf"] ?? modelUrls.stl,
    thumbnail_url: data.thumbnail_url as string,
    texture_urls:  data.texture_urls as string[] ?? [],
  };
}
