"""
本地预览服务器
用法: python serve.py

自动打开浏览器访问网站。
"""

import http.server
import socketserver
import os
import subprocess
import sys
import threading
import webbrowser
import urllib.parse
from datetime import datetime
from pathlib import Path

# 修复 Windows 控制台编码
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

PORT = 8080
VITEPRESS_PORT = 5173
BASE_DIR = Path(__file__).parent


def start_vitepress_server():
    """Start the VitePress test site alongside the legacy preview server."""
    npm_command = "npm.cmd" if sys.platform == "win32" else "npm"
    command = [
        npm_command,
        "run",
        "docs:dev",
        "--",
        "--port",
        str(VITEPRESS_PORT),
        "--strictPort",
    ]

    try:
        return subprocess.Popen(command, cwd=BASE_DIR)
    except FileNotFoundError:
        print(
            "[Test site] npm was not found; the VitePress test site was not started.",
            flush=True,
        )
        return None


def stop_process(process):
    if process is None or process.poll() is not None:
        return

    process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait()


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def translate_path(self, path):
        """重写路径解析，正确处理中文 URL 编码"""
        # 先 URL 解码
        path = urllib.parse.unquote(path)
        # 去掉查询参数
        path = path.split('?', 1)[0]
        path = path.split('#', 1)[0]
        # 调用父类方法
        return super().translate_path(path)

    def log_message(self, format, *args):
        timestamp = datetime.now().strftime("%H:%M:%S")
        status = args[1] if len(args) > 1 else "---"
        path = args[0] if args else "---"
        parts = path.split()
        if len(parts) >= 2:
            path = parts[1]
        print(f"  [{timestamp}] {status}  {path}", flush=True)

    def log_error(self, format, *args):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"  [{timestamp}] [Error] {args[0]}", flush=True)


if __name__ == "__main__":
    print(f"""
========================================
  Wiki - Local Preview
  Press Ctrl+C to stop
========================================
""", flush=True)

    vitepress_server = start_vitepress_server()
    if vitepress_server is not None:
        print(f"[Test site] http://localhost:{VITEPRESS_PORT}", flush=True)

    try:
        server = socketserver.ThreadingTCPServer(("", PORT), Handler)
    except OSError:
        print(f"[Error] Port {PORT} is already in use.", flush=True)
        print(f"       Run: netstat -ano | findstr :{PORT}", flush=True)
        stop_process(vitepress_server)
        sys.exit(1)

    server.allow_reuse_address = True
    server.daemon_threads = True

    if not os.environ.get("UEM_SKIP_RECENT_UPDATE"):
        def refresh_recent_updates():
            try:
                from update_recent import update_recent_updates
                update_recent_updates(quiet=True, max_age_seconds=600)
            except Exception as error:
                print(f"[Recent updates] 更新失败，保留现有数据: {error}", flush=True)

        threading.Thread(
            target=refresh_recent_updates,
            name="recent-updates",
            daemon=True
        ).start()

    url = f"http://localhost:{PORT}"
    print(f"[Started] {url}", flush=True)

    webbrowser.open(url)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[Stopped] Server closed.", flush=True)
        server.shutdown()
    finally:
        server.server_close()
        stop_process(vitepress_server)
