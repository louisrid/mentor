# Mentor

A private macOS AI mentor in a resizable black window, without a title bar or traffic lights. Uses OpenRouter, macOS Keychain and a local SQLite archive. No server, cloud database, subscription, Docker, local model or agents.

## Update to the simpler interface

Quit the old Mentor with ⌘Q. Unzip this complete replacement project and run **Build-Mentor.command**. When the DMG opens, drag Mentor into Applications and choose **Replace**. Open the installed copy. Your existing context, chats, memory and saved key are kept in their existing locations.

The interface now uses large white system sans-serif text. First-time setup has only a key field and **Start chatting**. Settings show two switches and closed **Personal context**, **Personality** and **Advanced** sections. All previous capabilities remain available.

## Install on your Mac

1. Unzip this folder somewhere you can keep the source, such as Downloads.
2. Double-click **Build-Mentor.command**. It now opens the actual DMG automatically, rather than opening its containing folder. If a completed DMG is already present, it opens that without rebuilding. It checks Apple's Command Line Tools, installs a private Node runtime if needed, installs Rust if needed, runs checks, and builds the app and DMG. If Apple's tools need installing, finish the popup and run the command again.
3. Open the resulting DMG in `src-tauri/target/release/bundle/dmg/`. Drag **Mentor.app** to **Applications**, then launch that installed copy.
4. Open the welcome screen, paste an OpenRouter API key and click **Start chatting**. The key is stored in macOS Keychain, not in this project or your transcript.

If macOS blocks the command or unsigned app, try Control-click → Open. If macOS reports the unsigned app as blocked, use System Settings → Privacy & Security → Open Anyway after attempting to open it. Do not disable Gatekeeper globally. If Terminal reports a permission error for the build script, run `bash` followed by a space, drag Build-Mentor.command into Terminal, then press Return.

The macOS app and DMG must be built on macOS. This source package is not a precompiled installer. A first build can exceed an hour if Apple tools, network downloads or compilation are slow. No paid Apple developer account is required for a personal unsigned build. Native behaviour still needs checking on your Mac.

## Everyday use

- **Dock icon:** show the window. Drag its empty top 20 pixels to move it. Resize from the edges.
- **⌥Space:** show/hide from another app. If another app owns the shortcut, a warning appears; use the Dock icon.
- **⌘W**, **hide**, or **Escape:** hide while staying running. Use **Settings → Advanced → Minimise window** to minimise.
- **⌘Q:** actually quit. Quit leaves the launch-at-login preference enabled unless you disable it in settings.
- **Enter:** send. **Shift+Enter:** newline. **stop** or Escape while generating: cancel.
- **new** / **⌘N:** fresh conversation, retaining profile, memory and archive.
- **history:** revisit previous conversations. **Settings** / **⌘,**: open simple settings; expand **Personal context**, **Personality** or **Advanced** for more controls.
- Startup is silent when launched by the login agent; clicking the Dock brings it back. Normal launches show the window. After installing, the launch-at-login checkbox controls the login agent. There are no API calls while idle.

## Everything included

- Tauri 2 .app and .dmg build configuration, Dock presence, borderless pure-black draggable/resizable window.
- Streaming OpenRouter replies; stop/cancel; bounded output and recent history.
- Direct, positive, occasionally rude and genuinely kind mentor prompt, UK English, realistic money/career advice.
- Editable sliders for bluntness, positivity, swearing and challenge. Reply length is fixed. Temperature defaults to 0.7.
- An opt-in Personal context box, blank on a new install, with editable goals and system instructions.
- Persistent SQLite conversation archive and last-conversation restore after restarting.
- New conversation / clear visible conversation without deleting archive or memory; conversation history and Markdown export.
- Automatic durable memory updates after six successful replies; manual update button; editable memory. No agents or embeddings.
- macOS Keychain API key; key replacement/removal.
- Launch at login, hide on close, true quit, Dock activation and Option+Space shortcut.
- Window size/position persistence; one running instance.
- Current OpenRouter model catalogue and pricing; configurable model and explicit cheap fallback button. No silent expensive failover.
- Daily usage display and configurable local budget guard, default $0.30 including memory calls.

## Memory and privacy

Files live at `~/Library/Application Support/Mentor/`:

- `profile.md`: stable profile, manually editable.
- `priorities.md`: current priorities, manually editable.
- `system.md`: mentor instructions, manually editable.
- `memory.md`: bounded durable memory, periodically updated and manually editable.
- `conversations.db`: complete transcript archive, including stopped/failed partial replies.
- `settings.json`: preferences, never your API key.
- `export-*.md`: explicitly exported full histories.

Profile, priorities, memory, system prompt and up to six recent complete exchanges are sent to OpenRouter when you chat. Memory updates send a bounded batch of unsummarised transcript with the existing memory and profile to the same selected model. All archived conversations are available locally, but the AI does not automatically search the full archive: durable memory is a summary and can omit details. It is not unlimited perfect recall. New chats share durable memory. The app does not automatically add inferred facts to your manually curated profile.

