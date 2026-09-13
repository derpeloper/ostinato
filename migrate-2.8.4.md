# migrating from v2.5.6 to v2.8.4
> "the variables that breathe life into the machine, now with a brand new engine under the hood."

v2.8.4 introduces the biggest architectural overhaul in ostinato's history. we replaced the external Supertonic submodule clone with a natively bundled engine in `src/engine/helper.mjs`, consolidated all dependencies into root `package.json`, added hardware acceleration (CUDA and DirectML), revamped our worker scheduler, and replaced direct process execution with an interactive terminal supervisor (`bot.js`).

because the directory structure and runtime dependencies changed so drastically, **the cleanest and most reliable way to migrate is starting fresh with a new clone**, transferring over your database and config values.

---

## what changed?

- **native engine bundling**: no more cloning `supertone-inc/supertonic` into a subfolder. the inference runtime now lives in `src/engine/helper.mjs`, and models live in `src/assets/engine/`.
- **unified dependencies**: all engine and ONNX dependencies (`onnxruntime-node`, `fft.js`, `js-yaml`) are merged directly into the root `package.json`. you only run `npm install` once.
- **terminal supervisor (`bot.js`)**: the bot is now launched via `bot.js`, giving you an interactive dashboard with live message activity, worker pool telemetry, and direct process controls (`start`, `stop`, `restart`).
- **hardware acceleration**: native GPU inference support via CUDA (Linux/Windows) and DirectML (Windows) with automatic CPU fallback.
- **onboarding wizard**: `setup.sh` and `setup.ps1` now feature a reactive CLI wizard that provisions model assets directly from Hugging Face and tunes your hardware/workers interactively.
- **zero-retention logging**: message content and usernames are no longer logged to disk or stdout; speech synthesis operates in-memory and text is discarded immediately after generation.

---

## recommended path: the clean slate

save yourself the git conflict headaches and ghost files from the old `supertonic/` submodule. 

### 1. back up your persistent data
from your existing v2.5.6 installation, copy these files to a safe backup directory outside the repo:

```bash
# create a temporary backup location
mkdir -p ~/ostinato-backup

# copy your database (contains user voices, names, guild settings, and filters)
cp src/data/database.db* ~/ostinato-backup/

# copy your credentials and settings
cp src/env.json ~/ostinato-backup/
cp src/config.js ~/ostinato-backup/
```

> **important**: keep your old `src/config.js` as a **reference** rather than copying it over directly. v2.8.4 introduces new hardware acceleration flags (`useGpu`, `gpuProvider`) and tuned worker memory allocations that the onboarding wizard will configure for you.

### 2. delete the old directory & clone fresh

```bash
cd ..
rm -rf ostinato
git clone https://github.com/derpeloper/ostinato
cd ostinato
```

### 3. restore your database

bring your SQLite database into the new directory. the built-in database migration engine will detect older schemas and automatically upgrade columns and tables without touching your data:

```bash
mkdir -p src/data
cp ~/ostinato-backup/database.db* src/data/
```

### 4. run the onboarding wizard

run the interactive onboarding script. it will verify dependencies, automatically download the Supertonic 3 ONNX assets from Hugging Face if missing, prompt for your token (or read your restored `env.json`), configure your hardware acceleration backend (CPU / DirectML / CUDA), and configure your worker pool:

- **Linux / macOS**:
  ```bash
  chmod +x setup.sh
  ./setup.sh
  ```
- **Windows**:
  ```powershell
  .\setup.ps1
  ```

*(you can check your backed-up `config.js` if you had custom settings like `ttsVolume` or `ttsSpeed` and adjust them in `src/config.js` afterwards).*

---

## alternative path: in-place git upgrade

if you prefer upgrading inside your existing local repository without deleting it:

### 1. back up local edits & pull v2.8.4
```bash
git stash
git fetch origin
git checkout v2.8.4
```

### 2. clean up legacy submodules and directories
delete the old Supertonic external folder and old build artifacts:
```bash
rm -rf supertonic
rm -rf node_modules package-lock.json
```

### 3. relocate or download model weights
v2.8.4 expects ONNX weights in `src/assets/engine/onnx/`.
- if you let `setup.sh` or `setup.ps1` run, it will automatically fetch them for you.
- if migrating manually, copy your existing model files into `src/assets/engine/onnx/` (`duration_predictor.onnx`, `text_encoder.onnx`, `vector_estimator.onnx`, `vocoder.onnx`, `tts.json`, `unicode_indexer.json`).

### 4. update `src/config.js`
ensure your `src/config.js` includes the new hardware acceleration block and tuned worker settings:
```javascript
    // -- hardware acceleration ------------------------------------------------
    useGpu:      false,  // toggle GPU acceleration (true / false)
    gpuProvider: 'cuda', // 'cuda' for NVIDIA (Linux/Windows), 'dml' for DirectML (Windows)

    // worker recommendations:
    // CPU or 4GB VRAM: 2 workers
    // 8GB VRAM:        5 to 7 workers
    workerCount: 2,
```

### 5. install dependencies & run
```bash
npm install
node bot.js
```

---

## using the new terminal dashboard

when launching `bot.js` (or via `npm start`), you will be greeted by the new control dashboard:

```text
* ostinato / control [v2.8.4]    uptime: 0h 02m 14s  |  servers: 42  |  vram: 545 / 8192 MB
────────────────────────────────────────────────────────────────────────────────

WORKER POOL
  WORKER   STATUS        JOBS      VRAM        BACKEND
  #0       [ONLINE]      0 active  469 MB      GPU: cuda
  #1       [ONLINE]      0 active  472 MB      GPU: cuda

LIVE MESSAGE
Guild: 123456789012345678
-----------
someone said: hello world!

SYSTEM LOGS
12:30|08:09:26 [CLIENT] Ready!
```

you can type commands directly into the terminal prompt while the bot is running:
- `help`: view available dashboard commands.
- `stop <id>` / `stop worker <id>`: pause a specific worker thread.
- `start <id>` / `start worker <id>`: start an inactive worker thread.
- `restart <id>`: recycle a worker thread immediately.
- `restart all`: recycle every worker in the pool sequentially.
- `stop bot` / `exit`: shut down the bot and worker pool gracefully.

---

## checklist summary

- [ ] backed up `src/data/database.db` and preserved your bot token.
- [ ] cloned fresh or wiped the old `supertonic/` directory.
- [ ] ran `setup.sh` / `setup.ps1` (or verified ONNX weights in `src/assets/engine/onnx/`).
- [ ] restored `src/data/database.db`.
- [ ] verified hardware settings (`useGpu`, `gpuProvider`, `workerCount`) in `src/config.js`.
- [ ] launched via `node bot.js` or `npm start`.