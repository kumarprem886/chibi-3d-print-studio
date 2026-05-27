import os
import base64
import subprocess
import tempfile
import io
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from PIL import Image

router = APIRouter()


class SvgRequest(BaseModel):
    image_data: str  # base64 PNG data URL


@router.post("/convert-svg")
async def convert_to_svg(req: SvgRequest):
    raw = _decode_data_url(req.image_data)

    # Convert to black-and-white bitmap for potrace
    img = Image.open(io.BytesIO(raw)).convert("L")
    # Threshold to pure B&W
    bw = img.point(lambda x: 0 if x < 128 else 255, "1")

    with tempfile.NamedTemporaryFile(suffix=".bmp", delete=False) as bmp_f:
        bmp_path = bmp_f.name
        bw.save(bmp_path, format="BMP")

    svg_path = bmp_path.replace(".bmp", ".svg")

    try:
        result = subprocess.run(
            ["potrace", bmp_path, "-s", "-o", svg_path],
            capture_output=True,
            timeout=30,
        )
        if result.returncode != 0:
            raise HTTPException(
                500,
                f"potrace failed: {result.stderr.decode()}. "
                "Install potrace: choco install potrace"
            )
    except FileNotFoundError:
        raise HTTPException(
            500,
            "potrace not found. Install it: choco install potrace (Windows) or apt install potrace (Linux)"
        )
    finally:
        os.unlink(bmp_path)

    with open(svg_path, "r", encoding="utf-8") as f:
        svg_content = f.read()
    os.unlink(svg_path)

    b64_svg = base64.b64encode(svg_content.encode()).decode()
    return JSONResponse({
        "result": f"data:image/svg+xml;base64,{b64_svg}",
        "svg_text": svg_content,
    })


def _decode_data_url(data: str) -> bytes:
    if data.startswith("data:"):
        _, encoded = data.split(",", 1)
        return base64.b64decode(encoded)
    return base64.b64decode(data)
