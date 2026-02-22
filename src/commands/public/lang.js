/**
 * @file lang.js
 * @description changes the language of the tts for your account.
 * "hola? bonjour? hello? is this thing on?"
 */
const { SlashCommandBuilder, MessageFlags } = require('discord.js')
const db = require('../../data/db');
const { localize, getCommandLocalizations, getOptionLocalizations } = require('../../localization/localize');

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
    async autocomplete(interaction, client) {
        const focusedValue = interaction.options.getFocused();
        const languages = [
            { name: 'English', value: 'en' },
            { name: 'Portuguese', value: 'pt' },
            { name: 'Korean', value: 'ko' },
            { name: 'French', value: 'fr' },
            { name: 'Spanish', value: 'es' }
        ];

        const filtered = languages.filter(choice => choice.name.toLowerCase().includes(focusedValue.toLowerCase()));
        
        await interaction.respond(
            filtered.map(choice => ({ name: choice.name, value: choice.value })),
        );
    },
    async execute(interaction, client) {
        const langCode = interaction.options.getString('language');
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        
        const validLangs = ['en', 'pt', 'ko', 'fr', 'es'];
        if (!validLangs.includes(langCode)) {
             return await interaction.reply({ content: localize(interaction.locale, 'responses.public.lang.invalid'), flags: MessageFlags.Ephemeral });
        }

        try {
            const updateLang = db.transaction(() => {
                db.prepare('DELETE FROM langs WHERE user = ? AND guild = ?').run(userId, guildId);
                return db.prepare('INSERT INTO langs (user, guild, lang) VALUES (?, ?, ?)').run(userId, guildId, langCode);
            });

            const info = updateLang();

            if (info.changes > 0) {
                await interaction.reply({ content: localize(interaction.locale, 'responses.public.lang.success', { langCode }), flags: MessageFlags.Ephemeral });
            } else {
                 await interaction.reply({ content: localize(interaction.locale, 'responses.public.lang.duplicate', { langCode }), flags: MessageFlags.Ephemeral });
            }
            
        } catch (error) {
            console.error(error);
             await interaction.reply({ content: localize(interaction.locale, 'responses.public.lang.error'), flags: MessageFlags.Ephemeral });
        }
    }
}
