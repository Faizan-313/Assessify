import json
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

from language_handlers.cpp import cleanup_cpp, compile_cpp, run_cpp
from language_handlers.javascript import check_js, run_js
from language_handlers.python import check_python, run_python


def normalize_output(value):
    return (value or "").strip()


def run_interpreted_tests(code, test_cases, checker, runner):
    check_result = checker(code)

    if not check_result["success"]:
        return {
            "success": False,
            "errorType": "syntax_error",
            "compileError": check_result["error"],
            "passed": 0,
            "failed": len(test_cases),
            "total": len(test_cases),
            "score": 0,
            "results": []
        }

    passed = 0
    results = []

    for index, test_case in enumerate(test_cases, start=1):
        input_data = test_case.get("input", "")
        expected_output = normalize_output(test_case.get("output", ""))
        execution = runner(code, input_data)

        if execution["status"] == "timeout":
            results.append({
                "testCase": index,
                "status": "timeout",
                "passed": False
            })
            continue

        if execution["stderr"]:
            results.append({
                "testCase": index,
                "status": "runtime_error",
                "error": execution["stderr"],
                "passed": False
            })
            continue

        actual_output = normalize_output(execution["stdout"])
        is_passed = actual_output == expected_output
        passed += int(is_passed)

        result = {
            "testCase": index,
            "status": "passed" if is_passed else "wrong_answer",
            "passed": is_passed
        }
        if not is_passed:
            result["expected"] = expected_output
            result["actual"] = actual_output

        results.append(result)

    return build_success_response(passed, len(test_cases), results)


def run_cpp_tests(code, test_cases):
    compile_result = compile_cpp(code)

    if not compile_result["success"]:
        return {
            "success": False,
            "errorType": "compile_error",
            "compileError": compile_result["error"],
            "passed": 0,
            "failed": len(test_cases),
            "total": len(test_cases),
            "score": 0,
            "results": []
        }

    passed = 0
    results = []
    temp_dir = compile_result["temp_dir"]

    try:
        for index, test_case in enumerate(test_cases, start=1):
            input_data = test_case.get("input", "")
            expected_output = normalize_output(test_case.get("output", ""))
            execution = run_cpp(compile_result["exe_path"], input_data)

            if execution["status"] == "timeout":
                results.append({
                    "testCase": index,
                    "status": "timeout",
                    "passed": False
                })
                continue

            if execution["stderr"]:
                results.append({
                    "testCase": index,
                    "status": "runtime_error",
                    "error": execution["stderr"],
                    "passed": False
                })
                continue

            actual_output = normalize_output(execution["stdout"])
            is_passed = actual_output == expected_output
            passed += int(is_passed)

            result = {
                "testCase": index,
                "status": "passed" if is_passed else "wrong_answer",
                "passed": is_passed
            }
            if not is_passed:
                result["expected"] = expected_output
                result["actual"] = actual_output

            results.append(result)
    finally:
        cleanup_cpp(temp_dir)

    return build_success_response(passed, len(test_cases), results)


def build_success_response(passed, total, results):
    failed = total - passed
    score = round((passed / total) * 100) if total else 0
    return {
        "success": True,
        "passed": passed,
        "failed": failed,
        "total": total,
        "score": score,
        "results": results
    }


def evaluate(payload):
    code = payload.get("code", "")
    language = payload.get("language", "").lower()
    test_cases = payload.get("testCases", [])

    if not isinstance(test_cases, list):
        return {
            "success": False,
            "message": "testCases must be a list"
        }

    if language in ("py", "python"):
        return run_interpreted_tests(code, test_cases, check_python, run_python)

    if language in ("js", "javascript"):
        return run_interpreted_tests(code, test_cases, check_js, run_js)

    if language in ("cpp", "c++"):
        return run_cpp_tests(code, test_cases)

    return {
        "success": False,
        "message": f"Language not supported: {language}"
    }


class RunnerRequestHandler(BaseHTTPRequestHandler):
    def write_json(self, status_code, payload):
        response = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def do_GET(self):
        if urlparse(self.path).path == "/health":
            self.write_json(200, {"status": "ok"})
            return

        self.write_json(404, {
            "success": False,
            "message": "Endpoint not found"
        })

    def do_POST(self):
        if urlparse(self.path).path != "/code-evaluate":
            self.write_json(404, {
                "success": False,
                "message": "Endpoint not found"
            })
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            request_body = self.rfile.read(content_length).decode("utf-8")
            payload = json.loads(request_body)
        except json.JSONDecodeError as exc:
            self.write_json(400, {
                "success": False,
                "message": "Request body must be valid JSON",
                "error": str(exc)
            })
            return

        response = evaluate(payload)
        status_code = 200 if response.get("success") else 400
        self.write_json(status_code, response)

    def log_message(self, format, *args):
        return


def run_server():
    server = ThreadingHTTPServer(("0.0.0.0", 7000), RunnerRequestHandler)
    print("Code runner listening on port 7000", flush=True)
    server.serve_forever()


def run_cli():
    try:
        payload = json.loads(sys.stdin.read())
        response = evaluate(payload)
    except json.JSONDecodeError as exc:
        response = {
            "success": False,
            "message": "Invalid JSON input",
            "error": str(exc)
        }
    except Exception as exc:
        response = {
            "success": False,
            "message": "Runner failed",
            "error": str(exc)
        }

    print(json.dumps(response))


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--serve":
        run_server()
        return

    run_cli()


if __name__ == "__main__":
    main()
