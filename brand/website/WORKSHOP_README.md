# Workshop System Documentation

## Overview

The Workshop page is a public R&D board displaying live operational work with an Operator ↔ Builder view toggle. It uses MDX files as the source of truth, with no mocks or projections.

## Directory Structure

```
workshop/
├── content/           # MDX files with project data (source of truth)
│   ├── engraving-automation.mdx
│   ├── paintbox-estimation.mdx
│   ├── promoteros-intelligence.mdx
│   └── inventory-automation.mdx
└── index.json        # Generated index for fast grid display
```

## Adding a New Project

### 1. Create MDX File

Create a new MDX file in `workshop/content/[slug].mdx` with the following frontmatter:

```yaml
---
title: "Project Title"
slug: "url-friendly-slug"  # Must match filename
status: "ACTIVE"           # IDEATION|ACTIVE|CALIBRATING|OPERATIONAL|PAUSED
domain: ["Domain1", "Domain2"]
complexity: "M"            # L|M|H
impact: "High"             # Low|Medium|High
owner: "Candlefish"
safe_public: true          # Must be true to appear on public site
client_name_masked: "Masked Client Name"
updated_at: "2025-08-23"   # YYYY-MM-DD format
metrics:
  metric_name: value
  another_metric: 100
stack: ["Tech1", "Tech2"]
links:
  repo: ""                 # Optional
  design: ""               # Optional
  doc: ""                  # Optional
architecture:
  nodes:
    - { id: "node1", kind: "service", label: "Node Label" }
  links:
    - { source: "node1", target: "node2", label: "Connection" }
changelog:
  - date: "2025-08-23"
    entry: "What changed"
next_milestone:           # Optional
  name: "Milestone name"
  eta: "2025-09-01"
---

# Project Content

Write your detailed project documentation here using Markdown.
```

### 2. Node Types for Architecture

Available node kinds:
- `source` - Data sources (green)
- `service` - Processing services (blue)
- `database` - Storage systems (orange)
- `ui` - User interfaces (bright green)
- `machine` - Physical devices (red)
- `integration` - External integrations (yellow)

### 3. Privacy & Masking

**Client Names**: Always use `client_name_masked` field. Never include real client names unless explicitly approved.

**Sensitive Metrics**: The system automatically removes sensitive metrics like:
- Revenue/cost data
- Profit margins
- Internal budget figures

**Safe Public Flag**: Only projects with `safe_public: true` will appear on the public site.

## Scripts

### Build Workshop Index
```bash
npm run build-workshop-index
```
Generates `workshop/index.json` from MDX frontmatter.

### Validate Workshop Content
```bash
npm run validate-workshop
```
Validates all MDX files against the schema. Checks for:
- Required fields
- Correct date formats
- Valid status values
- Architecture node references
- Slug/filename matching

### Development
```bash
npm run dev
```
Automatically builds index and validates before starting dev server.

### Production Build
```bash
npm run build
```
Runs validation and index generation before building.

## View Modes

### Operator View
- Emphasizes outcomes and metrics
- Shows status, impact, complexity
- Displays telemetry visualization
- Last updated timestamp

### Builder View
- Emphasizes technical architecture
- Shows technology stack
- Displays node graph preview
- Domain tags

## Features

### Filtering
- Status (IDEATION, ACTIVE, CALIBRATING, OPERATIONAL, PAUSED)
- Domain tags
- Complexity (L/M/H)
- Impact (Low/Medium/High)
- Updated within (7d, 30d, 90d)

### Search
Full-text search across:
- Project titles
- Domain tags

### Accessibility
- Full keyboard navigation
- ARIA labels on all interactive elements
- Respects prefers-reduced-motion
- Semantic HTML structure
- Color contrast compliant

### Performance
- Static generation for all project pages
- Lazy-loaded visualizations
- Optimized canvas rendering
- Frame rate capping at 30-45 FPS

## Architecture Visualization

The architecture diagram uses Canvas 2D for performance:
- Force-directed node layout
- Animated connections
- Color-coded by node type
- Subtle pulsing effects
- Responsive to container size

## Telemetry Visualization

Real-time metrics display:
- Streaming data visualization
- Multiple metric overlay
- Automatic scaling
- Graceful degradation for reduced motion

## Validation Rules

1. **Required Fields**: title, slug, status, domain, complexity, impact, owner, safe_public, client_name_masked, updated_at
2. **Date Format**: YYYY-MM-DD
3. **Status Values**: Must be one of the defined statuses
4. **Architecture Integrity**: All link sources/targets must exist in nodes
5. **Slug Matching**: Slug must match filename (without .mdx)
6. **No Future Dates**: Dates cannot be in the future

## Troubleshooting

### Project Not Appearing
1. Check `safe_public: true` is set
2. Run validation: `npm run validate-workshop`
3. Rebuild index: `npm run build-workshop-index`
4. Check for build errors

### Architecture Not Rendering
1. Verify all node IDs in links exist in nodes array
2. Check node `kind` is valid
3. Ensure both nodes and links arrays are present

### Validation Errors
The validator provides specific field paths and error messages. Common issues:
- Missing required fields
- Invalid date formats
- Mismatched slug and filename
- Invalid status values