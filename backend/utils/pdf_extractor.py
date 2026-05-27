import io
from pathlib import Path
from typing import List


def extract_images_from_pdf(pdf_bytes: bytes) -> List[bytes]:
    try:
        from pdf2image import convert_from_bytes
        pages = convert_from_bytes(pdf_bytes, dpi=200, fmt="PNG")
        result = []
        for page in pages:
            buf = io.BytesIO()
            page.save(buf, format="PNG")
            result.append(buf.getvalue())
        return result
    except Exception as e:
        raise RuntimeError(f"PDF extraction failed: {e}. Ensure poppler is installed.")
