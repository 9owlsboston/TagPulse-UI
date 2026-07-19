# Execution log — TagPulse-UI

Chronological record of **what was executed** against this repo — commands run,
changes made, and how they were verified. Distinct from `CHANGELOG.md` (which
records *content* changes for consumers); this log records **action** — especially
important because AI agents execute on our behalf.

Append newest-last. Preserve dates, commands, and verification notes; use
completed-state language (record what happened, not what to do).

---

<!-- Template (copy per entry):

### YYYY-MM-DD — <short title>

<what was done + why, in a sentence or two>. Verified: <how — command output,
test, diff, byte-identity, etc.>.
-->

### 2026-07-19 — Adopted dev-env-setup guardrail toolkit (xs profile)

Ran `bootstrap-repo.sh --profile xs` to seed the agent contract (`AGENTS.md`,
`docs/current-state.md`, this log, `.gitattributes`, `.repo-profile`, `.gitignore`
baseline). Reconciled four `*.toolkit-new` conflicts by hand — folded the template
floors into the existing `README.md`, `.github/copilot-instructions.md`, `CHANGELOG.md`,
and `.editorconfig` (kept all real repo content), then deleted the `.toolkit-new` files.
Filled the seeded placeholders in `AGENTS.md` (§1–3 grounded in package.json scripts +
`src/` layout) and `docs/current-state.md`; set `ledger-project: tagpulse` so the ledger
unions with the sibling backend repo. Verified: `find -name '*.toolkit-new'` empty; no
`TODO` left except the intentional "no diagram yet" note.
