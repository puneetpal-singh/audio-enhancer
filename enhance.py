import os
import sys
import argparse
import subprocess
import numpy as np
import soundfile as sf
import ffmpeg
import pyloudnorm as pyln
from pedalboard import Pedalboard, Compressor, HighShelfFilter, Gain, Limiter
import glob
import time
import shutil

def check_ffmpeg():
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def get_device():
    return "cpu"

def extract_audio(video_path, audio_path):
    print(f"[*] Extracting audio from {video_path}...")
    try:
        (
            ffmpeg
            .input(video_path)
            .output(audio_path, acodec='pcm_s16le', ac=1, ar='48000')
            .overwrite_output()
            .run(quiet=True)
        )
    except ffmpeg.Error as e:
        print(f"[!] FFmpeg extraction error: {e.stderr.decode()}")
        sys.exit(1)

def process_deepfilternet(input_path, output_path):
    print("[*] Stage 1: Running DeepFilterNet noise suppression...")

    is_windows = sys.platform.startswith('win')

    if is_windows:
        binary = os.path.join(os.path.dirname(__file__), "deep-filter.exe")
        if not os.path.exists(binary):
            print(f"[*] Warning: local binary not found, trying system 'deep-filter' command...")
            cmd = ["deep-filter", input_path]
        else:
            cmd = [binary, input_path]
    else:
        print("[*] Detected macOS/Linux. Using 'deep-filter' command...")
        cmd = ["deep-filter", input_path]

    s1_output_dir = os.path.join(os.getcwd(), f"s1_temp_{int(time.time())}")
    os.makedirs(s1_output_dir, exist_ok=True)

    try:
        full_cmd = cmd + ["-o", s1_output_dir]
        print(f"[*] Executing: {' '.join(full_cmd)}")
        result = subprocess.run(full_cmd, capture_output=True, text=True)

        if result.returncode != 0:
            print(f"[!] DeepFilterNet execution failed (Exit Code {result.returncode}):\n{result.stderr}")
            if not is_windows and "not found" in result.stderr.lower():
                print("[*] 'deep-filter' not found, trying 'df-enhance'...")
                result = subprocess.run(["df-enhance", input_path, "-o", s1_output_dir], capture_output=True, text=True)

            if result.returncode != 0:
                sys.exit(1)

        time.sleep(1)

        found_files = glob.glob(os.path.join(s1_output_dir, "*.wav"))

        if found_files:
            generated_file = max(found_files, key=os.path.getmtime)
            if os.path.exists(output_path):
                os.remove(output_path)
            os.rename(generated_file, output_path)
            print("[+] Stage 1 Complete.")
        else:
            print(f"[!] Error: DeepFilterNet executed but no output file found in '{s1_output_dir}'.")
            sys.exit(1)
            
    except Exception as e:
            print(f"[!] DeepFilterNet error: {e}")
            sys.exit(1)
    finally:
        shutil.rmtree(s1_output_dir, ignore_errors=True)

