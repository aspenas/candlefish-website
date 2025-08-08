#!/usr/bin/env python3
import os
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
EXCLUDES = {
    "node_modules",
    "dist",
    ".next",
    "venv",
    ".git",
    "coverage",
    "apps/website/candlefish-production",
}

patterns = [
    (re.compile(r"/logo_candlefish\.png"), "/logo/candlefish_original.png"),
    (re.compile(r"candlefish_highquality[^\"')\s]*\.png"), "candlefish_original.png"),
    (re.compile(r"candlefish_highquality[^\"')\s]*\.webp"), "candlefish_original.png"),
]


def should_skip(path):
    parts = set(path.split(os.sep))
    return bool(parts & EXCLUDES)


def is_text_file(path):
    try:
        with open(path, "rb") as f:
            chunk = f.read(1024)
        return b"\0" not in chunk
    except Exception:
        return False


def sweep():
    changed = []
    for root, dirs, files in os.walk(ROOT):
        # prunes
        dirs[:] = [d for d in dirs if d not in EXCLUDES]
        for name in files:
            path = os.path.join(root, name)
            if should_skip(path):
                continue
            if not is_text_file(path):
                continue
            try:
                with open(path, encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                original = content
                for pat, repl in patterns:
                    content = re.sub(pat, repl, content)
                if content != original:
                    with open(path, "w", encoding="utf-8") as f:
                        f.write(content)
                    changed.append(path)
            except Exception:
                continue
    for p in changed:
        print(f"Updated: {os.path.relpath(p, ROOT)}")


if __name__ == "__main__":
    sweep()
