import os
import base64
import requests
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env", override=True)

router = APIRouter()

MESHY_BASE = "https://api.meshy.ai"


def _key():
    load_dotenv(Path(__file__).parent.parent / ".env", override=True)
    key = os.getenv("MESHY_API_KEY", "").strip()
    if not key:
        raise HTTPException(400, "MESHY_API_KEY not set in backend/.env")
    return key


def _headers():
    return {"Authorization": f"Bearer {_key()}", "Content-Type": "application/json"}


# ─── Models ──────────────────────────────────────────────────────────────────

class ImageTo3DRequest(BaseModel):
    image_data: str
    image_id: str = ""
    enable_pbr: bool = False
    should_remesh: bool = True
    target_polycount: int = 30000

class TextTo3DRequest(BaseModel):
    prompt: str
    negative_prompt: str = "low quality, ugly, deformed"
    art_style: str = "cartoon"   # realistic | cartoon | low_poly | sculpture | pbr

class TextTo3DRefineRequest(BaseModel):
    preview_task_id: str

class TextToTextureRequest(BaseModel):
    model_url: str          # URL to an existing GLB/OBJ
    object_prompt: str
    style_prompt: str = ""
    negative_prompt: str = "low quality, ugly"
    resolution: str = "1024"  # "1024" | "2048" | "4096"
    enable_pbr: bool = False


# ─── Image → 3D ──────────────────────────────────────────────────────────────

@router.post("/image-to-3d")
async def image_to_3d(req: ImageTo3DRequest):
    raw = _decode_data_url(req.image_data)
    b64 = base64.b64encode(raw).decode()
    payload = {
        "image_url": f"data:image/png;base64,{b64}",
        "enable_pbr": req.enable_pbr,
        "should_remesh": req.should_remesh,
        "topology": "quad",
        "target_polycount": req.target_polycount,
    }
    resp = requests.post(f"{MESHY_BASE}/openapi/v1/image-to-3d", json=payload, headers=_headers())
    if resp.status_code not in (200, 201, 202):
        raise HTTPException(500, f"Meshy error {resp.status_code}: {resp.text}")
    job_id = resp.json().get("result") or resp.json().get("id")
    return JSONResponse({"job_id": job_id, "type": "image-to-3d"})


@router.get("/image-to-3d/{job_id}")
async def image_to_3d_status(job_id: str):
    resp = requests.get(f"{MESHY_BASE}/openapi/v1/image-to-3d/{job_id}", headers=_headers())
    if resp.status_code != 200:
        raise HTTPException(500, f"Meshy status error: {resp.text}")
    return JSONResponse(_parse_status(resp.json()))


# ─── Text → 3D ───────────────────────────────────────────────────────────────

@router.post("/text-to-3d/preview")
async def text_to_3d_preview(req: TextTo3DRequest):
    payload = {
        "mode": "preview",
        "prompt": req.prompt,
        "negative_prompt": req.negative_prompt,
        "art_style": req.art_style,
    }
    resp = requests.post(f"{MESHY_BASE}/openapi/v2/text-to-3d", json=payload, headers=_headers())
    if resp.status_code not in (200, 201, 202):
        raise HTTPException(500, f"Meshy error {resp.status_code}: {resp.text}")
    job_id = resp.json().get("result") or resp.json().get("id")
    return JSONResponse({"job_id": job_id, "type": "text-to-3d"})


@router.post("/text-to-3d/refine")
async def text_to_3d_refine(req: TextTo3DRefineRequest):
    payload = {"mode": "refine", "preview_task_id": req.preview_task_id}
    resp = requests.post(f"{MESHY_BASE}/openapi/v2/text-to-3d", json=payload, headers=_headers())
    if resp.status_code not in (200, 201, 202):
        raise HTTPException(500, f"Meshy error {resp.status_code}: {resp.text}")
    job_id = resp.json().get("result") or resp.json().get("id")
    return JSONResponse({"job_id": job_id, "type": "text-to-3d-refine"})


@router.get("/text-to-3d/{job_id}")
async def text_to_3d_status(job_id: str):
    resp = requests.get(f"{MESHY_BASE}/openapi/v2/text-to-3d/{job_id}", headers=_headers())
    if resp.status_code != 200:
        raise HTTPException(500, f"Meshy status error: {resp.text}")
    return JSONResponse(_parse_status(resp.json()))


# ─── Text → Texture ──────────────────────────────────────────────────────────

@router.post("/text-to-texture")
async def text_to_texture(req: TextToTextureRequest):
    payload = {
        "model_url": req.model_url,
        "object_prompt": req.object_prompt,
        "style_prompt": req.style_prompt,
        "negative_prompt": req.negative_prompt,
        "resolution": req.resolution,
        "enable_original_uv": True,
        "enable_pbr": req.enable_pbr,
    }
    resp = requests.post(f"{MESHY_BASE}/openapi/v1/text-to-texture", json=payload, headers=_headers())
    if resp.status_code not in (200, 201, 202):
        raise HTTPException(500, f"Meshy error {resp.status_code}: {resp.text}")
    job_id = resp.json().get("result") or resp.json().get("id")
    return JSONResponse({"job_id": job_id, "type": "text-to-texture"})


@router.get("/text-to-texture/{job_id}")
async def text_to_texture_status(job_id: str):
    resp = requests.get(f"{MESHY_BASE}/openapi/v1/text-to-texture/{job_id}", headers=_headers())
    if resp.status_code != 200:
        raise HTTPException(500, f"Meshy status error: {resp.text}")
    return JSONResponse(_parse_status(resp.json()))


# ─── Shared download + legacy routes ─────────────────────────────────────────

@router.get("/download-model")
async def download_model(url: str, filename: str = "model.stl"):
    resp = requests.get(url, stream=True)
    if resp.status_code != 200:
        raise HTTPException(500, "Failed to download model from Meshy")
    ext = filename.rsplit(".", 1)[-1].lower()
    content_type = {"stl": "model/stl", "glb": "model/gltf-binary", "obj": "text/plain", "fbx": "application/octet-stream"}.get(ext, "application/octet-stream")
    return StreamingResponse(
        resp.iter_content(chunk_size=8192),
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# Legacy route used by existing /models page
@router.post("/generate-3d")
async def generate_3d_legacy(req: ImageTo3DRequest):
    return await image_to_3d(req)


@router.get("/job-status/{job_id}")
async def job_status_legacy(job_id: str):
    return await image_to_3d_status(job_id)


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _parse_status(data: dict) -> dict:
    status = data.get("status", "unknown").lower()
    result = {
        "job_id": data.get("id", ""),
        "status": status,
        "progress": data.get("progress", 0),
    }
    if status == "succeeded":
        model_urls = data.get("model_urls", {})
        result["stl_url"] = model_urls.get("stl")
        result["fbx_url"] = model_urls.get("fbx")
        result["obj_url"] = model_urls.get("obj")
        result["glb_url"] = model_urls.get("glb")
        result["usdz_url"] = model_urls.get("usdz")
        result["3mf_url"] = model_urls.get("3mf") or model_urls.get("stl")
        result["thumbnail_url"] = data.get("thumbnail_url")
        result["texture_urls"] = data.get("texture_urls", [])
    return result


def _decode_data_url(data: str) -> bytes:
    if data.startswith("data:"):
        _, encoded = data.split(",", 1)
        return base64.b64decode(encoded)
    return base64.b64decode(data)
