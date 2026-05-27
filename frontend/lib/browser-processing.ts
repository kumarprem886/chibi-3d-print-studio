"use client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(blob);
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return blobToDataUrl(file);
}

// ─── Background Removal (HuggingFace API — no WASM, no bundling issues) ───────

export async function removeBgBrowser(dataUrl: string): Promise<string> {
  const hfToken = process.env.NEXT_PUBLIC_HF_TOKEN ?? "";
  if (!hfToken) return dataUrl;

  const blob = dataUrlToBlob(dataUrl);

  // Step 1: get foreground mask from RMBG-1.4
  const resp = await fetch(
    "https://api-inference.huggingface.co/models/briaai/RMBG-1.4",
    { method: "POST", headers: { Authorization: `Bearer ${hfToken}` }, body: blob }
  );

  if (!resp.ok) return dataUrl; // graceful fallback

  const data = await resp.json() as Array<{ label: string; mask: string }>;
  const fgItem = data.find((d) => d.label === "foreground") ?? data[0];
  if (!fgItem?.mask) return dataUrl;

  // Step 2: apply mask to original image using canvas
  return applyMask(dataUrl, fgItem.mask);
}

function applyMask(originalDataUrl: string, maskDataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const origImg = new Image();
    origImg.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = origImg.naturalWidth;
      canvas.height = origImg.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(origImg, 0, 0);

      const maskImg = new Image();
      maskImg.onload = () => {
        const maskCanvas = document.createElement("canvas");
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
        const mCtx = maskCanvas.getContext("2d")!;
        mCtx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);

        const orig = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const mask = mCtx.getImageData(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < orig.data.length; i += 4) {
          orig.data[i + 3] = mask.data[i]; // use red channel of mask as alpha
        }
        ctx.putImageData(orig, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      maskImg.src = maskDataUrl;
    };
    origImg.src = originalDataUrl;
  });
}

// ─── PDF Extraction (pdfjs-dist v4 — CDN worker, Node 20 compatible) ─────────

export async function extractPdfPages(file: File): Promise<string[]> {
  const pdfjsLib = await import("pdfjs-dist");
  // Use CDN worker to avoid bundling issues
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport }).promise;
    pages.push(canvas.toDataURL("image/png"));
  }
  return pages;
}

// ─── SVG Conversion (imagetracerjs — pure JS, no WASM) ────────────────────────

export async function imageToSvgBrowser(dataUrl: string): Promise<string> {
  const ImageTracer = (await import("imagetracerjs")).default;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const svgStr: string = ImageTracer.imagedataToSVG(imageData, {
        ltres: 1, qtres: 1, pathomit: 8,
        colorsampling: 2, numberofcolors: 16,
        mincolorratio: 0.02, colorquantcycles: 3,
        strokewidth: 1, scale: 1, roundcoords: 1,
        viewbox: true, desc: false,
      });
      resolve(svgStr);
    };
    img.src = dataUrl;
  });
}

// ─── Chibi Generation (HuggingFace Inference API, direct from browser) ────────

const HF_CAPTION_MODEL = "Salesforce/blip-image-captioning-base";
const HF_IMAGE_MODEL   = "Linaqruf/anything-v3-1";

export async function generateChibiBrowser(
  dataUrl: string,
  hfToken: string,
  customPrompt = ""
): Promise<{ result: string; warning?: string }> {
  if (!hfToken) {
    return { result: dataUrl, warning: "No HF_TOKEN — showing BG-removed image" };
  }

  const blob = dataUrlToBlob(dataUrl);

  // Caption the image
  let caption = "a person";
  try {
    const r = await fetch(
      `https://api-inference.huggingface.co/models/${HF_CAPTION_MODEL}`,
      { method: "POST", headers: { Authorization: `Bearer ${hfToken}` }, body: blob }
    );
    if (r.ok) {
      const d = await r.json();
      caption = Array.isArray(d) ? d[0]?.generated_text ?? "a person" : d?.generated_text ?? "a person";
    }
  } catch {}

  // Generate chibi
  const prompt = customPrompt ||
    `chibi anime style, ${caption}, cute kawaii character, big head small body, full body, white background, simple clean lineart, pastel colors`;
  const negative = "realistic, photo, ugly, deformed, extra limbs, nsfw, text, watermark, blurry";

  try {
    const r = await fetch(
      `https://api-inference.huggingface.co/models/${HF_IMAGE_MODEL}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: prompt, parameters: { negative_prompt: negative, guidance_scale: 7.5, num_inference_steps: 28 } }),
      }
    );
    if (!r.ok) {
      if (r.status === 503) return { result: dataUrl, warning: "Model loading — try again in 20s" };
      throw new Error(await r.text());
    }
    const resultBlob = await r.blob();
    return { result: await blobToDataUrl(resultBlob) };
  } catch (e: any) {
    return { result: dataUrl, warning: `Chibi failed: ${e.message}` };
  }
}
