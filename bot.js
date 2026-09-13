/**
 * @file bot.js
 * @description terminal management dashboard and process supervisor.
 * "the conductor behind the symphony."
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
const { spawn } = require('child_process');
const readline = require('readline');

const ACCENT = '\x1b[38;2;51;124;151m';
const GRAY = '\x1b[38;2;128;128;128m';
const GREEN = '\x1b[38;2;52;211;153m';
const YELLOW = '\x1b[38;2;251;191;36m';
const RED = '\x1b[38;2;248;113;113m';
const CYAN = '\x1b[38;2;56;189;248m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

const startTime = Date.now();
let serverCount = null;
let vramStats = null;
let workers = [];
let lastMessage = null;
const logs = [];
const MAX_LOGS = 100;
let isExiting = false;
let renderPending = false;

function formatTimestamp(d = new Date()) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const DD = String(d.getDate()).padStart(2, '0');
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const YY = String(d.getFullYear()).slice(-2);
    return `${hh}:${mm}|${DD}:${MM}:${YY}`;
}

function formatUptime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

function sanitizeMessageContent(content, maxLen) {
    if (!content) return '';
    const flattened = content.replace(/(?:\r?\n)+/g, ' ').trim();
    if (flattened.length <= maxLen) return flattened;
    return flattened.slice(0, Math.max(0, maxLen - 3)) + '...';
}

function parseLogLine(raw) {
    const text = raw.trim();
    if (!text) return null;

    let tag = `${GRAY}[SYS]${RESET}`;
    let body = text;

    if (text.includes('[Watchdog]')) {
        tag = `${YELLOW}[WATCHDOG]${RESET}`;
        body = text.replace(/\[Watchdog\]\s*/i, '');
    } else if (text.includes('[TTS Event]') || text.includes('[OstinatoTTS]')) {
        tag = `${ACCENT}[TTS]${RESET}`;
        if (/failed|error|fatal|fallback|fell back/i.test(text)) {
            tag = `${YELLOW}[TTS]${RESET}`;
        }
        body = text.replace(/\[(TTS Event|OstinatoTTS)\]\s*/i, '');
    } else if (text.includes('[Supertonic]')) {
        tag = `${CYAN}[ENGINE]${RESET}`;
        if (/failed|error|fatal|falling back|fell back/i.test(text)) {
            tag = `${YELLOW}[ENGINE]${RESET}`;
        }
        body = text.replace(/\[Supertonic\]\s*/i, '');
    } else if (text.includes('[Client]')) {
        tag = `${GREEN}[CLIENT]${RESET}`;
        body = text.replace(/\[Client\]\s*/i, '');
    } else if (text.includes('[Top.gg]')) {
        tag = `${GREEN}[TOP.GG]${RESET}`;
        body = text.replace(/\[Top\.gg\]\s*/i, '');
    } else if (text.includes('[Worker]') || text.includes('[Workers]')) {
        tag = `${CYAN}[WORKER]${RESET}`;
        body = text.replace(/\[Workers?\]\s*/i, '');
    } else if (text.includes('[Main]')) {
        tag = `${ACCENT}[MAIN]${RESET}`;
        body = text.replace(/\[Main\]\s*/i, '');
    } else if (/error|fatal|fail/i.test(text)) {
        tag = `${RED}[ERROR]${RESET}`;
    } else if (/warn/i.test(text)) {
        tag = `${YELLOW}[WARN]${RESET}`;
    }

    return {
        timestamp: formatTimestamp(),
        tag,
        text: body
    };
}

function addLogEntry(entry) {
    logs.push(entry);
    if (logs.length > MAX_LOGS) logs.shift();
    if (!process.stdout.isTTY) {
        console.log(`${entry.timestamp} ${entry.tag} ${entry.text}`);
    } else {
        queueRender();
    }
}

function addLog(tag, text) {
    addLogEntry({
        timestamp: formatTimestamp(),
        tag,
        text
    });
}

