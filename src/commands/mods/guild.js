/**
 * @file guild.js
 * @description manage guild-specific settings like default language.
 * "every guild has its own flavor."
 */
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../data/db');
const { localize, getCommandLocalizations, getSubcommandGroupLocalizations, getDeepOptionLocalizations } = require('../../localization/localize');
const ostinato = require('../../services/OstinatoTTS');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guild')
        .setDescription('manage guild-specific settings')
        .setNameLocalizations(getCommandLocalizations('mods', 'guild').nameLocalizations)
        .setDescriptionLocalizations(getCommandLocalizations('mods', 'guild').descriptionLocalizations)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommandGroup(group => group
            .setName('lang')
            .setDescription('manage default guild language')
            .setNameLocalizations(getSubcommandGroupLocalizations('mods', 'guild', 'lang').nameLocalizations)
            .setDescriptionLocalizations(getSubcommandGroupLocalizations('mods', 'guild', 'lang').descriptionLocalizations)
            .addSubcommand(sub => sub
                .setName('set')
                .setDescription('set the default language for the guild')
                .setNameLocalizations(getDeepOptionLocalizations('mods', 'guild', 'groups', 'lang', 'subcommands', 'set').nameLocalizations)
                .setDescriptionLocalizations(getDeepOptionLocalizations('mods', 'guild', 'groups', 'lang', 'subcommands', 'set').descriptionLocalizations)
                .addStringOption(option => option
                    .setName('language')
                    .setDescription('the language to set')
                    .setNameLocalizations(getDeepOptionLocalizations('mods', 'guild', 'groups', 'lang', 'subcommands', 'set', 'options', 'language').nameLocalizations)
                    .setDescriptionLocalizations(getDeepOptionLocalizations('mods', 'guild', 'groups', 'lang', 'subcommands', 'set', 'options', 'language').descriptionLocalizations)
                    .setAutocomplete(true)
                    .setRequired(true)
                )
            )
            .addSubcommand(sub => sub
                .setName('reset')
                .setDescription('reset the default language for the guild')
                .setNameLocalizations(getDeepOptionLocalizations('mods', 'guild', 'groups', 'lang', 'subcommands', 'reset').nameLocalizations)
                .setDescriptionLocalizations(getDeepOptionLocalizations('mods', 'guild', 'groups', 'lang', 'subcommands', 'reset').descriptionLocalizations)
            )
        ),
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const languages = [
            { name: 'English', value: 'en' },
            { name: 'Portuguese', value: 'pt' },
            { name: 'Korean', value: 'ko' },
            { name: 'French', value: 'fr' },
            { name: 'Spanish', value: 'es' }
        ];

        const filtered = languages.filter(choice => choice.name.toLowerCase().includes(focusedValue.toLowerCase()));
        await interaction.respond(filtered.map(choice => ({ name: choice.name, value: choice.value })));
    },
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === 'set') {
            const langCode = interaction.options.getString('language');
            const validLangs = ['en', 'pt', 'ko', 'fr', 'es'];

            if (!validLangs.includes(langCode)) {
                return await interaction.reply({ content: localize(interaction.locale, 'responses.mods.guild.lang.invalid'), flags: MessageFlags.Ephemeral });
            }

            try {
                db.prepare('INSERT OR REPLACE INTO guild_langs (guild, lang) VALUES (?, ?)').run(guildId, langCode);
                ostinato.invalidateCache(null, guildId, 'guild_lang');
                await interaction.reply({ content: localize(interaction.locale, 'responses.mods.guild.lang.success', { langCode }), flags: MessageFlags.Ephemeral });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: localize(interaction.locale, 'responses.mods.guild.lang.error'), flags: MessageFlags.Ephemeral });
            }
        } else if (subcommand === 'reset') {
            try {
                db.prepare('DELETE FROM guild_langs WHERE guild = ?').run(guildId);
                ostinato.invalidateCache(null, guildId, 'guild_lang');
                await interaction.reply({ content: localize(interaction.locale, 'responses.mods.guild.lang.reset'), flags: MessageFlags.Ephemeral });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: localize(interaction.locale, 'responses.mods.guild.lang.error'), flags: MessageFlags.Ephemeral });
            }
        }
    }
}
