param (
    [Parameter(Mandatory=$true)]
    [string]$InputVideo
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Write-Host "ffmpeg not found in PATH. Searching for local installation..." -ForegroundColor Yellow
    $localFfmpeg = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter ffmpeg.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($localFfmpeg) {
        $ffmpegPath = $localFfmpeg.FullName
        Write-Host "Found FFmpeg at: $ffmpegPath" -ForegroundColor Cyan
        function ffmpeg { & $ffmpegPath @args }
    } else {
        Write-Host "Error: ffmpeg is not installed or not in your PATH." -ForegroundColor Red
        Write-Host "Please install ffmpeg from https://ffmpeg.org/download.html and add it to your PATH."
        exit 1
    }
}

if (-not (Test-Path $InputVideo)) {
    Write-Host "Error: Input video '$InputVideo' not found." -ForegroundColor Red
    exit 1
}

$outputVideo = Join-Path (Split-Path -Parent $InputVideo) ("enhanced_" + (Split-Path -Leaf $InputVideo))

Write-Host "Enhancing audio..." -ForegroundColor Cyan
python enhance.py "$InputVideo" --output "$outputVideo"
Write-Host "Done! Output saved as $outputVideo" -ForegroundColor Green
