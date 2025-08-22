#!/usr/bin/env bash
set -euo pipefail

# Node & pnpm
corepack enable
corepack prepare pnpm@9.9.0 --activate

# Python via uv (fast, isolated envs per package)
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"

# JS deps (workspace)
[ -f pnpm-workspace.yaml ] && pnpm install --frozen-lockfile || true

# Python deps (each package with pyproject)
find libs/py services apps -maxdepth 2 -name "pyproject.toml" -print0 | while IFS= read -r -d '' f; do
  d=$(dirname "$f")
  (cd "$d" && uv sync)
done

# Pre-commit hooks
if command -v pipx >/dev/null 2>&1; then
  pipx install pre-commit || true
else
  pip install pre-commit
fi
pre-commit install || true

echo "Devcontainer bootstrap complete."
