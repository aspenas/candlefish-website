# Candlefish AI Landing Page

A Next.js 14 application with **Vercel AI SDK** and **Anthropic** integration.

## Setup

1. Install dependencies

   ```bash
   npm install
   ```

2. Copy the env template and add your **Anthropic API key**

   ```bash
   cp .env.local.example .env.local
   # edit .env.local
   ```

3. Run the dev server

   ```bash
   npm run dev
   ```

4. Open <http://localhost:3000>

---

## API

### `POST /api/generate-meta`

**Request**

```json
{ "industry": "Healthcare" }
```

**Response**

```json
{
  "title": "Candlefish AI - Healthcare AI Solutions",
  "description": "Transform healthcare with Candlefish AI's consciousness-aligned solutions..."
}
```
