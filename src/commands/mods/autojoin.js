/**
 * @file autojoin.js
 * @description toggles the automatic voice channel join behavior for the guild.
 * "i'll follow you anywhere."
 */
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder } = require('discord.js');
const db = require('../../data/db');
const { localize, getCommandLocalizations } = require('../../localization/localize');
const ostinato = require('../../services/OstinatoTTS');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autojoin')
        .setDescription('toggle the bot automatically joining voice channels')
        .setNameLocalizations(getCommandLocalizations('mods', 'autojoin').nameLocalizations)
        .setDescriptionLocalizations(getCommandLocalizations('mods', 'autojoin').descriptionLocalizations)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        const guildId = interaction.guild.id;
        
        try {
            const row = db.prepare('SELECT enabled FROM autojoin WHERE guild = ?').get(guildId);
            const currentlyEnabled = row ? row.enabled === 1 : false;
            const newStatus = currentlyEnabled ? 0 : 1;

            db.prepare('INSERT OR REPLACE INTO autojoin (guild, enabled) VALUES (?, ?)').run(guildId, newStatus);
            
            ostinato.invalidateCache(null, guildId, 'autojoin');

            const msgKey = newStatus === 1 ? 'responses.mods.autojoin.enabled' : 'responses.mods.autojoin.disabled';
            
            await interaction.reply({ 
                components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(interaction.locale, msgKey)))], 
                flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] 
            });
            
        } catch (error) {
            console.error('[Autojoin Command] Error:', error);
            await interaction.reply({ 
                components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(interaction.locale, 'responses.mods.autojoin.error')))], 
                flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] 
            });
        }
    }
}
