/**
 * @file tts.js
 * @description event handler for message creation. triggers tts if the user is in a voice channel and muted.
 * "i speak for the trees... er, the muted users."
 */
const ostinato = require('../services/OstinatoTTS');
const db = require('../data/db');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;

        const member = message.member;
        if (!member || !member.voice.channel) {
            return;
        }

        const isVoiceChat = message.channel.id === member.voice.channel.id;

        let isAltChannel = false;
        if (!isVoiceChat) {
            try {
                const row = db.prepare('SELECT channel FROM alt_channels WHERE guild = ?').get(message.guild.id);
                if (row && row.channel === message.channel.id) {
                    isAltChannel = true;
                }
            } catch (err) {
                console.error('[TTS Event] Error checking alt channel:', err);
            }
        }

        if (!isVoiceChat && !isAltChannel) {
            return;
        }

        try {
            console.log(`[TTS Event] Processing message from ${message.author.username}: ${message.content}`);
            await ostinato.processMessage(message);
        } catch (error) {
            console.error('Error processing TTS:', error);
        }
    }
};