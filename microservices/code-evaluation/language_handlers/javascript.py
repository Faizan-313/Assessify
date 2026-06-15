import os
import subprocess
import tempfile


def check_js(code):
    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".js", mode="w", encoding="utf-8") as tmp:
            temp_path = tmp.name
            tmp.write(code)

        result = subprocess.run(
            ["node", "--check", temp_path],
            capture_output=True,
            text=True,
            timeout=5
        )
        return {
            "success": result.returncode == 0,
            "error": result.stderr.strip()
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": "Syntax check timed out"
        }
    finally:
        if temp_path:
            try:
                os.remove(temp_path)
            except OSError:
                pass


def run_js(code, input_data):
    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".js", mode="w", encoding="utf-8") as tmp:
            temp_path = tmp.name
            tmp.write(code)

        result = subprocess.run(
            ["node", temp_path],
            input=input_data,
            capture_output=True,
            text=True,
            timeout=2
        )
        return {
            "stdout": result.stdout,
            "stderr": result.stderr.strip(),
            "status": "success"
        }
    except subprocess.TimeoutExpired:
        return {
            "stdout": "",
            "stderr": "",
            "status": "timeout"
        }
    finally:
        if temp_path:
            try:
                os.remove(temp_path)
            except OSError:
                pass
