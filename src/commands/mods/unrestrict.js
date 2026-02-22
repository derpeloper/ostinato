/**
 * @file unrestrict.js
 * @description enables tts for users who arent muted.
 * "freedom! horrible, noisy freedom."
 */
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../data/db');
const { localize, getCommandLocalizations } = require('../../localization/localize');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unrestrict')
        .setDescription('enable tts for users who arent muted')
        .setNameLocalizations(getCommandLocalizations('mods', 'unrestrict').nameLocalizations)
        .setDescriptionLocalizations(getCommandLocalizations('mods', 'unrestrict').descriptionLocalizations)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction, client) {
        const guildId = interaction.guild.id;

        try {
            const stmt = db.prepare('INSERT OR REPLACE INTO restrictions (guild, restricted) VALUES (?, 0)');
            stmt.run(guildId);
            await interaction.reply({ content: localize(interaction.locale, 'responses.mods.unrestrict.success'), flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: localize(interaction.locale, 'responses.mods.unrestrict.error'), flags: MessageFlags.Ephemeral });
        }
    }
}