#!/bin/bash
# PreToolUse hook: before a `git commit`, run lint + unit tests and block the
# commit (exit 2, stderr shown to Claude) if either fails.
#
# Input schema (PreToolUse for Bash):
# { "tool_name": "Bash", "tool_input": { "command": "git commit -m ..." } }

INPUT=$(cat)

if command -v jq >/dev/null 2>&1; then
    COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
else
    COMMAND=$(echo "$INPUT" | grep -oE '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/"command"[[:space:]]*:[[:space:]]*"//;s/"$//')
fi

if ! echo "$COMMAND" | grep -qE '^git[[:space:]]+commit'; then
    exit 0
fi

# Nothing to validate without installed tooling — don't block on a fresh clone.
[ -d node_modules ] || exit 0

if ! OUT=$(npm run lint --silent 2>&1); then
    echo "BLOCKED: npm run lint failed" >&2
    echo "$OUT" | tail -30 >&2
    exit 2
fi
if ! OUT=$(npm test --silent 2>&1); then
    echo "BLOCKED: npm test failed" >&2
    echo "$OUT" | tail -40 >&2
    exit 2
fi
exit 0
