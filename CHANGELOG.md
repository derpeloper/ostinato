# Changelog

## [2.8.4] - 2026-06-30

### Added

* **Interactive Terminal Management Dashboard**: Introduced `bot.js` as the primary launcher and management console, featuring dynamic terminal window resizing, real-time worker pool metrics, system log stream isolation, and interactive worker lifecycle commands (`start`, `stop`, `restart`).
* **Live Message Activity Panel**: Added an ephemeral, in-place replacing live message display on the host terminal that surfaces active guild ID and message text within a strict 3-line boundary without user attribution.
* **Interactive Onboarding Wizard**: Overhauled `setup.sh` and `setup.ps1` into a terminal CLI onboarding wizard. Automates Discord bot token configuration directly into `src/env.json`, guild scope targeting (`guildId`), GPU acceleration backend selection, and resource concurrency tuning with zero manual file editing required.
* **Automatic Voice Model Provisioning**: Setup scripts now detect whether voice assets (`src/assets/engine/onnx`) are present. If missing, they automatically clone the Supertonic 3 model weights and voice styles from Hugging Face into `src/assets/engine` on first run.
* **Hardware Acceleration Support**: Added native GPU execution provider support (`CUDA` and `DirectML`) via `onnxruntime-node@1.19.2` with automatic graceful CPU fallback if hardware acceleration libraries or drivers are missing or fail to initialize.
* **Live VRAM Telemetry & Supervisor Header Metrics**: Integrated real-time GPU VRAM tracking via `nvidia-smi` into `OstinatoTTS.js` and surfaced live memory telemetry (`vram: <used> / <total> MB`) directly in the `bot.js` supervisor console header with automatic silent fallback for non-NVIDIA or absent environments.
* **Per-Worker Live VRAM TUI Column**: Added a dedicated `VRAM` column to the `WORKER POOL` dashboard in `bot.js`. Displays baseline static allocations (~468–474 MB in green) and dynamically surges to transient inference scratchpads (~510–525 MB in bold yellow, scaled to message length) the instant a worker takes a job, snapping back on completion.
* **Central Task Queue**: Added a central FIFO task queue in `OstinatoTTS.js` to buffer audio generation requests during traffic spikes across multiple servers, eliminating dropped requests and maintaining strict processing order.
* **Empirical GPU Benchmark Suite & Architecture Deep Dive**: Added comprehensive sizing guidelines and benchmarks based on empirical RTX 5060 8GB stress testing. Relocated and expanded the technical deep dive in `README.md` with in-depth breakdowns of the DirectML dual-memory model, the PCIe memory paging cliff under VRAM over-allocation, and GPU time-slice duty cycle vs. compute saturation.
* **Dynamic Voice Style Loader**: Automatically scans and registers any voice styles located in `src/assets/engine/voice_styles/`.
* **Modernized `/voice` Command**: Replaced select menus with dynamic slash-command autocomplete, featuring inline audio file previews and a secondary confirmation button.
* **Custom Trained Voice Models**: Added 4 new custom-trained voice models: **Doris**, **Elliott**, **Lexie**, and **Palmer**. *(Note: The voice quality might be a bit rough as this is my first time training a voice model, so please bear with me.)*

### Changed

* **Privacy & Zero-Retention Policy Enforcement**: Fully removed disk and stdout logging of user message content, author usernames, discriminators, and user IDs (`src/events/tts.js`). Speech synthesis operates strictly in-memory with zero retention: message payloads are discarded immediately after audio generation, and the host dashboard renders only ephemeral, un-attributed text replacing in-place.
* **Startup Script & Package Entry Point Modernization**: Updated `setup.sh`, `setup.ps1`, and `package.json` (`main` and `scripts.start`) to target `bot.js` as the default execution entry point.
* **Native Supertonic Engine Bundling**: Fully bundled the Supertonic inference engine directly into `src/engine/helper.mjs` and relocated model/voice assets to `src/assets/engine/`. This completely removes the external git clone requirement on `supertone-inc/supertonic` and ensures local engine/GPU patches are never overwritten.
* **Unified Package Dependencies**: Merged Supertonic's runtime dependencies (`onnxruntime-node`, `fft.js`, `js-yaml`) directly into Ostinato's root `package.json`, dropping setup from a clunky two-stage installation down to a single clean `npm install`.
* **Cascading Worker Load Balancer**: Replaced blind round-robin dispatcher in `OstinatoTTS.js` with an active-job cascading load balancer ("Worker 2 only activates when Worker 1 is full"). Requests are routed strictly by worker index priority with real-time active load tracking, eliminating head-of-line blocking across workers.
* **Interactive Resource Allocation TUI**: Replaced sequential terminal prompts in setup with a reactive, in-place settings list. Values are kept hidden until highlighted, descriptions display inline side-by-side, and values edit in-place without newline buffer scrolling or cursor artifacts.
* **GPU Configuration & Empirical Sizing Tiers**: Updated `src/config.js` with documented dual-memory footprint metrics (~470 MB Dedicated VRAM + ~270 MB System RAM per worker) and tuned worker pool tiers: 2 workers for CPU or 4 GB GPUs, 5–7 workers for 8 GB GPUs (~96% capacity), and 10–14 workers for 16 GB+ cards.
* **Responsive Memory Polling**: Reduced periodic memory polling intervals from 5 minutes to 30 seconds and added debounced memory checks upon audio generation completion, keeping supervisor header metrics live without impacting inference latency.
* **Documentation Overhaul**: Restructured `README.md` to move "for the geeks" to the bottom as an exhaustive technical deep dive, complete with empirical benchmark summary tables, hardware disclosure notices, and dual-memory architecture breakdowns.
* **Supertonic 3 Character Speaker Naming**: Renamed voice styles and IDs from legacy `F1-F5` / `M1-M5` to official Supertonic names (`alex`, `james`, `robert`, `sam`, `daniel`, `sarah`, `lily`, `jessica`, `olivia`, `emily`).
* **Deterministic Default Voice Hashing**: Locked user default voices to the 10 core Supertonic speakers to ensure user defaults never shift when third-party or custom styles are added.
* **Streamlined Onboarding Scripts**: Updated `setup.sh` and `setup.ps1` to only download the `onnx` model weights, keeping voice style assets prebundled.

