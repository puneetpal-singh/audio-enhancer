# Audio Enhancer

Audio Enhancer is a local video-audio restoration tool. It combines a FastAPI backend, a React control panel, FFmpeg, DeepFilterNet noise suppression, Pedalboard vocal processing, and loudness normalization.

## Features

- Enhance video audio without re-encoding the video stream.
- Reduce background noise with DeepFilterNet.
- Adjust vocal presence, output gain, compression, limiter ceiling, and target loudness.
- Apply a timed spot boost for quiet segments.
- Run from the command line or through the local GUI.

## Requirements

- Python 3.11+
- Node.js 20+
- FFmpeg available on `PATH`
- DeepFilterNet command available through `deep-filter` or `df-enhance`

## Setup

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd gui
npm install
cd ..
```

## Run The GUI

```powershell
python start_gui.py
```

The backend runs at `http://127.0.0.1:8000` and the frontend runs at `http://localhost:5173`.

## Run From The Command Line

```powershell
python enhance.py "C:\path\to\video.mp4"
```

Optional controls:

```powershell
python enhance.py "C:\path\to\video.mp4" --output "C:\path\to\enhanced_video.mp4" --vocal-boost 4 --gain 2 --lufs -14
```

Generated media, local environments, model binaries, and frontend dependencies are intentionally excluded from Git.