function getWorkerStatusBadge(w) {
    if (w.stopped) {
        return `${RED}[STOPPED]${RESET}   `;
    }
    if (w.restarting) {
        return `${CYAN}[RESTARTING]${RESET}`;
    }
    if (!w.ready) {
        return `${YELLOW}[STARTING]${RESET}  `;
    }
    if (w.activeJobs > 0) {
        return `${YELLOW}[BUSY]${RESET}      `;
    }
    return `${GREEN}[ONLINE]${RESET}    `;
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${ACCENT}> ${RESET}`
});

function queueRender() {
    if (!process.stdout.isTTY || renderPending) return;
    renderPending = true;
    setTimeout(() => {
        renderPending = false;
        render();
    }, 25);
}

function render() {
    if (!process.stdout.isTTY) return;

    const cols = process.stdout.columns || 80;
    const rows = process.stdout.rows || 24;
    const lines = [];

    const uptimeStr = formatUptime(Date.now() - startTime);
    const serversStr = serverCount !== null ? `${serverCount}` : '--';
    let headerLine = `${ACCENT}${BOLD}* ostinato / control [v2.8.4]${RESET}    ${GRAY}uptime:${RESET} ${uptimeStr}  ${GRAY}|${RESET}  ${GRAY}servers:${RESET} ${serversStr}`;
    if (vramStats) {
        headerLine += `  ${GRAY}|${RESET}  ${GRAY}vram:${RESET} ${vramStats}`;
    }
    lines.push(headerLine);
    lines.push(`${DIM}${'─'.repeat(Math.min(cols - 1, 80))}${RESET}`);
    lines.push('');

    lines.push(`${ACCENT}${BOLD}WORKER POOL${RESET}`);
    if (workers.length === 0) {
        lines.push(`${DIM}  (initializing worker pool...)${RESET}`);
    } else {
        const hasFallback = workers.some(w => w.fallback);
        if (hasFallback) {
            const failedProviders = [...new Set(workers.filter(w => w.fallback).map(w => (w.fallbackFrom || 'CUDA').toUpperCase()))].join(', ');
            lines.push(`  ${YELLOW}${BOLD}! NOTICE:${RESET} ${YELLOW}${failedProviders} failed to initialize; fell back to CPU inference.${RESET}`);
        }
        lines.push(`${DIM}  WORKER   STATUS        JOBS      VRAM        BACKEND${RESET}`);
        for (const w of workers) {
            const idStr = `#${w.index}`.padEnd(8);
            const statusBadge = getWorkerStatusBadge(w);
            const jobsStr = `${w.activeJobs || 0} active`.padEnd(9);

            let vramStr;
            if (w.useGpu && w.ready && !w.stopped && w.vramMB) {
                const vramRaw = `${w.vramMB} MB`;
                const vramColor = w.activeJobs > 0 ? `${YELLOW}${BOLD}` : `${GREEN}`;
                vramStr = `${vramColor}${vramRaw}${RESET}` + ' '.repeat(Math.max(0, 11 - vramRaw.length));
            } else if (w.stopped) {
                const vramRaw = '0 MB';
                vramStr = `${RED}${vramRaw}${RESET}` + ' '.repeat(Math.max(0, 11 - vramRaw.length));
            } else if (w.restarting || !w.ready) {
                const vramRaw = '...';
                vramStr = `${YELLOW}${vramRaw}${RESET}` + ' '.repeat(Math.max(0, 11 - vramRaw.length));
            } else {
                const vramRaw = '--';
                vramStr = `${GRAY}${vramRaw}${RESET}` + ' '.repeat(Math.max(0, 11 - vramRaw.length));
            }

            let backendStr;
            if (w.restarting || !w.ready) {
                backendStr = `${GRAY}...${RESET}`;
            } else if (w.useGpu) {
                backendStr = `${GREEN}GPU: ${w.gpuProvider || 'cuda'}${RESET}`;
            } else if (w.fallback) {
                const prov = (w.fallbackFrom || 'cuda').toUpperCase();
                backendStr = `CPU ${YELLOW}(${prov} failed, fell back to CPU)${RESET}`;
            } else {
                backendStr = 'CPU';
            }

            lines.push(`  ${idStr} ${statusBadge}  ${jobsStr} ${vramStr} ${backendStr}`);
        }
    }
    lines.push('');

    lines.push(`${ACCENT}${BOLD}LIVE MESSAGE${RESET}`);
    if (!lastMessage) {
        lines.push('Guild: none');
        lines.push('-----------');
        lines.push(`${DIM}(waiting for speech...)${RESET}`);
    } else {
        lines.push(`Guild: ${lastMessage.guildId}`);
        lines.push('-----------');
        const maxContentLen = Math.max(10, cols - 4);
        lines.push(sanitizeMessageContent(lastMessage.content, maxContentLen));
    }
    lines.push('');

    lines.push(`${ACCENT}${BOLD}SYSTEM LOGS${RESET}`);
    const fixedRows = lines.length + 2;
    const availableLogRows = Math.max(3, rows - fixedRows);
    const visibleLogs = logs.slice(-availableLogRows);

    for (const log of visibleLogs) {
        const prefix = `${DIM}${log.timestamp}${RESET} ${log.tag} `;
        const maxTextLen = Math.max(10, cols - 22);
        const text = log.text.length > maxTextLen ? log.text.slice(0, maxTextLen - 3) + '...' : log.text;
        lines.push(`${prefix}${text}`);
    }

    const remaining = availableLogRows - visibleLogs.length;
    for (let i = 0; i < remaining; i++) {
        lines.push('');
    }

    const output = lines.join('\n');
    process.stdout.write('\x1b[H\x1b[2J' + output + '\n');
    rl.prompt(true);
}

