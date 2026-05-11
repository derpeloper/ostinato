/**
 * @file name.js
 * @description set your display name or manage name filters.
 * "what's in a name? that which we call a rose by any other name would smell as sweet. but you still need a name."
 */
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder } = require('discord.js');
const db = require('../../data/db');
const { localize, getCommandLocalizations, getSubcommandLocalizations, getSubcommandGroupLocalizations, getDeepOptionLocalizations } = require('../../localization/localize');
const ostinato = require('../../services/OstinatoTTS');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('name')
        .setDescription('set your display name or manage name filters')
        .setNameLocalizations(getCommandLocalizations('public', 'name').nameLocalizations)
        .setDescriptionLocalizations(getCommandLocalizations('public', 'name').descriptionLocalizations)
        .addSubcommand(sub => sub
            .setName('set')
            .setDescription('set your display name')
            .setNameLocalizations(getSubcommandLocalizations('public', 'name', 'set').nameLocalizations)
            .setDescriptionLocalizations(getSubcommandLocalizations('public', 'name', 'set').descriptionLocalizations)
            .addStringOption(option => option
                .setName('string')
                .setDescription('the name to set')
                .setNameLocalizations(getDeepOptionLocalizations('public', 'name', 'subcommands', 'set', 'options', 'string').nameLocalizations)
                .setDescriptionLocalizations(getDeepOptionLocalizations('public', 'name', 'subcommands', 'set', 'options', 'string').descriptionLocalizations)
                .setMaxLength(60)
                .setRequired(true)
            )
        )
        .addSubcommandGroup(group => group
            .setName('filter')
            .setDescription('manage name filters')
            .setNameLocalizations(getSubcommandGroupLocalizations('public', 'name', 'filter').nameLocalizations)
            .setDescriptionLocalizations(getSubcommandGroupLocalizations('public', 'name', 'filter').descriptionLocalizations)
            .addSubcommand(sub => sub
                .setName('add')
                .setDescription('add a new filter')
                .setNameLocalizations(getDeepOptionLocalizations('public', 'name', 'groups', 'filter', 'subcommands', 'add').nameLocalizations)
                .setDescriptionLocalizations(getDeepOptionLocalizations('public', 'name', 'groups', 'filter', 'subcommands', 'add').descriptionLocalizations)
                .addStringOption(option => option
                    .setName('string')
                    .setDescription('the filter text or regex to add')
                    .setNameLocalizations(getDeepOptionLocalizations('public', 'name', 'groups', 'filter', 'subcommands', 'add', 'options', 'string').nameLocalizations)
                    .setDescriptionLocalizations(getDeepOptionLocalizations('public', 'name', 'groups', 'filter', 'subcommands', 'add', 'options', 'string').descriptionLocalizations)
                    .setRequired(true)
                )
            )
            .addSubcommand(sub => sub
                .setName('list')
                .setDescription('list all active filters')
                .setNameLocalizations(getDeepOptionLocalizations('public', 'name', 'groups', 'filter', 'subcommands', 'list').nameLocalizations)
                .setDescriptionLocalizations(getDeepOptionLocalizations('public', 'name', 'groups', 'filter', 'subcommands', 'list').descriptionLocalizations)
            )
            .addSubcommand(sub => sub
                .setName('edit')
                .setDescription('edit an existing filter')
                .setNameLocalizations(getDeepOptionLocalizations('public', 'name', 'groups', 'filter', 'subcommands', 'edit').nameLocalizations)
                .setDescriptionLocalizations(getDeepOptionLocalizations('public', 'name', 'groups', 'filter', 'subcommands', 'edit').descriptionLocalizations)
                .addStringOption(option => option
                    .setName('old')
                    .setDescription('the existing filter to edit')
                    .setNameLocalizations(getDeepOptionLocalizations('public', 'name', 'groups', 'filter', 'subcommands', 'edit', 'options', 'old').nameLocalizations)
                    .setDescriptionLocalizations(getDeepOptionLocalizations('public', 'name', 'groups', 'filter', 'subcommands', 'edit', 'options', 'old').descriptionLocalizations)
                    .setRequired(true)
                )
                .addStringOption(option => option
                    .setName('new')
                    .setDescription('the new replacement filter')
                    .setNameLocalizations(getDeepOptionLocalizations('public', 'name', 'groups', 'filter', 'subcommands', 'edit', 'options', 'new').nameLocalizations)
                    .setDescriptionLocalizations(getDeepOptionLocalizations('public', 'name', 'groups', 'filter', 'subcommands', 'edit', 'options', 'new').descriptionLocalizations)
                    .setRequired(true)
                )
            )
            .addSubcommand(sub => sub
                .setName('remove')
                .setDescription('remove a filter')
                .setNameLocalizations(getDeepOptionLocalizations('public', 'name', 'groups', 'filter', 'subcommands', 'remove').nameLocalizations)
                .setDescriptionLocalizations(getDeepOptionLocalizations('public', 'name', 'groups', 'filter', 'subcommands', 'remove').descriptionLocalizations)
                .addStringOption(option => option
                    .setName('string')
                    .setDescription('the filter text or regex to remove')
                    .setNameLocalizations(getDeepOptionLocalizations('public', 'name', 'groups', 'filter', 'subcommands', 'remove', 'options', 'string').nameLocalizations)
                    .setDescriptionLocalizations(getDeepOptionLocalizations('public', 'name', 'groups', 'filter', 'subcommands', 'remove', 'options', 'string').descriptionLocalizations)
                    .setRequired(true)
                )
            )
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const group = interaction.options.getSubcommandGroup();
        const guildId = interaction.guild.id;
        const locale = interaction.locale;

        if (!group && subcommand === 'set') {
            const name = interaction.options.getString('string');
            const userId = interaction.user.id;

            try {
                const updateName = db.transaction(() => {
                    db.prepare('DELETE FROM names WHERE user = ? AND guild = ?').run(userId, guildId);
                    return db.prepare('INSERT INTO names (user, guild, name) VALUES (?, ?, ?)').run(userId, guildId, name);
                });
                updateName();
                ostinato.invalidateCache(userId, guildId, 'name');
                await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(locale, 'responses.public.name.success', { name })))], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
            } catch (error) {
                console.error(error);
                await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(locale, 'responses.public.name.error')))], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
            }
            return;
        }

        if (group === 'filter') {
            if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages)) {
                return await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(locale, 'responses.public.name.filter.error')))], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
            }

            try {
                if (subcommand === 'add') {
                    const pattern = interaction.options.getString('string');
                    const existing = db.prepare('SELECT id FROM name_filters WHERE guild = ? AND pattern = ?').get(guildId, pattern);
                    if (existing) {
                        return await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(locale, 'responses.public.name.filter.exists')))], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
                    }
                    db.prepare('INSERT INTO name_filters (guild, pattern) VALUES (?, ?)').run(guildId, pattern);
                    await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(locale, 'responses.public.name.filter.added', { pattern })))], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

                } else if (subcommand === 'list') {
                    const rows = db.prepare('SELECT pattern FROM name_filters WHERE guild = ?').all(guildId);
                    if (rows.length === 0) {
                        return await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(locale, 'responses.public.name.filter.empty')))], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
                    }
                    const filters = rows.map((r, i) => `${i + 1}. \`${r.pattern}\``).join('\n');
                    await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(locale, 'responses.public.name.filter.list', { filters })))], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

                } else if (subcommand === 'edit') {
                    const oldPattern = interaction.options.getString('old');
                    const newPattern = interaction.options.getString('new');
                    const result = db.prepare('UPDATE name_filters SET pattern = ? WHERE guild = ? AND pattern = ?').run(newPattern, guildId, oldPattern);
                    if (result.changes === 0) {
                        return await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(locale, 'responses.public.name.filter.notFound', { pattern: oldPattern })))], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
                    }
                    await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(locale, 'responses.public.name.filter.edited', { old: oldPattern, new: newPattern })))], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

                } else if (subcommand === 'remove') {
                    const pattern = interaction.options.getString('string');
                    const result = db.prepare('DELETE FROM name_filters WHERE guild = ? AND pattern = ?').run(guildId, pattern);
                    if (result.changes === 0) {
                        return await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(locale, 'responses.public.name.filter.notFound', { pattern })))], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
                    }
                    await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(locale, 'responses.public.name.filter.removed', { pattern })))], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
                }
            } catch (error) {
                console.error(error);
                await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(locale, 'responses.public.name.filter.error')))], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
            }
        }
    }
}
