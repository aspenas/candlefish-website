## Candlefish Otter Gateway (Fly.io)

Purpose: Receives Otter.ai webhooks and Slack Events/Interactivity, generates Candlefish summaries, and posts to Slack aggregator and project channels.

### Endpoints
- POST /slack/events — Slack Events API
- POST /slack/interactivity — Slack interactivity (buttons, shortcuts)
- POST /webhooks/otter — Otter Enterprise webhook (finalized transcripts)

### Environment variables (provided via Fly secrets)
- SLACK_BOT_TOKEN
- SLACK_SIGNING_SECRET
- SLACK_AGGREGATOR_CHANNEL_ID
- OTTER_WEBHOOK_SECRET
- OTTER_API_TOKEN
- OPENAI_API_KEY
- GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 (optional for calendar sync)
- S3_BUCKET_TRANSCRIPTS (optional; uploads handled by worker)
- LOG_LEVEL (default: info)
- PORT (default: 8080)

### Local development
1) `npm install`
2) Copy `.env.example` to `.env` and fill values
3) `npm run dev`

### Build & run
- `npm run build`
- `npm start`

### Fly.io
This folder includes a Dockerfile for Fly deploys. Create the Fly app and set secrets:

```
flyctl apps create candlefish-otter-gateway
flyctl secrets set \
  SLACK_BOT_TOKEN=... \
  SLACK_SIGNING_SECRET=... \
  SLACK_AGGREGATOR_CHANNEL_ID=... \
  OTTER_WEBHOOK_SECRET=... \
  OTTER_API_TOKEN=... \
  OPENAI_API_KEY=...

flyctl deploy
```
