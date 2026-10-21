#!/usr/bin/env python3
"""Serve this folder without Node.

macOS can make Python's built-in server label .js files as text/plain.
Browsers then refuse to load the ES modules. This server always sends
JavaScript as text/javascript and listens on both IPv4 and IPv6 localhost.
"""

import argparse
import socket
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent


class ModuleHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".html": "text/html",
        ".css": "text/css",
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".json": "application/json",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".webp": "image/webp",
    }


class DualStackServer(ThreadingHTTPServer):
    address_family = socket.AF_INET6
    allow_reuse_address = True

    def server_bind(self):
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        super().server_bind()
        host, port, *_ = self.socket.getsockname()
        self.server_name = host
        self.server_port = port


def bind_server(port, handler):
    try:
        return DualStackServer(("::", port), handler)
    except OSError:
        return ThreadingHTTPServer(("0.0.0.0", port), handler)


def main():
    parser = argparse.ArgumentParser(description="Open the eye-biomechanics page without Node.")
    parser.add_argument("--port", type=int, default=4173)
    args = parser.parse_args()
    handler = partial(ModuleHandler, directory=str(ROOT))

    try:
        server = bind_server(args.port, handler)
    except OSError as error:
        if getattr(error, "errno", None) in {48, 98}:
            raise SystemExit(
                f"Port {args.port} is already in use. Stop that process or run python3 serve.py --port 4180."
            ) from error
        raise

    print(f"Eye biomechanics is available at http://localhost:{args.port}")
    print("JavaScript modules are served as text/javascript.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print()
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
