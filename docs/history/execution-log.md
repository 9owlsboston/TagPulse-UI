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

### 2026-08-10 — brace-expansion: bump to the actually-patched versions (supersedes #124)

A cross-repo `hygiene` sweep flagged two dependabot PRs stale ~20 days. #123 (`ws`
8.20.0→8.21.1) merged clean. **#124 (`brace-expansion` 1.1.14→1.1.16) did not survive
review** — the required diff-stage deps rubber-duck (`AGENTS.md` §rubber-duck enforcement
makes it mandatory for deps even under `noncodefix`) found the PR's *target* versions are
themselves still affected by newer high-severity ReDoS advisories. Patched versions are
**1.1.18** and **5.0.9**.

That is the whole value of the gate here: merging #124 would have closed a dependabot
alert while leaving the vulnerability in place.

**Change.** `npm audit fix --package-lock-only`, taking all four lockfile instances to
their patched versions — the three eslint-tree v1 copies to 1.1.18 and the top-level v5 to
5.0.9. Lockfile-only; `package.json` untouched (neither package is a direct dependency,
both are transitive through dev tooling).

**How verified.**
- `git diff --stat` → `package-lock.json` only, 34+/34-.
- `npm audit --audit-level=high` → **found 0 vulnerabilities** (repo previously carried 6
  high + 3 moderate).
- `npm ci` + `npm run build` → clean, `✓ built in 2.46s`.

#124 should be closed as superseded rather than merged.

**Review attestations.** Diff-stage: **ran** — this change *is* the rubber-duck's finding.
Plan-stage: waived (dependency patch bump).

`current-state: not-affected`
