<p align="center">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/derpeloper/ostinato/refs/heads/main/assets/logo_dark.png">
<source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/derpeloper/ostinato/refs/heads/main/assets/logo_light.png">
<img alt="ostinato logo" src="https://github.com/user-attachments/assets/ad085efe-2380-4b85-b0a4-84164faa4c55" width="600">
</picture>
</p>

a discord bot that gives a voice to the voiceless. because listening is better than reading, and sounding human is better than sounding like a microwave.

> **current version**: v2.1.0 (official release)

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

[add the bot to your server](https://discord.com/oauth2/authorize?client_id=1459993892484288512)

_note: expect outages for maintenance, bug fixes, or unexpected hiccups. you have been warned._

## features

- **supertonic tts**: powered by the supertonic engine to provide high-quality, human-sounding voices. it's like magic, but with actual code.
- **localization**: fully translated across 5 languages (english, spanish, french, portuguese, korean).
- **voice customization**: change the voice model, speed, and language to fit your vibe.
- **persistent settings**: remembers your preferences per server via sqlite, because nobody likes repeating themselves.
- **worker pool & concurrency**: scales with your needs! supports spawning multiple workers for parallel processing, and queues are properly isolated per-server.
- **crash resilience**: it tries heavily not to crash. emphasize on "tries". auto-restarts individual workers if they trip over their own shoelaces.
- **memory management**: watches memory usage like a hawk. a hawk that occasionally panics and restarts things to stay fresh.

## 🤓 for the geeks (technicalities)

if you're wondering why this isn't just another `google-tts` wrapper, here is the breakdown:

### the audio pipeline
ostinato doesn't just play a file; it manages a stream. the flow looks like this:
`user input` $\rightarrow$ `discord.js event` $\rightarrow$ `worker pool` $\rightarrow$ `supertonic engine` $\rightarrow$ `ffmpeg` $\rightarrow$ `discord voice channel`.

to ensure low latency, the bot pipes raw audio data directly through ffmpeg, transcoding it into the Opus format required by discord's voice servers in real-time.

### the worker pool architecture
the supertonic engine is heavy and can be blocking. to prevent the entire bot from freezing while one person is reading a novel, the bot implements a **worker pool**. 
- the main process handles the discord api and event routing.
- tasks are dispatched to a pool of child processes (workers).
- each worker handles its own instance of the engine, allowing for true parallel processing across different servers.
- this architecture prevents "head-of-line blocking," meaning a long request in one server won't stall the queue for others.

### memory leak mitigation (the hawk)
because the engine can be resource-intensive, the bot monitors the RSS (resident set size) of each child process. if a worker exceeds its memory limit or becomes unstable, the manager automatically kills it and spawns a fresh one without dropping the main bot connection.

### persistence layer
instead of a bloated database, the bot uses **better-sqlite3**. it's fast, file-based, and perfect for storing per-guild configuration (voice, speed, language) without adding unnecessary network latency.

### localization engine
the bot manages a localization layer that maps inputs across 5 languages. it ensures that the correct voice models and linguistic parameters are passed to the engine based on the server's current settings.

## self-hosting

if you want 100% uptime and total control, host it yourself. you'll get access to customizable settings like speed (zoom zoom), volume, and performance tweaks.

### prerequisites
- **node.js**: v22.12.0 or higher (required by discord.js v14).
- **git**: for cloning the repos.
- **ram & cpu**: the engine is hungry. expect **~300mb to ~600mb of ram** per worker. be warned: it can get really heavy on the cpu as that is how the audio is generated, and overall resource usage scales directly with the number of workers set in your config. don't try running this on a toaster.

### setup guide

#### phase 1: the bot
1. clone the repo and install dependencies:
   ```bash
   git clone https://github.com/derpeloper/ostinato
   cd ostinato
   npm install
   ```

#### phase 2: the engine
the bot is just the brain; it needs the engine to speak.
1. download the supertonic engine:
   ```bash
   git clone https://github.com/supertone-inc/supertonic.git
   cd supertonic
   git clone https://huggingface.co/Supertone/supertonic-2 assets
   cd nodejs
   npm install
   ```

#### phase 3: configuration & launch
1. go back to the ostinato root folder:
   ```bash
   cd ../../
   ```
2. configure your bot:
   - in `src/env.json`, replace `token` with your actual discord bot token.
   - in `src/config.js`, replace `clientId` with your bot's client id.
   - **optional**: set `guildId` in `src/config.js` if you only want the bot in one server.
3. bring it to life:
   ```bash
   node src/index.js
   ```
4. **permissions**: ensure your bot has **priority speaker**, **connect**, **read message history**, and **speak**. otherwise, it'll just be a silent observer.

## configuration (self-host only)

edit `src/config.js` to tweak the engine:

- `ttsSpeed`: base speed of the speech. zoom zoom.
- `ttsVolume`: volume of the speech. can you hear me now?
- `ttsQuality`: 1 to 50. the trade-off between audio fidelity and processing speed.
- `defaultLang`: fallback language if detection fails.
- `maxConcurrency`: how many messages can process at once per server. prevents one active server from lagging others.
- `workerMemoryLimit`: memory cap for a worker before it restarts. keeps the ram gremlins at bay.
- `workerCount`: how many parallel workers to spin up. use with caution—each worker takes ~300mb-400mb ram!

## issues & contributions

found a bug? have a suggestion? bot exploded? feel free to [open an issue](https://github.com/derpeloper/ostinato/issues) and let me know.

you are also welcome to fork this repository for your own use. explore, experiment, break things. it's open source for a reason.

## disclaimer

may contain traces of nuts and bolts. the hosted version will not have 24/7 uptime due to maintenance and bug fixes. use at your own risk. if it breaks, you get to keep the pieces.

## credits

- **Supertonic 2** by **Supertone** — the high-quality tts engine doing the heavy lifting.