### Fixed

* **Name Validation**: Fixed an issue where users could bypass name filters:
  * **Command Validation**: The `/name set` command now correctly validates names against the active name filters (including regex support), preventing users from setting filtered names.
  * **TTS Fallback Filtering**: Fixed a loophole where the TTS engine's fallback to a user's Discord username could bypass name filters; it now correctly falls back to "someone" if their username is also filtered.
* **Client Ready Event**: Replaced the deprecated `ready` event listener with `clientReady` to prevent deprecation warnings. Somehow this managed to slip past my 50 code reviews, but who's counting?

## \[2.5.6] - 2026-06-02

### Added

* **`/inject` Command**: Send messages directly to a voice channel without being connected (rate-limited to 5 per hour, bypassable by mods).
* **`/autojoin` Command**: Administrator toggle to make the bot automatically join a voice channel when the first user enters.
* **Setup Scripts**: Added `setup.sh` and `setup.ps1` for automated dependency installation and bot launch.
* **Watchdog Mechanism**: The bot will now automatically restart its Discord client connection upon receiving 5 consecutive network errors.
* **Automatic Schema Migration**: Replaced hardcoded initialization with a dynamic migration engine. The database will now automatically apply updates, creating new tables and appending columns on startup as needed. Fingers crossed it works on the first try and doesn't just `DROP` our data into the void.
* **Database Corruption Recovery**: The bot now actively detects `SQLITE\_CORRUPT` errors on startup. If a corrupted database is found, it automatically backs up the damaged files and attempts to salvage and restore the data row-by-row into a fresh database.
* **Turkish Localisation**: Added the Turkish (`tr`) locale files. Yes, I totally didn't forget about this locale support in v2.4.1. We blame it on a temporary memory lapse. Details, details.

### Changed

* **Log Redaction**: "Processing message" logs now redact usernames and message content (showing only the first 4 characters followed by `\*\*\*`) for enhanced privacy.
* **Performance - DB Query Consolidation**: Consolidated 4 separate database queries (name, voice, speed, lang) into a single optimized query during message processing.
* **Performance - Regex Hoisting**: Moved regex filter compilation out of loops, significantly reducing overhead during high-volume message processing.
* **Member Resolution**: Replaced synchronous cache lookups with async API fetches for member display names, resolving the "someone" issue for uncached users.
* **Expanded Voice Error Handling**: Added specific, descriptive error logging for voice connection timeouts, permission issues, and sudden disconnections.

### Fixed

* **FFmpeg Memory Leak**: Fixed an issue where `ffmpeg` zombie processes caused RAM exhaustion on Linux and Windows:

  * **Deferred Stream Instantiation**: Deferred `AudioResource` (and `ffmpeg`) instantiation until exact playback time, preventing unplayed skipped/cleared messages from hoarding system resources.
  * **Explicit Stream Destruction**: Explicitly destroyed audio stream pipelines upon player idle or error to ensure complete clean up.
