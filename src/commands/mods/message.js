/**
 * @file message.js
 * @description manage message content filters for tts.
 * "some things are better left unsaid."
 */
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../data/db');
const { localize, getCommandLocalizations, getSubcommandGroupLocalizations, getDeepOptionLocalizations } = require('../../localization/localize');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('message')
        .setDescription('manage message content filters')
        .setNameLocalizations(getCommandLocalizations('mods', 'message').nameLocalizations)
        .setDescriptionLocalizations(getCommandLocalizations('mods', 'message').descriptionLocalizations)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addSubcommandGroup(group => group
            .setName('filter')
            .setDescription('manage content filters')
            .setNameLocalizations(getSubcommandGroupLocalizations('mods', 'message', 'filter').nameLocalizations)
            .setDescriptionLocalizations(getSubcommandGroupLocalizations('mods', 'message', 'filter').descriptionLocalizations)
            .addSubcommand(sub => sub
                .setName('add')
                .setDescription('add a new filter')
                .setNameLocalizations(getDeepOptionLocalizations('mods', 'message', 'groups', 'filter', 'subcommands', 'add').nameLocalizations)
                .setDescriptionLocalizations(getDeepOptionLocalizations('mods', 'message', 'groups', 'filter', 'subcommands', 'add').descriptionLocalizations)
                .addStringOption(option => option
                    .setName('string')
                    .setDescription('the filter text or regex to add')
                    .setNameLocalizations(getDeepOptionLocalizations('mods', 'message', 'groups', 'filter', 'subcommands', 'add', 'options', 'string').nameLocalizations)
                    .setDescriptionLocalizations(getDeepOptionLocalizations('mods', 'message', 'groups', 'filter', 'subcommands', 'add', 'options', 'string').descriptionLocalizations)
                    .setRequired(true)
                )
            )
            .addSubcommand(sub => sub
                .setName('list')
                .setDescription('list all active filters')
                .setNameLocalizations(getDeepOptionLocalizations('mods', 'message', 'groups', 'filter', 'subcommands', 'list').nameLocalizations)
                .setDescriptionLocalizations(getDeepOptionLocalizations('mods', 'message', 'groups', 'filter', 'subcommands', 'list').descriptionLocalizations)
            )
            .addSubcommand(sub => sub
                .setName('edit')
                .setDescription('edit an existing filter')
                .setNameLocalizations(getDeepOptionLocalizations('mods', 'message', 'groups', 'filter', 'subcommands', 'edit').nameLocalizations)
                .setDescriptionLocalizations(getDeepOptionLocalizations('mods', 'message', 'groups', 'filter', 'subcommands', 'edit').descriptionLocalizations)
                .addStringOption(option => option
                    .setName('old')
                    .setDescription('the existing filter to edit')
                    .setNameLocalizations(getDeepOptionLocalizations('mods', 'message', 'groups', 'filter', 'subcommands', 'edit', 'options', 'old').nameLocalizations)
                    .setDescriptionLocalizations(getDeepOptionLocalizations('mods', 'message', 'groups', 'filter', 'subcommands', 'edit', 'options', 'old').descriptionLocalizations)
                    .setRequired(true)
                )
                .addStringOption(option => option
                    .setName('new')
                    .setDescription('the new replacement filter')
                    .setNameLocalizations(getDeepOptionLocalizations('mods', 'message', 'groups', 'filter', 'subcommands', 'edit', 'options', 'new').nameLocalizations)
                    .setDescriptionLocalizations(getDeepOptionLocalizations('mods', 'message', 'groups', 'filter', 'subcommands', 'edit', 'options', 'new').descriptionLocalizations)
                    .setRequired(true)
                )
            )
            .addSubcommand(sub => sub
                .setName('remove')
                .setDescription('remove a filter')
                .setNameLocalizations(getDeepOptionLocalizations('mods', 'message', 'groups', 'filter', 'subcommands', 'remove').nameLocalizations)
                .setDescriptionLocalizations(getDeepOptionLocalizations('mods', 'message', 'groups', 'filter', 'subcommands', 'remove').descriptionLocalizations)
                .addStringOption(option => option
                    .setName('string')
                    .setDescription('the filter text or regex to remove')
                    .setNameLocalizations(getDeepOptionLocalizations('mods', 'message', 'groups', 'filter', 'subcommands', 'remove', 'options', 'string').nameLocalizations)
                    .setDescriptionLocalizations(getDeepOptionLocalizations('mods', 'message', 'groups', 'filter', 'subcommands', 'remove', 'options', 'string').descriptionLocalizations)
                    .setRequired(true)
                )
            )
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const locale = interaction.locale;

        try {
            if (subcommand === 'add') {
                const pattern = interaction.options.getString('string');
                const existing = db.prepare('SELECT id FROM message_filters WHERE guild = ? AND pattern = ?').get(guildId, pattern);
                if (existing) {
                    return await interaction.reply({ content: localize(locale, 'responses.mods.message.filter.exists'), flags: MessageFlags.Ephemeral });
                }
                db.prepare('INSERT INTO message_filters (guild, pattern) VALUES (?, ?)').run(guildId, pattern);
                await interaction.reply({ content: localize(locale, 'responses.mods.message.filter.added', { pattern }), flags: MessageFlags.Ephemeral });

            } else if (subcommand === 'list') {
                const rows = db.prepare('SELECT pattern FROM message_filters WHERE guild = ?').all(guildId);
                if (rows.length === 0) {
                    return await interaction.reply({ content: localize(locale, 'responses.mods.message.filter.empty'), flags: MessageFlags.Ephemeral });
                }
                const filters = rows.map((r, i) => `${i + 1}. \`${r.pattern}\``).join('\n');
                await interaction.reply({ content: localize(locale, 'responses.mods.message.filter.list', { filters }), flags: MessageFlags.Ephemeral });

            } else if (subcommand === 'edit') {
                const oldPattern = interaction.options.getString('old');
                const newPattern = interaction.options.getString('new');
                const result = db.prepare('UPDATE message_filters SET pattern = ? WHERE guild = ? AND pattern = ?').run(newPattern, guildId, oldPattern);
                if (result.changes === 0) {
                    return await interaction.reply({ content: localize(locale, 'responses.mods.message.filter.notFound', { pattern: oldPattern }), flags: MessageFlags.Ephemeral });
                }
                await interaction.reply({ content: localize(locale, 'responses.mods.message.filter.edited', { old: oldPattern, new: newPattern }), flags: MessageFlags.Ephemeral });

            } else if (subcommand === 'remove') {
                const pattern = interaction.options.getString('string');
                const result = db.prepare('DELETE FROM message_filters WHERE guild = ? AND pattern = ?').run(guildId, pattern);
                if (result.changes === 0) {
                    return await interaction.reply({ content: localize(locale, 'responses.mods.message.filter.notFound', { pattern }), flags: MessageFlags.Ephemeral });
                }
                await interaction.reply({ content: localize(locale, 'responses.mods.message.filter.removed', { pattern }), flags: MessageFlags.Ephemeral });
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: localize(locale, 'responses.mods.message.filter.error'), flags: MessageFlags.Ephemeral });
        }
    }
}
