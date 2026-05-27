import io
import base64
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter()


class RemoveBgRequest(BaseModel):
    image_data: str  # base64 PNG data URL or raw base64


@router.post("/remove-bg")
async def remove_background(req: RemoveBgRequest):
    try:
        from rembg import remove
    except ImportError:
        raise HTTPException(500, "rembg not installed. Run: pip install rembg")

    raw = _decode_data_url(req.image_data)
    try:
        result = remove(raw)
    except Exception as e:
        raise HTTPException(500, f"Background removal failed: {e}")

    b64 = base64.b64encode(result).decode()
    return JSONResponse({"result": f"data:image/png;base64,{b64}"})


def _decode_data_url(data: str) -> bytes:
    if data.startswith("data:"):
        _, encoded = data.split(",", 1)
        return base64.b64decode(encoded)
    return base64.b64decode(data)
