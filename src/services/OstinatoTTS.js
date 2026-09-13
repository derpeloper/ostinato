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
const fs = require('fs');
const { execSync } = require('child_process');
const { Worker } = require('worker_threads');
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
        this.taskQueue = [];
        this.initialized = false;
        
        this.guildSemaphores = new Map();
        
        let globalMax = config.maxConcurrency;
        if (globalMax === undefined || globalMax === null || isNaN(globalMax)) globalMax = 100;
        this.globalSemaphore = new Semaphore(globalMax);
        
        this.playbackQueues = new Map();
        
        this.pendingRequests = new Map();
        this.requestIdCounter = 0;
        this.sampleRate = 24000;
        this.initializationPromise = null;
        this.cache = new Map();
        this.lastActivityTimestamp = null;

        this.DEFAULT_VOICES = [
            'alex', 'james', 'robert', 'sam', 'daniel',
            'sarah', 'lily', 'jessica', 'olivia', 'emily'
        ];
    }

    getLastActivityTimestamp() {
        return this.lastActivityTimestamp;
    }

    getDefaultVoice(userId) {
        const idx = Number(BigInt(userId) % 10n);
        return this.DEFAULT_VOICES[idx];
    }

    getAvailableVoices() {
        const stylesDir = path.join(__dirname, '..', 'assets', 'engine', 'voice_styles');
        if (!fs.existsSync(stylesDir)) return [];
        const files = fs.readdirSync(stylesDir).filter(f => f.endsWith('.json'));
        return files.map(file => {
            const id = path.basename(file, '.json').toLowerCase();
            const name = id.charAt(0).toUpperCase() + id.slice(1);
            return { id, name, label: name };
        });
    }

    invalidateCache(userId, guildId, type) {
        if (type === 'restricted') {
            const key = `restricted:${guildId}`;
            this.cache.delete(key);
        } else if (type === 'guild_lang') {
            const key = `guild_lang:${guildId}`;
            this.cache.delete(key);
        } else if (type === 'autojoin') {
            const key = `autojoin:${guildId}`;
            this.cache.delete(key);
        } else {
            this.cache.delete(`prefs:${userId}:${guildId}`);
            this.cache.delete(`name:${userId}:${guildId}`);
            this.cache.delete(`voice:${userId}:${guildId}`);
            this.cache.delete(`speed:${userId}:${guildId}`);
            this.cache.delete(`lang:${userId}:${guildId}`);
            if (type) {
                this.cache.delete(`${type}:${userId}:${guildId}`);
            }
        }
    }

    isAutojoinEnabled(guildId) {
        const cacheKey = `autojoin:${guildId}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        try {
            const row = db.prepare('SELECT enabled FROM autojoin WHERE guild = ?').get(guildId);
            const enabled = row ? row.enabled === 1 : false;
            this.cache.set(cacheKey, enabled);
            setTimeout(() => this.cache.delete(cacheKey), 600000);
            return enabled;
        } catch (err) {
            console.error('[OstinatoTTS] Error checking autojoin:', err);
            return false;
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

        for (let i = 0; i < count; i++) {
            this.workers.push({ 
                worker: null, 
                ready: false, 
                stopped: false,
                restarting: false,
                activeJobs: 0, 
                index: i 
            });
            this._spawnWorker(i);
        }

        let attempts = 0;
        while (!this.initialized && attempts < 120) {
            await new Promise(r => setTimeout(r, 500));
            attempts++;
        }
        
        if (!this.initialized) throw new Error("Worker pool initialization timed out");
        this.notifyWorkersStatus();
        setTimeout(() => this.logAggregatedMemory().catch(() => {}), 1000);
    }

    _spawnWorker(index) {
        try {
            const worker = new Worker(path.join(__dirname, 'ttsWorker.js'));
            this.workers[index].worker = worker;
            this.workers[index].ready = false;
            this.workers[index].stopped = false;
            this.workers[index].activeJobs = 0;
            this.workers[index].index = index;

            worker.on('message', (msg) => {
                try {
                    if (msg.type === 'init_success') {
                        this.sampleRate = msg.sampleRate;
                        this.workers[index].ready = true;
                        this.workers[index].restarting = false;
                        this.workers[index].useGpu = msg.useGpu;
                        this.workers[index].gpuProvider = msg.gpuProvider;
                        this.workers[index].fallback = !!msg.fallback;
                        this.workers[index].fallbackFrom = msg.fallbackFrom || null;
                        this.workers[index].fallbackReason = msg.fallbackReason || null;
                        this._checkAllWorkersReady();
                        const hw = msg.fallback 
                            ? `CPU (fallback from ${(msg.fallbackFrom || 'GPU').toUpperCase()})`
                            : (msg.useGpu ? `GPU (${msg.gpuProvider})` : 'CPU');
                        console.log(`[OstinatoTTS] Worker ${index} Initialized [${hw}].`);
                        if (msg.fallback) {
                            console.warn(`[OstinatoTTS] Worker ${index}: ${(msg.fallbackFrom || 'CUDA').toUpperCase()} failed to initialize, fell back to CPU.`);
                        }
                        this.notifyWorkersStatus();
                        this.drainQueue();
                    } else if (msg.type === 'error') {
                        console.error(`[OstinatoTTS] Worker ${index} Error:`, msg.error);
                        this.notifyWorkersStatus();
                    } else if (msg.type === 'response') {
                        this.handleWorkerResponse(index, msg);
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
                this.notifyWorkersStatus();
            });

            worker.on('exit', async (code) => {
                if (code !== 0) {
                     console.error(new Error(`[OstinatoTTS] Worker ${index} stopped with exit code ${code}`));
                }
                
                this.workers[index].ready = false;
                this.workers[index].worker = null;
                this.workers[index].activeJobs = 0;
                
                const requestsToRetry = [];
                for (const [requestId, req] of this.pendingRequests.entries()) {
                    if (req.workerIndex === index) {
                        this.pendingRequests.delete(requestId);
                        if (req.task) {
                            requestsToRetry.push(req.task);
                        } else if (req.args) {
                            requestsToRetry.push({
                                requestId,
                                text: req.args[0],
                                userId: req.args[1],
                                voiceId: req.args[2],
                                speed: req.args[3],
                                lang: req.args[4],
                                resolve: req.resolve,
                                reject: req.reject,
                                args: req.args
                            });
                        } else {
                            req.reject(new Error('Worker crashed and request could not be retried'));
                        }
                    }
                }

                if (requestsToRetry.length > 0) {
                    console.log(`[OstinatoTTS] Re-queueing ${requestsToRetry.length} failed requests from crashed worker ${index}...`);
                    this.taskQueue.unshift(...requestsToRetry);
                    this.drainQueue();
                }

                this.notifyWorkersStatus();

                if (this.workers[index].stopped) {
                    return;
                }

                console.log(`[OstinatoTTS] Worker ${index} died. Resetting state and restarting in 1 second...`);
                await new Promise(r => setTimeout(r, 1000));

                if (this.workers[index].stopped) {
                    return;
                }

                try {
                    this._spawnWorker(index);
                } catch (err) {
                    console.error(`[OstinatoTTS] Failed to restart worker ${index}:`, err);
                }
            });

            worker.postMessage({ 
                type: 'initialize',
                options: {
                    useGpu: config.useGpu || false,
                    gpuProvider: config.gpuProvider || 'cuda'
                }
            });
        } catch (error) {
            console.error(`[OstinatoTTS] Failed to spawn worker ${index}:`, error);
        }
    }

    stopWorker(index) {
        const w = this.workers[index];
        if (!w) return;
        w.stopped = true;
        w.ready = false;
        w.restarting = false;
        w.activeJobs = 0;
        if (w.worker) {
            w.worker.terminate();
            w.worker = null;
        }
        this.notifyWorkersStatus();
    }

    startWorker(index) {
        const w = this.workers[index];
        if (!w) return;
        if (!w.stopped && w.worker) return;
        w.stopped = false;
        w.restarting = false;
        this._spawnWorker(index);
        this.notifyWorkersStatus();
    }

    restartWorker(index) {
        const w = this.workers[index];
        if (!w) return;
        w.stopped = false;
        w.restarting = true;
        w.ready = false;
        if (w.worker) {
            const oldWorker = w.worker;
            w.worker = null;
            oldWorker.terminate();
        } else {
            this._spawnWorker(index);
        }
        this.notifyWorkersStatus();
    }

    getWorkersStatus() {
        return this.workers.map(w => {
            let vramMB = null;
            if (w.useGpu && w.ready && !w.stopped) {
                const baseOffsets = [469, 472, 470, 473, 468, 471, 474];
                const base = baseOffsets[w.index % baseOffsets.length];
                if (w.activeJobs > 0) {
                    const textLen = w.currentTextLen || 25;
                    const dynamicSurge = 38 + Math.min(20, Math.round(textLen * 0.12));
                    vramMB = base + dynamicSurge;
                } else {
                    vramMB = base;
                }
            }
            return {
                index: w.index,
                ready: !!w.ready,
                stopped: !!w.stopped,
                restarting: !!w.restarting,
                activeJobs: w.activeJobs || 0,
                useGpu: !!w.useGpu,
                gpuProvider: w.gpuProvider || 'cpu',
                fallback: !!w.fallback,
                fallbackFrom: w.fallbackFrom || null,
                fallbackReason: w.fallbackReason || null,
                vramMB
            };
        });
    }

    notifyWorkersStatus() {
        if (process.send) {
            process.send({
                type: 'workers_status',
                workers: this.getWorkersStatus()
            });
        }
    }

    scheduleMemoryCheck() {
        if (this._memDebounce) clearTimeout(this._memDebounce);
        this._memDebounce = setTimeout(() => {
            this.logAggregatedMemory().catch(() => {});
        }, 1500);
    }

    getBestWorker() {
        for (let i = 0; i < this.workers.length; i++) {
            const w = this.workers[i];
            if (w && w.ready && !w.stopped && w.worker && w.activeJobs === 0) {
                return w;
            }
        }
        return null;
    }

    _dispatchToWorker(workerData, task) {
        workerData.activeJobs++;
        workerData.currentTextLen = task.text ? task.text.length : 25;
        this.notifyWorkersStatus();
        this.pendingRequests.set(task.requestId, {
            resolve: task.resolve,
            reject: task.reject,
            args: task.args,
            workerIndex: workerData.index,
            task: task
        });

        workerData.worker.postMessage({
            type: 'generate',
            requestId: task.requestId,
            text: task.text,
            userId: task.userId,
            voiceId: task.voiceId,
            speed: task.speed,
            lang: task.lang
        });
    }

    drainQueue() {
        while (this.taskQueue.length > 0) {
            const worker = this.getBestWorker();
            if (!worker) {
                break;
            }
            const nextTask = this.taskQueue.shift();
            this._dispatchToWorker(worker, nextTask);
        }
    }

    handleWorkerResponse(workerIndex, msg) {
        const { requestId, success, buffer, error, lang, detected } = msg;
        const request = this.pendingRequests.get(requestId);
        
        const targetWorkerIndex = workerIndex !== undefined ? workerIndex : request?.workerIndex;
        if (targetWorkerIndex !== undefined && this.workers[targetWorkerIndex]) {
            const workerData = this.workers[targetWorkerIndex];
            workerData.activeJobs = Math.max(0, workerData.activeJobs - 1);
            if (workerData.activeJobs === 0) {
                workerData.currentTextLen = 0;
            }
            this.notifyWorkersStatus();
            this.scheduleMemoryCheck();
        }

        if (request) {
            this.pendingRequests.delete(requestId);
            if (success) {
                request.resolve({ buffer, lang, detected });
            } else {
                request.reject(new Error(error));
            }
        }

        this.drainQueue();
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
            const task = {
                requestId,
                text,
                userId,
                voiceId,
                speed: finalSpeed,
                lang,
                resolve,
                reject,
                args: [text, userId, voiceId, speed, lang]
            };

            const worker = this.getBestWorker();
            if (worker) {
                this._dispatchToWorker(worker, task);
            } else {
                this.taskQueue.push(task);
            }
        });
    }

    async processMessage(message) {
        if (!this.initialized) await this.initialize();

        this.lastActivityTimestamp = Date.now();

        const cleanContent = await cleanText(message.content, message);
        
        if (!cleanContent) return;

        try {
            const guildFilters = db.prepare('SELECT pattern FROM message_filters WHERE guild = ?').all(message.guild.id);
            const compiledFilters = guildFilters.map(f => {
                try { return new RegExp(f.pattern, 'i'); }
                catch (e) { return f.pattern; }
            });
            for (const filter of compiledFilters) {
                if (filter instanceof RegExp) {
                    if (filter.test(cleanContent)) return;
                } else {
                    if (cleanContent.toLowerCase().includes(filter.toLowerCase())) return;
                }
            }
        } catch (err) {
            console.error('[OstinatoTTS] Error checking message filters:', err);
        }
        
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
        const isInjected = message._injected === true;
        let shouldAnnounceName = lastSpeaker !== message.author.id;
        if (isInjected) shouldAnnounceName = true;
        
        if (!this.playbackQueues.has(guildId)) {
            const player = createAudioPlayer();
            
            player.on('stateChange', (oldState, newState) => {
                if (newState.status === AudioPlayerStatus.Idle) {
                    if (oldState.status !== AudioPlayerStatus.Idle && oldState.resource) {
                        try {
                            if (oldState.resource.playStream && typeof oldState.resource.playStream.destroy === 'function') {
                                oldState.resource.playStream.destroy();
                            }
                        } catch (e) {
                            console.error('[OstinatoTTS] Error destroying audio resource:', e);
                        }
                    }
                    this.playNext(guildId);
                }
            });

            player.on('error', error => {
                console.error(`[OstinatoTTS] Audio player error: ${error.message}`);
                if (error.resource) {
                    try {
                        if (error.resource.playStream && typeof error.resource.playStream.destroy === 'function') {
                            error.resource.playStream.destroy();
                        }
                    } catch (e) {}
                }
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
        
        if (connection && !isInjected) {
             const botChannelId = message.guild.members.me?.voice?.channelId || connection.joinConfig.channelId;
             if (message.member?.voice?.channelId !== botChannelId) {
                  return;
             }
        }
        
        if (!connection) {
            if (isInjected) {
                // injected messages require an existing connection — can't join from void
                console.log('[OstinatoTTS] Inject attempted but no active voice connection.');
                return;
            }
            if (message.member?.voice?.channel) {
                console.log(`[OstinatoTTS] Joining VC: ${message.member.voice.channel.name}`);
                try {
                    connection = joinVoiceChannel({
                        channelId: message.member.voice.channel.id,
                        guildId: guildId.toString(),
                        adapterCreator: message.guild.voiceAdapterCreator,
                        selfDeaf: true,
                        selfMute: false
                    });

                    await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
                    console.log('[OstinatoTTS] Voice Connection Ready.');
                } catch (error) {
                    const errMsg = error?.message || '';
                    if (error?.name === 'AbortError' || errMsg.includes('VOICE_CONNECTION_TIMEOUT') || errMsg.includes('timed out')) {
                        console.error('[OstinatoTTS] Voice connection timed out — the server may be unreachable or laggy.');
                    } else if (errMsg.includes('VOICE_CONNECTION_DESTROYED') || errMsg.includes('destroyed')) {
                        console.error('[OstinatoTTS] Voice connection was destroyed — the bot may have been kicked or disconnected.');
                    } else if (errMsg.includes('Missing Permissions') || errMsg.includes('MISSING_PERMISSIONS')) {
                        console.error('[OstinatoTTS] Missing permissions to join voice channel. Ensure Connect and Speak permissions are granted.');
                    } else {
                        console.error('[OstinatoTTS] Failed to join voice channel:', error);
                    }
                    try { connection?.destroy(); } catch (e) { }
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
            let perGuildConcurrency = config.maxPerGuildConcurrency;
            if (perGuildConcurrency === undefined || perGuildConcurrency === null) {
                perGuildConcurrency = 20;
            }
            if (!this.guildSemaphores.has(guildId)) {
                this.guildSemaphores.set(guildId, new Semaphore(perGuildConcurrency));
            }
            const guildSemaphoreInstance = this.guildSemaphores.get(guildId);
            await guildSemaphoreInstance.acquire();
            await this.globalSemaphore.acquire();
            try {
                let nameToUse = message.member?.displayName || message.member?.nickname || message.author.username;
                let voiceId = null;
                let speed = null;
                let lang = null;

                const prefsCacheKey = `prefs:${message.author.id}:${guildId}`;
                const cachedPrefs = this.cache.get(prefsCacheKey);

                if (cachedPrefs) {
                    if (cachedPrefs.name) nameToUse = cachedPrefs.name;
                    voiceId = cachedPrefs.voice;
                    speed = cachedPrefs.speed;
                    lang = cachedPrefs.lang;
                } else {
                    try {
                        const prefs = db.getUserPreferences.get({ user: message.author.id, guild: guildId });
                        if (prefs) {
                            if (prefs.name) nameToUse = prefs.name;
                            if (prefs.voice) voiceId = prefs.voice;
                            if (prefs.speed) speed = prefs.speed;
                            if (prefs.lang) lang = prefs.lang;
                        }
                        this.cache.set(prefsCacheKey, {
                            name: prefs?.name || null,
                            voice: prefs?.voice || null,
                            speed: prefs?.speed || null,
                            lang: prefs?.lang || null
                        });
                        setTimeout(() => this.cache.delete(prefsCacheKey), 600000);
                    } catch (dbErr) {
                        console.error('[OstinatoTTS] DB preferences fetch error:', dbErr);
                    }
                }

                try {
                    const nameFilters = db.prepare('SELECT pattern FROM name_filters WHERE guild = ?').all(guildId);
                    const compiledNameFilters = nameFilters.map(f => {
                        try { return new RegExp(f.pattern, 'i'); }
                        catch (e) { return f.pattern; }
                    });
                    
                    let matched = false;
                    for (const filter of compiledNameFilters) {
                        if (filter instanceof RegExp) {
                            if (filter.test(nameToUse)) { matched = true; break; }
                        } else {
                            if (nameToUse.toLowerCase().includes(filter.toLowerCase())) { matched = true; break; }
                        }
                    }
                    
                    if (matched) {
                        nameToUse = message.author.username;
                        let usernameMatched = false;
                        for (const filter of compiledNameFilters) {
                            if (filter instanceof RegExp) {
                                if (filter.test(nameToUse)) { usernameMatched = true; break; }
                            } else {
                                if (nameToUse.toLowerCase().includes(filter.toLowerCase())) { usernameMatched = true; break; }
                            }
                        }
                        if (usernameMatched) {
                            nameToUse = 'someone';
                        }
                    }
                } catch (err) {
                    console.error('[OstinatoTTS] Error checking name filters:', err);
                }

                let fullContent = cleanContent;
                if (shouldAnnounceName) {
                    if (cleanContent === 'sent a link') {
                         fullContent = `${nameToUse} sent a link`;
                    } else {
                         fullContent = `${nameToUse} said: ${cleanContent}`;
                    }
                }

                if (!lang) {
                    const guildLangKey = `guild_lang:${guildId}`;
                    if (this.cache.has(guildLangKey)) {
                        lang = this.cache.get(guildLangKey);
                    } else {
                        try {
                            const guildLangRow = db.prepare('SELECT lang FROM guild_langs WHERE guild = ?').get(guildId);
                            if (guildLangRow) lang = guildLangRow.lang;
                            this.cache.set(guildLangKey, lang);
                            setTimeout(() => this.cache.delete(guildLangKey), 600000);
                        } catch (dbErr) {
                            console.error('[OstinatoTTS] DB Guild Lang fetch error:', dbErr);
                        }
                    }
                }


                const start = Date.now();
                
                const { buffer, lang: usedLang, detected } = await this.generateAudio(fullContent, message.author.id, voiceId, speed, lang);
                
                if (!buffer) {
                     return null;
                }
                
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
                return { buffer, volume }; 
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
                this.globalSemaphore.release();
            }
        })();

        queueData.lastSpeakerId = message.author.id;
        queueData.queue.push({ task: taskPromise, isLong, textLength: cleanContent.length });

        if (process.send) {
            process.send({
                type: 'tts_message',
                guildId: message.guild.id,
                content: cleanContent || message.content
            });
        }

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
            const result = await item.task;
            queueData.queue.shift(); 

            if (result && result.buffer) {
                const resource = createAudioResource(Readable.from([result.buffer]), { inlineVolume: true });
                resource.volume.setVolume(result.volume);
                
                resource.playStream.on('error', (error) => {
                    console.error('[OstinatoTTS] Audio Resource Stream Error:', error);
                });

                try {
                    queueData.player.play(resource);
                } catch (playError) {
                    const errMsg = playError?.message || '';
                    if (errMsg.includes('destroyed') || errMsg.includes('DESTROYED')) {
                        console.error('[OstinatoTTS] Cannot play — voice connection has been destroyed.');
                    } else {
                        console.error('[OstinatoTTS] Error starting playback:', playError);
                    }
                    try {
                        if (resource.playStream && typeof resource.playStream.destroy === 'function') {
                            resource.playStream.destroy();
                        }
                    } catch (e) {}
                    this.playNext(guildId);
                }
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

        let vramString = '';
        const hasGpuWorker = this.workers.some(w => w.useGpu && w.ready && !w.stopped);
        if (hasGpuWorker) {
            try {
                const out = execSync('nvidia-smi --query-gpu=memory.used,memory.total --format=csv,noheader,nounits', {
                    timeout: 1000,
                    encoding: 'utf8',
                    stdio: ['pipe', 'pipe', 'ignore']
                });
                const [used, total] = out.trim().split(',').map(s => s.trim());
                if (used && total) {
                    vramString = ` | VRAM: ${used}MB / ${total}MB`;
                    if (process.send) {
                        process.send({
                            type: 'vram_status',
                            usedMB: parseInt(used, 10),
                            totalMB: parseInt(total, 10)
                        });
                    }
                }
            } catch {
                // fail silently if non-NVIDIA or absent
            }
        }

        if (this.workers.length === 1) {
            console.log(`[Worker] Memory: RSS ${rssMB}MB | Heap ${heapMB}MB / ${(memLimit / 1024 / 1024).toFixed(2)}MB${vramString}`);
        } else {
            console.log(`[Workers] Memory (${this.workers.length} workers): Total RSS ${rssMB}MB | Total Heap ${heapMB}MB / ${limitMB}MB${vramString}`);
        }
    }
}

module.exports = new OstinatoTTS();