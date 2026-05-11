/**
 * @file voice.js
 * @description changes the voice for your account.
 * "listen to your inner voice. or just pick one from the list."
 */
const { SlashCommandBuilder, MessageFlags, ContainerBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, FileBuilder } = require('discord.js')
const db = require('../../data/db');
const { localize, getCommandLocalizations } = require('../../localization/localize');
const ostinato = require('../../services/OstinatoTTS');
const path = require('path');
const fs = require('fs');

const voices = [
    { label: 'Sarah (F1)', value: 'F1', description: 'Female voice 1' },
    { label: 'Emily (F2)', value: 'F2', description: 'Female voice 2' },
    { label: 'Jessica (F3)', value: 'F3', description: 'Female voice 3' },
    { label: 'Charlotte (F4)', value: 'F4', description: 'Female voice 4' },
    { label: 'Alice (F5)', value: 'F5', description: 'Female voice 5' },
    { label: 'Michael (M1)', value: 'M1', description: 'Male voice 1' },
    { label: 'David (M2)', value: 'M2', description: 'Male voice 2' },
    { label: 'Matthew (M3)', value: 'M3', description: 'Male voice 3' },
    { label: 'Ryan (M4)', value: 'M4', description: 'Male voice 4' },
    { label: 'George (M5)', value: 'M5', description: 'Male voice 5' }
];

const pendingSelections = new Map();

function getPreviewPath(voiceId) {
    return path.join(process.cwd(), 'src', 'assets', 'preview', `${voiceId}.mp3`);
}

function hasPreview(voiceId) {
    return fs.existsSync(getPreviewPath(voiceId));
}

function buildVoiceContainer(locale, selectedVoice = 'F1') {
    const container = new ContainerBuilder()
        .setAccentColor(0x337c97)
        .addTextDisplayComponents(t => t.setContent(localize(locale, 'responses.public.voice.selectPrompt')));

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('voice_select')
        .setPlaceholder('Select a voice...')
        .addOptions(voices.map(v => ({
            label: v.label,
            value: v.value,
            description: v.description,
            default: v.value === selectedVoice
        })));

    container.addActionRowComponents(row => row.addComponents(selectMenu));

    if (hasPreview(selectedVoice)) {
        container.addFileComponents(file => file.setURL(`attachment://${selectedVoice}.mp3`));
    } else {
        container.addTextDisplayComponents(t => t.setContent(`-# ${localize(locale, 'responses.public.voice.noPreview')}`));
    }

    const confirmBtn = new ButtonBuilder()
        .setCustomId('voice_confirm')
        .setLabel(localize(locale, 'responses.public.voice.confirmButton'))
        .setStyle(ButtonStyle.Success);

    container.addActionRowComponents(row => row.addComponents(confirmBtn));

    return container;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voice')
        .setDescription('change the voice for your account')
        .setNameLocalizations(getCommandLocalizations('public', 'voice').nameLocalizations)
        .setDescriptionLocalizations(getCommandLocalizations('public', 'voice').descriptionLocalizations),
    async execute(interaction) {
        const userId = interaction.user.id;
        const selectedVoice = 'F1';

        pendingSelections.set(userId, { voice: selectedVoice, guildId: interaction.guild.id });

        const container = buildVoiceContainer(interaction.locale, selectedVoice);
        const files = [];
        if (hasPreview(selectedVoice)) {
            files.push({ attachment: getPreviewPath(selectedVoice), name: `${selectedVoice}.mp3` });
        }

        await interaction.reply({
            components: [container],
            files,
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
    },
    async handleSelectMenu(interaction) {
        const userId = interaction.user.id;
        const selectedVoice = interaction.values[0];

        const pending = pendingSelections.get(userId) || { guildId: interaction.guild.id };
        pending.voice = selectedVoice;
        pendingSelections.set(userId, pending);

        const container = buildVoiceContainer(interaction.locale, selectedVoice);
        const files = [];
        if (hasPreview(selectedVoice)) {
            files.push({ attachment: getPreviewPath(selectedVoice), name: `${selectedVoice}.mp3` });
        }

        await interaction.update({
            components: [container],
            files
        });
    },
    async handleButton(interaction) {
        const userId = interaction.user.id;
        const pending = pendingSelections.get(userId);

        if (!pending) {
            await interaction.update({
                components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(interaction.locale, 'responses.public.voice.error', { voiceId: '?' })))],
                files: [],
                flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
            });
            return;
        }

        const voiceId = pending.voice;
        const guildId = pending.guildId;
        pendingSelections.delete(userId);

        try {
            const updateVoice = db.transaction(() => {
                db.prepare('DELETE FROM voices WHERE user = ? AND guild = ?').run(userId, guildId);
                return db.prepare('INSERT INTO voices (user, guild, voice) VALUES (?, ?, ?)').run(userId, guildId, voiceId);
            });

            updateVoice();
            ostinato.invalidateCache(userId, guildId, 'voice');
            await interaction.update({
                components: [new ContainerBuilder().setAccentColor(0x337c97).addTextDisplayComponents(t => t.setContent(localize(interaction.locale, 'responses.public.voice.success', { voiceId })))],
                files: [],
                flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
            });
        } catch (error) {
            console.error(error);
            await interaction.update({
                components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(interaction.locale, 'responses.public.voice.error', { voiceId })))],
                files: [],
                flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
            });
        }
    }
}