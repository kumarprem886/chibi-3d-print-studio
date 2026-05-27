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

// ─── Background Removal (@imgly/background-removal) ──────────────────────────

export async function removeBgBrowser(dataUrl: string): Promise<string> {
  const { removeBackground } = await import("@imgly/background-removal");
  const blob = dataUrlToBlob(dataUrl);
  const result = await removeBackground(blob, {
    publicPath: "https://staticimgly.com/@imgly/background-removal/1.1.26/dist/",
    model: "medium",
  });
  return blobToDataUrl(result);
}

// ─── PDF Extraction (pdfjs-dist) ─────────────────────────────────────────────

export async function extractPdfPages(file: File): Promise<string[]> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

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
    await page.render({ canvasContext: ctx, viewport }).promise;
    pages.push(canvas.toDataURL("image/png"));
  }
  return pages;
}

// ─── SVG Conversion (imagetracerjs) ──────────────────────────────────────────

export async function imageToSvgBrowser(dataUrl: string): Promise<string> {
  const ImageTracer = (await import("imagetracerjs")).default;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const svgStr = ImageTracer.imagedataToSVG(imageData, {
        ltres: 1,
        qtres: 1,
        pathomit: 8,
        colorsampling: 2,
        numberofcolors: 16,
        mincolorratio: 0.02,
        colorquantcycles: 3,
        layering: 0,
        strokewidth: 1,
        linefilter: false,
        scale: 1,
        roundcoords: 1,
        viewbox: true,
        desc: false,
        lcpr: 0,
        qcpr: 0,
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
    return { result: dataUrl, warning: "No HF_TOKEN configured — showing BG-removed image" };
  }

  const blob = dataUrlToBlob(dataUrl);

  // Step 1: Caption the image
  let caption = "a person";
  try {
    const captionResp = await fetch(
      `https://api-inference.huggingface.co/models/${HF_CAPTION_MODEL}`,
      { method: "POST", headers: { Authorization: `Bearer ${hfToken}` }, body: blob }
    );
    if (captionResp.ok) {
      const captionData = await captionResp.json();
      caption = Array.isArray(captionData)
        ? captionData[0]?.generated_text ?? "a person"
        : captionData?.generated_text ?? "a person";
    }
  } catch {}

  // Step 2: Generate chibi
  const prompt = customPrompt ||
    `chibi anime style, ${caption}, cute kawaii character, big head small body, full body, white background, simple clean lineart, pastel colors, anime chibi figurine`;
  const negative = "realistic, photo, ugly, deformed, extra limbs, nsfw, text, watermark, blurry";

  try {
    const genResp = await fetch(
      `https://api-inference.huggingface.co/models/${HF_IMAGE_MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { negative_prompt: negative, guidance_scale: 7.5, num_inference_steps: 28 },
        }),
      }
    );

    if (!genResp.ok) {
      const err = await genResp.text();
      // Model loading — return original with warning
      if (genResp.status === 503) {
        return { result: dataUrl, warning: "HuggingFace model is loading, try again in 20s" };
      }
      throw new Error(err);
    }

    const resultBlob = await genResp.blob();
    const resultDataUrl = await blobToDataUrl(resultBlob);
    return { result: resultDataUrl };
  } catch (e: any) {
    return { result: dataUrl, warning: `Chibi generation failed: ${e.message}` };
  }
}
