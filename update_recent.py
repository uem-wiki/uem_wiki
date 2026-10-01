"""Fetch recent GitHub deployments and write a static JSON file for the homepage."""

import argparse
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = Path(__file__).parent
OUTPUT_FILE = BASE_DIR / "assets" / "recent-updates.json"
STATE_FILE = BASE_DIR / ".recent-updates-state.json"
API_ROOT = "https://api.github.com"
USER_AGENT = "uem-wiki-build"
DEFAULT_REPOSITORY = "uem_wiki/uem_wiki"


def parse_github_repository(remote_url):
    """Extract owner/repository from common GitHub remote URL formats."""
    if not remote_url:
        return None
    match = re.search(r"github\.com[/:]([^/\s]+/[^/\s]+?)(?:\.git)?$", remote_url.strip())
    return match.group(1) if match else None


def git_remote_url(name):
    try:
        result = subprocess.run(
            ["git", "remote", "get-url", name],
            cwd=BASE_DIR,
            capture_output=True,
            text=True,
            check=True,
            timeout=5
        )
        return result.stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return ""


def resolve_repository(explicit=None):
    """Resolve repository in Actions, from CLI, or from Git remotes."""
    if explicit:
        return explicit

    upstream_repository = parse_github_repository(git_remote_url("upstream"))
    if upstream_repository:
        return upstream_repository

    environment_repository = os.environ.get("GITHUB_REPOSITORY", "").strip()
    if environment_repository:
        return environment_repository

    origin_repository = parse_github_repository(git_remote_url("origin"))
    if origin_repository:
        return origin_repository

    return DEFAULT_REPOSITORY


def github_request(url, token=None, timeout=15):
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": USER_AGENT,
        "X-GitHub-Api-Version": "2022-11-28"
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.load(response)


def first_line(value):
    return str(value or "").strip().splitlines()[0].strip()


def fetch_deployment_entry(repository, deployment, token=None):
    """Fetch deployment status and commit metadata for one deployment."""
    deployment_id = deployment.get("id")
    if not deployment_id:
        return None

    try:
        statuses = github_request(
            f"{API_ROOT}/repos/{repository}/deployments/{deployment_id}/statuses?per_page=1",
            token=token
        )
    except (OSError, urllib.error.URLError, urllib.error.HTTPError):
        statuses = []

    status = next(
        (item for item in statuses if item.get("state") == "success"),
        statuses[0] if statuses else {}
    )
    if status and status.get("state") not in (None, "success"):
        return None

    sha = deployment.get("sha") or ""
    commit = {}
    if sha:
        try:
            commit = github_request(
                f"{API_ROOT}/repos/{repository}/commits/{sha}",
                token=token
            )
        except (OSError, urllib.error.URLError, urllib.error.HTTPError):
            commit = {}

    commit_data = commit.get("commit") or {}
    author_data = commit_data.get("author") or {}
    message = first_line(commit_data.get("message"))
    short_sha = sha[:7] if sha else ""
    title = message or (f"部署 {short_sha}" if short_sha else "GitHub Pages 部署")

    return {
        "deployment_id": str(deployment_id),
        "title": title,
        "date": status.get("created_at") or deployment.get("created_at") or "",
        "url": (
            status.get("target_url")
            or commit.get("html_url")
            or f"https://github.com/{repository}/commit/{sha}"
        ),
        "commit": sha,
        "environment": deployment.get("environment") or deployment.get("original_environment") or "github-pages",
        "state": status.get("state") or "success",
        "environment_url": status.get("environment_url") or "",
        "author": author_data.get("name") or (commit.get("author") or {}).get("login") or ""
    }


