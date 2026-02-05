/**
 * @file ttsWorker.js
 * @description worker thread for handling heavy text-to-speech inference operations without blocking the main event loop.
 * "i'm working hard, or hardly working? just kidding, i'm definitely working hard."
 */
const { parentPort, workerData } = require('worker_threads');
const path = require('path');
const fs = require('fs');
const config = require('../config');

let ttsEngine = null;
let voiceStyles = [];
let voiceStyleMap = {};
let helper = null;
let eldModule = null;
let detector = null;
let initialized = false;

const supportedLangs = ['en', 'pt', 'ko', 'fr', 'es'];
let sampleRate = 24000;

const supertonicPath = path.join(process.cwd(), 'supertonic');
const onnxPath = path.join(supertonicPath, 'assets', 'onnx');
const voiceStylesPath = path.join(supertonicPath, 'assets', 'voice_styles');

function createWavBuffer(audioData, sampleRate) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const dataSize = audioData.length * bitsPerSample / 8;

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
        
        eldModule = await import('eld');
        detector = eldModule.default || eldModule.eld || eldModule;
        
        if (detector && typeof detector.load === 'function') {
            await detector.load('medium');
            if (typeof detector.setLanguageSubset === 'function') {
                detector.setLanguageSubset(supportedLangs);
            }
        }

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
    if (!detector) return null;
    const result = detector.detect(text);
    return result;
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

            if (used.heapUsed > memLimit) { // Soft Limit
                console.warn('[TTSWorker] Memory high. Recycling worker after this request.');
                // We will exit after sending the response to let the main process restart us fresh.
                // This prevents hard OOM crashes.
            }

            let lang = null;
            let detectedLang = null;

            if (forcedLang && supportedLangs.includes(forcedLang)) {
                lang = forcedLang;
            } else {
                const detection = detectLanguage(text);
                detectedLang = detection ? detection.language : null;
                
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

            // Check memory again after generation, if it spiked heavily or was already high, exit.
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
    }
});

function logWorkerMemory() {
    const used = process.memoryUsage();
    console.log(`[TTSWorker] Memory: RSS ${(used.rss / 1024 / 1024).toFixed(2)}MB | Heap ${(used.heapUsed / 1024 / 1024).toFixed(2)}MB`);
}

setInterval(logWorkerMemory, 5 * 60 * 1000);

process.on('unhandledRejection', (reason, promise) => {
    console.error('[TTSWorker] Unhandled Rejection at:', promise, 'reason:', reason);
    logWorkerMemory();
});

process.on('uncaughtException', (error) => {
    console.error('[TTSWorker] Uncaught Exception:', error);
    logWorkerMemory();
    process.exit(1);
});