* **Permission Filtering**: The bot will now correctly ignore messages from users who are server-muted or server-deafened.
* **Custom Emoji Processing**: Expanded regex matching for custom and animated emojis (`cleanText.js`) to strip out numerical IDs, ensuring TTS only reads the friendly name.
* **Voice Connection Timeouts**: Increased connection timeout from 5 to 20 seconds and improved error handling to gracefully catch and log Node's `AbortError` timeouts rather than dumping stack traces.
* **Concurrency Deadlock**: Fixed head-of-line blocking by swapping the global and per-guild semaphore acquisition order, preventing a single active guild from starving others.
* **Pending Requests Leak**: Fixed memory leak where rejected generation requests weren't removed from the pending map when no workers were available.
* **Worker Retry Bottleneck**: Made worker crash retries process concurrently instead of sequentially, drastically reducing latency spikes during recovery.
* **Double Playback Skipping**: Removed redundant `playNext` call on audio stream errors that caused race conditions with the audio player's idle state handler.
* **Audio Stream Range Error**: Fixed Opus encoding crashes (`RangeError: offset is out of bounds`) by padding generated WAV buffers to exact 20ms boundaries and installing native `@discordjs/opus` for more stable voice transmission.



## \[2.4.1] - 2026-05-11

### Added

* **Supertonic 3 Language Expansion**: TTS now natively supports **31 languages** — Arabic, Bulgarian, Czech, Danish, German, Greek, English, Spanish, Estonian, Finnish, French, Hindi, Croatian, Hungarian, Indonesian, Italian, Japanese, Korean, Lithuanian, Latvian, Dutch, Polish, Portuguese, Romanian, Russian, Slovak, Slovenian, Swedish, Turkish, Ukrainian, and Vietnamese.
* **19 new Discord localizations**: Danish, German, Croatian, Italian, Lithuanian, Hungarian, Dutch, Polish, Romanian, Finnish, Swedish, Vietnamese, Czech, Greek, Bulgarian, Russian, Ukrainian, Japanese, and Hindi. Bot now supports **24 Discord locales**.
* **`autoIdleDuration` config setting**: Self-hosters can now customize how long the bot waits before going idle (default: 300 seconds).
* **Unicode emoji text descriptions**: Common emojis in messages (e.g., 😊) are now read as their names ("smiling face") instead of being silently dropped.
* **Channel mention resolution**: `<#channel\_id>` mentions are now read as the channel name instead of raw IDs.
* **`/voice` command overhaul**: New interactive UI with a select menu, audio previews, and a confirm button — replacing the old autocomplete-based selection.

### Changed

* **Language detection migrated from `eld` to `franc`**: Improved multilingual detection with ISO 639-3 → 639-1 mapping layer for Supertonic compatibility.
* **`/lang` and `/guild lang set` autocomplete** now lists all 31 supported languages (previously 5).
* **Sticker and custom emoji names** now strip underscores (e.g., `cool\_emoji` → `cool emoji`).
* **Bot replies migrated to Container components** for a cleaner, more modern look across all commands.
* **README** updated to reflect Supertonic 3 and 31-language support.

### Fixed

* Unicode emojis no longer cause silent gaps or engine instability during TTS playback.
* Channel mentions no longer appear as raw Discord formatting in speech output.

## \[2.1.0] - 2026-05-07

### Added

* `/guild lang set` and `/guild lang reset` for per-guild default language management.
* `/message filter add|list|edit|remove` for admin-managed message content filters.
* `/name filter add|list|edit|remove` for admin-managed name filters.
* `/channel set` and `/channel remove` for alternative TTS chat channel designation.
* `/reset` command to wipe user data from the database (with optional granular resets).
* Dynamic idle status when the engine is inactive for 5+ minutes.
* Rotating custom status messages via config.
* Global concurrency limit (`maxConcurrency: 100`) alongside per-guild limits (`maxPerGuildConcurrency: 20`).
* Media-only message handling ("attached a file" instead of silence).
* Configurable presence status, activity type, and auto-idle toggle.
* Help entries for all new commands across all 6 supported locales.
* Reset data warning section in `/info`.

### Changed

* `/name` restructured from flat command to `/name set` subcommand + `/name filter` subcommand group.
* Ping mentions now resolve to server display names instead of raw user IDs.
* `maxConcurrency` split into global (`maxConcurrency`) and per-guild (`maxPerGuildConcurrency`).
* `/info` version updated to 2.1 with `/reset` database wipe warning.
* `/help` updated with all new command entries and autocomplete.

### Fixed

* Media-only messages (attachments without text) no longer produce empty TTS output.
* Emoji parsing confirmed working — custom emojis correctly resolve to their names.

## \[1.6.7]

### Added

* **Configurable Worker Pool**: Added `workerCount` setting to launch multiple parallel ONNX inference threads, dramatically reducing processing latency when the bot is under heavy load.
* **Aggregated Memory Logging**: The main process now regularly polls all active workers and outputs a unified cleanly-formatted memory usage summary.

### Changed

* **Per-Guild Semaphores**: Modifed `maxConcurrency` so that it applies on a per-server (guild) basis rather than globally. This prevents high-activity servers from stalling TTS generation in other servers.
* **Crash Resilience Improvements**: Worker crash recovery now gracefully re-queues isolated requests to surviving workers, ensuring partial failures don't drop unrelated messages.

