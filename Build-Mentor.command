#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
trap 'printf "\nBuild stopped. Copy the last error and send it to ChatGPT.\n"; if [ "${MENTOR_NONINTERACTIVE:-0}" != 1 ]; then read -r -p "Press Return to close… " _; fi' ERR
if [ "$(uname -s)" != "Darwin" ]; then printf 'This installer must run on your Mac.\n'; exit 1; fi
printf '\nMENTOR · personal macOS build\n\n'
# Open the disk image itself, rather than its containing build folder.
open_installer() {
  local mentor_dmg
  for mentor_dmg in src-tauri/target/release/bundle/dmg/Mentor_0.1.4_*.dmg; do
    if [ -f "$mentor_dmg" ]; then
      printf '\nOpening the Mentor installer. Drag Mentor.app into Applications, then launch it there.\n'
      open "$mentor_dmg"
      return 0
    fi
  done
  return 1
}
# Reuse only an installer built from this exact source version.
mentor_sources_hash="$(
  { find src prompts src-tauri/src src-tauri/capabilities src-tauri/icons -type f -exec shasum -a 256 {} \; ;
    shasum -a 256 package.json package-lock.json index.html vite.config.js src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/build.rs src-tauri/tauri.conf.json Build-Mentor.command;
  } | LC_ALL=C sort | shasum -a 256 | awk '{print $1}'
)"
mentor_build_stamp=src-tauri/target/mentor-source.sha256
if [ "${MENTOR_DIRECT_INSTALL:-0}" != 1 ] && [ -f "$mentor_build_stamp" ] && [ "$(cat "$mentor_build_stamp")" = "$mentor_sources_hash" ]; then
  if open_installer; then exit 0; fi
fi
if ! xcode-select -p >/dev/null 2>&1; then
  xcode-select --install || true
  printf '\nFinish installing Apple Command Line Tools, then double-click this file again.\n'
  read -r -p 'Press Return to close… ' _
  exit 0
fi
mentor_tools="$HOME/Library/Application Support/Mentor/build-tools"
mkdir -p "$mentor_tools"
if ! command -v node >/dev/null 2>&1 || ! node -e 'if(Number(process.versions.node.split(".")[0])<22)process.exit(1)' >/dev/null 2>&1; then
  printf 'Downloading a private Node.js runtime…\n'
  case "$(uname -m)" in arm64) mentor_arch=arm64;; x86_64) mentor_arch=x64;; *) printf 'Unsupported Mac architecture.\n'; exit 1;; esac
  curl --fail --location --proto '=https' --tlsv1.2 https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt -o "$mentor_tools/SHASUMS256.txt"
  mentor_archive="$(awk -v arch="$mentor_arch" '$2 ~ ("darwin-" arch "\\.tar\\.gz$") {print $2; exit}' "$mentor_tools/SHASUMS256.txt")"
  if [ -z "$mentor_archive" ]; then printf 'Could not resolve Node.js release.\n'; exit 1; fi
  curl --fail --location --proto '=https' --tlsv1.2 "https://nodejs.org/dist/latest-v24.x/$mentor_archive" -o "$mentor_tools/$mentor_archive"
  (cd "$mentor_tools"; awk -v file="$mentor_archive" '$2==file' SHASUMS256.txt | shasum -a 256 -c -)
  tar -xzf "$mentor_tools/$mentor_archive" -C "$mentor_tools"
  export PATH="$mentor_tools/${mentor_archive%.tar.gz}/bin:$PATH"
fi
if [ -f "$HOME/.cargo/env" ]; then source "$HOME/.cargo/env"; fi
if ! command -v cargo >/dev/null 2>&1; then
  printf 'Installing Rust build tools…\n'
  curl --fail --location --proto '=https' --tlsv1.2 https://sh.rustup.rs -o "$mentor_tools/rustup-init.sh"
  sh "$mentor_tools/rustup-init.sh" -y --profile minimal
  source "$HOME/.cargo/env"
fi
printf '\nInstalling dependencies…\n'
npm ci --no-audit --no-fund
printf '\nChecking the app logic…\n'
npm test
cargo test --manifest-path src-tauri/Cargo.toml --no-default-features
export CARGO_TARGET_DIR="${CARGO_TARGET_DIR:-$PWD/src-tauri/target}"
printf '\nBuilding Mentor.app and the DMG. The first Rust build can take several minutes…\n'
if [ "${MENTOR_DIRECT_INSTALL:-0}" = 1 ]; then
  npm run tauri -- build --bundles app
  printf "\nMentor.app built.\n"
  exit 0
fi
npm run tauri build
printf '%s\n' "$mentor_sources_hash" > "$mentor_build_stamp"
printf '\nBUILD COMPLETE.\n'
if ! open_installer; then
  printf '\nThe build returned without a DMG. Copy the build output and send it to ChatGPT.\n'
  exit 1
fi
read -r -p 'Press Return to close… ' _