def process_pedalboard(input_path, output_path, vocal_boost=3.0, comp_thresh=-20, comp_ratio=4, vocal_gain=2.0, limiter_threshold=-0.1, boost_start=None, boost_end=None, boost_db=0.0):
    print("[*] Stage 2: Running Pedalboard vocal polish...")
    try:
        audio, sample_rate = sf.read(input_path)

        board = Pedalboard([
            HighShelfFilter(cutoff_frequency_hz=3000, gain_db=vocal_boost),
            Compressor(threshold_db=comp_thresh, ratio=comp_ratio, attack_ms=2, release_ms=100),
            Gain(gain_db=vocal_gain),
            Limiter(threshold_db=limiter_threshold)
        ])

        processed = board(audio, sample_rate)

        if boost_start is not None and boost_end is not None and boost_db != 0:
            print(f"[*] Applying spot boost: {boost_start}s to {boost_end}s by {boost_db}dB")

            gain_factor = 10 ** (boost_db / 20)
            start_idx = int(boost_start * sample_rate)
            end_idx = int(boost_end * sample_rate)
            start_idx = max(0, min(start_idx, len(processed)))
            end_idx = max(0, min(end_idx, len(processed)))

            if start_idx < end_idx:
                fade_len = int(0.05 * sample_rate)
                fade_len = min(fade_len, (end_idx - start_idx) // 2)

                processed[start_idx:end_idx] *= gain_factor

                if fade_len > 0:
                    unboosted_start = processed[start_idx : start_idx + fade_len] / gain_factor
                    mask_in = np.linspace(0, 1, fade_len)
                    processed[start_idx : start_idx + fade_len] = (
                        unboosted_start * (1 - mask_in) + 
                        processed[start_idx : start_idx + fade_len] * mask_in
                    )

                    unboosted_end = processed[end_idx - fade_len : end_idx] / gain_factor
                    mask_out = np.linspace(1, 0, fade_len)
                    processed[end_idx - fade_len : end_idx] = (
                        unboosted_end * (1 - mask_out) + 
                        processed[end_idx - fade_len : end_idx] * mask_out
                    )

        sf.write(output_path, processed, sample_rate)
        print("[+] Stage 2 Complete.")
    except Exception as e:
        print(f"[!] Pedalboard error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

def apply_loudness_and_limiter(input_path, output_path, target_lufs=-14.0):
    print(f"[*] Normalizing loudness to {target_lufs} LUFS...")
    data, rate = sf.read(input_path)

    meter = pyln.Meter(rate)
    loudness = meter.integrated_loudness(data)
    normalized = pyln.normalize.loudness(data, loudness, target_lufs)

    sf.write(output_path, normalized, rate)

def remux_video(original_video, enhanced_audio, output_video):
    print(f"[*] Remuxing enhanced audio into {output_video}...")
    try:
        video_stream = ffmpeg.input(original_video).video
        audio_stream = ffmpeg.input(enhanced_audio).audio
        (
            ffmpeg
            .output(video_stream, audio_stream, output_video, vcodec='copy', acodec='aac', shortest=None)
            .overwrite_output()
            .run(quiet=True)
        )
    except ffmpeg.Error as e:
        print(f"[!] FFmpeg remuxing error: {e.stderr.decode()}")
        sys.exit(1)

def process_video(input_path, output_path=None, target_lufs=-14.0, vocal_boost=3.0, comp_thresh=-20.0, comp_ratio=4.0, vocal_gain=2.0, limit=-0.1, boost_start=None, boost_end=None, boost_db=6.0):
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file '{input_path}' not found.")

    if not check_ffmpeg():
        raise RuntimeError("FFmpeg not found in PATH.")

    input_abs = os.path.abspath(input_path)
    if output_path and os.path.isdir(output_path):
        output_video = os.path.join(output_path, f"enhanced_{os.path.basename(input_abs)}")
    else:
        output_video = output_path or os.path.join(os.path.dirname(input_abs), f"enhanced_{os.path.basename(input_abs)}")

    device = get_device()
    print(f"[*] Using device: {device.upper()}")

    cwd = os.getcwd()
    temp_audio = os.path.join(cwd, f"temp_extracted_{int(time.time())}.wav")
    temp_df = os.path.join(cwd, f"temp_df_enhanced_{int(time.time())}.wav")
    temp_vf = os.path.join(cwd, f"temp_vf_restored_{int(time.time())}.wav")
    temp_norm = os.path.join(cwd, f"temp_normalized_{int(time.time())}.wav")

    try:
        extract_audio(input_abs, temp_audio)
        process_deepfilternet(temp_audio, temp_df)

        process_pedalboard(
            temp_df,
            temp_vf,
            vocal_boost=vocal_boost,
            comp_thresh=comp_thresh,
            comp_ratio=comp_ratio,
            vocal_gain=vocal_gain,
            limiter_threshold=limit,
            boost_start=boost_start,
            boost_end=boost_end,
            boost_db=boost_db
        )

        apply_loudness_and_limiter(temp_vf, temp_norm, target_lufs=target_lufs)
        remux_video(input_abs, temp_norm, output_video)

        print(f"\n[+] Success! Enhanced video saved to: {output_video}")
        return output_video

    finally:
        for f in [temp_audio, temp_df, temp_vf, temp_norm]:
            if os.path.exists(f):
                try:
                    os.remove(f)
                except OSError:
                    pass

def main():
    parser = argparse.ArgumentParser(description="Neural Audio Restoration for Video")
    parser.add_argument("input", help="Input MP4/MOV video file")
    parser.add_argument("-o", "--output", help="Output video file")
    parser.add_argument("--lufs", type=float, default=-14.0, help="Target LUFS (default: -14.0)")

    parser.add_argument("--vocal-boost", type=float, default=3.0, help="Vocal clarity boost in dB (default: 3.0)")
    parser.add_argument("--comp-thresh", type=float, default=-20.0, help="Compressor threshold in dB (default: -20.0)")
    parser.add_argument("--comp-ratio", type=float, default=4.0, help="Compressor ratio (default: 4.0)")
    parser.add_argument("--gain", type=float, default=2.0, help="Final vocal gain stage in dB (default: 2.0)")
    parser.add_argument("--limit", type=float, default=-0.1, help="Peak limiter threshold in dB (default: -0.1)")
    parser.add_argument("--boost-start", type=float, help="Start time for spot boost in seconds")
    parser.add_argument("--boost-end", type=float, help="End time for spot boost in seconds")
    parser.add_argument("--boost-db", type=float, default=6.0, help="Amount of extra boost in dB (default: 6.0)")

    args = parser.parse_args()

    try:
        process_video(
            input_path=args.input,
            output_path=args.output,
            target_lufs=args.lufs,
            vocal_boost=args.vocal_boost,
            comp_thresh=args.comp_thresh,
            comp_ratio=args.comp_ratio,
            vocal_gain=args.gain,
            limit=args.limit,
            boost_start=args.boost_start,
            boost_end=args.boost_end,
            boost_db=args.boost_db
        )
    except Exception as e:
        print(f"[!] Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
