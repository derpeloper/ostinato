/**
 * @file info.js
 * @description provides information about the bot, privacy, and tos.
 * "for the lawyers."
 */
const { SlashCommandBuilder, ContainerBuilder, MessageFlags, SeparatorSpacingSize } = require('discord.js');
const { localize, getCommandLocalizations } = require('../../localization/localize');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('provides information about the bot')
        .setNameLocalizations(getCommandLocalizations('public', 'info').nameLocalizations)
        .setDescriptionLocalizations(getCommandLocalizations('public', 'info').descriptionLocalizations),

    async execute(interaction) {
        const container = new ContainerBuilder()
            .setAccentColor(0x337c97)
            .addTextDisplayComponents(textDisplay => textDisplay
                .setContent(localize(interaction.locale, 'responses.public.info.title'))
            )
            .addSeparatorComponents(separator => separator
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(true)
            )
            .addTextDisplayComponents(textDisplay => textDisplay
                .setContent(localize(interaction.locale, 'responses.public.info.subtitle'))
            )
            .addSeparatorComponents(separator => separator
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(false)
            )
            .addTextDisplayComponents(textDisplay => textDisplay
                .setContent(localize(interaction.locale, 'responses.public.info.privacyHeader'))
            )
            .addTextDisplayComponents(textDisplay => textDisplay
                .setContent(localize(interaction.locale, 'responses.public.info.privacySettings'))
            )
            .addSeparatorComponents(separator => separator
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(false)
            )
            .addTextDisplayComponents(textDisplay => textDisplay
                .setContent(localize(interaction.locale, 'responses.public.info.privacySystem'))
            )
            .addTextDisplayComponents(textDisplay => textDisplay
                .setContent(localize(interaction.locale, 'responses.public.info.privacyFooter'))
            )
            .addSeparatorComponents(separator => separator
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(false)
            )
            .addTextDisplayComponents(textDisplay => textDisplay
                .setContent(localize(interaction.locale, 'responses.public.info.tosHeader'))
            )
            .addTextDisplayComponents(textDisplay => textDisplay
                .setContent(localize(interaction.locale, 'responses.public.info.tosBody'))
            )
            .addSeparatorComponents(separator => separator
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(false)
            )
            .addTextDisplayComponents(textDisplay => textDisplay
                .setContent(localize(interaction.locale, 'responses.public.info.versionFooter'))
            );

        await interaction.reply({
            components: [container],
            flags: [ MessageFlags.Ephemeral, MessageFlags.IsComponentsV2 ]
        });
    }
}
