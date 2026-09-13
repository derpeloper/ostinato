/**
 * @file interactionCreate.js
 * @description event handler for interaction creation (slash commands).
 * "you rang?"
 */
const { MessageFlags, ContainerBuilder } = require("discord.js");

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'voice_select') {
                const voiceCommand = client.commands.get('voice');
                if (voiceCommand && voiceCommand.handleSelectMenu) {
                    try {
                        await voiceCommand.handleSelectMenu(interaction);
                    } catch (error) {
                        console.error('[interactionCreate] voice select menu error:', error);
                    }
                }
            }
            return;
        }

        if (interaction.isButton()) {
            if (interaction.customId.startsWith('voice_')) {
                const voiceCommand = client.commands.get('voice');
                if (voiceCommand) {
                    try {
                        if (interaction.customId.startsWith('voice_preview:')) {
                            const voiceId = interaction.customId.split(':')[1];
                            if (voiceCommand.handlePreview) {
                                await voiceCommand.handlePreview(interaction, voiceId);
                            }
                        } else if (interaction.customId.startsWith('voice_confirm:')) {
                            const voiceId = interaction.customId.split(':')[1];
                            if (voiceCommand.handleConfirm) {
                                await voiceCommand.handleConfirm(interaction, voiceId);
                            }
                        }
                    } catch (error) {
                        console.error('[interactionCreate] voice button error:', error);
                    }
                }
            }
            return;
        }

        if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.autocomplete(interaction, client);
            } catch (error) {
                console.error(error);
            }
            return;
        }

        if (!interaction.isCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) return
        
        try{
            await command.execute(interaction, client);
        } catch (error) {
            console.error(error);
            try {
                const reply = {
                    components: [new ContainerBuilder().addTextDisplayComponents(t => t.setContent('there was an error while executing this command.'))], 
                    flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
                };
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply);
                } else {
                    await interaction.reply(reply);
                }
            } catch (replyError) {
                console.error('[interactionCreate] Failed to send error reply:', replyError);
            }
        } 
    },
};