def fetch_recent_entries(repository, limit=6, token=None, cached_entries=None):
    """Fetch recent successful deployments with one-request fast path."""
    deployments = github_request(
        f"{API_ROOT}/repos/{repository}/deployments?per_page={limit}",
        token=token
    )
    if not deployments:
        return []

    cached_entries = cached_entries or []
    cached_by_id = {
        str(entry.get("deployment_id")): entry
        for entry in cached_entries
        if entry.get("deployment_id")
    }

    latest_id = str(deployments[0].get("id"))
    if latest_id in cached_by_id:
        return cached_entries[:limit]

    entries_by_id = {}
    unseen = [
        deployment for deployment in deployments
        if str(deployment.get("id")) not in cached_by_id
    ]
    max_workers = min(6, max(1, len(unseen)))
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(fetch_deployment_entry, repository, deployment, token): deployment
            for deployment in unseen
        }
        for future in as_completed(futures):
            deployment = futures[future]
            try:
                entry = future.result()
            except Exception:
                entry = None
            if entry:
                entries_by_id[str(deployment.get("id"))] = entry

    entries = []
    seen_commits = set()
    for deployment in deployments:
        deployment_id = str(deployment.get("id"))
        entry = cached_by_id.get(deployment_id) or entries_by_id.get(deployment_id)
        if not entry:
            continue
        dedupe_key = entry.get("commit") or deployment_id
        if dedupe_key in seen_commits:
            continue
        seen_commits.add(dedupe_key)
        entries.append(entry)
        if len(entries) >= limit:
            break
    return entries


def build_payload(repository, entries):
    return {
        "repository": repository,
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "entries": entries
    }


def update_recent_updates(
    repository=None,
    limit=6,
    quiet=False,
    max_age_seconds=0,
    force=False
):
    """Refresh the static recent-updates JSON. Returns True when written."""
    repository = resolve_repository(repository)
    if not force and max_age_seconds > 0 and STATE_FILE.exists():
        try:
            state = json.loads(STATE_FILE.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            state = {}
        if (
            state.get("repository") == repository
            and time.time() - STATE_FILE.stat().st_mtime < max_age_seconds
        ):
            if not quiet:
                print("[Recent updates] 缓存仍有效，跳过网络请求")
            return False

    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")

    old_payload = None
    if OUTPUT_FILE.exists():
        try:
            old_payload = json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            old_payload = None

    cached_entries = None
    if old_payload and old_payload.get("repository") == repository:
        cached_entries = old_payload.get("entries") or []

    entries = fetch_recent_entries(
        repository,
        limit=limit,
        token=token,
        cached_entries=cached_entries
    )
    payload = build_payload(repository, entries)

    same_entries = (
        old_payload
        and old_payload.get("repository") == payload.get("repository")
        and old_payload.get("entries") == payload.get("entries")
    )
    STATE_FILE.write_text(
        json.dumps({
            "checked_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
            "repository": repository
        }, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8"
    )
    if same_entries:
        if not quiet:
            print(f"[Recent updates] 无变化: {repository}, {len(entries)} 条")
        return False

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    temporary = OUTPUT_FILE.with_suffix(".json.tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8"
    )
    temporary.replace(OUTPUT_FILE)

    if not quiet:
        print(f"[Recent updates] 已更新: {repository}, {len(entries)} 条")
    return True


def main():
    parser = argparse.ArgumentParser(description="更新首页 GitHub Deployments 数据")
    parser.add_argument("--repo", help="GitHub 仓库，例如 owner/repository")
    parser.add_argument("--limit", type=int, default=6, help="最多保留多少条部署记录")
    parser.add_argument("--quiet", action="store_true", help="无输出")
    parser.add_argument("--max-age", type=int, default=0, help="缓存有效期（秒）")
    parser.add_argument("--force", action="store_true", help="忽略缓存强制刷新")
    args = parser.parse_args()

    try:
        update_recent_updates(
            repository=args.repo,
            limit=max(1, args.limit),
            quiet=args.quiet,
            max_age_seconds=max(0, args.max_age),
            force=args.force
        )
    except (OSError, urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError) as error:
        if not args.quiet:
            print(f"[Recent updates] 更新失败，保留现有数据: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
