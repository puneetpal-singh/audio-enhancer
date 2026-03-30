import subprocess
import sys
import os


def start():
    print("[*] Starting Audio Enhancer Pro GUI...")

    cwd = os.getcwd()
    backend_script = os.path.join(cwd, "app.py")

    if os.name == "nt":
        python_exe = os.path.join(cwd, "venv", "Scripts", "python.exe")
    else:
        python_exe = os.path.join(cwd, "venv", "bin", "python")

    if not os.path.exists(python_exe):
        python_exe = sys.executable

    print(f"[*] Starting Backend with {python_exe}...")
    backend_proc = subprocess.Popen([python_exe, backend_script])

    gui_dir = os.path.join(cwd, "gui")
    print(f"[*] Starting Frontend in {gui_dir}...")

    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_proc = None

    try:
        frontend_proc = subprocess.Popen([npm_cmd, "run", "dev"], cwd=gui_dir)

        print("\n" + "="*50)
        print("  AUDIO ENHANCER PRO IS STARTING!")
        print("  Backend: http://127.0.0.1:8000")
        print("  Frontend: http://localhost:5173")
        print("="*50 + "\n")

        frontend_proc.wait()

    except KeyboardInterrupt:
        print("\n[*] Shutting down...")
    except Exception as e:
        print(f"[!] Error starting GUI: {e}")
    finally:
        backend_proc.terminate()
        if frontend_proc:
            frontend_proc.terminate()


if __name__ == "__main__":
    start()
