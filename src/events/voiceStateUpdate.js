/**
 * @file voiceStateUpdate.js
 * @description event handler for voice state updates. triggers auto-disconnect logic in ostinatotts when a channel becomes empty.
 * "all by myself... don't wanna be..."
 */
const ostinato = require('../services/OstinatoTTS');
const { getVoiceConnection, joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        if (oldState.member.id === oldState.client.user.id) {
             if (!newState.channelId) {
                 console.log(`[voiceStateUpdate] I have been disconnected from ${oldState.guild.name}! "How rude!"`);
                 ostinato.handleBotDisconnect(oldState.guild.id);
                 return;
             }
        }
        
        if (!oldState.channelId && newState.channelId && !newState.member.user.bot) {
            const guildId = newState.guild.id;
            const connection = getVoiceConnection(guildId);
            
            if (!connection) {
                const autojoinEnabled = ostinato.isAutojoinEnabled(guildId);
                if (autojoinEnabled) {
                    console.log(`[voiceStateUpdate] Autojoin triggered for guild ${guildId} by user ${newState.member.user.username}`);
                    try {
                        const newConnection = joinVoiceChannel({
                            channelId: newState.channelId,
                            guildId: guildId.toString(),
                            adapterCreator: newState.guild.voiceAdapterCreator,
                            selfDeaf: true,
                            selfMute: false
                        });

                        await entersState(newConnection, VoiceConnectionStatus.Ready, 20_000);
                        console.log('[voiceStateUpdate] Autojoin Voice Connection Ready.');

                        if (!ostinato.playbackQueues.has(guildId)) {
                            const { createAudioPlayer, AudioPlayerStatus } = require('@discordjs/voice');
                            const player = createAudioPlayer();
                            
                            player.on('stateChange', (oldState, newState) => {
                                if (newState.status === AudioPlayerStatus.Idle) {
                                    ostinato.playNext(guildId);
                                }
                            });

                            player.on('error', error => {
                                console.error(`[OstinatoTTS] Audio player error: ${error.message}`);
                                ostinato.playNext(guildId); 
                            });

                            ostinato.playbackQueues.set(guildId, {
                                queue: [],
                                isPlaying: false,
                                player: player,
                                connection: newConnection,
                                currentIsLong: false,
                                currentTextLength: 0,
                                lastSpeakerId: null 
                            });

                            newConnection.subscribe(player);
                        }

                    } catch (error) {
                        if (error?.name === 'AbortError') {
                            console.error('[voiceStateUpdate] Autojoin voice connection timed out.');
                        } else {
                            console.error('[voiceStateUpdate] Failed to autojoin voice channel:', error);
                        }
                    }
                }
            }
        }

        ostinato.handleVoiceStateUpdate(oldState, newState);
    },
};
