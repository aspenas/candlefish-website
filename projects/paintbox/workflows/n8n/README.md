### Paintbox × n8n workflows

This folder contains ready-to-import n8n workflows to optimize Paintbox with automation. Import these JSON files into your n8n instance, wire credentials where needed, and optionally enable schedules.

Workflows:
- `salesforce-nightly-sync.json`: Triggers a Salesforce batch sync via Paintbox API.
- `estimate-approved-pdf-email.json`: Inbound webhook for estimate approval → generate PDF → send email.
- `companycam-event-pipeline.json`: Webhook router for CompanyCam events.
- `health-monitor.json`: Checks Paintbox health and emails on degradation.

Required environment variables (set in n8n):
```bash
# Paintbox
PAINTBOX_BASE_URL=https://your-paintbox.example.com
PAINTBOX_BEARER_TOKEN=eyJhbGciOi...  # service account JWT for n8n → Paintbox

# Notifications (used by Email nodes)
ALERT_FROM_EMAIL=ops@example.com
ALERT_TO_EMAIL=alerts@example.com

# Optional handlers used in CompanyCam pipeline
PHOTO_CREATED_HANDLER_URL=https://example.com/handle-photo-created
PROJECT_UPDATED_HANDLER_URL=https://example.com/handle-project-updated
```

Import via n8n API:
```bash
export N8N_URL="https://n8n.example.com"
export N8N_API_KEY="<your_n8n_api_key>"

for f in salesforce-nightly-sync.json estimate-approved-pdf-email.json companycam-event-pipeline.json health-monitor.json; do
  curl -sS -X POST "$N8N_URL/rest/workflows" \
    -H "X-N8N-API-KEY: $N8N_API_KEY" \
    -H "Content-Type: application/json" \
    --data-binary @workflows/n8n/$f | jq .id;
done
```

For environment promotion and Git-backed workflows, see: [n8n Source control and environments](https://docs.n8n.io/source-control-environments/).
