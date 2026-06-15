import os
import subprocess
import sys
import tempfile


def check_python(code):
    try:
        compile(code, "<submission>", "exec")
        return {
            "success": True,
            "error": ""
        }
    except SyntaxError as exc:
        return {
            "success": False,
            "error": f"{exc.msg} at line {exc.lineno}, column {exc.offset}"
        }


def run_python(code, input_data):
    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".py", mode="w", encoding="utf-8") as tmp:
            temp_path = tmp.name
            tmp.write(code)

        result = subprocess.run(
            [sys.executable, temp_path],
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
