#!/bin/bash
# Download, build and install the latest Mentor on your Mac.
set -euo pipefail
if [ "$(uname -s)" != "Darwin" ]; then printf 'Run this command on your Mac.\n'; exit 1; fi
mentor_repo_url="${1:-${MENTOR_REPOSITORY_URL:-https://github.com/louisrid/mentor.git}}"
if [ -z "$mentor_repo_url" ]; then printf 'A GitHub repository URL is required.\n'; exit 1; fi
case "$mentor_repo_url" in https://github.com/*/*) ;; *) printf 'Use the HTTPS URL of the Mentor GitHub repository.\n'; exit 1;; esac
if ! xcode-select -p >/dev/null 2>&1; then
  xcode-select --install || true
  printf 'Finish installing Apple Command Line Tools, then run the same command again.\n'
  exit 2
fi
mentor_cache="$HOME/Library/Application Support/Mentor/source-builds"
mkdir -p "$mentor_cache"
mentor_checkout="$(mktemp -d "$mentor_cache/update.XXXXXX")"
printf '\nDownloading the latest Mentor source…\n'
# Private repositories use your existing Git credential helper or GitHub authentication.
if ! git clone --depth 1 "$mentor_repo_url" "$mentor_checkout"; then
  printf '\nCould not download the repository. For a private repo, sign Git into GitHub first.\n'
  exit 1
fi
if [ ! -f "$mentor_checkout/Build-Mentor.command" ]; then
  printf 'This repository does not contain the Mentor app at its root.\n'; exit 1
fi
CARGO_TARGET_DIR="$mentor_cache/target" MENTOR_DIRECT_INSTALL=1 MENTOR_NONINTERACTIVE=1 bash "$mentor_checkout/Build-Mentor.command"
mentor_built_app="$mentor_cache/target/release/bundle/macos/Mentor.app"
if [ ! -d "$mentor_built_app" ]; then printf 'Build did not produce Mentor.app.\n'; exit 1; fi
mentor_applications="${MENTOR_APPLICATIONS_DIR:-/Applications}"
if [ ! -w "$mentor_applications" ]; then
  if [ -d /Applications/Mentor.app ]; then printf 'Cannot replace /Applications/Mentor.app with your current permissions.\n'; exit 1; fi
  mentor_applications="$HOME/Applications"
  mkdir -p "$mentor_applications"
fi
mentor_stage="$(mktemp -d "$mentor_applications/.mentor-install.XXXXXX")"
ditto "$mentor_built_app" "$mentor_stage/Mentor.app"
osascript -e 'if application "Mentor" is running then tell application "Mentor" to quit' >/dev/null 2>&1 || true
if [ -d "$mentor_applications/Mentor.app" ]; then
  mv "$mentor_applications/Mentor.app" "$mentor_stage/Previous-Mentor.app"
fi
if ! mv "$mentor_stage/Mentor.app" "$mentor_applications/Mentor.app"; then
  if [ -d "$mentor_stage/Previous-Mentor.app" ]; then mv "$mentor_stage/Previous-Mentor.app" "$mentor_applications/Mentor.app"; fi
  printf 'Install failed; the previous app was restored.\n'; exit 1
fi
printf '\nMentor updated. Your chats, key and context stay in place.\n'
open "$mentor_applications/Mentor.app"
