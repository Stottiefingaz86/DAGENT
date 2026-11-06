# Lumen gaps

Components or variants a design needed that the Lumen library does not have yet. One entry per gap.
The design agent adds entries; the design-system team promotes them into Lumen; the agent swaps to the real component once `knowledge/lumen/CHANGELOG.md` shows it.

## How a gap is handled

1. **Compose first.** Can it be built from existing Lumen components + tokens (a Card with a Badge and a Progress, a Button variant)? Then it is not a gap — do that.
2. **Propose.** If not, build it in `apps/live-site/components/proposed/<name>.tsx` from Lumen tokens and Lumen sub-components only, with the header comment `PROPOSED — not in Lumen yet`. In Figma it goes in the project page's "Proposed components" section, labelled the same way.
3. **Show it.** It appears in the proposal's gaps with a screenshot; Chris approves or rejects it like any other design decision.
4. **Hand it over twice.** In the dev handover (`manifest.json` → `gaps`) so dev builds it as a local component, and here so the design-system team can add it to the Lumen library (Figma + `src/components/lumen`).
5. **Swap.** When Lumen ships it, the agent replaces the proposed component and removes it from `components/proposed/`.

## Entry template

```
### <Component name> — <status: proposed | approved | in Lumen>
- Needed by: <project slug / BRD>
- Why Lumen can't do it today: …
- Variants / props: …
- States: default, hover, pressed, focus, disabled, loading, error
- Tokens used: …
- Code: apps/live-site/components/proposed/<name>.tsx
- Figma: <frame URL>
```

## Gaps
