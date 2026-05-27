import os
import io
import base64
import requests
import time
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# Always load .env from the backend directory
load_dotenv(Path(__file__).parent.parent / ".env", override=True)

router = APIRouter()

HF_CAPTION_MODEL = "Salesforce/blip-image-captioning-base"
HF_IMAGE_MODEL = "Linaqruf/anything-v3-1"
REPLICATE_MODEL = "cjwbw/anything-v3-better-vae:09a5805203f4c12da649ec1923bb7729517ca25fcac790e640eaa9ed66573b65"


class ChibiRequest(BaseModel):
    image_data: str
    prompt: str = ""


@router.post("/generate-chibi")
async def generate_chibi(req: ChibiRequest):
    # Read tokens fresh on every request so .env changes take effect without restart
    hf_token = os.getenv("HF_TOKEN", "").strip()
    replicate_token = os.getenv("REPLICATE_API_TOKEN", "").strip()

    raw = _decode_data_url(req.image_data)

    if hf_token:
        try:
            result_bytes = _generate_with_huggingface(raw, req.prompt, hf_token)
            b64 = base64.b64encode(result_bytes).decode()
            return JSONResponse({"result": f"data:image/png;base64,{b64}"})
        except Exception as e:
            hf_error = str(e)
    else:
        hf_error = "No HF_TOKEN set"

    if replicate_token:
        try:
            result_bytes = _generate_with_replicate(raw, req.prompt, replicate_token)
            b64 = base64.b64encode(result_bytes).decode()
            return JSONResponse({"result": f"data:image/png;base64,{b64}"})
        except Exception as e:
            raise HTTPException(500, f"Both providers failed. HF: {hf_error} | Replicate: {e}")

    return JSONResponse({
        "result": req.image_data,
        "warning": "No chibi provider configured. Set HF_TOKEN in backend/.env for free chibi generation.",
    })


def _generate_with_huggingface(image_bytes: bytes, custom_prompt: str, token: str) -> bytes:
    from huggingface_hub import InferenceClient
    client = InferenceClient(token=token)

    # Caption the image with BLIP
    try:
        caption_result = client.image_to_text(image_bytes, model=HF_CAPTION_MODEL)
        caption = caption_result.generated_text if hasattr(caption_result, "generated_text") else str(caption_result)
    except Exception:
        caption = "a person"

    prompt = custom_prompt or (
        f"chibi anime style, {caption}, cute kawaii character, "
        "big head small body, full body, white background, "
        "simple clean lineart, pastel colors, anime chibi figurine"
    )
    negative = "realistic, photo, ugly, deformed, extra limbs, nsfw, text, watermark, blurry"

    result_image = client.text_to_image(
        prompt=prompt,
        negative_prompt=negative,
        model=HF_IMAGE_MODEL,
        guidance_scale=7.5,
        num_inference_steps=28,
    )

    buf = io.BytesIO()
    result_image.save(buf, format="PNG")
    return buf.getvalue()


def _generate_with_replicate(image_bytes: bytes, custom_prompt: str, token: str) -> bytes:
    b64_input = base64.b64encode(image_bytes).decode()
    data_uri = f"data:image/png;base64,{b64_input}"

    prompt = custom_prompt or (
        "chibi style, full body character, cute anime chibi, simple white background, "
        "big head small body, kawaii, clean lineart, pastel colors"
    )

    headers = {"Authorization": f"Token {token}", "Content-Type": "application/json"}
    payload = {
        "version": REPLICATE_MODEL,
        "input": {
            "image": data_uri,
            "prompt": prompt,
            "negative_prompt": "realistic, photo, 3d render, ugly, deformed, extra limbs, nsfw",
            "num_inference_steps": 30,
            "guidance_scale": 7.5,
            "strength": 0.75,
        },
    }

    resp = requests.post("https://api.replicate.com/v1/predictions", json=payload, headers=headers)
    if resp.status_code != 201:
        raise Exception(f"Replicate API error: {resp.text}")

    result_url = _poll_replicate(resp.json()["urls"]["get"], headers)
    return requests.get(result_url).content


def _poll_replicate(url: str, headers: dict, timeout: int = 120) -> str:
    start = time.time()
    while time.time() - start < timeout:
        r = requests.get(url, headers=headers)
        data = r.json()
        status = data.get("status")
        if status == "succeeded":
            output = data.get("output")
            return output[0] if isinstance(output, list) else output
        if status == "failed":
            raise Exception(f"Replicate job failed: {data.get('error')}")
        time.sleep(3)
    raise Exception("Replicate job timed out")


def _decode_data_url(data: str) -> bytes:
    if data.startswith("data:"):
        _, encoded = data.split(",", 1)
        return base64.b64decode(encoded)
    return base64.b64decode(data)
