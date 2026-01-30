/**
 * @file voiceStateUpdate.js
 * @description event handler for voice state updates. triggers auto-disconnect logic in ostinatotts when a channel becomes empty.
 * "all by myself... don't wanna be..."
 */
const ostinato = require('../services/OstinatoTTS');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        if (oldState.member.id === oldState.client.user.id) {
             if (!newState.channelId) {
                 console.log(`[voiceStateUpdate] I have been disconnected from ${oldState.guild.name}! "How rude!"`);
                 ostinato.handleBotDisconnect(oldState.guild.id);
                 return;
             }
        }
        
        ostinato.handleVoiceStateUpdate(oldState, newState);
    },
};
