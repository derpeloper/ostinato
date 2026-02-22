/**
 * @file settings.js
 * @description displays the user's current tts settings.
 * "know thyself."
 */
const { SlashCommandBuilder, ContainerBuilder, MessageFlags, SeparatorSpacingSize } = require('discord.js');
const config = require('../../config');
const ostinato = require('../../services/OstinatoTTS');
const db = require('../../data/db');
const { localize, getCommandLocalizations } = require('../../localization/localize');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('check your current tts settings')
        .setNameLocalizations(getCommandLocalizations('public', 'settings').nameLocalizations)
        .setDescriptionLocalizations(getCommandLocalizations('public', 'settings').descriptionLocalizations),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        // -- VOICE --
        let voiceDisplay = "";
        const defaultVoice = ostinato.getDefaultVoice(userId);
        try {
            const row = db.prepare('SELECT voice FROM voices WHERE user = ? AND guild = ? ORDER BY rowid DESC LIMIT 1').get(userId, guildId);
            if (row) {
                voiceDisplay = localize(interaction.locale, 'responses.public.settings.setFormat', { value: row.voice, defaultValue: defaultVoice });
            } else {
                voiceDisplay = localize(interaction.locale, 'responses.public.settings.defaultFormat', { defaultValue: defaultVoice });
            }
        } catch (e) {
            voiceDisplay = localize(interaction.locale, 'responses.public.settings.defaultFormat', { defaultValue: defaultVoice });
        }

        // -- NAME --
        let nameDisplay = "";
        const defaultName = interaction.user.username;
        try {
            const row = db.prepare('SELECT name FROM names WHERE user = ? AND guild = ? ORDER BY rowid DESC LIMIT 1').get(userId, guildId);
            if (row) {
                 nameDisplay = localize(interaction.locale, 'responses.public.settings.setFormat', { value: row.name, defaultValue: defaultName });
            } else {
                 nameDisplay = localize(interaction.locale, 'responses.public.settings.defaultFormat', { defaultValue: defaultName });
            }
        } catch (e) {
             nameDisplay = localize(interaction.locale, 'responses.public.settings.defaultFormat', { defaultValue: defaultName });
        }

        // -- SPEED --
        let speedDisplay = "";
        const defaultSpeed = config.ttsSpeed || 1.16;
        try {
            const row = db.prepare('SELECT speed FROM speeds WHERE user = ? AND guild = ? ORDER BY rowid DESC LIMIT 1').get(userId, guildId);
            if (row) {
                speedDisplay = localize(interaction.locale, 'responses.public.settings.setFormat', { value: row.speed, defaultValue: defaultSpeed });
            } else {
                speedDisplay = localize(interaction.locale, 'responses.public.settings.defaultFormat', { defaultValue: defaultSpeed });
            }
        } catch (e) {
            speedDisplay = localize(interaction.locale, 'responses.public.settings.defaultFormat', { defaultValue: defaultSpeed });
        }

        // -- LANG --
        let langDisplay = "";
        const defaultLang = "Auto"; 
        try {
            const row = db.prepare('SELECT lang FROM langs WHERE user = ? AND guild = ? ORDER BY rowid DESC LIMIT 1').get(userId, guildId);
            if (row) {
                langDisplay = localize(interaction.locale, 'responses.public.settings.setFormat', { value: row.lang, defaultValue: defaultLang });
            } else {
                langDisplay = localize(interaction.locale, 'responses.public.settings.defaultFormat', { defaultValue: defaultLang });
            }
        } catch (e) {
            langDisplay = localize(interaction.locale, 'responses.public.settings.defaultFormat', { defaultValue: defaultLang });
        }

        const container = new ContainerBuilder()
            .setAccentColor(0x337c97)
            .addTextDisplayComponents(textDisplay => textDisplay
                .setContent(localize(interaction.locale, 'responses.public.settings.title'))
            )
            .addSeparatorComponents(separator => separator
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(false)
            )
            .addTextDisplayComponents(textDisplay => textDisplay
                .setContent(localize(interaction.locale, 'responses.public.settings.voice', { value: voiceDisplay }))
            )
            .addTextDisplayComponents(textDisplay => textDisplay
                .setContent(localize(interaction.locale, 'responses.public.settings.name', { value: nameDisplay }))
            )
            .addTextDisplayComponents(textDisplay => textDisplay
                .setContent(localize(interaction.locale, 'responses.public.settings.speed', { value: speedDisplay }))
            )
            .addTextDisplayComponents(textDisplay => textDisplay
                .setContent(localize(interaction.locale, 'responses.public.settings.lang', { value: langDisplay }))
            );

        await interaction.reply({
            components: [container],
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
    }
}
