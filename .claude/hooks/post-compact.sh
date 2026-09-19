#!/usr/bin/env bash
# post-compact.sh — fires after conversation compaction.
# Reminds Claude to re-read STATUS.md, the file-backed source of current state.

echo "=== Context restored after compaction ==="

if [ -f "STATUS.md" ]; then
  echo "STATUS.md exists — read it now to restore current focus, progress, and next steps."
else
  echo "No STATUS.md found."
fi

echo "==========================================="