const child = spawn(process.execPath, [path.join(__dirname, 'src', 'index.js')], {
    stdio: ['pipe', 'pipe', 'pipe', 'ipc']
});

let stdoutBuffer = '';
child.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk.toString();
    const split = stdoutBuffer.split(/\r?\n/);
    stdoutBuffer = split.pop();
    for (const line of split) {
        const parsed = parseLogLine(line);
        if (parsed) addLogEntry(parsed);
    }
});

let stderrBuffer = '';
child.stderr.on('data', (chunk) => {
    stderrBuffer += chunk.toString();
    const split = stderrBuffer.split(/\r?\n/);
    stderrBuffer = split.pop();
    for (const line of split) {
        const parsed = parseLogLine(line);
        if (parsed) addLogEntry(parsed);
    }
});

child.on('message', (msg) => {
    if (!msg || !msg.type) return;

    if (msg.type === 'workers_status') {
        workers = msg.workers || [];
        const anyGpu = workers.some(w => w.useGpu && w.ready && !w.stopped);
        if (!anyGpu) {
            vramStats = null;
        }
        queueRender();
    } else if (msg.type === 'tts_message') {
        lastMessage = {
            guildId: msg.guildId,
            content: msg.content,
            timestamp: Date.now()
        };
        queueRender();
    } else if (msg.type === 'server_count') {
        serverCount = msg.count;
        queueRender();
    } else if (msg.type === 'vram_status') {
        vramStats = `${msg.usedMB} / ${msg.totalMB} MB`;
        queueRender();
    }
});

child.on('exit', (code, signal) => {
    addLog(`${RED}[SYS]${RESET}`, `Child process exited with code ${code ?? signal}`);
    if (isExiting) {
        process.exit(code || 0);
    }
});

rl.on('line', (line) => {
    const cmd = line.trim();

    const stopMatch = cmd.match(/^stop\s+(?:worker\s+)?(\d+)$/i);
    const startMatch = cmd.match(/^start\s+(?:worker\s+)?(\d+)$/i);
    const restartMatch = cmd.match(/^restart\s+(?:worker\s+)?(\d+)$/i);

    if (stopMatch) {
        const idx = parseInt(stopMatch[1], 10);
        if (child && child.connected) {
            child.send({ type: 'stop_worker', index: idx });
            addLog(`${ACCENT}[CMD]${RESET}`, `Stopping worker #${idx}...`);
        }
    } else if (startMatch) {
        const idx = parseInt(startMatch[1], 10);
        if (child && child.connected) {
            child.send({ type: 'start_worker', index: idx });
            addLog(`${ACCENT}[CMD]${RESET}`, `Starting worker #${idx}...`);
        }
    } else if (restartMatch) {
        const idx = parseInt(restartMatch[1], 10);
        if (child && child.connected) {
            child.send({ type: 'restart_worker', index: idx });
            addLog(`${ACCENT}[CMD]${RESET}`, `Restarting worker #${idx}...`);
        }
    } else if (cmd === 'restart all') {
        if (child && child.connected) {
            child.send({ type: 'restart_all_workers' });
            addLog(`${ACCENT}[CMD]${RESET}`, 'Restarting all workers...');
        }
    } else if (cmd === 'stop bot' || cmd === 'exit' || cmd === 'quit') {
        addLog(`${ACCENT}[CMD]${RESET}`, 'Stopping bot and exiting...');
        gracefulExit();
    } else if (cmd === 'help') {
        addLog(`${ACCENT}[HELP]${RESET}`, 'Available commands:');
        addLog(`${ACCENT}[HELP]${RESET}`, '  stop [worker] <id>    - Stop specified worker');
        addLog(`${ACCENT}[HELP]${RESET}`, '  start [worker] <id>   - Start specified worker');
        addLog(`${ACCENT}[HELP]${RESET}`, '  restart [worker] <id> - Restart specified worker');
        addLog(`${ACCENT}[HELP]${RESET}`, '  restart all           - Restart all workers');
        addLog(`${ACCENT}[HELP]${RESET}`, '  stop bot / exit       - Shutdown bot and exit');
    } else if (cmd.length > 0) {
        addLog(`${YELLOW}[CMD]${RESET}`, `Unknown command: "${cmd}". Type "help" for available commands.`);
    }

    queueRender();
});

function gracefulExit() {
    if (isExiting) return;
    isExiting = true;
    if (child && child.connected) {
        try {
            child.send({ type: 'stop_bot' });
        } catch (e) {}
    }
    setTimeout(() => {
        if (child && !child.killed) {
            try { child.kill('SIGTERM'); } catch (e) {}
        }
        process.exit(0);
    }, 1500);
}

process.on('SIGINT', () => gracefulExit());
process.on('SIGTERM', () => gracefulExit());

process.stdout.on('resize', () => {
    queueRender();
});

setInterval(() => {
    queueRender();
}, 1000);

if (process.stdout.isTTY) {
    render();
}
