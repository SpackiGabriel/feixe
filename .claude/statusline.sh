#!/usr/bin/env bash
# Feixe — Status Line
# Receives JSON on stdin, outputs a single-line status: ctx% | model | branch

input=$(cat)

if command -v jq &>/dev/null; then
  model=$(echo "$input" | jq -r '.model.display_name // "Unknown"')
  used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
  cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // ""')
else
  model=$(echo "$input" | grep -oE '"display_name"\s*:\s*"[^"]*"' | head -1 | sed 's/.*: *"//;s/"//')
  used_pct=$(echo "$input" | grep -oE '"used_percentage"\s*:\s*[0-9]+' | head -1 | sed 's/.*: *//')
  cwd=$(echo "$input" | grep -oE '"current_dir"\s*:\s*"[^"]*"' | head -1 | sed 's/.*: *"//;s/"//')
  [ -z "$model" ] && model="Unknown"
fi

cwd=$(echo "$cwd" | sed 's|\\|/|g')
[ -z "$cwd" ] && cwd="."

if [ -n "$used_pct" ]; then
  ctx_label="ctx: ${used_pct}%"
else
  ctx_label="ctx: --"
fi

branch=$(git -C "$cwd" rev-parse --abbrev-ref HEAD 2>/dev/null)
[ -z "$branch" ] && branch="no-branch"

printf "%s" "${ctx_label} | ${model} | ${branch}"
