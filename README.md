<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://github.com/user-attachments/assets/ad085efe-2380-4b85-b0a4-84164faa4c55">
    <source media="(prefers-color-scheme: light)" srcset="https://github.com/user-attachments/assets/98f6cbda-4544-40b1-a6e9-a2fd90951467">
  </picture>
</p>

# ostinato

a discord bot that gives a voice to the voiceless. because listening is better than reading, and sounding human is better than sounding like a microwave.

[add the bot to your server](https://discord.com/oauth2/authorize?client_id=1459993892484288512)
*note: this is hosted on my personal machine. expect outages for maintenance, bug fixes, or if my power goes out. you have been warned.*

## features

- **supertonic tts**: powered by the supertonic engine to provide high-quality, human-sounding voices. it's like magic, but with actual code.
- **voice customization**: change the voice model to find one you actually like.
- **crash resilience**: it tries heavily not to crash. emphasize on "tries".
- **memory management**: watches memory usage like a hawk. a hawk that occasionally panics.

## commands

- `/voice`: pick your favorite voice model. choose the one that sounds the least like a robot.
- `/name`: tell the bot what to call you. set a custom nickname so the bot knows who is speaking when it announces "<name> says:".

## self-hosting

if you want 100% uptime and total control, host it yourself. you'll get access to customizable settings like speed (zoom zoom), volume, and performance tweaks.

### heads up on hardware
the engine is a bit hungry. on my machine, it sits between **~300mb and ~600mb of ram**. your mileage may vary depending on your system, but don't try running this on a toaster.

### setup
1. clone the repo: `git clone https://github.com/derpeloper/ostinato`. if you don't know how to do that, google is your best friend.
2. run `cd ostinato` then run `npm install`. this might take a while, go grab a coffee.
3. edit your config files:
    - in `src/env.json`, replace `token` with your actual discord bot token.
    - in `src/functions/handleCommands.js`, replace `"YOUR CLIENT ID"` with your bot's client id.
    - **optional**: in `src/functions/handleCommands.js`, you can also add your server's id where it says `"YOUR GUILD ID"` if you only want the bot in one server (and want the commands to show up instantly).
    - make sure you give the bot the right permissions: priority speaker, connect, read message history, and speak. otherwise, it'll just be a silent observer.
4. run this command to download the engine (and maybe go get that donut now): `git clone https://github.com/supertone-inc/supertonic.git && cd supertonic && git clone https://huggingface.co/Supertone/supertonic-2 assets && cd nodejs && npm install`.
5. run `cd ../../` to get back to the main folder.
6. finally, run `node src/index.js` to bring it to life.

## configuration (self-host only)

check `src/config.js` to change the internal engine settings.

- `ttsspeed`: speed of the speech. zoom zoom.
- `ttsvolume`: volume of the speech. can you hear me now?
- `maxconcurrency`: how many messages are processed at once to prevent a backed-up queue.

## disclaimer

may contain traces of nuts and bolts. the hosted version will not have 24/7 uptime due to maintenance and bug fixes. use at your own risk. if it breaks, you get to keep the pieces.

## credits

- **Supertonic 2** by **Supertone** — the high-quality tts engine doing the heavy lifting.
