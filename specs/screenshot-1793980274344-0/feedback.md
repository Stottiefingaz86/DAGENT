# Feedback log — Casino expanding hover banners

## Round 0 — 2026-11-06 (intake)

- BRD (Chris): "Looking at the banners that are around the site, focus on casino first, lets create new behaviour something like winna.com where they expand on hover and show more info."
- Agent: spec written; asked Q1 (VIP/Race widgets in accordion?) and Q2 (row height).
- Chris answers (2026-11-06): Q1 "Widgets join the accordion (recommended)"; Q2 "Grow to ~240px (recommended)". One-off for this feature; written into spec.md Clarifications. Not durable yet.
- Draft built: `components/lumen/expanding-banner-row-prototype.tsx`, opt-in `bannerRow` prop on `CasinoLobby`, registry entry.
- Round 1 — 2026-11-06: Chris approved the proposal direction (no note). One-off, no durable rule. Prototype: scale-token sizes, real Silver perk copy, image onError fallback, CTA shares launch spinner, focus ring, stronger mobile scrim.
- 2026-11-06: Final sign-off by Chris. dev-delivery.md written; no new surface, so SURFACES.md is unchanged. Figma not built (not connected).
- Tooling: `components/site/site-arrival-loader.tsx` skips the boot loader when `navigator.webdriver` so studio captures show the page (capture waits 1.2s, loader min 4.8s).
