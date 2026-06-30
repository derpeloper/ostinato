/**
 * @file inject.js
 * @description allows a user to send messages directly to the VC without being connected.
 * "speaking from the void."
 */
const { SlashCommandBuilder, MessageFlags, ContainerBuilder, PermissionFlagsBits } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const config = require('../../config');
const db = require('../../data/db');
const ostinato = require('../../services/OstinatoTTS');
const { localize, getCommandLocalizations, getOptionLocalizations } = require('../../localization/localize');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inject')
        .setDescription('send a message to the voice channel without joining')
        .setNameLocalizations(getCommandLocalizations('public', 'inject').nameLocalizations)
        .setDescriptionLocalizations(getCommandLocalizations('public', 'inject').descriptionLocalizations)
        .addStringOption(option => option
            .setName('message')
            .setDescription('the message to inject (max 200 chars)')
            .setNameLocalizations(getOptionLocalizations('public', 'inject', 'message').nameLocalizations)
            .setDescriptionLocalizations(getOptionLocalizations('public', 'inject', 'message').descriptionLocalizations)
            .setMaxLength(200)
            .setRequired(true)
        ),
        
    async execute(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        const messageContent = interaction.options.getString('message');
        
        const connection = getVoiceConnection(guildId);
        if (!connection) {
            return await interaction.reply({
                components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(interaction.locale, 'responses.public.inject.noConnection')))],
                flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
            });
        }

        const isAdminOrMod = interaction.memberPermissions ? interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages) : false;

        if (!isAdminOrMod) {
            const now = Date.now();
            const limit = config.injectLimit || 5;
            const windowMs = config.injectWindow || 3600000;
            const windowStart = now - windowMs;

            try {
                db.prepare('DELETE FROM inject_usage WHERE used_at < ?').run(windowStart);

                const usageRow = db.prepare('SELECT COUNT(*) as count FROM inject_usage WHERE user = ? AND guild = ? AND used_at >= ?').get(userId, guildId, windowStart);
                const currentCount = usageRow ? usageRow.count : 0;

                if (currentCount >= limit) {
                    return await interaction.reply({
                        components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(interaction.locale, 'responses.public.inject.rateLimited', { limit })))],
                        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
                    });
                }
                
                db.prepare('INSERT INTO inject_usage (user, guild, used_at) VALUES (?, ?, ?)').run(userId, guildId, now);
            } catch (dbError) {
                console.error('[Inject Command] DB Error:', dbError);
                return await interaction.reply({
                    components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(interaction.locale, 'responses.public.inject.error')))],
                    flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
                });
            }
        }

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        try {
            const fakeMessage = {
                content: messageContent,
                author: interaction.user,
                member: interaction.member,
                guild: interaction.guild,
                stickers: new Map(),
                attachments: new Map(),
                _injected: true,
                reply: async (msg) => {
                    await interaction.followUp({ content: msg, flags: MessageFlags.Ephemeral });
                }
            };

            await ostinato.processMessage(fakeMessage);
            
            await interaction.editReply({
                components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(interaction.locale, 'responses.public.inject.success')))],
                flags: [MessageFlags.IsComponentsV2]
            });

        } catch (error) {
            console.error('[Inject Command] Processing Error:', error);
            await interaction.editReply({
                components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent(localize(interaction.locale, 'responses.public.inject.error')))],
                flags: [MessageFlags.IsComponentsV2]
            });
        }
    }
}
