/**
 * @file ready.js
 * @description event handler for when the client is ready. sets the bot's status and logs a ready message.
 * "i'm ready, i'm ready!"
 */
const { ActivityType, PresenceUpdateStatus } = require('discord.js');
const config = require('../config');
const ostinato = require('../services/OstinatoTTS');

const activityTypeMap = {
    'Playing': ActivityType.Playing,
    'Watching': ActivityType.Watching,
    'Listening': ActivityType.Listening,
    'Custom': ActivityType.Custom
};

module.exports = {
    name: 'clientReady',
    once: true,
    async execute(client) {
        console.log('[Client] Ready!');

        let messageIndex = 0;
        const messages = config.statusMessages || ['active in {guilds} servers'];
        const interval = config.statusRotationInterval || 15000;
        const baseStatus = config.status || 'online';
        const actType = activityTypeMap[config.activityType] ?? ActivityType.Custom;
        const autoIdle = config.autoIdle !== undefined ? config.autoIdle : true;
        const idleThreshold = 5 * 60 * 1000;

        const statusMap = {
            'online': PresenceUpdateStatus.Online,
            'idle': PresenceUpdateStatus.Idle,
            'dnd': PresenceUpdateStatus.DoNotDisturb
        };

        const updateActivity = () => {
            const raw = messages[messageIndex % messages.length];
            const text = raw.replace('{guilds}', client.guilds.cache.size);
            messageIndex++;

            let currentStatus = statusMap[baseStatus] || PresenceUpdateStatus.Online;

            if (autoIdle) {
                const lastActive = ostinato.getLastActivityTimestamp();
                if (lastActive && (Date.now() - lastActive > idleThreshold)) {
                    currentStatus = PresenceUpdateStatus.Idle;
                }
            }

            client.user.setPresence({
                status: currentStatus,
                activities: [{ name: text, type: actType }]
            });
        };

        updateActivity();
        setInterval(updateActivity, interval);
    },
};