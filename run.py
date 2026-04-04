from __future__ import annotations

import shutil
import subprocess
import sys
import time
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent
PORT = "4500"
BACKEND_PORT = "4501"


def pick_package_manager() -> list[str]:
    if shutil.which("npm"):
        return ["npm"]
    if shutil.which("pnpm"):
        return ["pnpm"]
    if shutil.which("yarn"):
        return ["yarn"]
    raise RuntimeError("Install npm, pnpm, or yarn before starting this project.")


def install_command(manager: list[str]) -> list[str]:
    name = manager[0]
    if name == "npm":
        return ["npm", "install"]
    if name == "pnpm":
        return ["pnpm", "install"]
    return ["yarn", "install"]


def dev_command(manager: list[str]) -> list[str]:
    name = manager[0]
    if name == "npm":
        return ["npm", "run", "dev"]
    if name == "pnpm":
        return ["pnpm", "run", "dev"]
    return ["yarn", "dev"]


def ensure_dependencies(manager: list[str]) -> None:
    if (PROJECT_ROOT / "node_modules").exists():
        return
    print("Installing frontend dependencies...")
    subprocess.run(install_command(manager), cwd=PROJECT_ROOT, check=True)


def main() -> int:
    backend_process: subprocess.Popen[str] | None = None

    try:
        manager = pick_package_manager()
        ensure_dependencies(manager)
    except (RuntimeError, subprocess.CalledProcessError) as exc:
        print(f"Startup failed: {exc}", file=sys.stderr)
        return 1

    print()
    print("Gemini Dual Mode Chat is starting.")
    print(f"Open http://localhost:{PORT}")
    print("Press Ctrl+C to stop the dev server.")
    print()

    try:
        backend_process = subprocess.Popen(
            [sys.executable, "backend_server.py"],
            cwd=PROJECT_ROOT,
        )
        time.sleep(0.5)
        if backend_process.poll() is not None:
            raise RuntimeError(f"Local API relay failed to start on port {BACKEND_PORT}.")

        subprocess.run(dev_command(manager), cwd=PROJECT_ROOT, check=True)
    except KeyboardInterrupt:
        print("\nShutting down Gemini Dual Mode Chat.")
        return 0
    except RuntimeError as exc:
        print(f"Startup failed: {exc}", file=sys.stderr)
        return 1
    except subprocess.CalledProcessError as exc:
        print(f"Dev server exited with an error: {exc}", file=sys.stderr)
        return exc.returncode or 1
    finally:
        if backend_process is not None and backend_process.poll() is None:
            backend_process.terminate()
            try:
                backend_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                backend_process.kill()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
