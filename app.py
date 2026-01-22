import logging
from pathlib import Path
from typing import Optional

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

import enhance

app = FastAPI(title="Audio Enhancer Pro API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class EnhanceRequest(BaseModel):
    input_path: str
    output_path: Optional[str] = None
    vocal_boost: float = 3.0
    comp_thresh: float = -20.0
    comp_ratio: float = 4.0
    gain: float = 2.0
    limit: float = -0.1
    lufs: float = -14.0
    boost_start: Optional[float] = None
    boost_end: Optional[float] = None
    boost_db: float = 6.0

status_store = {
    "latest": {"status": "idle", "message": "Ready"}
}


def resolve_output_path(input_path: str, output_path: Optional[str]) -> Optional[str]:
    if not output_path:
        return None

    destination = Path(output_path).expanduser()
    if destination.exists() and destination.is_dir():
        source = Path(input_path)
        return str(destination / f"enhanced_{source.name}")

    return str(destination)


def run_enhancement_task(req: EnhanceRequest):
    try:
        status_store["latest"] = {"status": "processing", "message": "Starting enhancement..."}
        result = enhance.process_video(
            input_path=req.input_path,
            output_path=resolve_output_path(req.input_path, req.output_path),
            target_lufs=req.lufs,
            vocal_boost=req.vocal_boost,
            comp_thresh=req.comp_thresh,
            comp_ratio=req.comp_ratio,
            vocal_gain=req.gain,
            limit=req.limit,
            boost_start=req.boost_start,
            boost_end=req.boost_end,
            boost_db=req.boost_db
        )
        status_store["latest"] = {"status": "completed", "message": f"Saved to {result}", "path": result}
    except Exception as exc:
        logging.exception("Enhancement failed")
        status_store["latest"] = {"status": "error", "message": str(exc)}

@app.post("/api/enhance")
async def start_enhance(req: EnhanceRequest, background_tasks: BackgroundTasks):
    if not Path(req.input_path).expanduser().exists():
        raise HTTPException(status_code=400, detail="Input file not found.")

    background_tasks.add_task(run_enhancement_task, req)
    return {"message": "Processing started", "status": "queued"}

@app.get("/api/status")
async def get_status():
    return status_store["latest"]

@app.get("/api/browse/file")
async def browse_file():
    try:
        import tkinter as tk
        from tkinter import filedialog

        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        file_path = filedialog.askopenfilename(
            title="Select Video File",
            filetypes=[("Video files", "*.mp4 *.mov *.avi *.mkv"), ("All files", "*.*")]
        )
        root.destroy()
        return {"path": file_path}
    except Exception as exc:
        logging.exception("Browse file failed")
        raise HTTPException(status_code=500, detail=str(exc))

@app.get("/api/browse/directory")
async def browse_directory():
    try:
        import tkinter as tk
        from tkinter import filedialog

        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        dir_path = filedialog.askdirectory(title="Select Destination Folder")
        root.destroy()
        return {"path": dir_path}
    except Exception as exc:
        logging.exception("Browse directory failed")
        raise HTTPException(status_code=500, detail=str(exc))

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
