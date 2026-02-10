/**
 * @file handleCommands.js
 * @description function to handle loading and registering slash commands with discord api.
 * "i'm going to make him an offer he can't refuse... to run this command."
 */
const { REST } = require("@discordjs/rest");
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');

const { token } = require('../env.json')
const config = require('../config');

module.exports = (client) => {
    client.handleCommands = async (commandFolders, path) => {
        client.commandArray = [];
        for (folder of commandFolders) {
            const commandFiles = fs.readdirSync(`${path}/${folder}`).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                const command = require(`../commands/${folder}/${file}`);
                client.commands.set(command.data.name, command);
                client.commandArray.push(command.data.toJSON());
            }
        }

        const rest = new REST({
            version: '9'
        }).setToken(token);

        (async () => {
            try {
                console.log('[Command Handler] Started refreshing application (/) commands.');

                if (config.guildId) {
                    await rest.put(
                        Routes.applicationGuildCommands(config.clientId, config.guildId), {
                            body: client.commandArray
                        },
                    );
                    console.log(`[Command Handler] Successfully reloaded application (/) commands for guild: ${config.guildId}`);
                } else {
                    await rest.put(
                        Routes.applicationCommands(config.clientId), {
                            body: client.commandArray
                        },
                    );
                     console.log('[Command Handler] Successfully reloaded application (/) commands globally.');
                }

            } catch (error) {
                console.error(error);
            }
        })();
    };
};