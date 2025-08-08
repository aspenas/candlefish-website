# candlefish-ai – Claude.md (FULL-PERMISSIONS, July 2025)

## 1. Project DNA

- **Root**: `/Users/patricksmith/candlefish-ai`
- **Stack**: Python 3.12 (primary), TypeScript/Node.js (CLI tools), React (frontend)
- **Package managers**: poetry (Python), pnpm (Node)
- **Shell**: bash
- **Goals**: test-driven feature dev, large-scale refactors, CI/CD automation

## 2. LLM Priority Order & SDKs

1. Anthropic SDK – claude-opus-4-20250514, claude-3-5-sonnet
2. OpenAI SDK – gpt-4o, gpt-4-turbo
3. Together AI SDK
4. Fireworks AI SDK

All keys live in Infisical (preferred) or AWS Secrets Manager.
Use `infisical run --env=prod -- <cmd>` or AWS Secrets Manager SDK for runtime injection.

## 3. MCP Servers (auto-install on first use)

- filesystem (built-in)
- postgres (PGVector)     – `npx @modelcontextprotocol/server-postgres`
- github                  – `npx @modelcontextprotocol/server-github`
- aws                     – `npx @modelcontextprotocol/server-aws`
- context7                – `npx @modelcontextprotocol/server-context7`
- huggingface             – `npx @modelcontextprotocol/server-huggingface`
- anthropic               – `npx @modelcontextprotocol/server-anthropic`
- openai                  – `npx @modelcontextprotocol/server-openai`

Ensure each is listed in `.claude/settings.json`:

```json
{
  "mcpServers": {
    "postgres": { "command": "npx", "args": ["@modelcontextprotocol/server-postgres"] },
    "github":   { "command": "npx", "args": ["@modelcontextprotocol/server-github"] },
    "aws":      { "command": "npx", "args": ["@modelcontextprotocol/server-aws"] },
    "context7": { "command": "npx", "args": ["@modelcontextprotocol/server-context7"] },
    "huggingface": { "command": "npx", "args": ["@modelcontextprotocol/server-huggingface"] },
    "anthropic": { "command": "npx", "args": ["@modelcontextprotocol/server-anthropic"] },
    "openai": { "command": "npx", "args": ["@modelcontextprotocol/server-openai"] }
  }
}
```

## 4. RAG / Vector Stores

- **PGVector** (production) – via postgres MCP
- **ChromaDB** (local dev)  – via `chroma run --path ./chroma_data`
- **FAISS** (ephemeral)     – via Python `langchain_community.vectorstores.FAISS`

## 5. Global Tools (pre-installed in container)

aws-cli, gh, kubectl, terraform, ruff, pytest, selenium, infisical

## 6. Secrets Management

- Use `infisical run` to inject secrets into any command:

  ```bash
  infisical run --env=prod -- poetry run pytest
  ```

- Fall back to AWS Secrets Manager SDK for legacy keys.

## 7. Workflows & Commands

- **Test-driven dev**: `poetry run pytest -q` or `pnpm test`
- **Lint/format**: `ruff check && ruff format`
- **Type-check**: `pnpm tsc --noEmit`
- **CI/CD**: GitHub Actions (use gh MCP to open/merge PRs, trigger workflows)

## 8. Permissions

You have full permissions inside the container.
Outside the container, respect host isolation.
