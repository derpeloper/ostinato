/**
 * @file skip.js
 * @description skips the current playing tts message.
 * "next, please."
 */
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const ostinato = require('../../services/OstinatoTTS');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('skips the currently playing message')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction, client) {
        const guildId = interaction.guild.id;
        
        try {
            const result = ostinato.skip(guildId);
            
            if (result === 'SKIPPED') {
                await interaction.reply({ content: 'skipped.', flags: MessageFlags.Ephemeral });
            } else if (result === 'TOO_SHORT') {
                await interaction.reply({ content: 'message is too short to skip (< 35 chars).', flags: MessageFlags.Ephemeral });
            } else if (result === 'NOT_PLAYING') {
                await interaction.reply({ content: 'nothing is playing right now.', flags: MessageFlags.Ephemeral });
            } else {
                 await interaction.reply({ content: 'failed to skip.', flags: MessageFlags.Ephemeral });
            }

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'an error occurred while trying to skip.', flags: MessageFlags.Ephemeral });
        }
    }
}
