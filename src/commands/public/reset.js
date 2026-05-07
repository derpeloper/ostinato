/**
 * @file reset.js
 * @description resets user tts settings. full wipe or granular.
 * "tabula rasa."
 */
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../../data/db');
const { localize, getCommandLocalizations, getOptionLocalizations } = require('../../localization/localize');
const ostinato = require('../../services/OstinatoTTS');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset')
        .setDescription('resets your tts settings to default')
        .setNameLocalizations(getCommandLocalizations('public', 'reset').nameLocalizations)
        .setDescriptionLocalizations(getCommandLocalizations('public', 'reset').descriptionLocalizations)
        .addStringOption(option => option
            .setName('option')
            .setDescription('the specific setting to reset')
            .setNameLocalizations(getOptionLocalizations('public', 'reset', 'option').nameLocalizations)
            .setDescriptionLocalizations(getOptionLocalizations('public', 'reset', 'option').descriptionLocalizations)
            .setAutocomplete(true)
            .setRequired(false)
        ),
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const choices = [
            { name: 'voice', value: 'voice' },
            { name: 'name', value: 'name' },
            { name: 'speed', value: 'speed' },
            { name: 'lang', value: 'lang' },
            { name: 'all', value: 'all' }
        ];

        const filtered = choices.filter(c => c.name.toLowerCase().startsWith(focusedValue.toLowerCase()));
        await interaction.respond(filtered);
    },
    async execute(interaction) {
        const option = interaction.options.getString('option');
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        const locale = interaction.locale;

        try {
            if (!option || option === 'all') {
                const wipe = db.transaction(() => {
                    db.prepare('DELETE FROM names WHERE user = ?').run(userId);
                    db.prepare('DELETE FROM voices WHERE user = ?').run(userId);
                    db.prepare('DELETE FROM speeds WHERE user = ?').run(userId);
                    db.prepare('DELETE FROM langs WHERE user = ?').run(userId);
                });
                wipe();

                ostinato.invalidateCache(userId, guildId, 'name');
                ostinato.invalidateCache(userId, guildId, 'voice');
                ostinato.invalidateCache(userId, guildId, 'speed');
                ostinato.invalidateCache(userId, guildId, 'lang');

                await interaction.reply({ content: localize(locale, 'responses.public.reset.full'), flags: MessageFlags.Ephemeral });
            } else {
                const tableMap = { voice: 'voices', name: 'names', speed: 'speeds', lang: 'langs' };
                const table = tableMap[option];

                if (!table) {
                    return await interaction.reply({ content: localize(locale, 'responses.public.reset.error'), flags: MessageFlags.Ephemeral });
                }

                db.prepare(`DELETE FROM ${table} WHERE user = ? AND guild = ?`).run(userId, guildId);
                ostinato.invalidateCache(userId, guildId, option);

                await interaction.reply({ content: localize(locale, 'responses.public.reset.single', { option }), flags: MessageFlags.Ephemeral });
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: localize(locale, 'responses.public.reset.error'), flags: MessageFlags.Ephemeral });
        }
    }
}
