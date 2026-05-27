from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from routers import upload, background, chibi, svg, model3d

app = FastAPI(title="Chibi 3D Print API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000"), "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(background.router, prefix="/api", tags=["background"])
app.include_router(chibi.router, prefix="/api", tags=["chibi"])
app.include_router(svg.router, prefix="/api", tags=["svg"])
app.include_router(model3d.router, prefix="/api", tags=["3d"])


@app.get("/health")
def health():
    return {"status": "ok"}
