/**
 * @file OstinatoTTS.js
 * @description main service class for handling text-to-speech generation and playback management.
 * "actions speak louder than words, but sometimes words need to be spoken to be heard."
 */
const path = require('path');
const fs = require('fs');
const { createAudioResource, StreamType, joinVoiceChannel, getVoiceConnection, AudioPlayerStatus, createAudioPlayer, entersState, VoiceConnectionStatus } = require('@discordjs/voice');
const { Readable } = require('stream');
const config = require('../config');
const db = require('../data/db');

class Semaphore {
    constructor(max) {
        this.max = max;
        this.current = 0;
        this.queue = [];
    }

    async acquire() {
        if (this.current < this.max) {
            this.current++;
            return;
        }
        return new Promise(resolve => this.queue.push(resolve));
    }

    release() {
        this.current--;
        if (this.queue.length > 0) {
            this.current++;
            const resolve = this.queue.shift();
            resolve();
        }
    }
}

class OstinatoTTS {
    constructor() {
        this.worker = null;
        this.initialized = false;
        let concurrency = config.maxConcurrency;
        if (concurrency === undefined || concurrency === null) {
             console.warn('[OstinatoTTS] config.maxConcurrency is missing. falling back to backend default: 6');
             concurrency = 6;
        }
        this.processingSemaphore = new Semaphore(concurrency);
        this.playbackQueues = new Map();
        
        this.pendingRequests = new Map();
        this.requestIdCounter = 0;
        this.sampleRate = 24000;
    }

    async initialize() {
        if (this.initialized) return;

        console.log('[OstinatoTTS] Initializing Worker...');
        await this.startWorker();
        this.startHeartbeat();
    }

    async startWorker() {
        try {
            const { Worker } = require('worker_threads');
            this.worker = new Worker(path.join(__dirname, 'ttsWorker.js'));

            this.worker.on('message', (msg) => {
                try {
                    if (msg.type === 'init_success') {
                        this.sampleRate = msg.sampleRate;
                        this.initialized = true;
                        console.log('[OstinatoTTS] Worker Initialized.');
                    } else if (msg.type === 'error') {
                        console.error('[OstinatoTTS] Worker Error:', msg.error);
                    } else if (msg.type === 'response') {
                        this.handleWorkerResponse(msg);
                    }
                } catch (err) {
                    console.error('[OstinatoTTS] Error in worker message handler:', err);
                }
            });

            this.worker.on('error', (err) => {
                console.error('[OstinatoTTS] Worker Thread Error:', err);
            });

            this.worker.on('exit', async (code) => {
                if (code !== 0) {
                     console.error(new Error(`[OstinatoTTS] Worker stopped with exit code ${code}`));
                }
                
                console.log('[OstinatoTTS] Worker died. Restarting in 1 second...');
                this.initialized = false;
                this.worker = null;
                
                for (const [requestId, request] of this.pendingRequests.entries()) {
                    request.reject(new Error('Worker crashed during generation'));
                }
                this.pendingRequests.clear();

                await new Promise(r => setTimeout(r, 1000));
                this.startWorker();
            });

            this.worker.postMessage({ type: 'initialize' });

            let attempts = 0;
            while (!this.initialized && attempts < 120) {
                await new Promise(r => setTimeout(r, 500));
                attempts++;
            }
            
            if (!this.initialized) throw new Error("Worker initialization timed out");

        } catch (error) {
            console.error('[OstinatoTTS] Failed to initialize:', error);
            this.initialized = false; 
        }
    }

    handleWorkerResponse(msg) {
        const { requestId, success, buffer, error, lang, detected } = msg;
        const request = this.pendingRequests.get(requestId);
        
        if (request) {
            if (success) {
                request.resolve({ buffer, lang, detected });
            } else {
                request.reject(new Error(error));
            }
            this.pendingRequests.delete(requestId);
        }
    }

    async generateAudio(text, userId, voiceId, speed, lang) {
        if (!this.initialized) await this.initialize();

        let finalSpeed = speed;
        if (finalSpeed === undefined || finalSpeed === null || isNaN(finalSpeed)) {
             finalSpeed = config.ttsSpeed;
             if (finalSpeed === undefined || finalSpeed === null) {
                 console.warn('[OstinatoTTS] config.ttsSpeed is missing. falling back to backend default: 1.16');
                 finalSpeed = 1.16;
             }
        }

        return new Promise((resolve, reject) => {
            const requestId = this.requestIdCounter++;
            this.pendingRequests.set(requestId, { resolve, reject });
            
            this.worker.postMessage({
                type: 'generate',
                requestId,
                text,
                userId,
                voiceId,
                speed: finalSpeed,
                lang: lang // Pass the forced language if set
            });
        });
    }

