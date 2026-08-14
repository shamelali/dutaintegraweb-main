#!/usr/bin/env python3
"""Local static server with Vercel-like clean URLs."""
from __future__ import annotations

import mimetypes
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent
HOST = "0.0.0.0"
PORT = int(os.environ.get("PORT", "8765"))


class CleanURLHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        # Allow Arena live preview iframes (do not set X-Frame-Options: DENY)
        self.send_header("Content-Security-Policy", "frame-ancestors *")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def _map_path(self) -> bool:
        parsed = urlparse(self.path)
        path = unquote(parsed.path)
        resolved = self._resolve(path)
        if resolved is None:
            return False
        rel = resolved.relative_to(ROOT).as_posix()
        # Preserve query string if present
        query = ("?" + parsed.query) if parsed.query else ""
        self.path = "/" + rel + query
        return True

    def do_GET(self):  # noqa: N802
        if not self._map_path():
            self.send_error(404, "File not found")
            return
        return SimpleHTTPRequestHandler.do_GET(self)

    def do_HEAD(self):  # noqa: N802
        if not self._map_path():
            self.send_error(404, "File not found")
            return
        return SimpleHTTPRequestHandler.do_HEAD(self)

    def _resolve(self, path: str) -> Path | None:
        if path in ("", "/"):
            candidate = ROOT / "index.html"
            return candidate if candidate.is_file() else None

        raw = path.lstrip("/")
        # Direct file hit
        direct = (ROOT / raw).resolve()
        if str(direct).startswith(str(ROOT)) and direct.is_file():
            return direct

        # Directory with index.html
        as_dir = (ROOT / raw).resolve()
        if str(as_dir).startswith(str(ROOT)) and as_dir.is_dir():
            index = as_dir / "index.html"
            if index.is_file():
                return index

        # Clean URL → .html
        html = (ROOT / f"{raw}.html").resolve()
        if str(html).startswith(str(ROOT)) and html.is_file():
            return html

        # Nested clean URL with trailing slash already stripped above
        return None

    def log_message(self, fmt: str, *args) -> None:
        sys_stderr = __import__("sys").stderr
        print("%s - %s" % (self.address_string(), fmt % args), file=sys_stderr)


def main() -> None:
    # Ensure common types
    mimetypes.add_type("image/webp", ".webp")
    mimetypes.add_type("image/svg+xml", ".svg")
    mimetypes.add_type("application/javascript", ".js")

    server = ThreadingHTTPServer((HOST, PORT), CleanURLHandler)
    print(f"Serving {ROOT} on http://{HOST}:{PORT} (clean URLs on)", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down", flush=True)
        server.server_close()


if __name__ == "__main__":
    main()
