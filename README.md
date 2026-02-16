<p align="center">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/derpeloper/ostinato/refs/heads/main/assets/logo_dark.png">
<source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/derpeloper/ostinato/refs/heads/main/assets/logo_light.png">
<img alt="ostinato logo" src="https://github.com/user-attachments/assets/ad085efe-2380-4b85-b0a4-84164faa4c55" width="600">
</picture>
</p>

a discord bot that gives a voice to the voiceless. because listening is better than reading, and sounding human is better than sounding like a microwave.

> **current version**: v1.0.0 (official release)

[add the bot to your server](https://discord.com/oauth2/authorize?client_id=1459993892484288512)
_note: this is hosted on my personal machine. expect outages for maintenance, bug fixes, or if my power goes out. you have been warned._

## features

- **supertonic tts**: powered by the supertonic engine to provide high-quality, human-sounding voices. it's like magic, but with actual code.
- **voice customization**: change the voice model, speed, and language to fit your vibe.
- **persistent settings**: remembers your preferences per server, because nobody likes repeating themselves.
- **crash resilience**: it tries heavily not to crash. emphasize on "tries". auto-restarts the worker if it trips over its own shoelaces.
- **memory management**: watches memory usage like a hawk. a hawk that occasionally panics and restarts things to stay fresh.

## commands

- run `/help` in a server where the bot is present to see a full list of commands.
- for a detailed breakdown of commands for both moderators/admins and the general public, refer to the `src/commands` folder in this repository.

## self-hosting

if you want 100% uptime and total control, host it yourself. you'll get access to customizable settings like speed (zoom zoom), volume, and performance tweaks.

### heads up on hardware

the engine is a bit hungry. on my machine, it sits between **~300mb and ~600mb of ram**. your mileage may vary depending on your system, but don't try running this on a toaster.

### setup

1. clone the repo: `git clone https://github.com/derpeloper/ostinato`. if you don't know how to do that, google is your best friend.
2. run `cd ostinato` then run `npm install`. this might take a while, go grab a coffee.
3. edit your config files:
   - in `src/env.json`, replace `token` with your actual discord bot token.
   - in `src/config.js`, replace `clientId` with your bot's client id.
   - **optional**: in `src/config.js`, you can also set `guildId` to your server's id if you only want the bot in one server (and want the commands to show up instantly). otherwise, leave it as `null`.
   - make sure you give the bot the right permissions: priority speaker, connect, read message history, and speak. otherwise, it'll just be a silent observer.
4. run this command to download the engine (and maybe go get that donut now): `git clone https://github.com/supertone-inc/supertonic.git && cd supertonic && git clone https://huggingface.co/Supertone/supertonic-2 assets && cd nodejs && npm install`.
5. run `cd ../../` to get back to the main folder.
6. finally, run `node src/index.js` to bring it to life.

## configuration (self-host only)

check `src/config.js` to change the internal engine settings.

- `ttsSpeed`: base speed of the speech. zoom zoom.
- `ttsVolume`: volume of the speech. can you hear me now?
- `ttsQuality`: 1 to 50. quality vs speed trade-off.
- `defaultLang`: fallback language if detection fails.
- `maxConcurrency`: how many messages are processed at once to prevent a backed-up queue.
- `workerMemoryLimit`: memory cap for the worker before it restarts. keeps the ram gremlins at bay.

## issues & contributions

found a bug? have a suggestion? bot exploded? feel free to [open an issue](https://github.com/derpeloper/ostinato/issues) and let me know.

you are also welcome to fork this repository for your own use. explore, experiment, break things. it's open source for a reason.

## disclaimer

may contain traces of nuts and bolts. the hosted version will not have 24/7 uptime due to maintenance and bug fixes. use at your own risk. if it breaks, you get to keep the pieces.

## credits

- **Supertonic 2** by **Supertone** — the high-quality tts engine doing the heavy lifting.
