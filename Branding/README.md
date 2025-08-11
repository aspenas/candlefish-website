# Branding system

This directory contains the canonical source of truth for the brand: tokens, assets, and usage guidelines. Apps should not hard-code colors or logo paths. Instead, they should consume exported tokens or use copied assets at build time.

Structure:
- assets/: raw source assets (SVG/raster, fonts)
- tokens/: design tokens (colors, typography, components)
- templates/: reusable brand templates
- docs/: strategy and usage documentation

Distribution:
- Assets are copied to app `public/` directories during build or release.
- Tokens are imported into styling systems (e.g., Tailwind, CSS variables) and UI packages.
