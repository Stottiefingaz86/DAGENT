# Figma — settled preference

**Source:** Chris, Nov 2026.

- Account: company organisation (Enterprise), plan key `organization::1304356510223900444`.
- Design system: **Lumen only** — library "Lumen_Desing System", file `vCPe93hNKDWWcpu49Vo0kU`, library key `lk-40fae532f4d55afe9d90d03a1d23bb174e778ffbae07cd2f0474fa95b2d2d722c963aac1e23b5574fcef93bdd232629e4ba24792340aae1653726545bb15ac8f`. Pass it as `includeLibraryKeys` on every search.
- **Ignore all MUI libraries** (MUI Agnostic, MUI for Figma / Joy UI) and every other library (Kraken, Sportsbook UI Kit, Sportbook 26, Lumen | Shell | News).
- **Never edit existing files or folders.** Read-only, always.
- New work goes in **one file named "Design Agent" in the Lumen folder**. One page per project. Create the file there if it doesn't exist.
- Lumen folder (project) id: `625743109` — https://www.figma.com/files/1304356510223900444/folder/625743109
- **Design Agent file:** `MYeELetKW9xye1shSpm8Fn` — https://www.figma.com/design/MYeELetKW9xye1shSpm8Fn (created Nov 2026; the only file the agent writes to; one page per project)

## Chris, Nov 2026 (handover)
- Figma is part of the handover, built after the prototype is approved/signed off — not a separate afterthought.
- Icons come from the Lumen icon set. A Figma page with missing icons is not done.
- Capture hover/pressed/focus as component variants and motion as annotations next to the components — dev must not have to guess.
- Never end a Figma run with an empty or half-built page.
- Technical: Lumen `color/card` is translucent in Dark mode. On the canvas (sections are white) put `color/background` under it, or text disappears.
- Technical: instances don't expose hidden children to findOne — guard text overrides.

## Chris, Nov 12 2026 (handover fidelity)
- Figma screens are checked side by side against a prod screenshot at the same width before hand-off. Shell (side nav rail with its icons, header, sub-nav) must look like prod, not a stand-in.
- Overlays (alt-lines popover) are positioned exactly like prod: beside the arrows, vertically aligned to them — not dropped below.
- Show components in situ on the real page as well as on the components board.
