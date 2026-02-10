/**
 * @file unrestrict.js
 * @description enables tts for users who arent muted.
 * "freedom! horrible, noisy freedom."
 */
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../data/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unrestrict')
        .setDescription('enable tts for users who arent muted')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction, client) {
        const guildId = interaction.guild.id;

        try {
            const stmt = db.prepare('INSERT OR REPLACE INTO restrictions (guild, restricted) VALUES (?, 0)');
            stmt.run(guildId);
            await interaction.reply({ content: 'tts restrictions lifted.', flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'failed to unrestrict tts.', flags: MessageFlags.Ephemeral });
        }
    }
}