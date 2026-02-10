/**
 * @file leave.js
 * @description forces the bot to disconnect from the voice channel.
 * "make like a tree and leave."
 */
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const ostinato = require('../../services/OstinatoTTS');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('disconnects the bot from the voice channel'),
    async execute(interaction, client) {
        const guildId = interaction.guild.id;
        const connection = getVoiceConnection(guildId);

        if (!connection) {
            return await interaction.reply({ content: 'i am not in a voice channel. are you hearing voices?', flags: MessageFlags.Ephemeral });
        }

        const botChannelId = connection.joinConfig.channelId;
        const userChannelId = interaction.member.voice.channelId;

        if (!userChannelId || userChannelId !== botChannelId) {
            return await interaction.reply({ content: 'you must be in the same voice channel as me to disconnect me. nice try.', flags: MessageFlags.Ephemeral });
        }

        try {
            ostinato.handleBotDisconnect(guildId); // Uses the existing clean-up logic
            await interaction.reply({ content: 'goodbye.', flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'i struggled to leave. this is awkward.', flags: MessageFlags.Ephemeral });
        }
    }
}
