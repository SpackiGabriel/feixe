#!/bin/bash
# PreCompact hook: surface STATUS.md and working-tree changes right before
# compaction, so this state survives summarization.

echo "=== State before compaction ==="
echo "Timestamp: $(date)"

if [ -f "STATUS.md" ]; then
    echo ""
    echo "## STATUS.md"
    cat STATUS.md
else
    echo ""
    echo "## No STATUS.md found"
fi

echo ""
echo "## Files modified (git working tree)"
CHANGED=$(git diff --name-only 2>/dev/null)
STAGED=$(git diff --staged --name-only 2>/dev/null)
UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null)

if [ -n "$CHANGED" ]; then
    echo "Unstaged changes:"
    echo "$CHANGED" | while read -r f; do echo "  - $f"; done
fi
if [ -n "$STAGED" ]; then
    echo "Staged changes:"
    echo "$STAGED" | while read -r f; do echo "  - $f"; done
fi
if [ -n "$UNTRACKED" ]; then
    echo "New untracked files:"
    echo "$UNTRACKED" | while read -r f; do echo "  - $f"; done
fi
if [ -z "$CHANGED" ] && [ -z "$STAGED" ] && [ -z "$UNTRACKED" ]; then
    echo "  (no uncommitted changes)"
fi

echo ""
echo "## Recovery"
echo "After compaction, re-read STATUS.md, then any files listed above that are being actively worked on."
echo "=== end state ==="

exit 0
