import os
import uuid
import shutil
import asyncio
from pathlib import Path
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

TEMP_DIR = Path(os.getenv("TEMP_DIR", "./temp"))
TEMP_DIR.mkdir(exist_ok=True)


def new_session() -> str:
    session_id = str(uuid.uuid4())
    (TEMP_DIR / session_id).mkdir(parents=True, exist_ok=True)
    return session_id


def session_path(session_id: str) -> Path:
    return TEMP_DIR / session_id


def save_bytes(session_id: str, filename: str, data: bytes) -> Path:
    path = session_path(session_id) / filename
    path.write_bytes(data)
    return path


def cleanup_old_sessions(max_age_hours: int = 1):
    cutoff = datetime.now() - timedelta(hours=max_age_hours)
    for folder in TEMP_DIR.iterdir():
        if folder.is_dir():
            mtime = datetime.fromtimestamp(folder.stat().st_mtime)
            if mtime < cutoff:
                shutil.rmtree(folder, ignore_errors=True)
