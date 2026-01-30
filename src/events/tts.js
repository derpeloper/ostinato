/**
 * @file tts.js
 * @description event handler for message creation. triggers tts if the user is in a voice channel and muted.
 * "i speak for the trees... er, the muted users."
 */
const ostinato = require('../services/OstinatoTTS');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot) return;

        const member = message.member;
        if (!member || !member.voice.channel) {
            return;
        }

        if (message.channel.id !== member.voice.channel.id) {
             return;
        }

        const isMuted = member.voice.mute || member.voice.selfMute;
        
        if (!isMuted) return;
        
        try {
            console.log(`[TTS Event] Processing message from ${message.author.username}: ${message.content}`);
            await ostinato.processMessage(message);
        } catch (error) {
            console.error('Error processing TTS:', error);
        }
    }
};