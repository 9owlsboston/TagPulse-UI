#!/usr/bin/env bash
# scripts/ui-env-load.sh <env>
#
# `source`-able loader: exports every non-empty value from .env.<env>
# into the current shell. Mirror of TagPulse/scripts/azd-env-load.sh.
#
# Usage (must be sourced — values are exported into your shell):
#     source scripts/ui-env-load.sh dev
#     . scripts/ui-env-load.sh staging
#
# Compatibility: also accepts a direct file path.
#
# Note: this file is intended to be sourced. If executed directly, the
# exports vanish when the subshell exits and only the warning prints.

# Detect sourcing. Works for bash + zsh.
__ui_env_sourced=0
if [[ -n "${BASH_SOURCE:-}" ]]; then
  [[ "${BASH_SOURCE[0]}" != "${0}" ]] && __ui_env_sourced=1
elif [[ -n "${ZSH_EVAL_CONTEXT:-}" ]]; then
  [[ "$ZSH_EVAL_CONTEXT" == *:file:* ]] && __ui_env_sourced=1
fi

if [[ $__ui_env_sourced -eq 0 ]]; then
  echo "warn: $0 should be sourced, not executed:" >&2
  echo "      source $0 <env>" >&2
fi

__ui_arg="${1:-}"
if [[ -z "$__ui_arg" ]]; then
  echo "Usage: source $0 <env>   # dev | staging | production" >&2
  echo "       source $0 <path>  # path to a .env file" >&2
  return 1 2>/dev/null || exit 1
fi

__ui_repo_root="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"

if [[ -f "$__ui_arg" ]]; then
  __ui_env_file="$__ui_arg"
elif [[ -f "$__ui_repo_root/.env.${__ui_arg}" ]]; then
  __ui_env_file="$__ui_repo_root/.env.${__ui_arg}"
else
  echo "error: no .env file found for '$__ui_arg'" >&2
  echo "       tried: $__ui_repo_root/.env.${__ui_arg}" >&2
  echo "              $__ui_arg (as path)" >&2
  echo "Bootstrap with: scripts/ui-bootstrap.sh $__ui_arg" >&2
  return 1 2>/dev/null || exit 1
fi

__ui_count=0
while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line#"${line%%[![:space:]]*}"}"
  line="${line%"${line##*[![:space:]]}"}"
  [[ -z "$line" || "$line" == \#* ]] && continue
  if [[ "$line" != *=* ]]; then
    echo "warn: skipping malformed line: $line" >&2
    continue
  fi

  __ui_key="${line%%=*}"
  __ui_val="${line#*=}"
  [[ -z "$__ui_val" ]] && continue

  # Strip matching surrounding quotes.
  if [[ "$__ui_val" =~ ^\".*\"$ ]] || [[ "$__ui_val" =~ ^\'.*\'$ ]]; then
    __ui_val="${__ui_val:1:${#__ui_val}-2}"
  fi

  export "$__ui_key=$__ui_val"
  __ui_count=$((__ui_count + 1))
  case "$__ui_key" in
    *PASSWORD*|*SECRET*|*TOKEN*|*KEY*) echo "  set $__ui_key=***" ;;
    *) echo "  set $__ui_key=$__ui_val" ;;
  esac
done < "$__ui_env_file"

echo "Loaded $__ui_count value(s) from $__ui_env_file"

unset __ui_arg __ui_repo_root __ui_env_file __ui_count __ui_key __ui_val __ui_env_sourced
