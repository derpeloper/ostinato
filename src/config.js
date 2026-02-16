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
    ttsQuality:  15,     // depth: 1 to 50. 6 is the "magic" spot for efficiency.
    defaultLang: 'en',  // fallback: [en, es, pt, ko, fr] supported only.


    // -- resource safety ------------------------------------------------------
    // limits to keep the machine from melting under load.

    maxConcurrency:    6,          // queue: how many jobs can run at the same time.
    workerMemoryLimit: 1610612736  // memory: 1.5gb cap to prevent crashing.

};


