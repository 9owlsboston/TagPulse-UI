#!/usr/bin/env bash
# Start a new sprint: branch off main + open a draft PR.
#
# Usage:  scripts/start-sprint.sh <NN> <topic-slug> ["PR title"]
# Example: scripts/start-sprint.sh 22 cold-chain-alerts
#          scripts/start-sprint.sh 22 cold-chain-alerts "feat(sprint-22): cold-chain alerts"

set -euo pipefail

if [[ $# -lt 2 ]]; then
    echo "Usage: $0 <NN> <topic-slug> [\"PR title\"]" >&2
    exit 1
fi

NN="$1"
topic="$2"
title="${3:-feat(sprint-${NN}): ${topic//-/ }}"
branch="sprint-${NN}/${topic}"

if [[ -n $(git status --porcelain) ]]; then
    echo "Working tree not clean. Commit or stash first." >&2
    exit 1
fi

echo "==> Updating main"
git checkout main
git pull --ff-only

echo "==> Creating branch $branch"
git checkout -b "$branch"

echo "==> Pushing branch + creating draft PR"
# Empty commit so the PR has something to show
git commit --allow-empty -m "chore(sprint-${NN}): start branch"
git push -u origin "$branch"

gh pr create --draft --base main --head "$branch" \
    --title "$title" \
    --body "Sprint ${NN} workstream. Fill in scope below.

## Scope
_TBD_

## Cross-repo plan
<!-- See .github/copilot-instructions.md § Cross-Repo Workflow. -->
- Backend: _TBD (none / sprint-${NN}/<topic> at <link> / in-flight follow-up)_
- UI: this PR
- OpenAPI: _no change / consumes new endpoints from backend SHA \`<sha>\`_
- Merge order: _UI only / after backend PR merges_

## Checklist
- [ ] Implementation complete
- [ ] Tests added / updated
- [ ] \`npm run check\` clean
- [ ] CHANGELOG updated under \`## Unreleased\`
- [ ] If consuming new API: backend SHA recorded above and \`src/api/generated/\` regenerated"

echo ""
echo "Done. You're now on $branch with a draft PR."
