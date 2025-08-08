#!/usr/bin/env bash

set -euo pipefail

# Auto-load .env from repo root if present so this works across terminals/IDEs
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
if [[ -f "$REPO_ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$REPO_ROOT/.env"
  set +a
fi

usage() {
  cat <<'USAGE'
gpt5 - Simple CLI to call OpenAI GPT-5 from your terminal

Usage:
  gpt5 [options] "your prompt here"
  echo "your prompt here" | gpt5 [options]

Options:
  -m <model>        Model to use (default: ${OPENAI_MODEL:-gpt-5})
  -s                Enable JSON streaming output (raw SSE); default off
  -h, --help        Show this help

Environment:
  OPENAI_API_KEY    Required. Your OpenAI API key.
  OPENAI_BASE_URL   Optional. Default: https://api.openai.com/v1
  OPENAI_MODEL      Optional. Default: gpt-5

Examples:
  export OPENAI_API_KEY="sk-..."
  gpt5 "Write a haiku about the ocean"
  gpt5 -m gpt-4.1 "Summarize this repo structure"

USAGE
}

if [[ ${1:-} == "-h" || ${1:-} == "--help" ]]; then
  usage
  exit 0
fi

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
  echo "[gpt5] ERROR: OPENAI_API_KEY is not set." >&2
  echo "Set it and retry, e.g.:" >&2
  echo "  export OPENAI_API_KEY=\"sk-...\"" >&2
  exit 1
fi

BASE_URL=${OPENAI_BASE_URL:-"https://api.openai.com/v1"}
MODEL=${OPENAI_MODEL:-"gpt-5"}
STREAM=false

# Parse flags
while getopts ":m:sh" opt; do
  case $opt in
    m) MODEL="$OPTARG" ;;
    s) STREAM=true ;;
    h) usage; exit 0 ;;
    :) echo "[gpt5] ERROR: Option -$OPTARG requires an argument" >&2; exit 1 ;;
    \?) echo "[gpt5] ERROR: Invalid option: -$OPTARG" >&2; usage; exit 1 ;;
  esac
done
shift $((OPTIND-1))

# Gather prompt from args or stdin
PROMPT=""
if [[ $# -gt 0 ]]; then
  PROMPT="$*"
elif ! [ -t 0 ]; then
  PROMPT="$(cat)"
fi

if [[ -z "$PROMPT" ]]; then
  echo "[gpt5] ERROR: No prompt provided." >&2
  usage
  exit 1
fi

ENDPOINT="$BASE_URL/responses"

if [[ "$STREAM" == true ]]; then
  # Stream raw SSE; user may parse as needed
  curl -sS \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -H "Content-Type: application/json" \
    -H "Accept: text/event-stream" \
    -X POST "$ENDPOINT" \
    -d "$(jq -nc --arg m "$MODEL" --arg p "$PROMPT" '{model:$m,input:$p,stream:true}')"
  exit $?
fi

# Non-streaming request; pretty-print best-effort
RESPONSE=$(curl -sS \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST "$ENDPOINT" \
  -d "$(jq -nc --arg m "$MODEL" --arg p "$PROMPT" '{model:$m,input:$p}')")

# Prefer output_text (Responses API). Fallback to Chat Completions-like shapes.
python3 - "$RESPONSE" <<'PY'
import json, sys

raw = sys.argv[1]
try:
    data = json.loads(raw)
except Exception:
    print(raw)
    sys.exit(0)

def print_text(text):
    if text is None:
        return False
    if isinstance(text, str):
        print(text)
        return True
    if isinstance(text, list):
        # Some SDKs return content parts
        combined = []
        for part in text:
            if isinstance(part, dict) and 'text' in part:
                combined.append(part['text'])
        if combined:
            print(''.join(combined))
            return True
    return False

# Responses API common field
if print_text(data.get('output_text')):
    sys.exit(0)

# Some variants nest under response/output
if isinstance(data.get('response'), dict):
    if print_text(data['response'].get('output_text')):
        sys.exit(0)

# Chat Completions fallback
choices = data.get('choices')
if isinstance(choices, list) and choices:
    choice = choices[0]
    msg = choice.get('message') if isinstance(choice, dict) else None
    if isinstance(msg, dict):
        if print_text(msg.get('content')):
            sys.exit(0)

# If all else fails, pretty-print JSON
print(json.dumps(data, indent=2))
PY
