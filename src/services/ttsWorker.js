/**
 * @file ttsWorker.js
 * @description worker thread for handling heavy text-to-speech inference operations without blocking the main event loop.
 * "i'm working hard, or hardly working? just kidding, i'm definitely working hard."
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

const { parentPort } = require('worker_threads');
const path = require('path');
const config = require('../config');

let ttsEngine = null;
let voiceStyles = [];
let voiceStyleMap = {};
let helper = null;
let francDetect = null;
let initialized = false;

const supportedLangs = [
    'en', 'ko', 'ja', 'ar', 'bg', 'cs', 'da', 'de', 'el', 'es',
    'et', 'fi', 'fr', 'hi', 'hr', 'hu', 'id', 'it', 'lt', 'lv',
    'nl', 'pl', 'pt', 'ro', 'ru', 'sk', 'sl', 'sv', 'tr', 'uk', 'vi'
];

const iso3to1 = {
    'eng': 'en', 'kor': 'ko', 'jpn': 'ja', 'ara': 'ar', 'bul': 'bg',
    'ces': 'cs', 'dan': 'da', 'deu': 'de', 'ell': 'el', 'spa': 'es',
    'est': 'et', 'fin': 'fi', 'fra': 'fr', 'hin': 'hi', 'hrv': 'hr',
    'hun': 'hu', 'ind': 'id', 'ita': 'it', 'lit': 'lt', 'lav': 'lv',
    'nld': 'nl', 'pol': 'pl', 'por': 'pt', 'ron': 'ro', 'rus': 'ru',
    'slk': 'sk', 'slv': 'sl', 'swe': 'sv', 'tur': 'tr', 'ukr': 'uk',
    'vie': 'vi'
};

const supportedLangs3 = Object.keys(iso3to1);

let sampleRate = 24000;

const supertonicPath = path.join(process.cwd(), 'supertonic');
const onnxPath = path.join(supertonicPath, 'assets', 'onnx');
const voiceStylesPath = path.join(supertonicPath, 'assets', 'voice_styles');

function createWavBuffer(audioData, sampleRate) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    
    const samplesPer20ms = Math.floor(sampleRate * 20 / 1000);
    const remainder = audioData.length % samplesPer20ms;
    const paddedLength = audioData.length + (remainder === 0 ? 0 : samplesPer20ms - remainder);
    const dataSize = paddedLength * bitsPerSample / 8;

    const buffer = Buffer.alloc(44 + dataSize);
    
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    
    for (let i = 0; i < audioData.length; i++) {
        const sample = Math.max(-1, Math.min(1, audioData[i]));
        const intSample = Math.floor(sample * 32767);
        buffer.writeInt16LE(intSample, 44 + i * 2);
    }
    
    return buffer;
}

async function initialize() {
    if (initialized) return;

    try {
        const helperPath = path.join(supertonicPath, 'nodejs', 'helper.js');
        helper = await import('file://' + helperPath.replace(/\\/g, '/'));
        
        const francModule = await import('franc');
        francDetect = francModule.franc || francModule.default;

        ttsEngine = await helper.loadTextToSpeech(onnxPath, false);
        sampleRate = ttsEngine.sampleRate;

        const styleFiles = [
            'F1.json', 'F2.json', 'F3.json', 'F4.json', 'F5.json',
            'M1.json', 'M2.json', 'M3.json', 'M4.json', 'M5.json'
        ];

        for (const file of styleFiles) {
            const stylePath = path.join(voiceStylesPath, file);
            const style = helper.loadVoiceStyle([stylePath], false);
            voiceStyles.push(style);
            
            const styleName = file.replace('.json', '');
            voiceStyleMap[styleName] = style;
        }

        initialized = true;
        parentPort.postMessage({ type: 'init_success', sampleRate });
    } catch (error) {
        parentPort.postMessage({ type: 'error', error: error.message });
    }
}

function detectLanguage(text) {
    if (!francDetect) return null;
    const result = francDetect(text, { only: supportedLangs3 });
    if (result === 'und') return null;
    return iso3to1[result] || null;
}

function getVoiceStyle(userId, voiceId) {
    if (voiceId && voiceStyleMap[voiceId]) {
        return voiceStyleMap[voiceId];
    }
    const idx = Number(BigInt(userId) % 10n);
    return voiceStyles[idx];
}

parentPort.on('message', async (msg) => {
    if (msg.type === 'initialize') {
        await initialize();
    } else if (msg.type === 'generate') {
        const { requestId, text, userId, voiceId, speed, lang: forcedLang } = msg;

        let targetSpeed = speed;
        if (targetSpeed === undefined || targetSpeed === null) {
             const configSpeed = config.ttsSpeed;
             if (configSpeed === undefined || configSpeed === null) {
                 console.warn('[TTSWorker] config.ttsSpeed is missing. falling back to backend default: 1.16');
                 targetSpeed = 1.16;
             } else {
                 targetSpeed = configSpeed;
             }
        }

        if (!initialized) {
             parentPort.postMessage({ type: 'response', requestId, success: false, error: 'Worker not initialized' });
             return;
        }

        try {
            const used = process.memoryUsage();
            let memLimit = config.workerMemoryLimit;
            if (memLimit === undefined || memLimit === null) {
                console.warn('[TTSWorker] config.workerMemoryLimit is missing. falling back to backend default: 1.5GB');
                memLimit = 1610612736;
            }

            if (used.heapUsed > memLimit) {
                console.warn('[TTSWorker] Memory high. Recycling worker after this request.');
            }

            let lang = null;
            let detectedLang = null;

            if (forcedLang && supportedLangs.includes(forcedLang)) {
                lang = forcedLang;
            } else {
                detectedLang = detectLanguage(text);
                
                let defaultLang = config.defaultLang;
                if (defaultLang === undefined || defaultLang === null) {
                     console.warn('[TTSWorker] config.defaultLang is missing. falling back to backend default: "en"');
                     defaultLang = 'en';
                }

                lang = defaultLang;
                if (detectedLang && supportedLangs.includes(detectedLang)) {
                    lang = detectedLang;
                }
            }

            const voiceStyle = getVoiceStyle(userId, voiceId);
            
            let quality = config.ttsQuality;
            if (quality === undefined || quality === null) {
                 console.warn('[TTSWorker] config.ttsQuality is missing. falling back to backend default: 6');
                 quality = 6;
            }

            const { wav } = await ttsEngine.call(text, lang, voiceStyle, quality, targetSpeed);
            const buffer = createWavBuffer(wav, sampleRate);
            
            parentPort.postMessage({ 
                type: 'response', 
                requestId, 
                success: true, 
                buffer: buffer,
                lang: lang,
                detected: detectedLang
            });

            const finalUsed = process.memoryUsage();
            let finalMemLimit = config.workerMemoryLimit;
            if (finalMemLimit === undefined || finalMemLimit === null) {
                finalMemLimit = 1610612736;
            }
            if (finalUsed.heapUsed > finalMemLimit) {
                console.log('[TTSWorker] Recycling due to memory limit...');
                process.exit(0);
            }

        } catch (error) {
            parentPort.postMessage({ type: 'response', requestId, success: false, error: error.message });
        }
    } else if (msg.type === 'memory_report') {
        parentPort.postMessage({ type: 'memory_report', memoryUsage: process.memoryUsage() });
    }
});

function logWorkerMemory() {
    const used = process.memoryUsage();
    console.log(`[TTSWorker] Memory: RSS ${(used.rss / 1024 / 1024).toFixed(2)}MB | Heap ${(used.heapUsed / 1024 / 1024).toFixed(2)}MB`);
}

process.on('unhandledRejection', (reason, promise) => {
    console.error('[TTSWorker] Unhandled Rejection at:', promise, 'reason:', reason);
    logWorkerMemory();
});

process.on('uncaughtException', (error) => {
    console.error('[TTSWorker] Uncaught Exception:', error);
    logWorkerMemory();
    process.exit(1);
});