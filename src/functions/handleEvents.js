/**
 * @file handleEvents.js
 * @description function to handle loading and registering event listeners.
 * "i'm listening..."
 */
module.exports = (client) => {
    client.handleEvents = async (eventFiles, path) => {
        console.log('[Event Handler] Loading events...');
        for (const file of eventFiles) {
            const event = require(`../events/${file}`);
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
        }
        console.log('[Event Handler] Successfully loaded events.');
    };
}