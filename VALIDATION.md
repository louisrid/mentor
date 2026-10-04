# Validation

- Frontend production bundle: passed.
- Core Rust tests: 4 passed (stream chunk/UTF-8 parsing, persistent budget reservations and settlement, archive/context selection, settings validation).
- JavaScript test: passed.
- Browser smoke test with a mocked native bridge: passed for streaming, safe text rendering, persisted settings, manual memory, new conversations/history and 380 × 400 layout.
- Installer shell syntax and JSON configuration: passed.
- Current default model ID and prices: verified against the live OpenRouter models API during authoring.

The macOS native app and DMG have not been compiled or run here. An attempted macOS cross-check stopped in an Objective-C dependency because this Linux environment lacks Apple's compiler and SDK. Keychain, Dock activation, native window resizing, login startup and global shortcut need validation in the installed Mac app. No real AI completion was made and no OpenRouter credits were spent during these checks.

Installer revision: shell syntax and a simulated file-opening test passed. Verified that the generated .dmg file, not its containing folder, is passed to macOS open. An existing image is reopened without rebuilding. Native mounting still requires macOS.

Version 0.1.1 UI revision: frontend build and mocked browser smoke test passed for one-field setup, large white sans-serif inputs, default collapsed settings, streaming and safe rendering, settings persistence, memory, history and compact layout. Setup and settings screenshots were visually inspected. Installer syntax and simulated opening of the new version passed; changed source is rebuilt. The revised native binary has not been built here.

Version 0.1.2 opt-in context: 6 core Rust tests passed, including blank initial context, persistence after reopening, and backup/removal of unchanged starter text while retaining edits. Frontend build, installer syntax and mocked UI smoke test passed; manual profile and goals persist in settings. New context draft was not included in the source or defaults. Native macOS revision still needs local build.

Version 0.1.3: Markdown import unit tests (multiple files, preservation, invalid/empty files, UTF-8 size checks) and browser import/save smoke test passed. Core Rust tests: 6 passed. Frontend build and both installer shell syntax checks passed. One-command updater download/build/install/backup/launch flow passed with mocked Mac commands. The dependency lockfile was refreshed against available registry versions after a stale transitive lock entry was detected. Native macOS build and real remote updater have not been run here; hosting repository is not yet configured.

Version 0.1.4: 8 core Rust tests passed, including repeated credential reads loading only once, cached denied/missing access, and immediate cache replacement after save/remove. Keychain caching stays in the native process; no key is returned to the frontend. Installer shell syntax passed. Actual macOS permission dialogs require verification on the user's Mac.

Version 0.1.5: 9 core Rust tests passed, including a hard word/Unicode-character limit and monotonic streaming prefixes. Frontend build and browser smoke test passed with a mocked native bridge. Checked zero chat overflow at 380×400, message arrow navigation, and identical Mentor label coordinates after resizing. Native macOS build still runs on the user's Mac.