    async processMessage(message) {
        if (!this.initialized) await this.initialize();

        const originalContent = message.content;
        
        const guildId = message.guild.id;

        try {
            const setting = db.prepare('SELECT restricted FROM restrictions WHERE guild = ?').get(guildId);
            if (setting && setting.restricted === 1) {
                if (!message.member.voice.selfMute && !message.member.voice.serverMute) {
                     console.log(`[OstinatoTTS] Ignored non-muted user ${message.author.username} in restricted guild.`);
                     return;
                }
            }
        } catch (err) {
            console.error('[OstinatoTTS] Error checking restrictions:', err);
        }
        
        const existingQueue = this.playbackQueues.get(guildId);
        const lastSpeaker = existingQueue ? existingQueue.lastSpeakerId : null;
        const shouldAnnounceName = lastSpeaker !== message.author.id;
        
        if (!this.playbackQueues.has(guildId)) {
            const player = createAudioPlayer();
            
            player.on('stateChange', (oldState, newState) => {
                if (newState.status === AudioPlayerStatus.Idle) {
                    this.playNext(guildId);
                }
            });

            player.on('error', error => {
                console.error(`[OstinatoTTS] Audio player error: ${error.message}`);
                this.playNext(guildId); 
            });

            this.playbackQueues.set(guildId, {
                queue: [],
                isPlaying: false,
                player: player,
                connection: null,
                currentIsLong: false,
                lastSpeakerId: null 
            });
        }

        const queueData = this.playbackQueues.get(guildId);
        
        let connection = getVoiceConnection(guildId);
        if (!connection) {
            if (message.member.voice.channel) {
                console.log(`[OstinatoTTS] Joining VC: ${message.member.voice.channel.name}`);
                connection = joinVoiceChannel({
                    channelId: message.member.voice.channel.id,
                    guildId: guildId.toString(),
                    adapterCreator: message.guild.voiceAdapterCreator,
                    selfDeaf: true,
                    selfMute: false
                });

                const originalSetSpeaking = connection.setSpeaking;
                connection.setSpeaking = (speaking) => {
                    if (speaking) return originalSetSpeaking.call(connection, 4); 
                    return originalSetSpeaking.call(connection, speaking);
                };

                try {
                    await entersState(connection, VoiceConnectionStatus.Ready, 5_000);
                    console.log('[OstinatoTTS] Voice Connection Ready.');
                } catch (error) {
                    console.error('[OstinatoTTS] Failed to join voice channel within 5s:', error);
                    connection.destroy();
                    return;
                }

                queueData.connection = connection;
            } else {
                console.log('[OstinatoTTS] User not in VC, ignoring.');
                return; 
            }
        }

        const sub = connection.subscribe(queueData.player);
        if (!sub) console.warn('[OstinatoTTS] Failed to subscribe player to connection.');
        
        const isLong = originalContent.length > 175;

        if (queueData.isPlaying && queueData.currentIsLong) {
            console.log(`[OstinatoTTS] Interrupting long message.`);
            queueData.player.stop(); 
        }
        
        const taskPromise = (async () => {
            await this.processingSemaphore.acquire();
            try {
                let nameToUse = message.author.username;
                try {
                    const nameRow = db.prepare('SELECT name FROM names WHERE user = ? AND guild = ? ORDER BY rowid DESC LIMIT 1').get(message.author.id, guildId);
                    if (nameRow) nameToUse = nameRow.name;
                } catch (dbErr) {
                    console.error('[OstinatoTTS] DB Name fetch error:', dbErr);
                }

                let fullContent = originalContent;
                if (shouldAnnounceName) {
                    fullContent = `${nameToUse} said: ${originalContent}`;
                }

                let voiceId = null;
                try {
                    const voiceRow = db.prepare('SELECT voice FROM voices WHERE user = ? AND guild = ? ORDER BY rowid DESC LIMIT 1').get(message.author.id, guildId);
                    if (voiceRow) voiceId = voiceRow.voice;
                } catch (dbErr) {
                     console.error('[OstinatoTTS] DB Voice fetch error:', dbErr);
                }

                let speed = null;
                try {
                    const speedRow = db.prepare('SELECT speed FROM speeds WHERE user = ? AND guild = ? ORDER BY rowid DESC LIMIT 1').get(message.author.id, guildId);
                    if (speedRow) speed = speedRow.speed;
                } catch (dbErr) {
                     console.error('[OstinatoTTS] DB Speed fetch error:', dbErr);
                }

                let lang = null;
                try {
                    const langRow = db.prepare('SELECT lang FROM langs WHERE user = ? AND guild = ? ORDER BY rowid DESC LIMIT 1').get(message.author.id, guildId);
                    if (langRow) lang = langRow.lang;
                } catch (dbErr) {
                     console.error('[OstinatoTTS] DB Lang fetch error:', dbErr);
                }

                console.log(`[OstinatoTTS] Requesting generation for ${message.author.username} (Voice: ${voiceId || 'Default'} | Speed: ${speed || 'Default'} | Lang: ${lang || 'Auto'})...`);
                const start = Date.now();
                
                const { buffer, lang: usedLang, detected } = await this.generateAudio(fullContent, message.author.id, voiceId, speed, lang);
                
                if (!buffer) {
                     console.log(`[OstinatoTTS] Worker returned no audio. Text: "${fullContent}" | Detected: ${detected} | Supported: ${this.supportedLangs}`);
                     return null;
                }

                console.log(`[OstinatoTTS] Received ${buffer.length} bytes in ${Date.now() - start}ms. Lang: ${lang}`);
                
                const resource = createAudioResource(Readable.from([buffer]), { inlineVolume: true });
                
                let volume = config.ttsVolume;
                if (volume === undefined || volume === null) {
                     console.warn('[OstinatoTTS] config.ttsVolume is missing. falling back to backend default: 5.89');
                     volume = 5.89;
                }
                resource.volume.setVolume(volume);
                return resource; 
            } catch (e) {
                console.error('[OstinatoTTS] Generation error:', e);
                
                if (e.message && (e.message.includes('Non-zero status code') || e.message.includes('BroadcastIterator'))) {
                    try {
                        await message.reply("the engine failed to process this. it hit a tensor dimensionality mismatch (the engine got a bit confused by how this message was structured).");
                    } catch (replyError) {
                        console.error('[OstinatoTTS] Failed to reply to user:', replyError);
                    }
                }
                
                return null;
            } finally {
                this.processingSemaphore.release();
            }
        })();

        queueData.lastSpeakerId = message.author.id;
        queueData.queue.push({ task: taskPromise, isLong });

        if (!queueData.isPlaying) {
            this.playNext(guildId);
        }
    }

