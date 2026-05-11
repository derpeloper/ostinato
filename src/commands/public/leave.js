/**
 * @file leave.js
 * @description forces the bot to disconnect from the voice channel.
 * "make like a tree and leave."
 */
const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const ostinato = require('../../services/OstinatoTTS');
const { localize, getCommandLocalizations } = require('../../localization/localize');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('disconnects the bot from the voice channel')
        .setNameLocalizations(getCommandLocalizations('public', 'leave').nameLocalizations)
        .setDescriptionLocalizations(getCommandLocalizations('public', 'leave').descriptionLocalizations),
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const connection = getVoiceConnection(guildId);

        if (!connection) {
            return await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${localize(interaction.locale, 'responses.public.leave.notInVoice')}`))], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        }

        const botChannelId = connection.joinConfig.channelId;
        const userChannelId = interaction.member.voice.channelId;

        if (!userChannelId || userChannelId !== botChannelId) {
            return await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${localize(interaction.locale, 'responses.public.leave.differentVoice')}`))], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        }

        try {
            ostinato.handleBotDisconnect(guildId);
            await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${localize(interaction.locale, 'responses.public.leave.success')}`))], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        } catch (error) {
            console.error(error);
            await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(`${localize(interaction.locale, 'responses.public.leave.error')}`))], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        }
    }
}
