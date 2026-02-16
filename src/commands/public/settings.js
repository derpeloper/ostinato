/**
 * @file settings.js
 * @description displays the user's current tts settings.
 * "know thyself."
 */
const { SlashCommandBuilder, ContainerBuilder, MessageFlags, SeparatorSpacingSize } = require('discord.js');
const config = require('../../config');
const ostinato = require('../../services/OstinatoTTS');
const db = require('../../data/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('check your current tts settings'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        // -- VOICE --
        let voiceDisplay = "";
        const defaultVoice = ostinato.getDefaultVoice(userId);
        try {
            const row = db.prepare('SELECT voice FROM voices WHERE user = ? AND guild = ? ORDER BY rowid DESC LIMIT 1').get(userId, guildId);
            if (row) {
                voiceDisplay = `\`${row.voice}\` (Default: \`${defaultVoice}\`)`;
            } else {
                voiceDisplay = `\`Not set\` (Default: \`${defaultVoice}\`)`;
            }
        } catch (e) {
            voiceDisplay = `\`Not set\` (Default: \`${defaultVoice}\`)`;
        }

        // -- NAME --
        let nameDisplay = "";
        const defaultName = interaction.user.username;
        try {
            const row = db.prepare('SELECT name FROM names WHERE user = ? AND guild = ? ORDER BY rowid DESC LIMIT 1').get(userId, guildId);
            if (row) {
                 nameDisplay = `\`${row.name}\` (Default: \`${defaultName}\`)`;
            } else {
                 nameDisplay = `\`Not set\` (Default: \`${defaultName}\`)`;
            }
        } catch (e) {
             nameDisplay = `\`Not set\` (Default: \`${defaultName}\`)`;
        }

        // -- SPEED --
        let speedDisplay = "";
        const defaultSpeed = config.ttsSpeed || 1.16;
        try {
            const row = db.prepare('SELECT speed FROM speeds WHERE user = ? AND guild = ? ORDER BY rowid DESC LIMIT 1').get(userId, guildId);
            if (row) {
                speedDisplay = `\`${row.speed}\` (Default: \`${defaultSpeed}\`)`;
            } else {
                speedDisplay = `\`Not set\` (Default: \`${defaultSpeed}\`)`;
            }
        } catch (e) {
            speedDisplay = `\`Not set\` (Default: \`${defaultSpeed}\`)`;
        }

        // -- LANG --
        let langDisplay = "";
        const defaultLang = "Auto"; 
        try {
            const row = db.prepare('SELECT lang FROM langs WHERE user = ? AND guild = ? ORDER BY rowid DESC LIMIT 1').get(userId, guildId);
            if (row) {
                langDisplay = `\`${row.lang}\` (Default: \`${defaultLang}\`)`;
            } else {
                langDisplay = `\`Not set\` (Default: \`${defaultLang}\`)`;
            }
        } catch (e) {
            langDisplay = `\`Not set\` (Default: \`${defaultLang}\`)`;
        }

        const container = new ContainerBuilder()
            .setAccentColor(0x337c97)
            .addTextDisplayComponents(textDisplay => textDisplay
                .setContent('# settings')
            )
            .addSeparatorComponents(separator => separator
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(false)
            )
            .addTextDisplayComponents(textDisplay => textDisplay
                .setContent(`**voice**: ${voiceDisplay}`)
            )
            .addTextDisplayComponents(textDisplay => textDisplay
                .setContent(`**name**: ${nameDisplay}`)
            )
            .addTextDisplayComponents(textDisplay => textDisplay
                .setContent(`**speed**: ${speedDisplay}`)
            )
            .addTextDisplayComponents(textDisplay => textDisplay
                .setContent(`**lang**: ${langDisplay}`)
            );

        await interaction.reply({
            components: [container],
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
    }
}
