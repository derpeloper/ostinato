/**
 * @file clear.js
 * @description clears the tts queue for the current server.
 * "silence, brand."
 */
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const ostinato = require('../../services/OstinatoTTS');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('clears the tts queue for this server')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction, client) {
        const guildId = interaction.guild.id;
        
        try {
            ostinato.clearQueue(guildId);
            await interaction.reply({ content: 'queue cleared.', flags: MessageFlags.Ephemeral });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'failed to clear the queue.', flags: MessageFlags.Ephemeral });
        }
    }
}
