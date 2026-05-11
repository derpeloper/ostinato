/**
 * @file lang.js
 * @description changes the language of the tts for your account.
 * "hola? bonjour? hello? is this thing on?"
 */
const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require('discord.js')
const db = require('../../data/db');
const { localize, getCommandLocalizations, getOptionLocalizations } = require('../../localization/localize');
const ostinato = require('../../services/OstinatoTTS');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lang')
        .setDescription('change the language of the tts for your account')
        .setNameLocalizations(getCommandLocalizations('public', 'lang').nameLocalizations)
        .setDescriptionLocalizations(getCommandLocalizations('public', 'lang').descriptionLocalizations)
        .addStringOption(option => option
            .setName('language')
            .setDescription('the language to use')
            .setNameLocalizations(getOptionLocalizations('public', 'lang', 'language').nameLocalizations)
            .setDescriptionLocalizations(getOptionLocalizations('public', 'lang', 'language').descriptionLocalizations)
            .setAutocomplete(true)
            .setRequired(true)
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
        
        await interaction.respond(
            filtered.slice(0, 25).map(choice => ({ name: choice.name, value: choice.value })),
        );
    },
    async execute(interaction) {
        const langCode = interaction.options.getString('language');
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        
        const validLangs = ['en', 'ko', 'ja', 'ar', 'bg', 'cs', 'da', 'de', 'el', 'es', 'et', 'fi', 'fr', 'hi', 'hr', 'hu', 'id', 'it', 'lt', 'lv', 'nl', 'pl', 'pt', 'ro', 'ru', 'sk', 'sl', 'sv', 'tr', 'uk', 'vi'];
        if (!validLangs.includes(langCode)) {
             return await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(interaction.locale, 'responses.public.lang.invalid')))], flags: MessageFlags.Ephemeral });
        }

        try {
            const updateLang = db.transaction(() => {
                db.prepare('DELETE FROM langs WHERE user = ? AND guild = ?').run(userId, guildId);
                return db.prepare('INSERT INTO langs (user, guild, lang) VALUES (?, ?, ?)').run(userId, guildId, langCode);
            });

            updateLang();
            ostinato.invalidateCache(userId, guildId, 'lang');
            await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(interaction.locale, 'responses.public.lang.success', { langCode })))], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
            
        } catch (error) {
            console.error(error);
             await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(interaction.locale, 'responses.public.lang.error')))], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        }
    }
}
