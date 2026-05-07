# Changelog

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
