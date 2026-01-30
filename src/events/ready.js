const { ActivityType } = require('discord.js');

/**
 * @file ready.js
 * @description event handler for when the client is ready. sets the bot's status and logs a ready message.
 * "i'm ready, i'm ready!"
 */
module.exports = {
    name: 'clientReady',
    once: true,
    async execute(client) {
        console.log('[Client] Ready!');

        const updateActivity = () => {
             client.user.setActivity({
                name: `active in ${client.guilds.cache.size} servers`,
            });
        };

        updateActivity();

        setInterval(updateActivity, 15 * 1000);
    },
};