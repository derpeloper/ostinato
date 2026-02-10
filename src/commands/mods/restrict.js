/**
 * @file restrict.js
 * @description disable tts for users who arent muted.
 * "children should be seen and not heard."
 */
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../data/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('restrict')
        .setDescription('disable tts for users who arent muted')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction, client) {
        const guildId = interaction.guild.id;

        try {
            const stmt = db.prepare('INSERT OR REPLACE INTO restrictions (guild, restricted) VALUES (?, 1)');
            stmt.run(guildId);
            await interaction.reply({ content: 'tts restricted to muted users only.', flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'failed to restrict tts.', flags: MessageFlags.Ephemeral });
        }
    }
}