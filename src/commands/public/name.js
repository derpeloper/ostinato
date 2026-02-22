/**
 * @file name.js
 * @description changes the name for your account in the database.
 * "what's in a name? that which we call a rose by any other name would smell as sweet. but you still need a name."
 */
const { SlashCommandBuilder, MessageFlags } = require('discord.js')
const db = require('../../data/db');
const { localize, getCommandLocalizations, getOptionLocalizations } = require('../../localization/localize');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('name')
        .setDescription('changes the name for your messages')
        .setNameLocalizations(getCommandLocalizations('public', 'name').nameLocalizations)
        .setDescriptionLocalizations(getCommandLocalizations('public', 'name').descriptionLocalizations)
        .addStringOption(option => option
            .setName('name')
            .setDescription('the name to use')
            .setNameLocalizations(getOptionLocalizations('public', 'name', 'name').nameLocalizations)
            .setDescriptionLocalizations(getOptionLocalizations('public', 'name', 'name').descriptionLocalizations)
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
                await interaction.reply({ content: localize(interaction.locale, 'responses.public.name.success', { name }), flags: MessageFlags.Ephemeral });
            } else {
                 await interaction.reply({ content: localize(interaction.locale, 'responses.public.name.duplicate', { name }), flags: MessageFlags.Ephemeral });
            }

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: localize(interaction.locale, 'responses.public.name.error'), flags: MessageFlags.Ephemeral });
        }
    }
}
