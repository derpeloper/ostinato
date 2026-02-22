/**
 * @file clear.js
 * @description clears the tts queue for the current server.
 * "silence, brand."
 */
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const ostinato = require('../../services/OstinatoTTS');
const { localize, getCommandLocalizations } = require('../../localization/localize');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('clears the tts queue for this server')
        .setNameLocalizations(getCommandLocalizations('mods', 'clear').nameLocalizations)
        .setDescriptionLocalizations(getCommandLocalizations('mods', 'clear').descriptionLocalizations)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction, client) {
        const guildId = interaction.guild.id;
        
        try {
            ostinato.clearQueue(guildId);
            await interaction.reply({ content: localize(interaction.locale, 'responses.mods.clear.success'), flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: localize(interaction.locale, 'responses.mods.clear.error'), flags: MessageFlags.Ephemeral });
        }
    }
}
