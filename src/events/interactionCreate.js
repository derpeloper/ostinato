/**
 * @file interactionCreate.js
 * @description event handler for interaction creation (slash commands).
 * "you rang?"
 */
const { Interaction, MessageFlags } = require("discord.js");

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
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
            console.log(error);
            await interaction.reply({
                content: 'There was an error while executing this command!', 
                flags: MessageFlags.Ephemeral
            });
        } 
    },
};