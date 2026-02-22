/**
 * @file leave.js
 * @description forces the bot to disconnect from the voice channel.
 * "make like a tree and leave."
 */
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const ostinato = require('../../services/OstinatoTTS');
const { localize, getCommandLocalizations } = require('../../localization/localize');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('disconnects the bot from the voice channel')
        .setNameLocalizations(getCommandLocalizations('public', 'leave').nameLocalizations)
        .setDescriptionLocalizations(getCommandLocalizations('public', 'leave').descriptionLocalizations),
    async execute(interaction, client) {
        const guildId = interaction.guild.id;
        const connection = getVoiceConnection(guildId);

        if (!connection) {
            return await interaction.reply({ content: localize(interaction.locale, 'responses.public.leave.notInVoice'), flags: MessageFlags.Ephemeral });
        }

        const botChannelId = connection.joinConfig.channelId;
        const userChannelId = interaction.member.voice.channelId;

        if (!userChannelId || userChannelId !== botChannelId) {
            return await interaction.reply({ content: localize(interaction.locale, 'responses.public.leave.differentVoice'), flags: MessageFlags.Ephemeral });
        }

        try {
            ostinato.handleBotDisconnect(guildId);
            await interaction.reply({ content: localize(interaction.locale, 'responses.public.leave.success'), flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: localize(interaction.locale, 'responses.public.leave.error'), flags: MessageFlags.Ephemeral });
        }
    }
}
