/**
 * @file name.js
 * @description changes the name for your account in the database.
 * "what's in a name? that which we call a rose by any other name would smell as sweet. but you still need a name."
 */
const { SlashCommandBuilder, MessageFlags } = require('discord.js')
const db = require('../../data/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('name')
        .setDescription('changes the name for your messages')
        .addStringOption(option => option
            .setName('name')
            .setDescription('the name to use')
            .setMaxLength(60)
            .setRequired(true)
        ),
    async execute(interaction, client) {
        const name = interaction.options.getString('name');
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        try {
            const updateName = db.transaction(() => {
                db.prepare('DELETE FROM names WHERE user = ? AND guild = ?').run(userId, guildId);
                return db.prepare('INSERT INTO names (user, guild, name) VALUES (?, ?, ?)').run(userId, guildId, name);
            });

            const info = updateName();

            if (info.changes > 0) {
                await interaction.reply({ content: `your name has been set to **${name}**.`, flags: MessageFlags.Ephemeral });
            } else {
                 await interaction.reply({ content: `you already have the name **${name}** set.`, flags: MessageFlags.Ephemeral });
            }

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'there was an error saving your name.', flags: MessageFlags.Ephemeral });
        }
    }
}
