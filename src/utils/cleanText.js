/**
 * @file cleanText.js
 * @description utility to clean and format text for better TTS experience.
 * "clean content, clear mind, clear voice."
 */

const abbreviations = {
    'brb': 'be right back',
    'idk': "i don't know",
    'tbh': 'to be honest',
    'rn': 'right now',
    'imo': 'in my opinion',
    'btw': 'by the way',
    'afk': 'away from keyboard',
    'omg': 'oh my god',
    'lol': 'laughing out loud',
    'lmao': 'laughing my ass off',
    'wtf': 'what the fuck',
    'wth': 'what the hell',
    'nvm': 'nevermind',
    'pls': 'please',
    'plz': 'please',
    'thx': 'thanks',
    'ty': 'thank you',
    'gg': 'good game',
    'ez': 'easy',
    'ig': 'i guess',
    'fr': 'for real',
    'ong': 'on god',
};

const urlRegex = /(https?:\/\/[^\s]+)/g;
const emojiRegex = /<a?:([a-zA-Z0-9_]+):(\d+)>/g;
const channelUserRoleRegex = /<(@|@&|#)(!|&)?(\d+)>/g;

function cleanText(text, message = null) {
    if (!text && (!message || !message.stickers || message.stickers.size === 0)) return "";

    let cleaned = text || "";

    const hasUrl = urlRegex.test(cleaned);
    urlRegex.lastIndex = 0;
    cleaned = cleaned.replace(urlRegex, 'link');

    if (hasUrl) {
        if (cleaned.replace(/[^a-zA-Z]/g, '').length < 15) {
             cleaned = "sent a link";
        }
    }

    cleaned = cleaned.replace(emojiRegex, (match, name, id) => {
        return name;
    });

    const words = cleaned.split(/\s+/);
    const expanded = words.map(word => {
        const lower = word.toLowerCase().replace(/[.,!?]$/, "");
        const punctuation = word.slice(lower.length);
        if (abbreviations[lower]) {
            return abbreviations[lower] + (word.match(/[.,!?]+$/) ? word.match(/[.,!?]+$/)[0] : "");
        }
        return word;
    });
    cleaned = expanded.join(" ");

    if (message && message.stickers && message.stickers.size > 0) {
        const stickerNames = message.stickers.map(s => s.name).join(", ");
        if (cleaned.length > 0) {
            cleaned += ` sent a sticker: ${stickerNames}`;
        } else {
            cleaned += `sticker: ${stickerNames}`;
        }
    }

    cleaned = cleaned.replace(/(\*\*|__)(.*?)\1/g, '$2');
    cleaned = cleaned.replace(/(\*|_)(.*?)\1/g, '$2');
    cleaned = cleaned.replace(/(`+)(.*?)\1/g, '$2');
    cleaned = cleaned.replace(/\|\|(.*?)\|\|/g, '$1');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
}

module.exports = { cleanText };
