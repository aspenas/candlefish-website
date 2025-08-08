# Candlefish Brand Governance

Owner: Patrick (sole approver)

Source of Truth: `brand/` directory in this repository plus Figma master file (link to be added upon creation).

Review Gates:

- New or modified logos and icons: approval required by Owner before merge.
- Color and typography changes: approval required by Owner and version bump in `design-tokens.json`.
- Templates and public assets: approval required by Owner.

Versioning:

- Semantic versioning for `design-tokens.json` and templates.
- Maintain `CHANGELOG.md` in `brand/` for all updates.

Distribution:

- SVG/PNG logo kit in `public/logo/svg/` and `public/logo/png/`.
- Templates in `apps/brand-portal/templates/`.
- Interactive PDF exported to `brand/Brand-Standards.pdf`.

Vendor Onboarding Checklist:

- Share `Brand-Standards.pdf` and link to Figma master.
- Provide logo kit (SVG/PNG) and color/typography tokens.
- Confirm WCAG AA conformance for produced materials.
- Route all deliverables to Owner for approval prior to release.
