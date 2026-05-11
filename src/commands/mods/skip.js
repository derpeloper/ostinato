/**
 * @file skip.js
 * @description skips the current playing tts message.
 * "next, please."
 */
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder } = require('discord.js');
const ostinato = require('../../services/OstinatoTTS');
const { localize, getCommandLocalizations } = require('../../localization/localize');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('skips the currently playing message')
        .setNameLocalizations(getCommandLocalizations('mods', 'skip').nameLocalizations)
        .setDescriptionLocalizations(getCommandLocalizations('mods', 'skip').descriptionLocalizations)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
        const guildId = interaction.guild.id;
        
        try {
            const result = ostinato.skip(guildId);
            
            if (result === 'SKIPPED') {
                await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(interaction.locale, 'responses.mods.skip.success')))], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
            } else if (result === 'TOO_SHORT') {
                await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(interaction.locale, 'responses.mods.skip.tooShort')))], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
            } else if (result === 'NOT_PLAYING') {
                await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(interaction.locale, 'responses.mods.skip.notPlaying')))], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
            } else {
                 await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(interaction.locale, 'responses.mods.skip.unknown')))], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
            }

        } catch (error) {
            console.error(error);
            await interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(interaction.locale, 'responses.mods.skip.error')))], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        }
    }
}
