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

const emojiMap = {
    '😀': 'grinning face', '😃': 'smiley face', '😄': 'smiling face', '😁': 'beaming face',
    '😆': 'laughing face', '😅': 'sweat smile', '🤣': 'rolling on the floor laughing', '😂': 'crying laughing',
    '🙂': 'slightly smiling', '🙃': 'upside down face', '😉': 'winking face', '😊': 'smiling face',
    '😇': 'angel face', '🥰': 'loving face', '😍': 'heart eyes', '🤩': 'starstruck',
    '😘': 'blowing a kiss', '😗': 'kissing face', '😚': 'kissing face', '😙': 'kissing face',
    '🥲': 'smiling with tear', '😋': 'yummy face', '😛': 'tongue out', '😜': 'winking tongue',
    '🤪': 'zany face', '😝': 'squinting tongue', '🤑': 'money face', '🤗': 'hugging face',
    '🤭': 'hand over mouth', '🤫': 'shushing face', '🤔': 'thinking face', '🤐': 'zipper mouth',
    '🤨': 'raised eyebrow', '😐': 'neutral face', '😑': 'expressionless', '😶': 'no mouth',
    '😏': 'smirking face', '😒': 'unamused face', '🙄': 'eye roll', '😬': 'grimacing face',
    '🤥': 'lying face', '😌': 'relieved face', '😔': 'pensive face', '😪': 'sleepy face',
    '🤤': 'drooling face', '😴': 'sleeping face', '😷': 'face with mask', '🤒': 'sick face',
    '🤕': 'injured face', '🤢': 'nauseated face', '🤮': 'vomiting face', '🥵': 'hot face',
    '🥶': 'cold face', '🥴': 'woozy face', '😵': 'dizzy face', '🤯': 'mind blown',
    '🤠': 'cowboy face', '🥳': 'party face', '🥸': 'disguised face', '😎': 'cool face',
    '🤓': 'nerd face', '🧐': 'monocle face', '😕': 'confused face', '😟': 'worried face',
    '🙁': 'slightly frowning', '😮': 'open mouth', '😯': 'hushed face', '😲': 'astonished face',
    '😳': 'flushed face', '🥺': 'pleading face', '😦': 'frowning face', '😧': 'anguished face',
    '😨': 'fearful face', '😰': 'anxious face', '😥': 'sad but relieved', '😢': 'crying face',
    '😭': 'loudly crying', '😱': 'screaming face', '😖': 'confounded face', '😣': 'persevering face',
    '😞': 'disappointed face', '😓': 'downcast face', '😩': 'weary face', '😫': 'tired face',
    '🥱': 'yawning face', '😤': 'huffing face', '😡': 'angry face', '😠': 'angry face',
    '🤬': 'cursing face', '😈': 'smiling devil', '👿': 'angry devil', '💀': 'skull',
    '☠️': 'skull and crossbones', '💩': 'poop', '🤡': 'clown face', '👹': 'ogre',
    '👺': 'goblin', '👻': 'ghost', '👽': 'alien', '👾': 'alien monster',
    '🤖': 'robot', '😺': 'smiling cat', '😸': 'grinning cat', '😹': 'cat with tears of joy',
    '😻': 'heart eyes cat', '😼': 'smirking cat', '😽': 'kissing cat', '🙀': 'weary cat',
    '😿': 'crying cat', '😾': 'pouting cat', '💋': 'kiss mark', '👋': 'waving hand',
    '🤚': 'raised back of hand', '🖐️': 'hand with fingers splayed', '✋': 'raised hand', '🖖': 'vulcan salute',
    '👌': 'ok hand', '🤌': 'pinched fingers', '🤏': 'pinching hand', '✌️': 'victory hand',
    '🤞': 'crossed fingers', '🤟': 'love you gesture', '🤘': 'rock on', '🤙': 'call me hand',
    '👈': 'pointing left', '👉': 'pointing right', '👆': 'pointing up', '🖕': 'middle finger',
    '👇': 'pointing down', '☝️': 'pointing up', '👍': 'thumbs up', '👎': 'thumbs down',
    '✊': 'raised fist', '👊': 'fist bump', '🤛': 'left fist', '🤜': 'right fist',
    '👏': 'clapping hands', '🙌': 'raising hands', '👐': 'open hands', '🤲': 'palms up',
    '🤝': 'handshake', '🙏': 'folded hands', '💪': 'flexed bicep', '🦾': 'mechanical arm',
    '❤️': 'red heart', '🧡': 'orange heart', '💛': 'yellow heart', '💚': 'green heart',
    '💙': 'blue heart', '💜': 'purple heart', '🖤': 'black heart', '🤍': 'white heart',
    '🤎': 'brown heart', '💔': 'broken heart', '❣️': 'heart exclamation', '💕': 'two hearts',
    '💞': 'revolving hearts', '💓': 'beating heart', '💗': 'growing heart', '💖': 'sparkling heart',
    '💘': 'heart with arrow', '💝': 'heart with ribbon', '🔥': 'fire', '💯': 'hundred points',
    '✨': 'sparkles', '⭐': 'star', '🌟': 'glowing star', '💫': 'dizzy star',
    '🎉': 'party popper', '🎊': 'confetti ball', '🎶': 'music notes', '🎵': 'music note',
    '💤': 'sleeping', '💢': 'anger symbol', '💬': 'speech bubble', '👁️': 'eye',
    '👀': 'eyes', '🫡': 'saluting face', '🫠': 'melting face', '🫢': 'face with open eyes and hand over mouth',
    '🫣': 'face with peeking eye', '🫤': 'face with diagonal mouth', '🫥': 'dotted line face',
    '🫨': 'shaking face', '🩷': 'pink heart', '🩵': 'light blue heart', '🩶': 'grey heart',
};

