from __future__ import annotations

import json
import socketserver
import sys
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler
from typing import Any


HOST = "127.0.0.1"
PORT = 4501
REQUEST_TIMEOUT_SECONDS = 60
GEMINI_OPENAI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai"


def json_bytes(payload: Any) -> bytes:
    return json.dumps(payload).encode("utf-8")


def read_json_body(handler: BaseHTTPRequestHandler) -> dict[str, Any]:
    content_length = int(handler.headers.get("Content-Length", "0"))
    raw_body = handler.rfile.read(content_length)
    if not raw_body:
        return {}

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON request body: {exc.msg}") from exc

    if not isinstance(payload, dict):
        raise ValueError("JSON request body must be an object.")

    return payload


def forward_json_request(url: str, headers: dict[str, str], payload: dict[str, Any]) -> tuple[int, dict[str, Any]]:
    request = urllib.request.Request(
        url=url,
        data=json_bytes(payload),
        headers=headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            status = response.status
            body = response.read()
    except urllib.error.HTTPError as exc:
        status = exc.code
        body = exc.read()
    except urllib.error.URLError as exc:
        reason = getattr(exc, "reason", exc)
        raise ConnectionError(str(reason)) from exc

    if not body:
        return status, {}

    try:
        decoded = json.loads(body.decode("utf-8"))
    except json.JSONDecodeError:
        return status, {"error": {"message": "Upstream service returned non-JSON data."}}

    if isinstance(decoded, dict):
        return status, decoded

    return status, {"data": decoded}


def clean_header_map(value: Any) -> dict[str, str]:
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise ValueError("Headers must be an object with string values.")

    headers: dict[str, str] = {}
    for key, header_value in value.items():
        if isinstance(key, str) and isinstance(header_value, str):
            headers[key] = header_value
    return headers


def build_openai_endpoint(base_url: str) -> str:
    normalized = base_url.strip().rstrip("/")
    if not normalized:
        raise ValueError("Base URL is required.")

    parsed = urllib.parse.urlparse(normalized)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("Base URL must be a valid http:// or https:// URL.")

    lowered_path = parsed.path.rstrip("/").lower()
    if lowered_path.endswith("/chat/completions"):
        return normalized
    if lowered_path.endswith("/v1"):
        return f"{normalized}/chat/completions"
    return f"{normalized}/v1/chat/completions"


class ChatProxyHandler(BaseHTTPRequestHandler):
    server_version = "LocalChatRelay/2.0"

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "http://localhost:4500")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.end_headers()

    def do_POST(self) -> None:
        try:
            payload = read_json_body(self)
        except ValueError as exc:
            self.send_json(400, {"error": {"message": str(exc)}})
            return

        try:
            if self.path == "/api/direct-chat":
                status, response_payload = self.handle_direct_chat(payload)
            elif self.path == "/api/proxy-chat":
                status, response_payload = self.handle_proxy_chat(payload)
            else:
                self.send_json(404, {"error": {"message": "Route not found."}})
                return
        except ConnectionError as exc:
            self.send_json(502, {"error": {"message": f"Unable to reach upstream service: {exc}"}})
            return
        except TimeoutError:
            self.send_json(504, {"error": {"message": "The upstream service timed out."}})
            return
        except ValueError as exc:
            self.send_json(400, {"error": {"message": str(exc)}})
            return
        except Exception:
            self.send_json(500, {"error": {"message": "The local relay encountered an unexpected error."}})
            return

        self.send_json(status, response_payload)

    def handle_direct_chat(self, payload: dict[str, Any]) -> tuple[int, dict[str, Any]]:
        api_key = str(payload.get("apiKey", "")).strip()
        model = str(payload.get("model", "")).strip()
        messages = payload.get("messages", [])

        if not api_key:
            raise ValueError("Gemini API key is required.")
        if not model:
            raise ValueError("Gemini model is required.")
        if not isinstance(messages, list):
            raise ValueError("Messages must be an array.")

        return forward_json_request(
            f"{GEMINI_OPENAI_BASE_URL}/chat/completions",
            {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            {
                "model": model,
                "messages": messages,
            },
        )

    def handle_proxy_chat(self, payload: dict[str, Any]) -> tuple[int, dict[str, Any]]:
        base_url = str(payload.get("baseUrl", "")).strip()
        model = str(payload.get("model", "")).strip()
        messages = payload.get("messages", [])
        custom_headers = clean_header_map(payload.get("headers"))

        if not model:
            raise ValueError("Proxy model is required.")
        if not isinstance(messages, list):
            raise ValueError("Messages must be an array.")

        return forward_json_request(
            build_openai_endpoint(base_url),
            {
                "Content-Type": "application/json",
                **custom_headers,
            },
            {
                "model": model,
                "messages": messages,
            },
        )

    def send_json(self, status: int, payload: dict[str, Any]) -> None:
        body = json_bytes(payload)
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "http://localhost:4500")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: object) -> None:
        sys.stderr.write(
            "%s - - [%s] %s\n"
            % (self.address_string(), self.log_date_time_string(), format % args)
        )


def main() -> int:
    with socketserver.ThreadingTCPServer((HOST, PORT), ChatProxyHandler) as httpd:
        print(f"Local API relay listening on http://{HOST}:{PORT}")
        httpd.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
