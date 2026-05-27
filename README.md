# Chibi 3D Print Studio

Upload photos or PDFs → remove backgrounds → generate chibi 2D art → export SVGs → generate 3D models (STL/3MF) for FDM printing.

---

## Prerequisites

### 1. System tools (Windows — run in Administrator PowerShell)

```powershell
# Install Chocolatey if you don't have it
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install poppler (PDF extraction) and potrace (SVG conversion)
choco install poppler -y
choco install potrace -y
```

### 2. Python 3.10+

```powershell
# From the backend folder
cd chibi-print\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3. Node.js 18+

```powershell
cd chibi-print\frontend
npm install
```

---

## API Keys (free tiers)

Copy `backend\.env.example` to `backend\.env` and fill in:

| Key | Where to get it | Free tier |
|-----|----------------|-----------|
| `REPLICATE_API_TOKEN` | https://replicate.com/account/api-tokens | Free starter credits |
| `MESHY_API_KEY` | https://app.meshy.ai → Settings → API Keys | 3 free image-to-3D/day |

> **No keys?** The app still works — background removal runs locally for free. Chibi generation will return the BG-removed image with a warning. 3D generation requires a Meshy key.

---

## Running the app

Open **two terminals**:

**Terminal 1 — Backend**
```powershell
cd chibi-print\backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend**
```powershell
cd chibi-print\frontend
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Workflow

1. **Upload** — drag & drop images (JPG/PNG/WEBP) or PDFs. Multi-page PDFs are split into individual images automatically.
2. **Auto-processing** — background is removed locally (rembg), then chibi art is generated via Replicate.
3. **Review** — inspect all chibis side-by-side with originals. Download PNGs, convert to SVG (for laser cutting), or add more images.
4. **Select & Generate 3D** — check the chibis you want as figurines and click "Generate 3D". Meshy.ai converts each one.
5. **Download** — grab STL or 3MF files and open in Cura/Bambu Studio to slice for your FDM printer.

---

## FDM Print Tips

- Use 0.12–0.16mm layer height for best detail
- Tree supports work best on curved figurines
- Sand with 200→400→800 grit, then apply filler primer to hide layer lines
- Paint with acrylics — chibi bold colours are very forgiving

---

## Project Structure

```
chibi-print/
├── backend/          Python FastAPI — image processing + AI APIs
│   ├── main.py
│   ├── routers/      upload, background, chibi, svg, model3d
│   ├── utils/        pdf_extractor, file_manager
│   └── requirements.txt
└── frontend/         Next.js 14 — UI
    ├── app/          page.tsx (upload), review/, models/
    ├── components/   UploadZone, ChibiCard, ModelCard, ProgressBar
    └── lib/          api.ts, store.ts (Zustand)
```
