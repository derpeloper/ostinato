# Changelog

## [2.4.1] - 2026-05-11

### Added

- **Supertonic 3 Language Expansion**: TTS now natively supports **31 languages** — Arabic, Bulgarian, Czech, Danish, German, Greek, English, Spanish, Estonian, Finnish, French, Hindi, Croatian, Hungarian, Indonesian, Italian, Japanese, Korean, Lithuanian, Latvian, Dutch, Polish, Portuguese, Romanian, Russian, Slovak, Slovenian, Swedish, Turkish, Ukrainian, and Vietnamese.
- **19 new Discord localizations**: Danish, German, Croatian, Italian, Lithuanian, Hungarian, Dutch, Polish, Romanian, Finnish, Swedish, Vietnamese, Czech, Greek, Bulgarian, Russian, Ukrainian, Japanese, and Hindi. Bot now supports **24 Discord locales**.
- **`autoIdleDuration` config setting**: Self-hosters can now customize how long the bot waits before going idle (default: 300 seconds).
- **Unicode emoji text descriptions**: Common emojis in messages (e.g., 😊) are now read as their names ("smiling face") instead of being silently dropped.
- **Channel mention resolution**: `<#channel_id>` mentions are now read as the channel name instead of raw IDs.
- **`/voice` command overhaul**: New interactive UI with a select menu, audio previews, and a confirm button — replacing the old autocomplete-based selection.

### Changed

- **Language detection migrated from `eld` to `franc`**: Improved multilingual detection with ISO 639-3 → 639-1 mapping layer for Supertonic compatibility.
- **`/lang` and `/guild lang set` autocomplete** now lists all 31 supported languages (previously 5).
- **Sticker and custom emoji names** now strip underscores (e.g., `cool_emoji` → `cool emoji`).
- **Bot replies migrated to Container components** for a cleaner, more modern look across all commands.
- **README** updated to reflect Supertonic 3 and 31-language support.

### Fixed

- Unicode emojis no longer cause silent gaps or engine instability during TTS playback.
- Channel mentions no longer appear as raw Discord formatting in speech output.

## [2.1.0] - 2026-05-07

### Added

- `/guild lang set` and `/guild lang reset` for per-guild default language management.
- `/message filter add|list|edit|remove` for admin-managed message content filters.
- `/name filter add|list|edit|remove` for admin-managed name filters.
- `/channel set` and `/channel remove` for alternative TTS chat channel designation.
- `/reset` command to wipe user data from the database (with optional granular resets).
- Dynamic idle status when the engine is inactive for 5+ minutes.
- Rotating custom status messages via config.
- Global concurrency limit (`maxConcurrency: 100`) alongside per-guild limits (`maxPerGuildConcurrency: 20`).
- Media-only message handling ("attached a file" instead of silence).
- Configurable presence status, activity type, and auto-idle toggle.
- Help entries for all new commands across all 6 supported locales.
- Reset data warning section in `/info`.

### Changed

- `/name` restructured from flat command to `/name set` subcommand + `/name filter` subcommand group.
- Ping mentions now resolve to server display names instead of raw user IDs.
- `maxConcurrency` split into global (`maxConcurrency`) and per-guild (`maxPerGuildConcurrency`).
- `/info` version updated to 2.1 with `/reset` database wipe warning.
- `/help` updated with all new command entries and autocomplete.

### Fixed

- Media-only messages (attachments without text) no longer produce empty TTS output.
- Emoji parsing confirmed working — custom emojis correctly resolve to their names.

## [1.6.7]

### Added

- **Configurable Worker Pool**: Added `workerCount` setting to launch multiple parallel ONNX inference threads, dramatically reducing processing latency when the bot is under heavy load.
- **Aggregated Memory Logging**: The main process now regularly polls all active workers and outputs a unified cleanly-formatted memory usage summary.

### Changed

- **Per-Guild Semaphores**: Modifed `maxConcurrency` so that it applies on a per-server (guild) basis rather than globally. This prevents high-activity servers from stalling TTS generation in other servers.
- **Crash Resilience Improvements**: Worker crash recovery now gracefully re-queues isolated requests to surviving workers, ensuring partial failures don't drop unrelated messages.
