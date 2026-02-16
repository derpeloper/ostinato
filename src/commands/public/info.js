/**
 * @file info.js
 * @description provides information about the bot, including the notices for the terms of service and privacy policy.
 * "knowledge is power. but ignorance is bliss. take your pick."
 */

const { SlashCommandBuilder, ContainerBuilder, MessageFlags, SeparatorSpacingSize } = require("discord.js");

const container = new ContainerBuilder()
    .setAccentColor(0x337c97)

    .addTextDisplayComponents(textDisplay => textDisplay
        .setContent('# ostinato')
    )

    .addTextDisplayComponents(textDisplay => textDisplay
        .setContent('*giving a voice to the voiceless. and the socially awkward.*')
    )

    .addSeparatorComponents(separator => separator
        .setSpacing(SeparatorSpacingSize.Large)
        .setDivider(true)
    )

    .addTextDisplayComponents(textDisplay => textDisplay
        .setContent('## privacy policy')
    )

    .addTextDisplayComponents(textDisplay => textDisplay
        .setContent('**your stuff** (stored locally per-server)\n- **voice**: so you don\'t sound like a generic robot.\n- **speed**: zoom zoom or slow motion.\n- **name**: your alter ego.\n- **language**: for when you want to sound fancy.')
    )

    .addTextDisplayComponents(textDisplay => textDisplay
        .setContent('**boring system data**\n- **opt-out**: we remember if you told us to shut up (`/tts off`).\n- **guild settings**: just to know if we should ignore unmuted people.')
    )

    .addTextDisplayComponents(textDisplay => textDisplay
        .setContent('-# we do not log your messages, generate audio files, or sell your data. your secrets are safe, mostly because they are probably boring.')
    )
    
    .addSeparatorComponents(separator => separator
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(false)
    )

    .addTextDisplayComponents(textDisplay => textDisplay
        .setContent('## terms of service')
    )

    .addTextDisplayComponents(textDisplay => textDisplay
        .setContent('provided "as-is". adhere to discord tos. or don\'t. we aren\'t your parents.')
    )
    
    .addSeparatorComponents(separator => separator
        .setSpacing(SeparatorSpacingSize.Large)
        .setDivider(true)
    )

    .addTextDisplayComponents(textDisplay => textDisplay
        .setContent('-# version: 1.0.0 | engine: supertonic v2 | [github](https://github.com/derpeloper/ostinato)\n-# bugs? probably. features? definitely.')
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
