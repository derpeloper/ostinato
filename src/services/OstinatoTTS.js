/**
 * @file OstinatoTTS.js
 * @description main service class for handling text-to-speech generation and playback management.
 * "actions speak louder than words, but sometimes words need to be spoken to be heard."
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

const path = require('path');
const { createAudioResource, joinVoiceChannel, getVoiceConnection, AudioPlayerStatus, createAudioPlayer, entersState, VoiceConnectionStatus } = require('@discordjs/voice');
const { Readable } = require('stream');
const { PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const db = require('../data/db');
const { cleanText } = require('../utils/cleanText');

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
        this.workers = [];
        this.nextWorkerIndex = 0;
        this.initialized = false;
        
        this.guildSemaphores = new Map();
        
        this.playbackQueues = new Map();
        
        this.pendingRequests = new Map();
        this.requestIdCounter = 0;
        this.sampleRate = 24000;
        this.initializationPromise = null;
        this.cache = new Map();

        this.DEFAULT_VOICES = [
            'F1', 'F2', 'F3', 'F4', 'F5',
            'M1', 'M2', 'M3', 'M4', 'M5'
        ];
    }

    getDefaultVoice(userId) {
        const idx = Number(BigInt(userId) % 10n);
        return this.DEFAULT_VOICES[idx];
    }

    invalidateCache(userId, guildId, type) {
        if (type === 'restricted') {
            const key = `restricted:${guildId}`;
            this.cache.delete(key);
        } else {
            const key = `${type}:${userId}:${guildId}`;
            this.cache.delete(key);
        }
    }

    async initialize() {
        if (this.initialized) return;
        if (this.initializationPromise) return this.initializationPromise;

        console.log('[OstinatoTTS] Initializing Worker Pool...');
        this.initializationPromise = (async () => {
            try {
                await this.startWorkerPool();
                this.startHeartbeat();
            } catch (error) {
                this.initializationPromise = null;
                throw error;
            }
        })();
        return this.initializationPromise;
    }

    _checkAllWorkersReady() {
        this.initialized = this.workers.length > 0 && this.workers.every(w => w.ready);
    }

    async startWorkerPool() {
        let count = config.workerCount;
        if (count === undefined || count === null || isNaN(count)) {
            console.warn('[OstinatoTTS] config.workerCount is missing. falling back to 1');
            count = 1;
        }

        const { Worker } = require('worker_threads');
        
        for (let i = 0; i < count; i++) {
            this.workers.push({ worker: null, ready: false });
            this._spawnWorker(i, Worker);
        }

        let attempts = 0;
        while (!this.initialized && attempts < 120) {
            await new Promise(r => setTimeout(r, 500));
            attempts++;
        }
        
        if (!this.initialized) throw new Error("Worker pool initialization timed out");
    }

    _spawnWorker(index, Worker) {
        try {
            const worker = new Worker(path.join(__dirname, 'ttsWorker.js'));
            this.workers[index].worker = worker;
            this.workers[index].ready = false;

            worker.on('message', (msg) => {
                try {
                    if (msg.type === 'init_success') {
                        this.sampleRate = msg.sampleRate;
                        this.workers[index].ready = true;
                        this._checkAllWorkersReady();
                        console.log(`[OstinatoTTS] Worker ${index} Initialized.`);
                    } else if (msg.type === 'error') {
                        console.error(`[OstinatoTTS] Worker ${index} Error:`, msg.error);
                    } else if (msg.type === 'response') {
                        this.handleWorkerResponse(msg);
                    } else if (msg.type === 'memory_report') {
                        if (this.workers[index]._memoryResolve) {
                            this.workers[index]._memoryResolve(msg.memoryUsage);
                            this.workers[index]._memoryResolve = null;
                        }
                    }
                } catch (err) {
                    console.error(`[OstinatoTTS] Error in worker ${index} message handler:`, err);
                }
            });

            worker.on('error', (err) => {
                console.error(`[OstinatoTTS] Worker ${index} Thread Error:`, err);
            });

            worker.on('exit', async (code) => {
                if (code !== 0) {
                     console.error(new Error(`[OstinatoTTS] Worker ${index} stopped with exit code ${code}`));
                }
                
                console.log(`[OstinatoTTS] Worker ${index} died. Restarting in 1 second...`);
                this.workers[index].ready = false;
                this.workers[index].worker = null;
                this._checkAllWorkersReady();
                
                const requestsToRetry = Array.from(this.pendingRequests.entries())
                    .filter(([_, req]) => req.workerIndex === index);
                
                for (const [requestId] of requestsToRetry) {
                    this.pendingRequests.delete(requestId);
                }

                await new Promise(r => setTimeout(r, 1000));
                
                try {
                    this._spawnWorker(index, Worker);
                    
                    let attempts = 0;
                    while (!this.workers[index].ready && attempts < 120) {
                        await new Promise(r => setTimeout(r, 500));
                        attempts++;
                    }
                    
                    if (!this.workers[index].ready) {
                        throw new Error(`Worker ${index} failed to become ready`);
                    }
                    
                    console.log(`[OstinatoTTS] Re-queueing ${requestsToRetry.length} failed requests for worker ${index}...`);
                    for (const [requestId, req] of requestsToRetry) {
                        if (req.args) {
                            try {
                               const { buffer, lang, detected } = await this.generateAudio(...req.args);
                               req.resolve({ buffer, lang, detected });
                            } catch (err) {
                               req.reject(err);
                            }
                        } else {
                            req.reject(new Error('Worker crashed and request could not be retried'));
                        }
                    }
                } catch (err) {
                    console.error(`[OstinatoTTS] Failed to restart worker ${index}:`, err);
                    for (const [requestId, req] of requestsToRetry) {
                        req.reject(new Error('Worker crashed and failed to restart'));
                    }
                }
            });

            worker.postMessage({ type: 'initialize' });
        } catch (error) {
            console.error(`[OstinatoTTS] Failed to spawn worker ${index}:`, error);
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
            
            let workerIndex = this.nextWorkerIndex % this.workers.length;
            this.nextWorkerIndex++;
            
            let workerData = this.workers[workerIndex];
            
            // Output protection: if selected worker is currently indisposed (e.g. restarting), try another
            if (!workerData || !workerData.worker || !workerData.ready) {
                for (let i = 0; i < this.workers.length; i++) {
                    const fallbackIndex = (workerIndex + i) % this.workers.length;
                    if (this.workers[fallbackIndex] && this.workers[fallbackIndex].worker && this.workers[fallbackIndex].ready) {
                        workerIndex = fallbackIndex;
                        workerData = this.workers[workerIndex];
                        break;
                    }
                }
            }
            
            this.pendingRequests.set(requestId, { 
                resolve, 
                reject,
                args: [text, userId, voiceId, speed, lang],
                workerIndex
            });
            
            if (workerData && workerData.worker && workerData.ready) {
                workerData.worker.postMessage({
                    type: 'generate',
                    requestId,
                    text,
                    userId,
                    voiceId,
                    speed: finalSpeed,
                    lang: lang
                });
            } else {
                reject(new Error(`Worker ${workerIndex} is not ready, and no available workers were found.`));
            }
        });
    }

    async processMessage(message) {
        if (!this.initialized) await this.initialize();

        const cleanContent = cleanText(message.content, message);
        
        if (!cleanContent) return;
        
        const guildId = message.guild.id;

        try {
            const restrictedKey = `restricted:${guildId}`;
            let isRestricted = false;
            if (this.cache.has(restrictedKey)) {
                isRestricted = this.cache.get(restrictedKey);
            } else {
                const setting = db.prepare('SELECT restricted FROM restrictions WHERE guild = ?').get(guildId);
                if (setting && setting.restricted === 1) isRestricted = true;
                this.cache.set(restrictedKey, isRestricted);
                setTimeout(() => this.cache.delete(restrictedKey), 600000);
            }

            if (isRestricted) {
                if (!message.member?.voice?.selfMute && !message.member?.voice?.serverMute) {
                     return;
                }
            }

            const disabledKey = `disabled:${message.author.id}`;
            let isDisabled = false;
            
            if (this.cache.has(disabledKey)) {
                 isDisabled = this.cache.get(disabledKey);
            } else {
                const disabled = db.prepare('SELECT user FROM disabled WHERE user = ?').get(message.author.id);
                if (disabled) isDisabled = true;
                this.cache.set(disabledKey, isDisabled);
                setTimeout(() => this.cache.delete(disabledKey), 600000);
            }

            if (isDisabled) {
                return;
            }
        } catch (err) {
            console.error('[OstinatoTTS] Error checking restrictions/disabled:', err);
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
                currentTextLength: 0,
                lastSpeakerId: null 
            });
        }

        const queueData = this.playbackQueues.get(guildId);
        
        let connection = getVoiceConnection(guildId);
        
        if (connection) {
             const botChannelId = message.guild.members.me?.voice?.channelId || connection.joinConfig.channelId;
             if (message.member?.voice?.channelId !== botChannelId) {
                  return;
             }
        }
        
        if (!connection) {
            if (message.member?.voice?.channel) {
                console.log(`[OstinatoTTS] Joining VC: ${message.member.voice.channel.name}`);
                connection = joinVoiceChannel({
                    channelId: message.member.voice.channel.id,
                    guildId: guildId.toString(),
                    adapterCreator: message.guild.voiceAdapterCreator,
                    selfDeaf: true,
                    selfMute: false
                });

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
        
        const isLong = cleanContent.length > 200;

        if (queueData.isPlaying && queueData.currentIsLong) {
            console.log(`[OstinatoTTS] Interrupting long message.`);
            queueData.player.stop(); 
        }
        
        const taskPromise = (async () => {
            let concurrency = config.maxConcurrency;
            if (concurrency === undefined || concurrency === null) {
                console.warn('[OstinatoTTS] config.maxConcurrency is missing. falling back to backend default: 6');
                concurrency = 6;
            }
            if (!this.guildSemaphores.has(guildId)) {
                this.guildSemaphores.set(guildId, new Semaphore(concurrency));
            }
            const guildSemaphoreInstance = this.guildSemaphores.get(guildId);
            await guildSemaphoreInstance.acquire();
            try {
                let nameToUse = message.author.username;
                
                const nameKey = `name:${message.author.id}:${guildId}`;
                if (this.cache.has(nameKey)) {
                    nameToUse = this.cache.get(nameKey);
                } else {
                    try {
                        const nameRow = db.prepare('SELECT name FROM names WHERE user = ? AND guild = ? ORDER BY rowid DESC LIMIT 1').get(message.author.id, guildId);
                        if (nameRow) nameToUse = nameRow.name;
                        this.cache.set(nameKey, nameToUse);
                        setTimeout(() => this.cache.delete(nameKey), 600000);
                    } catch (dbErr) {
                        console.error('[OstinatoTTS] DB Name fetch error:', dbErr);
                    }
                }

                let fullContent = cleanContent;
                if (shouldAnnounceName) {
                    if (cleanContent === 'sent a link') {
                         fullContent = `${nameToUse} sent a link`;
                    } else {
                         fullContent = `${nameToUse} said: ${cleanContent}`;
                    }
                }

                let voiceId = null;
                const voiceKey = `voice:${message.author.id}:${guildId}`;
                if (this.cache.has(voiceKey)) {
                    voiceId = this.cache.get(voiceKey);
                } else {
                    try {
                        const voiceRow = db.prepare('SELECT voice FROM voices WHERE user = ? AND guild = ? ORDER BY rowid DESC LIMIT 1').get(message.author.id, guildId);
                        if (voiceRow) voiceId = voiceRow.voice;
                        this.cache.set(voiceKey, voiceId);
                        setTimeout(() => this.cache.delete(voiceKey), 600000);
                    } catch (dbErr) {
                         console.error('[OstinatoTTS] DB Voice fetch error:', dbErr);
                    }
                }

                let speed = null;
                const speedKey = `speed:${message.author.id}:${guildId}`;
                if (this.cache.has(speedKey)) {
                    speed = this.cache.get(speedKey);
                } else {
                    try {
                        const speedRow = db.prepare('SELECT speed FROM speeds WHERE user = ? AND guild = ? ORDER BY rowid DESC LIMIT 1').get(message.author.id, guildId);
                        if (speedRow) speed = speedRow.speed;
                        this.cache.set(speedKey, speed);
                        setTimeout(() => this.cache.delete(speedKey), 600000);
                    } catch (dbErr) {
                         console.error('[OstinatoTTS] DB Speed fetch error:', dbErr);
                    }
                }

                let lang = null;
                const langKey = `lang:${message.author.id}:${guildId}`;
                if (this.cache.has(langKey)) {
                    lang = this.cache.get(langKey);
                } else {
                    try {
                        const langRow = db.prepare('SELECT lang FROM langs WHERE user = ? AND guild = ? ORDER BY rowid DESC LIMIT 1').get(message.author.id, guildId);
                        if (langRow) lang = langRow.lang;
                        this.cache.set(langKey, lang);
                        setTimeout(() => this.cache.delete(langKey), 600000);
                    } catch (dbErr) {
                         console.error('[OstinatoTTS] DB Lang fetch error:', dbErr);
                    }
                }


                const start = Date.now();
                
                const { buffer, lang: usedLang, detected } = await this.generateAudio(fullContent, message.author.id, voiceId, speed, lang);
                
                if (!buffer) {
                     return null;
                }
                
                const resource = createAudioResource(Readable.from([buffer]), { inlineVolume: true });
                
                let volume = config.ttsVolume;
                if (volume === undefined || volume === null) {
                     console.warn('[OstinatoTTS] config.ttsVolume is missing. falling back to backend default: 5.89');
                     volume = 5.89;
                }

                if (message.member && message.member.permissions.has(PermissionFlagsBits.PrioritySpeaker)) {
                    let priorityVolume = config.priorityTtsVolume;
                    if (priorityVolume === undefined || priorityVolume === null) {
                         console.warn('[OstinatoTTS] config.priorityTtsVolume is missing. falling back to backend default: 6.1');
                         priorityVolume = 6.1;
                    }
                    volume = priorityVolume;
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
                if (guildSemaphoreInstance) guildSemaphoreInstance.release();
            }
        })();

        queueData.lastSpeakerId = message.author.id;
        queueData.queue.push({ task: taskPromise, isLong, textLength: cleanContent.length });

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
        queueData.currentTextLength = item.textLength;
        
        try {
            const resource = await item.task;
            queueData.queue.shift(); 

            if (resource) {
                
                resource.playStream.on('error', (error) => {
                    console.error('[OstinatoTTS] Audio Resource Stream Error:', error);
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
            if (this.playbackQueues.has(guildId)) {
                this.playbackQueues.get(guildId).player.stop();
            }
            connection.destroy();
            this.playbackQueues.delete(guildId); 
            this.guildSemaphores.delete(guildId);
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
            this.guildSemaphores.delete(guildId);
        }
    }

    startHeartbeat() {
        setInterval(async () => {
            if (!this.initialized || this.workers.length === 0) return;
            try {
                await this.generateAudio("alive", "0", null, null, null);
            } catch (e) {
            }
        }, 3 * 60 * 1000);
    }

    clearQueue(guildId) {
        if (this.playbackQueues.has(guildId)) {
            const queueData = this.playbackQueues.get(guildId);
            queueData.queue = [];
            queueData.player.stop();
            console.log(`[OstinatoTTS] Queue cleared for guild ${guildId}. "silence is golden."`);
        }
    }

    skip(guildId) {
        if (!this.playbackQueues.has(guildId)) return 'NOT_PLAYING';

        const queueData = this.playbackQueues.get(guildId);
        
        if (!queueData.isPlaying) return 'NOT_PLAYING';

        if (queueData.currentTextLength < 35) {
            return 'TOO_SHORT';
        }

        queueData.player.stop();
        return 'SKIPPED';
    }

    async collectWorkerMemory() {
        const promises = this.workers.map((workerData, index) => {
            return new Promise((resolve) => {
                if (!workerData.worker || !workerData.ready) {
                    resolve(null);
                    return;
                }

                const timeout = setTimeout(() => {
                    workerData._memoryResolve = null;
                    resolve(null);
                }, 3000);

                workerData._memoryResolve = (mem) => {
                    clearTimeout(timeout);
                    resolve(mem);
                };

                workerData.worker.postMessage({ type: 'memory_report' });
            });
        });

        return Promise.all(promises);
    }

    async logAggregatedMemory() {
        if (!this.initialized || this.workers.length === 0) return;

        const memoryReports = await this.collectWorkerMemory();
        
        let totalRss = 0;
        let totalHeapUsed = 0;
        let activeWorkers = 0;

        for (const mem of memoryReports) {
            if (mem) {
                totalRss += mem.rss;
                totalHeapUsed += mem.heapUsed;
                activeWorkers++;
            }
        }

        if (activeWorkers === 0) return;

        let memLimit = config.workerMemoryLimit;
        if (memLimit === undefined || memLimit === null) {
            memLimit = 1610612736;
        }

        const rssMB = (totalRss / 1024 / 1024).toFixed(2);
        const heapMB = (totalHeapUsed / 1024 / 1024).toFixed(2);
        const limitMB = (memLimit * this.workers.length / 1024 / 1024).toFixed(2);

        if (this.workers.length === 1) {
            console.log(`[Worker] Memory: RSS ${rssMB}MB | Heap ${heapMB}MB / ${(memLimit / 1024 / 1024).toFixed(2)}MB`);
        } else {
            console.log(`[Workers] Memory (${this.workers.length} workers): Total RSS ${rssMB}MB | Total Heap ${heapMB}MB / ${limitMB}MB`);
        }
    }
}

module.exports = new OstinatoTTS();