const urlRegex = /(https?:\/\/[^\s]+)/g;
const emojiRegex = /<a?:([a-zA-Z0-9_]+):(\d+)>/g;
const mentionRegex = /<@!?(\d+)>/g;
const channelMentionRegex = /<#(\d+)>/g;
const unicodeEmojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{231A}-\u{231B}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{25AA}-\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2614}-\u{2615}\u{2648}-\u{2653}\u{267F}\u{2693}\u{26A1}\u{26AA}-\u{26AB}\u{26BD}-\u{26BE}\u{26C4}-\u{26C5}\u{26CE}\u{26D4}\u{26EA}\u{26F2}-\u{26F3}\u{26F5}\u{26FA}\u{26FD}\u{2702}\u{2705}\u{2708}-\u{270D}\u{270F}]\uFE0F?/gu;

function cleanText(text, message = null) {
    if (!text && (!message || !message.stickers || message.stickers.size === 0)) {
        if (message && message.attachments && message.attachments.size > 0) {
            return "attached a file";
        }
        return "";
    }

    let cleaned = text || "";

    if (!cleaned && message && message.attachments && message.attachments.size > 0) {
        cleaned = "attached a file";
    }

    const hasUrl = urlRegex.test(cleaned);
    urlRegex.lastIndex = 0;

    if (hasUrl) {
        const textWithoutUrls = cleaned.replace(urlRegex, '').trim();
        if (textWithoutUrls.length === 0) {
            cleaned = "sent a link";
        } else {
            cleaned = cleaned.replace(urlRegex, 'link');
        }
    }

    cleaned = cleaned.replace(emojiRegex, (match, name, id) => {
        return name.replace(/_/g, ' ');
    });

    cleaned = cleaned.replace(mentionRegex, (match, userId) => {
        if (message && message.guild) {
            const member = message.guild.members.cache.get(userId);
            if (member) return member.displayName;
        }
        return "someone";
    });

    cleaned = cleaned.replace(channelMentionRegex, (match, channelId) => {
        if (message && message.guild) {
            const channel = message.guild.channels.cache.get(channelId);
            if (channel) return channel.name;
        }
        return "a channel";
    });

    cleaned = cleaned.replace(unicodeEmojiRegex, (match) => {
        const plain = match.replace(/\uFE0F/g, '');
        if (emojiMap[plain]) return ` ${emojiMap[plain]} `;
        if (emojiMap[match]) return ` ${emojiMap[match]} `;
        return '';
    });

    const words = cleaned.split(/\s+/);
    const expanded = words.map(word => {
        const lower = word.toLowerCase().replace(/[.,!?]$/, "");
        if (abbreviations[lower]) {
            return abbreviations[lower] + (word.match(/[.,!?]+$/) ? word.match(/[.,!?]+$/)[0] : "");
        }
        return word;
    });
    cleaned = expanded.join(" ");

    if (message && message.stickers && message.stickers.size > 0) {
        const stickerNames = message.stickers.map(s => s.name.replace(/_/g, ' ')).join(", ");
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
