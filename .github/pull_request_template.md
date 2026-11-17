## What changed

<!-- What does this pull request do, and why? Link the issue if there is one: "Closes #..." -->

## How I tested it

<!-- Unit tests, and if you deployed it: which workspace and Commerce instance (SaaS or PaaS, version), and which label rules and products you tried. -->

## Checklist

- [ ] `npm run code:check`, `npm run typecheck` and `npm test` pass
- [ ] New logic in the engine or `src/common/labels` has unit tests
- [ ] Labels still render as plain text (no HTML from rules), and a failed rules feed still shows no labels instead of breaking the page
- [ ] No secrets, tokens or shopper data in code, logs or tests
- [ ] README, `docs/` or CHANGELOG updated, if behaviour, rule fields or setup changed
