/**
 * @file help.js
 * @description provides information about commands that this bot has to offer.
 * "help! i need somebody. help! not just anybody."
 */
const { SlashCommandBuilder, MessageFlags, ContainerBuilder, SeparatorSpacingSize } = require('discord.js')

const messages = {
    help: new ContainerBuilder().setAccentColor(0x337c97).addTextDisplayComponents(textDisplay => textDisplay.setContent('# help')).addSeparatorComponents(separator => separator.setSpacing(SeparatorSpacingSize.Large).setDivider(true)).addTextDisplayComponents(textDisplay => textDisplay.setContent('im pretty sure this command is self-explanatory. it provides information about commands that this bot has to offer.')),
    voice: new ContainerBuilder().setAccentColor(0x337c97).addTextDisplayComponents(textDisplay => textDisplay.setContent('# voice')).addSeparatorComponents(separator => separator.setSpacing(SeparatorSpacingSize.Large).setDivider(true)).addTextDisplayComponents(textDisplay => textDisplay.setContent('changes the voice for your account. \n\nif you are curious about how the voices sound like, you may refer to supertonic\'s [voices](https://supertone-inc.github.io/supertonic-py/voices/) page.\n\n-# voice preferences only affects the guild you use the command in so you can have different preferences per guild.')),
    info: new ContainerBuilder().setAccentColor(0x337c97).addTextDisplayComponents(textDisplay => textDisplay.setContent('# info')).addSeparatorComponents(separator => separator.setSpacing(SeparatorSpacingSize.Large).setDivider(true)).addTextDisplayComponents(textDisplay => textDisplay.setContent('provides information about the bot, including the notices for the terms of service and privacy policy.')),
    name: new ContainerBuilder().setAccentColor(0x337c97).addTextDisplayComponents(textDisplay => textDisplay.setContent('# name')).addSeparatorComponents(separator => separator.setSpacing(SeparatorSpacingSize.Large).setDivider(true)).addTextDisplayComponents(textDisplay => textDisplay.setContent('changes the name for your account. \n\n-# name preferences are per-server instead of being universal. this is to protect your privacy.')),
    speed: new ContainerBuilder().setAccentColor(0x337c97).addTextDisplayComponents(textDisplay => textDisplay.setContent('# speed')).addSeparatorComponents(separator => separator.setSpacing(SeparatorSpacingSize.Large).setDivider(true)).addTextDisplayComponents(textDisplay => textDisplay.setContent('changes the speed of the tts for your account. \n\nvalue must be between **0.5** and **2.0**. \n\n-# speeds are per-server instead of being universal.')),
    lang: new ContainerBuilder().setAccentColor(0x337c97).addTextDisplayComponents(textDisplay => textDisplay.setContent('# lang')).addSeparatorComponents(separator => separator.setSpacing(SeparatorSpacingSize.Large).setDivider(true)).addTextDisplayComponents(textDisplay => textDisplay.setContent('changes the language of the tts for your account. \n\nsupported languages: english, portuguese, korean, french, spanish. \n\n-# language preferences are per-server instead of being universal.')),
    clear: new ContainerBuilder().setAccentColor(0x337c97).addTextDisplayComponents(textDisplay => textDisplay.setContent('# clear')).addSeparatorComponents(separator => separator.setSpacing(SeparatorSpacingSize.Large).setDivider(true)).addTextDisplayComponents(textDisplay => textDisplay.setContent('clears the tts queue for the current server. \n\nrequires **Manage Messages** permission.')),
    leave: new ContainerBuilder().setAccentColor(0x337c97).addTextDisplayComponents(textDisplay => textDisplay.setContent('# leave')).addSeparatorComponents(separator => separator.setSpacing(SeparatorSpacingSize.Large).setDivider(true)).addTextDisplayComponents(textDisplay => textDisplay.setContent('forces the bot to disconnect from the voice channel.')),
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('provides information for commands')
        .addStringOption(option => option
            .setName('command')
            .setDescription('the command to get information about')
            .setAutocomplete(true)
            .setRequired(true)
        ),
    async autocomplete(interaction, client) {
        const focusedValue = interaction.options.getFocused();
        const commands = [
            { name: 'help', value: 'help' },
            { name: 'info', value: 'info' },
            { name: 'name', value: 'name' },
            { name: 'voice', value: 'voice' },
            { name: 'speed', value: 'speed' },
            { name: 'lang', value: 'lang' },
            { name: 'clear', value: 'clear' },
            { name: 'leave', value: 'leave' }
        ];
        const filtered = commands.filter(command => command.name.toLowerCase().includes(focusedValue.toLowerCase()));
        await interaction.respond(
            filtered.map(command => ({ name: command.name, value: command.value })),
        );
    },
    async execute(interaction, client) {
        const commandName = interaction.options.getString('command');
        if (messages[commandName]) {
             await interaction.reply({ components: [messages[commandName]], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        } else {
             await interaction.reply({ content: 'command info not found.', flags: MessageFlags.Ephemeral });
        }
    }
}