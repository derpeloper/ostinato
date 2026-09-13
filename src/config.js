/**
 * 
 *  ● ostinato / configuration
 *  "the variables that breathe life into the machine."
 * 
 */

module.exports = {

    // -- core identity --------------------------------------------------------
    // who am i? and where do i belong?

    clientId: '1459993892484288512', // id: the bot's unique identifier.
    guildId:  null,                  // scope: specific guild id for local commands (null for global).


    // -- engine settings ------------------------------------------------------
    // customize how the voice sounds and behaves.

    ttsSpeed:    1.16,  // rate: how fast the model reads messages (float)
    ttsVolume:   5.89,  // gain: loud enough to be heard, quiet enough to be sane.
    priorityTtsVolume: 6.1, // gain: slightly louder for users with priority speaker permission
    ttsQuality:  6,     // depth: 1 to 50. 6 is the "magic" spot for efficiency.
    /*
     * fallback language for tts when detection fails.
     * supported languages:
     *   en  - English       ko  - Korean        ja  - Japanese
     *   ar  - Arabic        bg  - Bulgarian     cs  - Czech
     *   da  - Danish        de  - German        el  - Greek
     *   es  - Spanish       et  - Estonian       fi  - Finnish
     *   fr  - French        hi  - Hindi          hr  - Croatian
     *   hu  - Hungarian     id  - Indonesian     it  - Italian
     *   lt  - Lithuanian    lv  - Latvian        nl  - Dutch
     *   pl  - Polish        pt  - Portuguese     ro  - Romanian
     *   ru  - Russian       sk  - Slovak         sl  - Slovenian
     *   sv  - Swedish       tr  - Turkish        uk  - Ukrainian
     *   vi  - Vietnamese
     */
    defaultLang: 'en',


    // -- hardware acceleration ------------------------------------------------
    // speed up inference using your graphics card.

    useGpu:      true,   // acceleration: toggle GPU acceleration (CUDA / DirectML).
    gpuProvider: 'dml',  // provider: 'cuda' for NVIDIA (Linux/Windows), 'dml' for DirectML (Windows).


    // -- resource safety ------------------------------------------------------
    // limits to keep the machine from melting under load.

    /*
     * workers: number of TTS inference workers in the pool.
     *
     * dual-memory footprint (per worker):
     *   - Dedicated VRAM: ~470 MB 
     *   - Host System RAM (RSS): ~270 MB 
     *   - Process bootstrap overhead: ~70–120 MB
     *
     * recommended worker tiers:
     *   - CPU Mode:       2 workers (lightweight, ~300–400 MB RAM each).
     *   - 4 GB VRAM GPUs: 2 workers (fits static weights + desktop OS overhead safely).
     *   - 8 GB VRAM GPUs: 5 to 7 workers (optimal balance; 7 workers approaches ~96% capacity under full load).
     *   - 16 GB+ GPUs:    10 to 14 workers (complete and overkill unless you're trying to run a small
     *                      call center from your bedroom).
     */
    workerCount:            2,
    maxConcurrency:         100,         // queue: total requests to the engine at any given time.
    maxPerGuildConcurrency: 20,          // queue: per-guild. how many jobs can run at the same time per server.
    workerMemoryLimit:      1610612736,  // memory: 1.5gb cap to prevent crashing.

    // -- rate limiting --------------------------------------------------------
    injectLimit: 5,                      // max injections per user per guild
    injectWindow: 3600000,               // timeframe for injections in ms (1 hour)


    // -- presence & status ----------------------------------------------------
    // control how the bot presents itself.

    status: 'online',           // presence: 'online', 'idle', 'dnd'
    activityType: 'Custom',     // activity: 'Playing', 'Watching', 'Listening', 'Custom'
    statusMessages: [
        'active in {guilds} servers',
        'a voice for the voiceless',
        'v2.8.4 - /help'
    ],
    statusRotationInterval: 4500,  // ms: how often the status rotates.
    autoIdle: true,                 // idle: automatically go idle after inactivity.
    autoIdleDuration: 300           // seconds: how long before the bot goes idle (default: 5 minutes).

};
