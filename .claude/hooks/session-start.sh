#!/bin/bash
# SessionStart hook: print branch/recent commits and preview STATUS.md.

echo "=== Feixe — Session Context ==="

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
if [ -n "$BRANCH" ]; then
    echo "Branch: $BRANCH"
    echo ""
    echo "Recent commits:"
    git log --oneline -5 2>/dev/null | while read -r line; do
        echo "  $line"
    done
fi

if [ -f "STATUS.md" ]; then
    echo ""
    echo "=== STATUS.md ==="
    cat STATUS.md
    echo "=== end STATUS.md ==="
fi

echo "==================================="
exit 0
