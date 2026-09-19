#!/bin/bash
# PreToolUse hook: blocks `git commit` if staged assets/data/*.json is invalid JSON.
# Exit 0 = allow, Exit 2 = block (stderr shown to Claude).
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

STAGED=$(git diff --cached --name-only 2>/dev/null)
if [ -z "$STAGED" ]; then
    exit 0
fi

DATA_FILES=$(echo "$STAGED" | grep -E '^assets/data/.*\.json$')
if [ -n "$DATA_FILES" ]; then
    PYTHON_CMD=""
    for cmd in python python3 py; do
        if command -v "$cmd" >/dev/null 2>&1; then
            PYTHON_CMD="$cmd"
            break
        fi
    done

    while IFS= read -r file; do
        if [ -f "$file" ]; then
            if [ -n "$PYTHON_CMD" ]; then
                if ! "$PYTHON_CMD" -m json.tool "$file" > /dev/null 2>&1; then
                    echo "BLOCKED: $file is not valid JSON" >&2
                    exit 2
                fi
            else
                echo "WARNING: Cannot validate JSON (python not found): $file" >&2
            fi
        fi
    done <<< "$DATA_FILES"
fi

exit 0
