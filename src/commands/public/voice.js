/**
 * @file voice.js
 * @description changes the voice for your account.
 * "listen to your inner voice. or just pick one from the list."
 */
const { SlashCommandBuilder, MessageFlags } = require('discord.js')
const db = require('../../data/db');
const { localize, getCommandLocalizations, getOptionLocalizations } = require('../../localization/localize');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voice')
        .setDescription('change the voice for your account')
        .setNameLocalizations(getCommandLocalizations('public', 'voice').nameLocalizations)
        .setDescriptionLocalizations(getCommandLocalizations('public', 'voice').descriptionLocalizations)
        .addStringOption(option => option
            .setName('voice')
            .setDescription('the voice to use')
            .setNameLocalizations(getOptionLocalizations('public', 'voice', 'voice').nameLocalizations)
            .setDescriptionLocalizations(getOptionLocalizations('public', 'voice', 'voice').descriptionLocalizations)
            .setAutocomplete(true)
            .setRequired(true)
        ),
    async autocomplete(interaction, client) {
        const focusedValue = interaction.options.getFocused();
        const voices = [
            { name: 'Sarah (F1)', value: 'F1' },
            { name: 'Emily (F2)', value: 'F2' },
            { name: 'Jessica (F3)', value: 'F3' },
            { name: 'Charlotte (F4)', value: 'F4' },
            { name: 'Alice (F5)', value: 'F5' },
            { name: 'Michael (M1)', value: 'M1' },
            { name: 'David (M2)', value: 'M2' },
            { name: 'Matthew (M3)', value: 'M3' },
            { name: 'Ryan (M4)', value: 'M4' },
            { name: 'George (M5)', value: 'M5' }
        ];

        const filtered = voices.filter(choice => choice.name.toLowerCase().includes(focusedValue.toLowerCase()));
        
        await interaction.respond(
            filtered.map(choice => ({ name: choice.name, value: choice.value })),
        );
    },
    async execute(interaction, client) {
        const voiceId = interaction.options.getString('voice');
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        try {
            const updateVoice = db.transaction(() => {
                db.prepare('DELETE FROM voices WHERE user = ? AND guild = ?').run(userId, guildId);
                return db.prepare('INSERT INTO voices (user, guild, voice) VALUES (?, ?, ?)').run(userId, guildId, voiceId);
            });

            const info = updateVoice();

            if (info.changes > 0) {
                await interaction.reply({ content: localize(interaction.locale, 'responses.public.voice.success', { voiceId }), flags: MessageFlags.Ephemeral });
            } else {
                 await interaction.reply({ content: localize(interaction.locale, 'responses.public.voice.duplicate', { voiceId }), flags: MessageFlags.Ephemeral });
            }
            
        } catch (error) {
            console.error(error);
             await interaction.reply({ content: localize(interaction.locale, 'responses.public.voice.error', { voiceId }), flags: MessageFlags.Ephemeral });
        }
    }
}