# Contributing

## Branches
- `main` is **production**: Vercel deploys the live site from it.
- Work on a branch and open a pull request into `main`. Every branch gets a private Vercel preview.
- Commit with an email linked to your GitHub account.

## Where knowledge lives
The agent should never depend on a prompt someone typed once. Durable knowledge goes in files:

| Kind | Put it in |
|---|---|
| How the agent works (flow, gates, handoff) | `.claude/skills/design-agent/SKILL.md` |
| How UI is built (Lumen, shell, patterns, anti-patterns) | `.claude/skills/lumen-build/` |
| Taste learned from feedback | `knowledge/chris-taste/<TOPIC>.md`, one rule per line with a do/don't and its source. Rules the agent learns carry a `<!-- rule:ID -->` marker: keep it, and review them in Studio → Taste |
| The learning record | `knowledge/taste-ledger.jsonl` + `knowledge/learned-rules.json`: commit them, they're the agent's memory |
| Lumen changes | `npm run lumen:watch` after re-exporting tokens; commit `knowledge/lumen/` |
| Where something lives on the site | `knowledge/chris-taste/SURFACES.md` |
| Strategy and research | `knowledge/product-strategy/` |
| Non-negotiable principles | `.specify/memory/constitution.md` |

When a new rule contradicts an old one, **replace** the old one; don't keep both.

## Skills
- One folder per skill under `.claude/skills/<name>/` with a `SKILL.md` whose front matter `name` matches the folder.
- `npm run skills:check` before every PR. `npm run skills:sync` mirrors the skills to `.cursor/skills/` for Cursor users; that copy is git-ignored.

## Checks
```bash
npm run verify                      # skills, Lumen lint on prototypes, studio syntax
npm run tokens:lint <dir>           # the Lumen rule on whatever you touched
```

## Reviews
The Head of Design reviews changes to `knowledge/chris-taste/`, `.claude/skills/`, `tokens/` and anything visual. See `.github/CODEOWNERS`.
