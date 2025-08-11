## Branding strategy (initial draft)

- Goals: clarity, restraint, consistency across surfaces
- Tokens-first: define color/typography tokens; map to CSS variables and UI components
- Asset pipeline: source in `Branding/assets`, distribute to `public/` for each app
- Versioning: change with semantic versions, keep prior versions in ARCHIVE
- Multi-brand ready: allow future brands via `brand.config.json` and tokens per brand

Next steps:
1) Approve base palette and typography
2) Provide final logo set (SVG + raster) and favicon set
3) Wire tokens into Tailwind/CSS variables in apps and `ui-components`
4) Add a small build script to sync assets/tokens to apps
