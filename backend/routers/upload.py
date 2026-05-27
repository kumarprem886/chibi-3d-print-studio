import io
import uuid
import base64
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image

from utils.file_manager import new_session, save_bytes
from utils.pdf_extractor import extract_images_from_pdf

router = APIRouter()

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_MB = 50


@router.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    session_id = new_session()
    images = []

    for file in files:
        data = await file.read()

        if len(data) > MAX_SIZE_MB * 1024 * 1024:
            raise HTTPException(413, f"{file.filename} exceeds {MAX_SIZE_MB}MB limit")

        if file.content_type == "application/pdf" or (file.filename or "").endswith(".pdf"):
            try:
                pages = extract_images_from_pdf(data)
            except RuntimeError as e:
                raise HTTPException(422, str(e))

            for i, page_bytes in enumerate(pages):
                img_id = str(uuid.uuid4())
                fname = f"{img_id}.png"
                save_bytes(session_id, fname, page_bytes)
                images.append({
                    "id": img_id,
                    "session_id": session_id,
                    "filename": f"{file.filename}_page{i+1}.png",
                    "data_url": _to_data_url(page_bytes),
                })
        elif file.content_type in ALLOWED_IMAGE_TYPES or _is_image_ext(file.filename):
            img_id = str(uuid.uuid4())
            # Normalise to PNG
            png_bytes = _to_png(data)
            fname = f"{img_id}.png"
            save_bytes(session_id, fname, png_bytes)
            images.append({
                "id": img_id,
                "session_id": session_id,
                "filename": file.filename,
                "data_url": _to_data_url(png_bytes),
            })
        else:
            raise HTTPException(415, f"Unsupported file type: {file.content_type}")

    return JSONResponse({"session_id": session_id, "images": images})


def _to_png(data: bytes) -> bytes:
    img = Image.open(io.BytesIO(data)).convert("RGBA")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _to_data_url(png_bytes: bytes) -> str:
    b64 = base64.b64encode(png_bytes).decode()
    return f"data:image/png;base64,{b64}"


def _is_image_ext(filename: str | None) -> bool:
    if not filename:
        return False
    return filename.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".gif"))
