/**
 * @file info.js
 * @description provides information about the bot, including the notices for the terms of service and privacy policy.
 * "knowledge is power. but ignorance is bliss. take your pick."
 */

const { SlashCommandBuilder, ContainerBuilder, MessageFlags, SeparatorSpacingSize } = require("discord.js");

const container = new ContainerBuilder()
    .setAccentColor(0x337c97)

    .addTextDisplayComponents(textDisplay => textDisplay
        .setContent('# information')
    )

    .addTextDisplayComponents(textDisplay => textDisplay
        .setContent('a simple, open-sourced bot that utilises supertonic as a tts inference. it does exactly what it says on the tin, assuming the tin is made of code.')
    )

    .addSeparatorComponents(separator => separator
        .setSpacing(SeparatorSpacingSize.Large)
        .setDivider(true)
    )

    .addTextDisplayComponents(textDisplay => textDisplay
        .setContent('## privacy policy')
    )

    .addTextDisplayComponents(textDisplay => textDisplay
        .setContent('### user data')
    )

    .addTextDisplayComponents(textDisplay => textDisplay
        .setContent('we locally store your preferences (nickname, voice, speed, language) per-server. so your chaotic settings here won\'t leak elsewhere.')
    )

    .addTextDisplayComponents(textDisplay => textDisplay
        .setContent('### guild data')
    )

    .addTextDisplayComponents(textDisplay => textDisplay
        .setContent('we only store the guild identifier to keep track of the "muted-only" setting. that is the full extent of our surveillance state.')
    )

    .addTextDisplayComponents(textDisplay => textDisplay
        .setContent('-# we do not sell or share data. your secrets are safe, largely because they are boring.')
    )
    
    .addSeparatorComponents(separator => separator
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(false)
    )

    .addTextDisplayComponents(textDisplay => textDisplay
        .setContent('## terms of service')
    )

    .addTextDisplayComponents(textDisplay => textDisplay
        .setContent('adhere to discord\'s tos, and this bot is provided "as-is". use it wisely, or don\'t. we aren\'t your parents.')
    )
    
    .addSeparatorComponents(separator => separator
        .setSpacing(SeparatorSpacingSize.Large)
        .setDivider(true)
    )

    .addTextDisplayComponents(textDisplay => textDisplay
        .setContent('-# bot version: 0.95.7-beta\n-# github: [derpeloper/ostinato](https://github.com/derpeloper/ostinato)\n-# supertonic version: 2\n\n-# this bot is in beta, expect frequent updates, changes, bugs, and outages')
    )

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('provides information about the bot'),

    async execute(interaction) {
        await interaction.reply({
            components: [container],
            flags: [ MessageFlags.Ephemeral, MessageFlags.IsComponentsV2 ]
        })
    }
}
