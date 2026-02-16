/**
 * @file tts.js
 * @description allows users to opt-in or opt-out of tts processing.
 * "to speak or not to speak, that is the question."
 */
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../../data/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tts')
        .setDescription('manage your tts preferences')
        .addSubcommand(subcommand =>
            subcommand
                .setName('on')
                .setDescription('turn on tts for your messages')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('off')
                .setDescription('turn off tts for your messages')
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        try {
            const row = db.prepare('SELECT user FROM disabled WHERE user = ?').get(userId);

            if (subcommand === 'off') {
                if (row) {
                    await interaction.reply({ content: 'tts is already **off** for you.', flags: MessageFlags.Ephemeral });
                } else {
                    db.prepare('INSERT OR IGNORE INTO disabled (user) VALUES (?)').run(userId);
                    await interaction.reply({ content: 'tts is now **off** for you.', flags: MessageFlags.Ephemeral });
                }
            } else if (subcommand === 'on') {
                if (!row) {
                    await interaction.reply({ content: 'tts is already **on** for you.', flags: MessageFlags.Ephemeral });
                } else {
                    db.prepare('DELETE FROM disabled WHERE user = ?').run(userId);
                    await interaction.reply({ content: 'tts is now **on** for you.', flags: MessageFlags.Ephemeral });
                }
            }
        } catch (error) {
            console.error('[TTS Command] Error:', error);
            await interaction.reply({ content: 'failed to update settings.', flags: MessageFlags.Ephemeral });
        }
    }
}
