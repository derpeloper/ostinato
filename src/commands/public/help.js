/**
 * @file help.js
 * @description provides information for all commands.
 * "when all else fails, read the manual."
 */
const { SlashCommandBuilder, ContainerBuilder, MessageFlags, SeparatorSpacingSize } = require('discord.js');
const { localize, getCommandLocalizations, getOptionLocalizations } = require('../../localization/localize');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('provides information for commands')
        .setNameLocalizations(getCommandLocalizations('public', 'help').nameLocalizations)
        .setDescriptionLocalizations(getCommandLocalizations('public', 'help').descriptionLocalizations)
        .addStringOption(option => option
            .setName('command')
            .setDescription('the command to get information about')
            .setNameLocalizations(getOptionLocalizations('public', 'help', 'command').nameLocalizations)
            .setDescriptionLocalizations(getOptionLocalizations('public', 'help', 'command').descriptionLocalizations)
            .setAutocomplete(true)
            .setRequired(false)
        ),
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const choices = [
            { id: 'help', group: 'public' },
            { id: 'voice', group: 'public' },
            { id: 'info', group: 'public' },
            { id: 'name', group: 'public' },
            { id: 'speed', group: 'public' },
            { id: 'lang', group: 'public' },
            { id: 'clear', group: 'mods' },
            { id: 'leave', group: 'public' },
            { id: 'restrict', group: 'mods' },
            { id: 'unrestrict', group: 'mods' },
            { id: 'skip', group: 'mods' },
            { id: 'tts', group: 'public' },
            { id: 'settings', group: 'public' }
        ];
        
        const locale = interaction.locale;
        
        const localizedChoices = choices.map(choice => {
            const locs = getCommandLocalizations(choice.group, choice.id).nameLocalizations;
            const locName = locs[locale] || choice.id;
            return { name: locName, value: choice.id };
        });

        const filtered = localizedChoices.filter(choice => 
            choice.name.toLowerCase().startsWith(focusedValue.toLowerCase()) || 
            choice.value.toLowerCase().startsWith(focusedValue.toLowerCase())
        );

        await interaction.respond(filtered.slice(0, 25));
    },
    async execute(interaction) {
        const command = interaction.options.getString('command');
        const locale = interaction.locale;

        const getHelpComponent = (cmdName) => {
            const pubCommands = ['help', 'voice', 'info', 'name', 'speed', 'lang', 'leave', 'tts', 'settings'];
            const cmdGroup = pubCommands.includes(cmdName) ? 'public' : 'mods';
            
            const locs = getCommandLocalizations(cmdGroup, cmdName).nameLocalizations;
            const titleName = locs[locale] || cmdName;

            return new ContainerBuilder()
                .setAccentColor(0x337c97)
                .addTextDisplayComponents(textDisplay => textDisplay
                    .setContent(`# ${titleName}`)
                )
                .addSeparatorComponents(separator => separator
                    .setSpacing(SeparatorSpacingSize.Large)
                    .setDivider(true)
                )
                .addTextDisplayComponents(textDisplay => textDisplay
                    .setContent(localize(locale, `responses.public.help.commands.${cmdName}`))
                );
        };

        if (!command) {
            await interaction.reply({
                components: [getHelpComponent('help')],
                flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
            });
            return;
        }

        const validCommands = ['help', 'voice', 'info', 'name', 'speed', 'lang', 'clear', 'leave', 'restrict', 'unrestrict', 'skip', 'tts', 'settings'];
        
        if (validCommands.includes(command.toLowerCase())) {
            await interaction.reply({
                components: [getHelpComponent(command.toLowerCase())],
                flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
            });
        } else {
            await interaction.reply({
                content: localize(locale, 'responses.public.help.notFound'),
                flags: MessageFlags.Ephemeral
            });
        }
    }
}