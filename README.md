# ostinato

a discord bot that gives a voice to the voiceless. i made this mainly because i was bored.

## features

- **text-to-speech**: converts your boring text into speech using a customized engine. it's like magic, but with more code.
- **voice customization**: change the voice of the bot. because who wants to sound like a default robot forever?
- **crash resilience**: it tries heavily not to crash. emphasize on "tries".
- **memory management**: watches memory usage like a hawk. a hawk that occasionally panics.

## installation

1. clone the repo: `git clone https://github.com/derpeloper/ostinato`. if you don't know how to do that, google is your best friend.
2. run `cd ostinato` then run `npm install`. this might take a while, go grab a coffee.
3. edit the `token` in `src/env.json` to your actual discord bot token. make sure you give it the right permissions: priority speaker, connect, read message history, and speak. otherwise it'll just be a silent observer.
4. run this command to download the engine (and maybe go get that donut now): `git clone https://github.com/supertone-inc/supertonic.git && cd supertonic && git clone https://huggingface.co/Supertone/supertonic-2 assets && cd nodejs && npm install`.
5. restart your powershell or command prompt. don't ask why, just do it.
6. finally, run `node src/index.js` to bring it to life.

## configuration

check `src/config.js` to change settings.

- `ttsspeed`: speed of the speech. zoom zoom.
- `ttsvolume`: volume of the speech. can you hear me now?
- `maxconcurrency`: how many messages are processed at once (to prevent a backed up queue).

## commands

- `/voice`: change the voice model. pick your poison.
- `/name`: set a nickname for the bot to say.

## disclaimer

may contain traces of nuts and bolts. use at your own risk. if it breaks, you get to keep the pieces.

## credits

- **Supertonic 2** by **Supertone** — the tts engine that does the heavy lifting for ostinato. 
