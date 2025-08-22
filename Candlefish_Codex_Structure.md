# Candlefish.ai Codex Transformation
## From Marketing Site to Public Research Archive

### Transformation Summary

The Candlefish.ai website has been transformed from a traditional consulting/marketing site into a **public research archive** - an open lab codex that documents tool-building in raw, versioned, transparent form.

**Before:** Sales-focused, client-facing, marketing language, "investment ranges"
**After:** Research-focused, peer-facing, technical documentation, version-controlled learnings

---

## New Information Architecture

### 1. **Home (Ledger / Now Building Index)**
- **Location:** `/`
- **Purpose:** Real-time status of active research
- **Key Features:**
  - Version badge (v0.3.2)
  - NOW BUILDING section with active projects
  - Live activity feed
  - System statistics
  - No marketing copy, just current state

### 2. **Workshop Logs**
- **Location:** `/workshop`
- **Purpose:** Complete build history with failures and breakthroughs
- **Key Features:**
  - Each project versioned (e.g., Crown Trophy v0.2.1)
  - Documented failures with metrics
  - Code samples from actual implementations
  - Changelog for every version
  - Known limitations clearly stated
  - Next steps/roadmap

### 3. **Technical Instruments**
- **Location:** `/instruments`
- **Purpose:** Specification cards for every tool built
- **Key Features:**
  - Input → Methods → Output structure
  - Performance metrics
  - Sample code
  - Known limitations
  - Version tracking
  - Categories: parsers, extractors, ml-models, orchestration, sync, analysis

### 4. **Field Journal (Notes)**
- **Location:** `/notes`
- **Purpose:** Raw observations from builds
- **Key Features:**
  - Versioned entries (v1.0, v1.1, etc.)
  - Code fragments
  - Citations to actual projects
  - Revision history
  - RSS feed for updates

### 5. **Annotations**
- **Location:** `/annotations`
- **Purpose:** Philosophy linked to actual builds
- **Key Features:**
  - Principles with evidence
  - Links to specific build versions
  - Counterpoints acknowledged
  - Not manifesto, but marginalia

### 6. **Assessment Tool** (Pending Enhancement)
- **Location:** `/assessment`
- **Purpose:** Diagnostic tool with versioning
- **Features to Add:**
  - Version changelog
  - Documented blind spots
  - Calibration history

---

## Design Conventions Implemented

### Visual Language
- **Monospace font throughout** - Research/technical aesthetic
- **Dark theme** - `#0a0a0a` background, `#d4d4d4` text
- **Color coding:**
  - Green `#00ff00` - Production/Success
  - Yellow `#ffff00` - Testing/Warning
  - Orange `#ff9500` - Calibrating/Pending
  - Red `#ff4444` - Failure/Error
  - Blue `#6666ff` - Links/Actions

### Version Badges
Every component shows its version:
```
[v0.2.1] [active-research]
```

### Status Indicators
- `production` - Deployed and working
- `testing` - In active testing
- `calibrating` - Tuning performance
- `active-research` - Currently building

### Code Display
- Syntax highlighted
- Collapsible sections
- Language indicated
- Real code, not pseudocode

---

## Content Migration

### Removed Marketing Artifacts

1. **"Investment Range"** → Removed entirely
2. **"We transform"** → "We document"
3. **"Excellence emerges"** → "Patterns emerge"
4. **"Consultation"** → "Research"
5. **"Clients"** → "Builds"
6. **"Solutions"** → "Tools"
7. **Sales CTAs** → Documentation links

### Preserved Elements

1. **Project descriptions** - Now with technical detail
2. **Problem statements** - With metrics
3. **Philosophy** - As annotations with evidence
4. **Team information** - As contributors

---

## Technical Changes

### Page Structure
```typescript
// Before: Marketing-focused
<Hero />
<Features />
<Testimonials />
<CallToAction />

// After: Documentation-focused
<CurrentStatus />
<ActiveResearch />
<RecentActivity />
<SystemStats />
```

### Data Structure
```typescript
// Before
{
  client: "Crown Trophy",
  service: "Automation",
  value: "$125,000"
}

// After
{
  id: "crown-trophy",
  version: "v0.2.1",
  status: "active-research",
  failures: 3,
  breakthroughs: 1,
  changelog: [...],
  limitations: [...]
}
```

---

## Publishing Workflow

### For Notes (Field Journal)
1. Document observation in `fieldNotes` array
2. Include version, date, context
3. Add code snippet if relevant
4. List citations to builds
5. Track revisions

### For Workshop Logs
1. Update version number
2. Add changelog entry
3. Document any failures
4. Update current solution
5. List limitations discovered

### For Instruments
1. Specify inputs/methods/outputs
2. Include performance metrics
3. Add sample code
4. Document known limitations
5. Update version and date

---

## RSS Feed Structure (To Implement)

```xml
<rss version="2.0">
  <channel>
    <title>Candlefish Research Codex</title>
    <description>Tool-building observations</description>
    <item>
      <title>Excel as Truth Source v1.2</title>
      <link>/notes#excel-truth-source</link>
      <description>Updated with code examples</description>
      <pubDate>2025-08-20</pubDate>
    </item>
  </channel>
</rss>
```

---

## Success Metrics

The transformation succeeds if:

✅ **Transparent workshop logs** - All failures visible
✅ **Exposed instrument guts** - Code and limitations clear
✅ **Versioned everything** - Every artifact tracked
✅ **Field journal active** - Regular observations
✅ **Philosophy as annotations** - Linked to builds

❌ No marketing language
❌ No client pitches
❌ No feature lists
❌ No testimonials
❌ No pricing

---

## Next Steps

1. **Implement RSS feed** for notes
2. **Add search functionality** across all content
3. **Create API endpoints** for codex data
4. **Build version diff viewer** for changelogs
5. **Add contribution guidelines** for open research

---

## Migration Complete

The site now functions as a **public research archive** where:
- Failures are documented equally with successes
- Every tool shows its internals
- Philosophy connects to implementation
- Versions track evolution
- Patterns emerge from practice

This is not a marketing site. This is a working notebook, versioned and public.
