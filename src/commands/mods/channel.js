/**
 * @file channel.js
 * @description manage the guild's alternative chat channel for tts.
 * "talk here, heard there."
 */
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } = require('discord.js');
const db = require('../../data/db');
const { localize, getCommandLocalizations, getSubcommandLocalizations, getDeepOptionLocalizations } = require('../../localization/localize');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('channel')
        .setDescription('manage the guild\'s alternative chat channel')
        .setNameLocalizations(getCommandLocalizations('mods', 'channel').nameLocalizations)
        .setDescriptionLocalizations(getCommandLocalizations('mods', 'channel').descriptionLocalizations)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(sub => sub
            .setName('set')
            .setDescription('set a channel as the alternative chat')
            .setNameLocalizations(getSubcommandLocalizations('mods', 'channel', 'set').nameLocalizations)
            .setDescriptionLocalizations(getSubcommandLocalizations('mods', 'channel', 'set').descriptionLocalizations)
            .addChannelOption(option => option
                .setName('channel')
                .setDescription('the channel to set')
                .setNameLocalizations(getDeepOptionLocalizations('mods', 'channel', 'subcommands', 'set', 'options', 'channel').nameLocalizations)
                .setDescriptionLocalizations(getDeepOptionLocalizations('mods', 'channel', 'subcommands', 'set', 'options', 'channel').descriptionLocalizations)
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
            )
        )
        .addSubcommand(sub => sub
            .setName('remove')
            .setDescription('remove the current alternative chat channel')
            .setNameLocalizations(getSubcommandLocalizations('mods', 'channel', 'remove').nameLocalizations)
            .setDescriptionLocalizations(getSubcommandLocalizations('mods', 'channel', 'remove').descriptionLocalizations)
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const locale = interaction.locale;

        try {
            if (subcommand === 'set') {
                const channel = interaction.options.getChannel('channel');
                db.prepare('INSERT OR REPLACE INTO alt_channels (guild, channel) VALUES (?, ?)').run(guildId, channel.id);
                await interaction.reply({ content: localize(locale, 'responses.mods.channel.success', { channel: `<#${channel.id}>` }), flags: MessageFlags.Ephemeral });

            } else if (subcommand === 'remove') {
                const result = db.prepare('DELETE FROM alt_channels WHERE guild = ?').run(guildId);
                if (result.changes === 0) {
                    return await interaction.reply({ content: localize(locale, 'responses.mods.channel.noneSet'), flags: MessageFlags.Ephemeral });
                }
                await interaction.reply({ content: localize(locale, 'responses.mods.channel.removed'), flags: MessageFlags.Ephemeral });
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: localize(locale, 'responses.mods.channel.error'), flags: MessageFlags.Ephemeral });
        }
    }
}