    async playNext(guildId) {
        const queueData = this.playbackQueues.get(guildId);
        if (!queueData) return;

        if (queueData.queue.length === 0) {
            queueData.isPlaying = false;
            queueData.currentIsLong = false;
            return;
        }

        queueData.isPlaying = true;
        const item = queueData.queue[0]; 
        queueData.currentIsLong = item.isLong;
        
        try {
            const resource = await item.task;
            queueData.queue.shift(); 

            if (resource) {
                console.log(`[OstinatoTTS] Playing...`);
                
                // Monitor resource for errors that might kill the stream silently
                resource.playStream.on('error', (error) => {
                    console.error('[OstinatoTTS] Audio Resource Stream Error:', error);
                    // Force skip to next if stream dies
                    this.playNext(guildId); 
                });

                queueData.player.play(resource);
            } else {
                this.playNext(guildId);
            }
        } catch (e) {
            console.error('[OstinatoTTS] Playback error:', e);
            queueData.queue.shift();
            this.playNext(guildId);
        }
    }

    handleVoiceStateUpdate(oldState, newState) {
        const guildId = oldState.guild.id;
        const connection = getVoiceConnection(guildId);
        
        if (!connection) return;

        const channelId = connection.joinConfig.channelId;
        if (!channelId) return;

        const channel = oldState.guild.channels.cache.get(channelId);
        if (!channel) return;

        const nonBotMembers = channel.members.filter(m => !m.user.bot);

        if (nonBotMembers.size === 0) {
            console.log(`[OstinatoTTS] All humans left. Disconnecting.`);
            connection.destroy();
            this.playbackQueues.delete(guildId); 
        }
    }

    handleBotDisconnect(guildId) {
        if (this.playbackQueues.has(guildId)) {
            console.log(`[OstinatoTTS] Detected bot disconnection in guild ${guildId}. Clearing state.`);
            const queueData = this.playbackQueues.get(guildId);
            queueData.player.stop();
             if (queueData.connection) {
                try {
                    queueData.connection.destroy();
                } catch (e) { }
            }
            this.playbackQueues.delete(guildId);
        }
    }

    startHeartbeat() {
        // "stayin' alive, stayin' alive."
        setInterval(async () => {
            if (!this.initialized || !this.worker) return;
            
            // silently generate "alive" to keep memory pages hot.
            // we don't await this because we ideally don't care about the result,
            // but we need to ensure the worker actually processes it.
            try {
                // we use a junk user id (0) and null voice id to just hit the default path.
                // console.log('[OstinatoTTS] Pulse check...'); 
                await this.generateAudio("alive", "0", null, null, null);
            } catch (e) {
                // silent failure is fine here.
            }
        }, 3 * 60 * 1000); // 3 minutes
    }

    clearQueue(guildId) {
        if (this.playbackQueues.has(guildId)) {
            const queueData = this.playbackQueues.get(guildId);
            queueData.queue = []; // empty the array
            queueData.player.stop(); // stop current audio
            console.log(`[OstinatoTTS] Queue cleared for guild ${guildId}. "silence is golden."`);
        }
    }
}

module.exports = new OstinatoTTS();