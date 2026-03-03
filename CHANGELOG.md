# Changelog

## v1.6.7

### Added

- **Configurable Worker Pool**: Added `workerCount` setting to launch multiple parallel ONNX inference threads, dramatically reducing processing latency when the bot is under heavy load.
- **Aggregated Memory Logging**: The main process now regularly polls all active workers and outputs a unified cleanly-formatted memory usage summary.

### Changed

- **Per-Guild Semaphores**: Modifed `maxConcurrency` so that it applies on a per-server (guild) basis rather than globally. This prevents high-activity servers from stalling TTS generation in other servers.
- **Crash Resilience Improvements**: Worker crash recovery now gracefully re-queues isolated requests to surviving workers, ensuring partial failures don't drop unrelated messages.
