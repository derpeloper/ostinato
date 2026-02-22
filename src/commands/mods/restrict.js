/**
 * @file restrict.js
 * @description disable tts for users who arent muted.
 * "children should be seen and not heard."
 */
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../data/db');
const { localize, getCommandLocalizations } = require('../../localization/localize');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('restrict')
        .setDescription('disable tts for users who arent muted')
        .setNameLocalizations(getCommandLocalizations('mods', 'restrict').nameLocalizations)
        .setDescriptionLocalizations(getCommandLocalizations('mods', 'restrict').descriptionLocalizations)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction, client) {
        const guildId = interaction.guild.id;

        try {
            const stmt = db.prepare('INSERT OR REPLACE INTO restrictions (guild, restricted) VALUES (?, 1)');
            stmt.run(guildId);
            await interaction.reply({ content: localize(interaction.locale, 'responses.mods.restrict.success'), flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: localize(interaction.locale, 'responses.mods.restrict.error'), flags: MessageFlags.Ephemeral });
        }
    }
}