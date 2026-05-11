/**
 * @file guild.js
 * @description manage guild-specific settings like default language.
 * "every guild has its own flavor."
 */
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder } = require('discord.js');
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
            { name: 'Arabic', value: 'ar' },
            { name: 'Bulgarian', value: 'bg' },
            { name: 'Czech', value: 'cs' },
            { name: 'Danish', value: 'da' },
            { name: 'German', value: 'de' },
            { name: 'Greek', value: 'el' },
            { name: 'English', value: 'en' },
            { name: 'Spanish', value: 'es' },
            { name: 'Estonian', value: 'et' },
            { name: 'Finnish', value: 'fi' },
            { name: 'French', value: 'fr' },
            { name: 'Hindi', value: 'hi' },
            { name: 'Croatian', value: 'hr' },
            { name: 'Hungarian', value: 'hu' },
            { name: 'Indonesian', value: 'id' },
            { name: 'Italian', value: 'it' },
            { name: 'Japanese', value: 'ja' },
            { name: 'Korean', value: 'ko' },
            { name: 'Lithuanian', value: 'lt' },
            { name: 'Latvian', value: 'lv' },
            { name: 'Dutch', value: 'nl' },
            { name: 'Polish', value: 'pl' },
            { name: 'Portuguese', value: 'pt' },
            { name: 'Romanian', value: 'ro' },
            { name: 'Russian', value: 'ru' },
            { name: 'Slovak', value: 'sk' },
            { name: 'Slovenian', value: 'sl' },
            { name: 'Swedish', value: 'sv' },
            { name: 'Turkish', value: 'tr' },
            { name: 'Ukrainian', value: 'uk' },
            { name: 'Vietnamese', value: 'vi' }
        ];

        const filtered = languages.filter(choice => choice.name.toLowerCase().includes(focusedValue.toLowerCase()));
        await interaction.respond(filtered.slice(0, 25).map(choice => ({ name: choice.name, value: choice.value })));
    },
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === 'set') {
            const langCode = interaction.options.getString('language');
            const validLangs = ['en', 'ko', 'ja', 'ar', 'bg', 'cs', 'da', 'de', 'el', 'es', 'et', 'fi', 'fr', 'hi', 'hr', 'hu', 'id', 'it', 'lt', 'lv', 'nl', 'pl', 'pt', 'ro', 'ru', 'sk', 'sl', 'sv', 'tr', 'uk', 'vi'];

            if (!validLangs.includes(langCode)) {
                return await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(interaction.locale, 'responses.mods.guild.lang.invalid')))], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
            }

            try {
                db.prepare('INSERT OR REPLACE INTO guild_langs (guild, lang) VALUES (?, ?)').run(guildId, langCode);
                ostinato.invalidateCache(null, guildId, 'guild_lang');
                await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(interaction.locale, 'responses.mods.guild.lang.success', { langCode })))], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
            } catch (error) {
                console.error(error);
                await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(interaction.locale, 'responses.mods.guild.lang.error')))], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
            }
        } else if (subcommand === 'reset') {
            try {
                db.prepare('DELETE FROM guild_langs WHERE guild = ?').run(guildId);
                ostinato.invalidateCache(null, guildId, 'guild_lang');
                await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(interaction.locale, 'responses.mods.guild.lang.reset')))], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
            } catch (error) {
                console.error(error);
                await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(interaction.locale, 'responses.mods.guild.lang.error')))], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
            }
        }
    }
}
