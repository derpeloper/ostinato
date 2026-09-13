/**
 * @file voice.js
 * @description changes the voice for your account.
 * "listen to your inner voice. or just pick one from the list."
 */
const { SlashCommandBuilder, MessageFlags, ContainerBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../data/db');
const { localize, getCommandLocalizations } = require('../../localization/localize');
const ostinato = require('../../services/OstinatoTTS');
const path = require('path');
const fs = require('fs');

function getPreviewPath(voiceId) {
    return path.join(process.cwd(), 'src', 'assets', 'preview', `${voiceId}.mp3`);
}

function hasPreview(voiceId) {
    return fs.existsSync(getPreviewPath(voiceId));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voice')
        .setDescription('change the voice for your account')
        .setNameLocalizations(getCommandLocalizations('public', 'voice').nameLocalizations)
        .setDescriptionLocalizations(getCommandLocalizations('public', 'voice').descriptionLocalizations)
        .addStringOption(option =>
            option
                .setName('voice')
                .setDescription('the voice to select')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const availableVoices = ostinato.getAvailableVoices();
        const filtered = availableVoices.filter(choice =>
            choice.name.toLowerCase().includes(focusedValue) || choice.id.toLowerCase().includes(focusedValue)
        );

        await interaction.respond(
            filtered.slice(0, 25).map(choice => ({ name: choice.name, value: choice.id }))
        );
    },

    async execute(interaction) {
        const selectedVoice = interaction.options.getString('voice').toLowerCase();
        const availableVoices = ostinato.getAvailableVoices();
        const voiceObj = availableVoices.find(v => v.id === selectedVoice);

        if (!voiceObj) {
            return await interaction.reply({
                components: [
                    new ContainerBuilder().addTextDisplayComponents(t =>
                        t.setContent(localize(interaction.locale, 'responses.public.voice.error', { voiceId: selectedVoice }))
                    )
                ],
                flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
            });
        }

        const container = new ContainerBuilder()
            .setAccentColor(0x337c97)
            .addTextDisplayComponents(t => t.setContent(`selected voice: **${voiceObj.name}**`))
            .addActionRowComponents(row =>
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`voice_preview:${selectedVoice}`)
                        .setLabel('Preview')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`voice_confirm:${selectedVoice}`)
                        .setLabel(localize(interaction.locale, 'responses.public.voice.confirmButton') || 'Confirm')
                        .setStyle(ButtonStyle.Secondary)
                )
            );

        await interaction.reply({
            components: [container],
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
    },

    async handlePreview(interaction, voiceId) {
        const previewPath = getPreviewPath(voiceId);
        if (hasPreview(voiceId)) {
            await interaction.reply({
                files: [{
                    attachment: previewPath,
                    name: `${voiceId}.mp3`
                }],
                flags: [MessageFlags.Ephemeral]
            });
        } else {
            await interaction.reply({
                content: localize(interaction.locale, 'responses.public.voice.noPreview') || 'no preview available.',
                flags: [MessageFlags.Ephemeral]
            });
        }
    },

    async handleConfirm(interaction, voiceId) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        const displayName = voiceId.charAt(0).toUpperCase() + voiceId.slice(1);

        try {
            db.prepare('INSERT OR REPLACE INTO voices (user, guild, voice) VALUES (?, ?, ?)').run(userId, guildId, voiceId);
            ostinato.invalidateCache(userId, guildId, 'voice');

            await interaction.update({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0x337c97)
                        .addTextDisplayComponents(t =>
                            t.setContent(localize(interaction.locale, 'responses.public.voice.success', { voiceId: displayName }))
                        )
                ],
                flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
            });
        } catch (error) {
            console.error(error);
            await interaction.update({
                components: [
                    new ContainerBuilder().addTextDisplayComponents(t =>
                        t.setContent(localize(interaction.locale, 'responses.public.voice.error', { voiceId: displayName }))
                    )
                ],
                flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
            });
        }
    }
};