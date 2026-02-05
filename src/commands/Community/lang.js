/**
 * @file lang.js
 * @description changes the language of the tts for your account.
 * "hola? bonjour? hello? is this thing on?"
 */
const { SlashCommandBuilder, MessageFlags } = require('discord.js')
const db = require('../../data/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lang')
        .setDescription('change the language of the tts for your account')
        .addStringOption(option => option
            .setName('language')
            .setDescription('the language to use')
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
        
        // simple validation to prevent junk data
        const validLangs = ['en', 'pt', 'ko', 'fr', 'es'];
        if (!validLangs.includes(langCode)) {
             return await interaction.reply({ content: `that language code is invalid.`, flags: MessageFlags.Ephemeral });
        }

        try {
            const updateLang = db.transaction(() => {
                db.prepare('DELETE FROM langs WHERE user = ? AND guild = ?').run(userId, guildId);
                return db.prepare('INSERT INTO langs (user, guild, lang) VALUES (?, ?, ?)').run(userId, guildId, langCode);
            });

            const info = updateLang();

            if (info.changes > 0) {
                await interaction.reply({ content: `language preferences set to **${langCode}**.`, flags: MessageFlags.Ephemeral });
            } else {
                 await interaction.reply({ content: `you already have **${langCode}** set as your preferred language.`, flags: MessageFlags.Ephemeral });
            }
            
        } catch (error) {
            console.error(error);
             await interaction.reply({ content: `failed to save language setting. (db error)`, flags: MessageFlags.Ephemeral });
        }
    }
}