The app only generates on a message or memory update. It cannot proactively monitor you, browse the web, send reminders, act on other apps or guarantee earnings. Model/provider restrictions still apply; tone instructions are not fine-tuning. Nothing runs a separate background AI agent.

To forget something, remove it from memory/profile/priorities in settings. Archived messages remain until you delete the archive yourself. Automatic summarisation can pick up an old fact from still-unsummarised history; disable auto-memory if necessary. To reset the archive, quit and move `conversations.db` and any `conversations.db-wal` / `conversations.db-shm` files out of the data folder. This removes all chat history; back up first. Exports are separate files. Keychain credentials are removed using **Remove key**.

## Cost handling

The default configured model is `openai/gpt-5.6-luna`. At authoring, OpenRouter lists $0.20/M input and $1.20/M output. The app loads available model IDs and rates from OpenRouter's live `/models` catalogue before sending; unavailable IDs produce a useful error. Pricing is refreshed each hour during use. You can choose another model, including `openai/gpt-oss-120b` if currently available.

A 50-message day with 6,000 input and 350 output tokens per reply would cost about **$0.081 for chat**, plus memory updates. Actual costs depend on context, output, reasoning, model and provider. No usage test with your account has been run.

Before each request, a conservative token estimate is reserved against your local daily budget. Reported `usage.cost` replaces that estimate. Interrupted or unreported calls retain the reservation rather than pretending to be free. Failed HTTP requests release their reservation. This guard is not an account-level billing guarantee, because provider tokenisation, pricing changes, or API reporting can differ. Check OpenRouter's account usage for authoritative billing and set an API-key spending limit there if desired. The app never automatically retries billable requests or switches to a pricier model. The day resets at your Mac's local midnight.

## Develop / rebuild

```bash
npm ci
npm run tauri dev
```

```bash
npm test
cargo test --manifest-path src-tauri/Cargo.toml --no-default-features
npm run tauri build
```

Development mode does not register a login agent. API key access is macOS-only. Core logic tests run without the desktop feature on Linux or macOS. `npm run build` checks the frontend bundle. `tests/ui-smoke.cjs` is a browser test with a mocked native bridge, intended for developer validation with Playwright installed; it makes no paid API calls.

Source is provided under the MIT licence. Build dependency versions are recorded in package-lock.json and Cargo.lock. The app uses Apple's WebKit rather than bundling Chromium.

## Add personal context

Open **Settings → Personal context**. Paste your own text in **About you**, optionally add **Current goals**, then click **Save**. These fields start empty. Your saved context is included in future AI requests and persists after restarting. **Clear context** empties the two fields; click **Save** to apply it.

On update from the old starter profile, only text that exactly matches the unchanged supplied starter is cleared. A backup is kept locally. Any edited profile or goals are retained. Existing chat and automatically accumulated memory are retained; edit Memory under Advanced if you want to remove anything there.

## Import Markdown context

Open **Settings → Personal context → Add .md files**. Select one or several `.md` or `.markdown` files. Their text is added after your existing context, with filename headings. Review or edit it, then click **Save**. Context can contain up to 32 KB of UTF-8 text. Oversized imports leave the existing text unchanged. The file contents are saved as context; the original files are not moved or modified. Saved context is included in subsequent AI requests, so more text can increase usage costs.

## One-command updates

Paste this into Terminal on your Mac to install or update Mentor:

```bash
curl -fsSL https://raw.githubusercontent.com/louisrid/mentor/main/scripts/update-mac.sh -o /tmp/mentor-update.sh && bash /tmp/mentor-update.sh
```

The command downloads the latest source, builds Mentor, replaces the installed app and opens it. Your chats, context and Keychain credentials stay in place. The first build can take a while. Later builds reuse downloaded dependencies and a shared Rust build cache. If Apple Command Line Tools need installing, finish the popup and run the same command again.

## Keychain prompts

Mentor reads the saved API key once per app session and holds it only in the native process memory. Opening settings/history, sending messages and refreshing the interface reuse that result. Saving or removing a key updates the session immediately. A denied or missing read is also remembered until you relaunch or save a key. The key remains stored in macOS Keychain and is never sent to the frontend. If macOS asks whether Mentor may access it, choose Always Allow to avoid permission prompts on later launches. Rebuilding an unsigned app can cause macOS to ask again.

## Fixed reply view

Mentor stays pinned in the top-left corner. Chat shows one message at a time with arrow buttons for earlier/later messages, rather than a scrolling transcript. New replies are limited in native code to 40 words, 240 Unicode characters and 160 output tokens. Smaller windows send a lower character limit based on the available text area. Replies use a single paragraph. The reply-length slider and token-limit field have been removed. Longer archived messages remain available in fitted pages using the arrows, and full transcripts remain exportable. Settings can still scroll.
