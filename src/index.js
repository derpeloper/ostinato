/**
 * @file index.js
 * @description main entry point for the discord bot. initializes the client, loads handlers, and logs in.
 * "warning: may contain traces of nuts and bolts."
 */

/*
 * ostinato - bringing every message to life.
 * Copyright (C) 2026  derpeloper
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

const { Client, GatewayIntentBits, Collection, Options } = require(`discord.js`);
const fs = require('fs');
const client = new Client({ intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent, 
    GatewayIntentBits.GuildVoiceStates
], makeCache: Options.cacheWithLimits({ 
    MessageManager: 0,
    PresenceManager: 0,
    ThreadManager: 0,
    ReactionManager: 0,
    GuildScheduledEventManager: 0,
    StageInstanceManager: 0,
    GuildInviteManager: 0,
    GuildBanManager: 0,
    GuildStickerManager: 0
}) }); 

client.commands = new Collection();

const { token } = require('./env.json')


const functions = fs.readdirSync("./src/functions").filter(file => file.endsWith(".js"));
const eventFiles = fs.readdirSync("./src/events").filter(file => file.endsWith(".js"));
const commandFolders = fs.readdirSync("./src/commands");

const ostinato = require('./services/OstinatoTTS');
require('./data/db'); 

(async () => {
    try {
        await ostinato.initialize();
    } catch (e) {
        console.error('Failed to initialize OstinatoTTS:', e);
    }
    
    for (const file of functions) {
        require(`./functions/${file}`)(client);
    }
    
    client.handleEvents(eventFiles, "./src/events");
    client.handleCommands(commandFolders, "./src/commands");
    
    client.login(token);

    process.on('unhandledRejection', error => {
        console.error('[Main] Unhandled promise rejection:', error);
    });

    process.on('uncaughtException', error => {
        console.error('[Main] Uncaught Exception:', error);
    });

    process.on('warning', (warning) => {
        console.warn(`[Main] Process Warning: ${warning.name} | ${warning.message}`);
        if (warning.name === 'HeapLimitAllocationFailed') {
             console.error('[Main] FATAL: Heap limit allocation failed. We might be about to crash.');
        }
    });
})();


function logMemoryUsage(context = 'Process') {
    const used = process.memoryUsage();
    console.log(`[${context}] Memory: RSS ${(used.rss / 1024 / 1024).toFixed(2)}MB | Heap ${(used.heapUsed / 1024 / 1024).toFixed(2)}MB / ${(used.heapTotal / 1024 / 1024).toFixed(2)}MB | External ${(used.external / 1024 / 1024).toFixed(2)}MB`);
}

setInterval(() => logMemoryUsage('Main'), 5 * 60 * 1000);
logMemoryUsage('MainInit');

process.on('SIGINT', () => {
    console.log('\n[Main] Caught SIGINT. Exiting gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n[Main] Caught SIGTERM. Exiting gracefully...');
    process.exit(0);
});

process.on('exit', (code) => {
    console.log(`[Main] Process exiting with code: ${code}`);
});

process.on('beforeExit', (code) => {
    console.log(`[Main] Process beforeExit event with code: ${code}`);
});

process.on('uncaughtExceptionMonitor', (err, origin) => {
    console.error(`[Main] Uncaught Exception Monitor [${origin}]:`, err);
    logMemoryUsage('Crash');
});

