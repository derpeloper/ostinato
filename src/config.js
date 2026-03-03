/**
 * 
 *  ● ostinato / configuration
 *  "the variables that breathe life into the machine."
 * 
 */

module.exports = {

    // -- core identity --------------------------------------------------------
    // who am i? and where do i belong?

    clientId: 'your client id', // id: the bot's unique identifier.
    guildId:  null, // scope: specific guild id for local commands (null for global).


    // -- engine settings ------------------------------------------------------
    // customize how the voice sounds and behaves.

    ttsSpeed:    1.16,  // rate: how fast the model reads messages (float)
    ttsVolume:   5.89,  // gain: loud enough to be heard, quiet enough to be sane.
    priorityTtsVolume: 6.1, // gain: slightly louder for users with priority speaker permission
    ttsQuality:  6,     // depth: 1 to 50. 6 is the "magic" spot for efficiency.
    defaultLang: 'en',  // fallback: [en, es, pt, ko, fr] supported only.


    // -- resource safety ------------------------------------------------------
    // limits to keep the machine from melting under load.

    workerCount:       3,           // workers: number of TTS inference workers. each uses ~300-400mb of ram.
    maxConcurrency:    20,          // queue: per-guild. how many jobs can run at the same time per server.
    workerMemoryLimit: 1610612736  // memory: 1.5gb cap to prevent crashing.

};


