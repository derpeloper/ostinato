/**
 * @file speed.js
 * @description increases or decreases the speed of the tts for your account.
 * "gotta go fast. or slow. i don't judge."
 */
const { SlashCommandBuilder, MessageFlags } = require('discord.js')
const db = require('../../data/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('speed')
        .setDescription('change the speed of the tts for your account')
        .addNumberOption(option => option
            .setName('value')
            .setDescription('the speed multiplier (0.5 to 2.0)')
            .setMinValue(0.5)
            .setMaxValue(2.0)
            .setRequired(true)
        ),
    async execute(interaction, client) {
        const speedValue = interaction.options.getNumber('value');
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        try {
            const updateSpeed = db.transaction(() => {
                db.prepare('DELETE FROM speeds WHERE user = ? AND guild = ?').run(userId, guildId);
                return db.prepare('INSERT INTO speeds (user, guild, speed) VALUES (?, ?, ?)').run(userId, guildId, speedValue);
            });

            const info = updateSpeed();

            if (info.changes > 0) {
                await interaction.reply({ content: `speed set to **${speedValue}x**.`, flags: MessageFlags.Ephemeral });
            } else {
                 await interaction.reply({ content: `you are already at **${speedValue}x** speed.`, flags: MessageFlags.Ephemeral });
            }
            
        } catch (error) {
            console.error(error);
             await interaction.reply({ content: `failed to save speed setting. (db error)`, flags: MessageFlags.Ephemeral });
        }
    }
}
