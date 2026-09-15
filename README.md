<p align="center">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/derpeloper/ostinato/refs/heads/main/assets/logo_dark.png">
<source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/derpeloper/ostinato/refs/heads/main/assets/logo_light.png">
<img alt="ostinato logo" src="https://github.com/user-attachments/assets/ad085efe-2380-4b85-b0a4-84164faa4c55" width="600">
</picture>
</p>

a discord bot that gives a voice to the voiceless. because listening is better than reading, and sounding human is better than sounding like a microwave.

> **current version**: v2.8.4 (official release)

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

[add the bot to your server](https://discord.com/oauth2/authorize?client_id=1459993892484288512)

_note: expect outages for maintenance, bug fixes, or unexpected hiccups. you have been warned._

## features

- **supertonic tts**: powered by the supertonic engine to provide high-quality, human-sounding voices. it's like magic, but with actual code.
- **localization**: fully translated across **25 languages** (excluding English GB and US).
- **multilingual tts**: natively supports **31 languages** via the supertonic 3 engine.
- **voice customization**: change the voice model, speed, and language to fit your vibe.
- **persistent settings**: remembers your preferences per server via sqlite, because nobody likes repeating themselves.
- **worker pool & concurrency**: scales with your needs! supports spawning multiple workers for parallel processing, and queues are properly isolated per-server.
- **crash resilience**: it tries heavily not to crash. emphasize on "tries". auto-restarts individual workers if they trip over their own shoelaces.
- **memory management**: watches memory usage like a hawk. a hawk that occasionally panics and restarts things to stay fresh.

## self-hosting

if you want 100% uptime and total control, host it yourself. you'll get access to customizable settings like speed (zoom zoom), volume, and performance tweaks.

### prerequisites

- **node.js**: v22.12.0 or higher (required by discord.js v14).
- **git**: for cloning the repo and pulling model assets.
- **ram, vram & compute**: the engine is hungry.
  - **cpu inference**: expect **~300mb to ~500mb of system ram** per worker. it is cpu-intensive and resource usage scales directly with worker count.
  - **gpu inference**: uses a **dual-memory setup** that splits between your graphics card (VRAM) and normal computer memory (RAM):
    - **~470 MB dedicated VRAM** per worker (~429 MB to load the model into your GPU, plus ~42 MB of extra breathing room when it's actively speaking).
    - **~270 MB system RAM** per worker (for Node.js to keep track of words, text, and bot logic).
    - plus a one-time startup cost of **~70–120 MB** when the GPU engine boots up.

#### recommended worker sizing

- **cpu mode**: 2 workers (keeps things light, ~300–400 MB RAM each).
- **4 gb vram gpus**: 2 workers (comfortably fits the models and leaves room for your desktop).
- **8 gb vram gpus**: 5 to 7 workers (the sweet spot; 7 workers is the max on an 8 GB card and uses ~96% of its memory under heavy spam).
- **16 gb+ vram gpus**: 10 to 14 workers (complete overkill unless you're trying to run a small call center).

> *note: these benchmarks were measured on an RTX 5060 8GB. the officially hosted instance of ostinato runs on significantly more powerful hardware to ensure minimum latency.*

#### rtx 5060 8gb benchmark results

| setup | process VRAM | system RAM (RSS) | latency (avg) | RTF | status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1 worker** | ~545 MB | ~680 MB | ~0.68s | ~0.15 | instant speech |
| **7 workers** | ~3,300 MB | ~2,150 MB | ~1.35s | ~0.35 | smooth high traffic (~96% VRAM used) |
| **16 workers** | ~3,409 MB (capped) | ~7,160 MB | ~10s–18s | ~3.0+ | memory collapse (spilled into normal RAM) |

### setup guide

we have interactive setup wizards now (`setup.sh` and `setup.ps1`). you don't need to manually clone external engine folders, download models by hand, or edit config files unless you really want to.

#### step 1: clone the repo

```bash
git clone https://github.com/derpeloper/ostinato
cd ostinato
```

#### step 2: run the onboarding wizard

run the script for your operating system. it will check your dependencies, download the voice model assets from Hugging Face automatically if you don't have them, ask for your bot token, let you choose your GPU acceleration (CPU, DirectML, or CUDA), and launch the bot:

- **linux / macos**:
  ```bash
  chmod +x setup.sh
  ./setup.sh
  ```
- **windows**:
  ```powershell
  .\setup.ps1
  ```

#### step 3: discord permissions

ensure your bot has **priority speaker**, **connect**, **read message history**, and **speak** in your discord server. otherwise, it'll just be a silent observer.

## configuration (optional tweaks)

the onboarding wizard configures this for you on first boot, but you can always open `src/config.js` manually to fine-tune settings:

- `ttsSpeed`: base speed of the speech. zoom zoom.
- `ttsVolume`: volume of the speech. can you hear me now?
- `ttsQuality`: 1 to 50. the trade-off between audio fidelity and processing speed.
- `defaultLang`: fallback language if detection fails (supports all 31 languages — see `config.js` for full list).
- `useGpu`: toggle GPU acceleration (`true`/`false`).
- `gpuProvider`: `'dml'` for DirectML (Windows) or `'cuda'` for NVIDIA (Linux/Windows).
- `maxConcurrency`: how many messages can process at once per server. prevents one active server from lagging others.
- `workerMemoryLimit`: memory cap for a worker before it restarts. keeps the ram gremlins at bay.
- `workerCount`: how many parallel workers to spin up. each GPU worker takes ~470 MB VRAM + ~270 MB system RAM (check the sizing table above so you don't melt your card).

## issues & contributions

found a bug? have a suggestion? bot exploded? feel free to [open an issue](https://github.com/derpeloper/ostinato/issues) and let me know.

you are also welcome to fork this repository for your own use. explore, experiment, break things. it's open source for a reason.

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

### the dual-memory architecture

when running on your graphics card (DirectML / D3D12), each worker splits its memory between your GPU and regular computer RAM:
- **dedicated VRAM (~470 MB):** DirectML loads ~429 MB of static model weights directly into your graphics card so it can generate audio fast. while actively speaking, it needs about ~42 MB of extra temporary breathing room for processing audio buffers.
- **host system RAM (~270 MB):** Node.js keeps its own engine state, text tokenizer tables, and bot code in regular computer memory.
- **startup overhead:** there is also a one-time startup cost of ~70–120 MB when initializing the graphics device and shader pipelines.

because each worker thread gets its own independent model instance, memory scales up with every worker you add until your card runs out of space.

### the memory cliff (what happened with 16 workers)

what happens if you add way too many workers and exceed your card's VRAM? we tested 16 workers on an 8 GB card to see:
- the graphics card completely filled up its dedicated video memory at ~3,409 MB (with Windows and background apps using the rest).
- once physical VRAM was completely tapped out, Windows had no choice but to shove the extra data into **shared system memory (regular computer RAM)**.
- the bot's system RAM usage exploded to 7.16 GB because it had to haul heavy voice model data back and forth across the motherboard bus (PCIe) on every single sentence.
- moving data across that bus created massive traffic jams: generation times collapsed from ~680ms up to **18 seconds**, audio lagged by up to 5× slower than real-time, and the GPU sat pinned at 100% just waiting for memory to transfer.

this is why worker count must strictly fit inside your card's physical VRAM instead of letting Windows swap things into system memory.

### duty cycle vs. compute saturation

during speech with 1 worker, Windows Task Manager often shows only 10–18% GPU usage. this doesn't mean your graphics card is slacking off:
- Task Manager measures **time active over 1 second**, not how hard the card is working during that instant.
- Supertonic's neural kernels are fast on modern GPUs, finishing their calculations in tiny bursts of 1–3ms per step.
- between those lightning-fast bursts, the GPU pauses for a split second while Node.js and JavaScript coordinate the next chunk of words.
- the GPU is working at full power during those tiny milliseconds, but because it finishes so fast, Task Manager averages it out to a low 10–18% number.

### memory leak mitigation (the hawk)

because the engine can be resource-intensive, the bot monitors the RSS (resident set size) of each child process and checks dedicated VRAM via `nvidia-smi`. if a worker exceeds its memory limit or becomes unstable, the manager automatically kills it and spawns a fresh one without dropping the main bot connection.

### persistence layer

instead of a bloated database, the bot uses **better-sqlite3**. it's fast, file-based, and perfect for storing per-guild configuration (voice, speed, language) without adding unnecessary network latency.

### localization engine

the bot manages a localization layer that maps inputs across 25 discord locales. it ensures that the correct voice models and linguistic parameters are passed to the engine based on the server's current settings.

## disclaimer

may contain traces of nuts and bolts. the hosted version will not have 24/7 uptime due to maintenance and bug fixes. use at your own risk. if it breaks, you get to keep the pieces.

## credits

- **Supertonic 3** by **Supertone** ([Archived upstream repository](https://github.com/supertone-oss-archive/supertonic)) — the high-quality, lightweight on-device TTS engine doing the heavy lifting.
  > _note: Supertone has dissolved and the upstream Supertonic repository is officially archived. The code and model weights remain available under their original open licenses, and ostinato runs the engine fully locally via ONNX without relying on external upstream services._
- **LibriTTS & LibriVox** — the public-domain audiobook recordings and speech corpus that made training custom voice models possible.

### custom voice models

our custom-trained models were built using speech audio from the **LibriTTS** dataset, sourced from **LibriVox** public domain recordings. massive thanks to the volunteer readers who gave them their voices:

- **Doris** — voiced by **Betsie Bush** (LibriVox reader `#32`)
- **Elliott** — voiced by **Simon (|CBW|Simon)** (LibriVox reader `#60`)
- **Lexie** — voiced by **Catharine Eastman** (LibriVox reader `#83`)
- **Palmer** — voiced by **Stewart Wills** (LibriVox reader `#196`)

### localization

all base translations are officially generated via [**Gemini 3.8 Flash (high)**](https://deepmind.google/models/model-cards/gemini-3-8-flash/) and may not be fully accurate.

_note: contributors who helped verify locales may be listed by their alias rather than their Discord username._

#### current version (v2.8.4)

| contributor | language locale
| :--- | :--- 
| **9am1n_** | Hindi
| **salty** | Croatian

#### awaiting human verification (AI cross-checked)

the following languages have been cross-checked for consistency using independent, isolated Gemini 3.8 Flash (high) sessions (one dedicated session per language). however, they have not yet been reviewed by a human:

Bulgarian, Chinese (China), Chinese (Taiwan), Czech, Danish, Dutch, Finnish, French, German, Greek, Hungarian, Italian, Japanese, Korean, Lithuanian, Norwegian, Polish, Portuguese, Romanian, Russian, Spanish, Swedish, Thai, Turkish, Ukrainian, Vietnamese.

> **want to help?** if you speak any of these languages and notice something off, please [open an issue](https://github.com/derpeloper/ostinato/issues) with the label **`locale feedback`** so we can move it up to the verified list.

#### legacy 

> **disclaimer:** these locales were verified for previous versions of the bot. translations for newer features or modified strings may not be fully accurate.

| Contributor | Language Locale | Last Verified |
| :--- | :--- | :--- |
| **croi** | Lithuanian | v2.5.6 |
| **Daniel** | Korean | v2.5.6 |
| **dash** | Ukrainian | v2.5.6 |
| **dash**<br>**exskrime** | Russian | v2.5.6 |
| **malios71** | French | v2.5.6 |
| **marac** | Dutch | v2.5.6 |
| **michael** | Spanish | v2.5.6 |
| **orbital** | Turkish | v2.5.6 |
| **p** | Vietnamese | v2.5.6 |
| **rascage** | Portuguese | v2.5.6 |
| **sentry** | Polish | v2.5.6 |
| **cat lover**<br>**steff** | Romanian | v2.5.6 |