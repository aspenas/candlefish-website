# Decision Memo: AI-Powered Engraving Preview
*Date: 2025-08-31 | Owner: Sarah Chen | Status: In Review*

## Context
Crown Trophy loses 35% of custom engraving orders at checkout when customers can't visualize the final product. Competitors offer basic text previews but nothing photorealistic. Customer interviews show visualization is the #1 requested feature.

## Decision Required
Which approach should we take for implementing AI-powered engraving previews?

## Three Paths

### Path 1: Stable Diffusion Fine-Tuning
**Description:** Fine-tune open-source Stable Diffusion on our catalog of 10,000+ engraved products.

**Pros:**
- Photorealistic quality
- No per-generation costs
- Complete control
- Can run edge/local

**Cons:**
- GPU infrastructure needed
- 2-3 second generation time
- Training complexity
- Model drift over time

**Cost:** $30k setup + $2k/month GPU costs
**Timeline:** 8 weeks

### Path 2: OpenAI/Anthropic API
**Description:** Use commercial API with prompt engineering for real-time generation.

**Pros:**
- No infrastructure
- Best-in-class quality
- Continuous improvements
- Sub-second response

**Cons:**
- Per-request costs
- Internet dependency
- Potential rate limits
- Less control over output

**Cost:** $0.02/preview × 50k/month = $1k/month
**Timeline:** 2 weeks

### Path 3: Hybrid Template System
**Description:** Pre-render common combinations, use AI only for unique requests.

**Pros:**
- Instant for 80% of requests
- Predictable costs
- Fallback options
- Progressive enhancement

**Cons:**
- Complex caching logic
- Storage requirements
- Partial coverage
- Maintenance overhead

**Cost:** $5k setup + $500/month
**Timeline:** 4 weeks

## Recommendation
**Path 3: Hybrid Template System**

Rationale:
- Best user experience (instant for majority)
- Manageable costs that scale with usage
- Can start simple and enhance over time
- Reduces dependency on external services

## Reversibility
**Easily reversible** - Display layer abstraction means we can swap generation methods without touching UI code.

## Success Metrics
1. Checkout conversion increase of 25%+
2. Preview generation time <500ms for 80% of requests
3. Customer satisfaction with preview accuracy >4.0/5
4. Cost per conversion <$0.10

## Next Steps
1. Analyze top 1000 engraving patterns
2. Build template generation pipeline
3. Implement caching layer
4. A/B test with 10% of traffic

---
*Pending Review: Portfolio Council 2025-09-04*