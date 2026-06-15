import os
import shutil
import subprocess
import tempfile


def compile_cpp(code):
    temp_dir = tempfile.mkdtemp()
    source_path = os.path.join(temp_dir, "main.cpp")
    exe_path = os.path.join(temp_dir, "main")

    with open(source_path, "w", encoding="utf-8") as source_file:
        source_file.write(code)

    compile_proc = subprocess.run(
        ["g++", source_path, "-std=c++17", "-O2", "-o", exe_path],
        capture_output=True,
        text=True,
        timeout=10
    )

    if compile_proc.returncode != 0:
        cleanup_cpp(temp_dir)
        return {
            "success": False,
            "error": compile_proc.stderr.strip()
        }

    return {
        "success": True,
        "temp_dir": temp_dir,
        "exe_path": exe_path
    }


def run_cpp(exe_path, input_data):
    try:
        result = subprocess.run(
            [exe_path],
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


def cleanup_cpp(temp_dir):
    shutil.rmtree(temp_dir, ignore_errors=True)
